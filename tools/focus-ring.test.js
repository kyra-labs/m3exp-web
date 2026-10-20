// The focus ring's motion (DECISIONS D19 (3), SOURCES register #61): Compose's inset ring grows on
// the fast spatial spring and shrinks on the fast effects spring (material3 Ripple.kt@19991f2c
// L852–853), none under reduced motion. m3e-css draws it as an outline, so every ring element
// keeps a zero-width outline at rest and transitions its width and offset; a component that sets
// its own `transition` must list the ring's first, or it would drop the ring's motion.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dir = new URL('../packages/m3e-css/src/', import.meta.url);
const read = (file) => readFileSync(new URL(file, dir), 'utf8');
const RING = 'var(--_m3e-focus-ring-transition, outline-width, outline-offset)';
const IN = '--_m3e-focus-ring-transition: var(--_m3e-focus-ring-in);';

/** Innermost rules as { selector, body, media } (comments removed; enough for this codebase). */
const rules = (css) => {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      stack.push({ prelude: text.slice(start, i).trim().replace(/\s+/g, ' '), body: i + 1 });
      start = i + 1;
    } else if (text[i] === '}') {
      const block = stack.pop();
      const body = text.slice(block.body, i);
      if (!body.includes('{') && !block.prelude.startsWith('@')) {
        out.push({
          selector: block.prelude.slice(block.prelude.lastIndexOf(';') + 1).trim(),
          body: body.replace(/\s+/g, ' ').trim(),
          media: stack
            .map((b) => b.prelude)
            .filter((p) => p.startsWith('@media'))
            .join(' '),
        });
      }
      start = i + 1;
    }
  }
  return out;
};

/** The subject (last compound selector) of each selector in a list, parentheses removed. */
const subjects = (selector) => {
  let flat = selector;
  while (/\([^()]*\)/.test(flat)) flat = flat.replace(/\([^()]*\)/g, '');
  return flat.split(',').map(
    (s) =>
      s
        .trim()
        .split(/\s*[>+~ ]\s*/)
        .pop() ?? '',
  );
};

const ringCss = read('focus-ring.css');
const ringRules = rules(ringCss);
const rest = ringRules.find((r) => r.body.includes('outline: 0 solid') && r.media === '');
const ringClasses = [...rest.selector.matchAll(/\.(m3e-[\w-]+)/g)].map((m) => m[1]);

describe('focus ring motion (D19 (3))', () => {
  it('at rest: a zero-width secondary ring, shrinking on the fast effects spring', () => {
    expect(rest.body).toContain('outline: 0 solid var(--m3e-sys-color-secondary);');
    expect(rest.body).toContain('transition: var(--_m3e-focus-ring-transition);');
    expect(rest.body).toContain('--_m3e-focus-ring-transition: var(--_m3e-focus-ring-out);');
    expect(rest.body).toMatch(
      /--_m3e-focus-ring-out: outline-width var\(--m3e-sys-motion-spring-fast-effects-duration\) var\(--m3e-sys-motion-spring-fast-effects-easing\), outline-offset var\(--m3e-sys-motion-spring-fast-effects-duration\) var\(--m3e-sys-motion-spring-fast-effects-easing\);/,
    );
    expect(rest.body).toMatch(
      /--_m3e-focus-ring-in: outline-width var\(--m3e-sys-motion-spring-fast-spatial-duration\) var\(--m3e-sys-motion-spring-fast-spatial-easing\), outline-offset var\(--m3e-sys-motion-spring-fast-spatial-duration\) var\(--m3e-sys-motion-spring-fast-spatial-easing\);/,
    );
  });

  it('focused: every ring grows on the fast spatial spring', () => {
    const drawn = ringRules.filter((r) =>
      r.body.includes('var(--m3e-sys-state-focus-indicator-thickness) solid'),
    );
    expect(drawn.length).toBeGreaterThan(5);
    for (const r of drawn) {
      if (r.media.includes('forced-colors')) continue;
      expect(r.body, r.selector).toContain(IN);
    }
  });

  it('reduced motion: neither list has a duration', () => {
    const reduced = ringRules.filter((r) => r.media.includes('prefers-reduced-motion'));
    expect(reduced).toHaveLength(1);
    expect(reduced[0].selector).toBe(rest.selector);
    expect(reduced[0].body).toBe(
      '--_m3e-focus-ring-in: outline-width, outline-offset; --_m3e-focus-ring-out: outline-width, outline-offset;',
    );
  });

  it('forced colors: the ring stays Highlight while it shrinks', () => {
    const forced = ringRules.find(
      (r) => r.media.includes('forced-colors') && r.selector === rest.selector,
    );
    expect(forced?.body).toBe('outline-color: Highlight;');
  });

  it('component transitions on ring elements list the ring first', () => {
    const files = readdirSync(dir).filter((f) => f.endsWith('.css') && f !== 'focus-ring.css');
    const hostPattern = new RegExp(`\\.(${ringClasses.join('|')})(?![\\w-])`);
    let checked = 0;
    for (const file of files) {
      for (const r of rules(read(file))) {
        // Only rules whose subject is a ring element (`:where()` / `:is()` subjects count too).
        const own = subjects(r.selector).some((s) => hostPattern.test(s));
        const wrapped =
          /^:(where|is)\(/.test(r.selector) &&
          !/::(before|after)$/.test(r.selector) &&
          hostPattern.test(r.selector);
        if (!own && !wrapped) continue;
        for (const decl of r.body.split(';').map((d) => d.trim())) {
          if (decl.startsWith('transition:')) {
            checked++;
            expect(decl, `${file} ${r.selector}`).toMatch(
              new RegExp(`^transition: ${RING.replace(/[()$.]/g, '\\$&')}(,|$)`),
            );
          } else if (decl.startsWith('transition-property:')) {
            checked++;
            expect(decl, `${file} ${r.selector}`).toMatch(
              /^transition-property: outline-width, outline-offset(,|$)/,
            );
          } else if (/^transition-(duration|timing-function):/.test(decl)) {
            throw new Error(`${file} ${r.selector}: a single ${decl} would retime the ring`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});
