// Reference comparisons: values are re-read from the vendored androidx sources with simple,
// independent regexes (not the parser) and compared with what the generator emits.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generate } from './generate.js';
import { parseTokenFile } from './kotlin.js';
import { readPin } from './pin.js';
import { readVendor } from './vendor.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const vendorDir = fileURLToPath(new URL('../vendor/androidx-material3-tokens/', import.meta.url));
const { manifest, files } = readVendor(vendorDir);
const colorSchemeKt = readVendor(
  fileURLToPath(new URL('../vendor/androidx-material3-sources/', import.meta.url)),
).files.find((f) => f.name === 'ColorScheme.kt')!.content;
const output = generate({
  files,
  commit: manifest.commit,
  upstreamPath: manifest.path,
  colorSchemeKt,
});
const tokensCss = output.get('tokens.css')!;
const source = (name: string) => files.find((f) => f.name === name)!.content;

/** Reads `--name: value;` declarations from generated CSS. */
const declarations = (css: string) =>
  new Map([...css.matchAll(/^\s*(--[\w-]+): (.+);$/gm)].map((m) => [m[1]!, m[2]!]));
// Main :root block only; the reduced-motion @media block re-declares some variables.
const sys = declarations(tokensCss.slice(0, tokensCss.indexOf('@media')));
const allComponentCss = [...output].filter(([p]) => p.startsWith('components/')).map(([, c]) => c);

describe('vendored sources', () => {
  it('are pinned to SOURCE_PIN', () => {
    expect(manifest.commit).toBe(readPin(root)['androidx_commit']);
    expect(files.length).toBe(120);
  });

  it('every token object is either emitted or explicitly excluded', () => {
    const parity = output.get('PARITY.md')!;
    for (const f of files) {
      const { object } = parseTokenFile(f.content);
      const listed = parity.includes(`\`${object}.`) || parity.includes(`| \`${object}\` |`);
      expect(listed, object).toBe(true);
    }
  });
});

describe('generator', () => {
  it('is deterministic', () => {
    const again = generate({
      files: [...files].reverse(),
      commit: manifest.commit,
      upstreamPath: manifest.path,
      colorSchemeKt,
    });
    expect([...again]).toEqual([...output]);
  });

  it('never emits a variable twice within a rule block', () => {
    for (const [path, css] of output) {
      if (!path.endsWith('.css')) continue;
      // theme.css repeats each role across its light / dark-media / data-theme blocks by design.
      for (const block of css.split(/[{}]/)) {
        const names = [...block.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
        expect(new Set(names).size, path).toBe(names.length);
      }
    }
  });

  it('only references defined sys tokens or color roles from ColorSchemeKeyTokens', () => {
    const roles = new Set(
      [...source('ColorSchemeKeyTokens.kt').matchAll(/val (\w+) = ColorToken/g)].map((m) =>
        m[1]!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase()),
      ),
    );
    const defined = new Set(sys.keys());
    for (const css of [tokensCss, ...allComponentCss]) {
      for (const [, ref] of css.matchAll(/var\((--[\w-]+)\)/g)) {
        const color = /^--m3e-sys-color-(.+)$/.exec(ref!);
        if (color) expect(roles, ref).toContain(color[1]);
        else expect(defined, ref).toContain(ref);
      }
    }
  });
});

describe('reference values (register items 2–6, 12–14)', () => {
  it.each([
    ['StandardMotionTokens.kt', 'standard'],
    ['ExpressiveMotionTokens.kt', 'expressive'],
  ])('%s: all 12 spring constants', (file, scheme) => {
    const constants = [
      ...source(file).matchAll(
        /Spring(Fast|Default|Slow)(Spatial|Effects)(Damping|Stiffness) = ([\d.]+)f/g,
      ),
    ];
    expect(constants).toHaveLength(12);
    for (const [, speed, type, field, value] of constants) {
      const name = `--m3e-sys-motion-spring-${scheme}-${speed!.toLowerCase()}-${type!.toLowerCase()}-${field === 'Damping' ? 'damping-ratio' : 'stiffness'}`;
      expect(Number(sys.get(name)), name).toBe(Number(value));
    }
  });

  it('elevation levels 0–5', () => {
    const levels = [
      ...source('ElevationTokens.kt').matchAll(/Level(\d)[\s\S]*?get\(\) = ([\d.]+)\.dp/g),
    ];
    expect(levels.map(([, l, v]) => [l, Number(v)])).toEqual([
      ['0', 0],
      ['1', 1],
      ['2', 3],
      ['3', 6],
      ['4', 8],
      ['5', 12],
    ]);
    for (const [, level, value] of levels) {
      const css = sys.get(`--m3e-sys-elevation-level${level!}`);
      expect(css).toBe(Number(value) === 0 ? '0' : `${String(Number(value))}px`);
    }
  });

  it('state layer opacities', () => {
    for (const [, state, value] of source('StateTokens.kt').matchAll(
      /(\w+)StateLayerOpacity = ([\d.]+)f/g,
    )) {
      expect(Number(sys.get(`--m3e-sys-state-${state!.toLowerCase()}-state-layer-opacity`))).toBe(
        Number(value),
      );
    }
  });

  it('uniform corner scale', () => {
    for (const [, name, value] of source('ShapeTokens.kt').matchAll(
      /val Corner(\w+) = RoundedCornerShape\(([\d.]+)\.dp\)/g,
    )) {
      const kebab = name!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase());
      expect(sys.get(`--m3e-sys-shape-corner-${kebab}`)).toBe(`${String(Number(value))}px`);
    }
    expect(sys.get('--m3e-sys-shape-corner-none')).toBe('0');
    expect(sys.get('--m3e-sys-shape-corner-full')).toBe('calc(infinity * 1px)');
  });

  it('typescale: every size, line height and tracking (sp → rem)', () => {
    const fields = [
      ...source('TypeScaleTokens.kt').matchAll(
        /val (\w+?)(LineHeight|Size|Tracking):[^\n]*\n\s*get\(\) = (-?[\d.]+)\.sp/g,
      ),
    ];
    expect(fields).toHaveLength(30 * 3);
    for (const [, role, field, value] of fields) {
      const kebab = role!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase());
      const css = sys.get(
        `--m3e-sys-typescale-${kebab}-${field === 'LineHeight' ? 'line-height' : field!.toLowerCase()}`,
      );
      const expected =
        Number(value) === 0 ? '0' : `${String(Number((Number(value) / 16).toFixed(6)))}rem`;
      expect(css, `${role!}${field!}`).toBe(expected);
    }
  });

  it('typescale weights resolve through TypefaceTokens', () => {
    for (const [, role, weight] of source('TypeScaleTokens.kt').matchAll(
      /val (\w+?)Weight:[^\n]*\n\s*get\(\) = TypefaceTokens\.Weight(\w+)/g,
    )) {
      const kebab = role!.replace(/[A-Z]/g, (c, i: number) => (i ? '-' : '') + c.toLowerCase());
      expect(sys.get(`--m3e-sys-typescale-${kebab}-weight`)).toBe(
        `var(--m3e-ref-typeface-weight-${weight!.toLowerCase()})`,
      );
    }
    expect(sys.get('--m3e-ref-typeface-weight-regular')).toBe('400');
    expect(sys.get('--m3e-ref-typeface-weight-medium')).toBe('500');
    expect(sys.get('--m3e-ref-typeface-weight-bold')).toBe('700');
  });

  it('TypographyTokens maps every style 1:1 onto TypeScaleTokens (why it is not emitted)', () => {
    const typography = parseTokenFile(source('TypographyTokens.kt'));
    const styles = typography.members.filter((m) => m.expr.kind === 'textStyle');
    expect(styles).toHaveLength(30);
    for (const m of styles) {
      if (m.expr.kind !== 'textStyle') continue;
      expect(m.expr.fields).toEqual({
        fontFamily: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Font` },
        fontWeight: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Weight` },
        fontSize: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Size` },
        lineHeight: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}LineHeight` },
        letterSpacing: { kind: 'ref', object: 'TypeScaleTokens', member: `${m.name}Tracking` },
      });
    }
  });

  it('Compose typeface default is FontFamily.SansSerif; D1 overrides it', () => {
    expect(source('TypefaceTokens.kt')).toMatch(
      /Brand: FontFamily\s+get\(\) = FontFamily\.SansSerif/,
    );
    expect(sys.get('--m3e-ref-typeface-brand')).toBe(
      '"Google Sans Flex", "Google Sans Flex Fallback", system-ui, sans-serif',
    );
  });

  it('scrim opacity', () => {
    expect(source('ScrimTokens.kt')).toContain('ContainerOpacity = 0.32f');
    expect(output.get('components/scrim.css')).toContain(
      '--m3e-comp-scrim-container-opacity: 0.32;',
    );
  });

  it('component disabled opacities come straight from source', () => {
    const css = declarations(output.get('components/filled-button.css')!);
    expect(source('FilledButtonTokens.kt')).toContain('DisabledContainerOpacity = 0.1f');
    expect(css.get('--m3e-comp-filled-button-container-opacity-disabled')).toBe('0.1');
  });
});

describe('supplementary m3.material.io tokens (register items 15–16)', () => {
  it('focus indicator', () => {
    expect(sys.get('--m3e-sys-state-focus-indicator-thickness')).toBe('3px');
    expect(sys.get('--m3e-sys-state-focus-indicator-outer-offset')).toBe('2px');
    expect(sys.get('--m3e-sys-state-focus-indicator-inner-offset')).toBe('-3px');
  });

  it('spacing scale is 8dp-based', () => {
    expect(sys.get('--m3e-sys-space-0')).toBe('0');
    expect(sys.get('--m3e-sys-space-25')).toBe('2px');
    expect(sys.get('--m3e-sys-space-100')).toBe('8px');
    expect(sys.get('--m3e-sys-space-450')).toBe('36px');
    expect(sys.get('--m3e-sys-space-900')).toBe('72px');
  });
});

describe('spring curves (M3: linear() + m3.material.io bezier stand-ins)', () => {
  it('emits the official bezier table verbatim for all 12 springs', async () => {
    const { SPRING_CURVES } = await import('./supplementary.js');
    expect(SPRING_CURVES).toHaveLength(12);
    for (const c of SPRING_CURVES) {
      const tk = c.token.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`);
      const base = `--m3e-sys-motion-spring-${c.scheme}-${tk}`;
      expect(sys.get(`${base}-bezier`)).toBe(
        `cubic-bezier(${c.bezier.map((n) => String(n)).join(', ')})`,
      );
      expect(sys.get(`${base}-bezier-duration`)).toBe(`${String(c.durationMillis)}ms`);
      expect(sys.get(`${base}-easing`)).toMatch(/^linear\(0, .+, 1\)$/);
      expect(sys.get(`${base}-duration`)).toMatch(/^\d+ms$/);
    }
  });

  it('aliases the active scheme (expressive) for every curve field', () => {
    for (const field of ['easing', 'duration', 'bezier', 'bezier-duration']) {
      expect(sys.get(`--m3e-sys-motion-spring-default-spatial-${field}`)).toBe(
        `var(--m3e-sys-motion-spring-expressive-default-spatial-${field})`,
      );
    }
  });

  it('reduced motion snaps spatial springs and speeds up effects (FOUNDATIONS §4)', () => {
    const media =
      /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {2}\}/.exec(tokensCss)?.[1] ?? '';
    for (const scheme of ['standard', 'expressive']) {
      for (const speed of ['fast', 'default', 'slow']) {
        expect(media).toContain(
          `--m3e-sys-motion-spring-${scheme}-${speed}-spatial-duration: 0ms;`,
        );
      }
      expect(media).toContain(
        `--m3e-sys-motion-spring-${scheme}-slow-effects-duration: var(--m3e-sys-motion-spring-${scheme}-fast-effects-duration);`,
      );
      expect(media).not.toContain(`--m3e-sys-motion-spring-${scheme}-fast-effects-duration:`);
    }
  });
});
