// Turns the vendored androidx token files into m3e-tokens outputs:
//   generated/tokens.css            ref + sys tokens (typeface, typescale, shape, elevation, state, motion)
//   generated/components/<c>.css    one file per component token object
//   generated/sys.ts                sys tokens as typed JS objects
//   generated/components.ts         component tokens as JS objects (one named export each)
//   generated/theme.css             baseline color scheme (Compose expressive light + dark)
//   generated/baseline-colors.ts    the same colors as JS
//   generated/PARITY.md             every source token → emitted variable, with file:line
//
// Seed-based color (material-color-utilities) is a runtime concern: @kyralabs/m3e-tokens/theme.

import { springToLinear } from '@kyralabs/m3e-motion';
import { themeCss } from '@kyralabs/m3e-tokens/theme-css';
import { type BaselineColor, baselineColors } from './color.js';
import { TOP_APP_BAR_REDUCED_MOTION, extractAppBarDefaults } from './app-bar-defaults.js';
import { extractButtonDefaults } from './button-defaults.js';
import { checkSmallAgainstCompose, extractButtonGroupDefaults } from './button-group-defaults.js';
import { extractChipDefaults, extractChipsDefaults } from './chip-defaults.js';
import { extractElevationMotion } from './elevation-motion.js';
import { extractFabDefaults } from './fab-defaults.js';
import { extractFabMenuDefaults } from './fab-menu-defaults.js';
import {
  FLOATING_TOOLBAR_REDUCED_MOTION,
  extractFloatingToolbarDefaults,
} from './floating-toolbar-defaults.js';
import { extractDockedToolbarDefaults } from './docked-toolbar-defaults.js';
import {
  extractCenteredPadding,
  extractNavigationDefaults,
  extractWideRailDefaults,
} from './navigation-defaults.js';
import { extractLoadingIndicatorMotion } from './loading-indicator-motion.js';
import { extractMenuDefaults } from './menu-defaults.js';
import {
  NAVIGATION_DRAWER_REDUCED_MOTION,
  extractNavigationDrawerDefaults,
} from './navigation-drawer-defaults.js';
import {
  NAVIGATION_SUITE_REDUCED_MOTION,
  extractNavigationSuiteDefaults,
} from './navigation-suite-defaults.js';
import {
  PANE_SCAFFOLD_REDUCED_MOTION,
  extractPaneScaffoldDefaults,
} from './pane-scaffold-defaults.js';
import { SEARCH_REDUCED_MOTION, extractSearchDefaults } from './search-defaults.js';
import {
  PROGRESS_INDICATOR_REDUCED_MOTION,
  extractProgressIndicatorDefaults,
  progressIndicatorKeyframes,
} from './progress-indicator-defaults.js';
import {
  SPLIT_BUTTON_REDUCED_MOTION,
  extractSplitButtonDefaults,
} from './split-button-defaults.js';
import { extractTabsDefaults } from './tabs-defaults.js';
import { extractTooltipDefaults } from './tooltip-defaults.js';
import { extractBadgeDefaults } from './badge-defaults.js';
import { extractDialogDefaults } from './dialog-defaults.js';
import { extractSnackbarDefaults } from './snackbar-defaults.js';
import {
  BOTTOM_SHEET_REDUCED_MOTION,
  extractBottomSheetDefaults,
} from './bottom-sheet-defaults.js';
import { SIDE_SHEET_REDUCED_MOTION, extractSideSheetDefaults } from './side-sheet-defaults.js';
import { CAROUSEL_REDUCED_MOTION, extractCarouselDefaults } from './carousel-defaults.js';
import {
  PULL_TO_REFRESH_REDUCED_MOTION,
  extractPullToRefreshDefaults,
} from './pull-to-refresh-defaults.js';
import { extractSegmentedButtonDefaults } from './segmented-button-defaults.js';
import { TIME_PICKER_REDUCED_MOTION, extractTimePickerDefaults } from './time-picker-defaults.js';
import { extractCheckboxDefaults } from './checkbox-defaults.js';
import { extractRadioButtonDefaults } from './radio-button-defaults.js';
import { checkSliderXSmallAgainstCompose, extractSliderDefaults } from './slider-defaults.js';
import { extractListDefaults } from './list-defaults.js';
import { extractSwitchDefaults } from './switch-defaults.js';
import { extractTextFieldDefaults } from './text-field-defaults.js';
import type { ComposeLiteral } from './compose-literals.js';
import {
  ANIMATION_CORE_PATH as ANIMATION_CORE_DIR,
  MATERIAL3_ADAPTIVE_PATH,
  MATERIAL3_ADAPTIVE_SOURCES,
  MATERIAL3_PATH as MATERIAL3_DIR,
  MATERIAL3_ANDROID_PATH as MATERIAL3_ANDROID_DIR,
  MATERIAL3_SAMPLES_PATH as MATERIAL3_SAMPLES_DIR,
} from './vendor.js';
import { boxShadow, parseElevationShadows } from './elevation.js';
import { extractWindowBreakpoints } from './window-size-class.js';
import { type Expr, type Member, type TokenFile, parseTokenFile } from './kotlin.js';
import {
  FOCUS_INDICATOR,
  SPACE,
  SPRING_CURVES,
  SPRING_CURVES_CITE,
  type SupplementaryToken,
} from './supplementary.js';
import { compVar, componentName, kebab, kebabName, reorderStates, words } from './names.js';

export interface SourceFile {
  /** File name inside the vendored tokens directory, e.g. `ShapeTokens.kt`. */
  name: string;
  content: string;
}

export interface GenerateOptions {
  files: readonly SourceFile[];
  /** androidx commit the files were fetched at (from /SOURCE_PIN). */
  commit: string;
  /** Upstream directory of the token files, for citations. */
  upstreamPath: string;
  /** Vendored `ColorScheme.kt` (expressiveLightColorScheme overrides). */
  colorSchemeKt: string;
  /** Other vendored Material3 sources by file name (Button.kt, ToggleButton.kt, …). */
  material3Sources: Readonly<Record<string, string>>;
  /** Vendored animation-core `Easing.kt` (FastOutSlowInEasing, …). */
  easingKt: string;
  /** Vendored compose/ui `GraphicsLayerScope.kt` (`DefaultShadowColor`). */
  graphicsLayerScopeKt: string;
  /** Vendored window-core `WindowSizeClass.kt` (window size class breakpoints). */
  windowSizeClassKt: string;
  /** Vendored Material Web `elevation/internal/_elevation.scss` (shadow geometry per level). */
  elevationScss: string;
  materialWebVersion: string;
  /** Material Symbols fvar axis defaults (`FILL`, `GRAD`, `opsz`, `wght`). */
  iconAxes: Readonly<Record<string, number>>;
  /** Material Symbols fvar `FILL` maximum (the filled style). */
  iconFillMax: number;
  iconVersion: string;
  /** Google Sans Flex hhea metrics (font units), from the fonts manifest (D1). */
  fontMetrics: { unitsPerEm: number; ascent: number; descent: number };
}

interface Emitted {
  name: string;
  value: string;
  object: string;
  member: string;
  raw: string;
  line: number;
  note?: string;
  /** Citation for tokens that do not come from an androidx file. */
  cite?: string;
}

/** Token objects whose values are produced elsewhere (color) or are not design values. */
const NOT_EMITTED: Readonly<Record<string, string>> = {
  ColorSchemeKeyTokens:
    'Color role keys; roles are emitted as --m3e-sys-color-* (see Baseline color).',
  PaletteTokens: 'Tonal palette; referenced by the baseline color schemes (see Baseline color).',
  ShapeKeyTokens: 'Key enum; resolved to ShapeTokens of the same name.',
  TypographyKeyTokens: 'Key enum; resolved to TypeScaleTokens of the same name.',
  MotionSchemeKeyTokens: 'Key enum; no component token references it at this pin.',
  TypographyTokens: 'TextStyle assembly; verified to map 1:1 onto TypeScaleTokens (test).',
};

const COLOR_OBJECTS = new Set(['ColorLightTokens', 'ColorDarkTokens']);

const SYS_OBJECTS = new Set([
  'TypefaceTokens',
  'TypeScaleTokens',
  'ShapeTokens',
  'ElevationTokens',
  'StateTokens',
  'MotionTokens',
  'StandardMotionTokens',
  'ExpressiveMotionTokens',
]);

/** D1: Google Sans Flex (+ its metric-matched fallback face, fonts.css) replaces FontFamily.SansSerif. */
const TYPEFACE_STACK = '"Google Sans Flex", "Google Sans Flex Fallback", system-ui, sans-serif';

/** Compose FontWeight constants (compose/ui/ui-text/.../font/FontWeight.kt L60–L66 at the pin). */
const FONT_WEIGHTS: Readonly<Record<string, number>> = { Normal: 400, Medium: 500, Bold: 700 };

/** The motion scheme `MaterialExpressiveTheme` uses; REQUIREMENTS §9 default. */
const DEFAULT_MOTION_SCHEME = 'expressive';

const TYPESCALE_FIELDS = [
  ['Font', 'font'],
  ['Weight', 'weight'],
  ['Size', 'size'],
  ['LineHeight', 'line-height'],
  ['Tracking', 'tracking'],
] as const;

/** Logical corners: Compose start/end are layout-direction aware, like CSS logical radii. */
const CORNERS = [
  ['topStart', ['Start', 'Start'], 'startStart'],
  ['topEnd', ['Start', 'End'], 'startEnd'],
  ['bottomEnd', ['End', 'End'], 'endEnd'],
  ['bottomStart', ['End', 'Start'], 'endStart'],
] as const;

const num = (n: number): string => String(Number(n.toFixed(6)));
const px = (dp: number): string => (dp === 0 ? '0' : `${num(dp)}px`);
const rem = (sp: number): string => (sp === 0 ? '0' : `${num(sp / 16)}rem`);
const camel = (parts: readonly string[]): string =>
  parts
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
const camelName = (name: string): string => camel(words(name));
const isUniform = (e: Extract<Expr, { kind: 'corners' }>): boolean =>
  e.topStart === e.topEnd && e.topEnd === e.bottomEnd && e.bottomEnd === e.bottomStart;

export function generate({
  files,
  commit,
  upstreamPath,
  colorSchemeKt,
  material3Sources,
  easingKt,
  graphicsLayerScopeKt,
  windowSizeClassKt,
  elevationScss,
  materialWebVersion,
  iconAxes,
  iconFillMax,
  iconVersion,
  fontMetrics,
}: GenerateOptions): Map<string, string> {
  const parsed = new Map<string, TokenFile & { file: string }>();
  for (const { name, content } of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const tokens = parseTokenFile(content);
    parsed.set(tokens.object, { ...tokens, file: name });
  }
  const lookup = (object: string, member: string): Member => {
    const found = parsed.get(object)?.members.find((m) => m.name === member);
    if (!found) throw new Error(`Unresolved reference ${object}.${member}`);
    return found;
  };

  const sys: Emitted[] = [];
  const emit = (
    list: Emitted[],
    object: string,
    m: Member,
    name: string,
    value: string,
    note?: string,
  ) => {
    const e: Emitted = { name, value, object, member: m.name, raw: m.raw, line: m.line };
    if (note !== undefined) e.note = note;
    else if (m.comment !== undefined) e.note = `upstream: ${m.comment}`;
    list.push(e);
  };

  // --- Typeface (ref) -------------------------------------------------------------------------
  const typeface = {
    brand: TYPEFACE_STACK,
    plain: TYPEFACE_STACK,
    weights: {} as Record<string, number>,
  };
  for (const m of parsed.get('TypefaceTokens')?.members ?? []) {
    if (m.expr.kind === 'fontFamily') {
      emit(
        sys,
        'TypefaceTokens',
        m,
        `--m3e-ref-typeface-${kebabName(m.name)}`,
        TYPEFACE_STACK,
        `D1 override: Google Sans Flex replaces FontFamily.${m.expr.name}`,
      );
    } else if (m.expr.kind === 'fontWeight') {
      const weight = FONT_WEIGHTS[m.expr.name];
      if (weight === undefined) throw new Error(`Unknown FontWeight.${m.expr.name}`);
      typeface.weights[camelName(m.name.replace(/^Weight/, ''))] = weight;
      emit(sys, 'TypefaceTokens', m, `--m3e-ref-typeface-${kebabName(m.name)}`, String(weight));
    } else {
      throw new Error(`TypefaceTokens.${m.name}: unexpected ${m.expr.kind}`);
    }
  }

  // --- Typescale (sys) ------------------------------------------------------------------------
  const typescale: Record<string, Record<string, string | number>> = {};
  for (const m of parsed.get('TypeScaleTokens')?.members ?? []) {
    const match = /^(\w+?)(Font|Weight|Size|LineHeight|Tracking)$/.exec(m.name);
    if (!match) throw new Error(`TypeScaleTokens.${m.name}: unexpected name`);
    const [, role, field] = match as unknown as [string, string, string];
    const cssField = TYPESCALE_FIELDS.find(([f]) => f === field)![1];
    const name = `--m3e-sys-typescale-${kebabName(role)}-${cssField}`;
    const style = (typescale[camelName(role)] ??= {});
    const e = m.expr;
    if (e.kind === 'ref' && e.object === 'TypefaceTokens') {
      const target = lookup('TypefaceTokens', e.member);
      emit(sys, 'TypeScaleTokens', m, name, `var(--m3e-ref-typeface-${kebabName(e.member)})`);
      style[camelName(field)] =
        target.expr.kind === 'fontWeight' ? FONT_WEIGHTS[target.expr.name]! : kebabName(e.member);
    } else if (e.kind === 'sp') {
      emit(sys, 'TypeScaleTokens', m, name, rem(e.value));
      style[camelName(field)] = e.value;
    } else {
      throw new Error(`TypeScaleTokens.${m.name}: unexpected ${e.kind}`);
    }
  }

  // --- Shape (sys) ----------------------------------------------------------------------------
  const shape: Record<string, number | Record<string, number>> = {};
  const shapeIsUniform = new Map<string, boolean>();
  for (const m of parsed.get('ShapeTokens')?.members ?? []) {
    const base = `--m3e-sys-shape-${kebabName(m.name)}`;
    const key = camelName(m.name);
    const e = m.expr;
    if (e.kind === 'rectangle') {
      emit(sys, 'ShapeTokens', m, base, '0');
      shape[key] = 0;
      shapeIsUniform.set(m.name, true);
    } else if (e.kind === 'circle') {
      emit(
        sys,
        'ShapeTokens',
        m,
        base,
        'calc(infinity * 1px)',
        'CircleShape is 50% in Compose; rendered as a true pill (FOUNDATIONS §3)',
      );
      shape[key] = Number.POSITIVE_INFINITY;
      shapeIsUniform.set(m.name, true);
    } else if (e.kind === 'cornerSize') {
      emit(sys, 'ShapeTokens', m, base, px(e.value));
      shape[key] = e.value;
      shapeIsUniform.set(m.name, true);
    } else if (e.kind === 'corners' && isUniform(e)) {
      emit(sys, 'ShapeTokens', m, base, px(e.topStart));
      shape[key] = e.topStart;
      shapeIsUniform.set(m.name, true);
    } else if (e.kind === 'corners') {
      const corners: Record<string, number> = {};
      for (const [field, suffix, jsKey] of CORNERS) {
        emit(sys, 'ShapeTokens', m, `${base}-${kebab(suffix)}`, px(e[field]));
        corners[jsKey] = e[field];
      }
      shape[key] = corners;
      shapeIsUniform.set(m.name, false);
    } else {
      throw new Error(`ShapeTokens.${m.name}: unexpected ${e.kind}`);
    }
  }

  // --- Elevation, state (sys) -----------------------------------------------------------------
  const elevation: Record<string, number> = {};
  for (const m of parsed.get('ElevationTokens')?.members ?? []) {
    if (m.expr.kind !== 'dp')
      throw new Error(`ElevationTokens.${m.name}: unexpected ${m.expr.kind}`);
    emit(sys, 'ElevationTokens', m, `--m3e-sys-elevation-${kebabName(m.name)}`, px(m.expr.value));
    elevation[camelName(m.name)] = m.expr.value;
  }
  // Shadow geometry per level from Material Web (Compose draws platform shadows); colored with the
  // shadow role. See elevation.ts.
  const shadows = parseElevationShadows(elevationScss);
  const elevationShadow: Record<string, string> = {};
  for (const m of parsed.get('ElevationTokens')?.members ?? []) {
    const level = /^Level(\d)$/.exec(m.name)?.[1];
    if (level === undefined) throw new Error(`ElevationTokens.${m.name}: unexpected name`);
    const value = boxShadow(shadows, Number(level), '--m3e-sys-color-shadow');
    sys.push({
      name: `--m3e-sys-elevation-${kebabName(m.name)}-shadow`,
      value,
      object: 'Material Web',
      member: `elevation level${level}`,
      raw: `key ${shadows.key.levels[Number(level)]!.join(' ')} @${String(shadows.key.opacity)}; ambient ${shadows.ambient.levels[Number(level)]!.join(' ')} @${String(shadows.ambient.opacity)}`,
      line: 0,
      cite: `@material/web@${materialWebVersion} elevation/internal/_elevation.scss (key L${String(shadows.key.line)}, ambient L${String(shadows.ambient.line)} and the per-level comment tables above them)`,
    });
    elevationShadow[camelName(m.name)] = value;
  }
  const state: Record<string, number> = {};
  for (const m of parsed.get('StateTokens')?.members ?? []) {
    if (m.expr.kind !== 'number')
      throw new Error(`StateTokens.${m.name}: unexpected ${m.expr.kind}`);
    emit(sys, 'StateTokens', m, `--m3e-sys-state-${kebabName(m.name)}`, num(m.expr.value));
    state[camelName(m.name)] = m.expr.value;
  }

  // --- Motion (sys) ---------------------------------------------------------------------------
  const durations: Record<string, number> = {};
  const easings: Record<string, readonly number[]> = {};
  for (const m of parsed.get('MotionTokens')?.members ?? []) {
    const e = m.expr;
    if (e.kind === 'number' && m.name.startsWith('Duration')) {
      const rest = m.name.replace(/^Duration/, '');
      emit(
        sys,
        'MotionTokens',
        m,
        `--m3e-sys-motion-duration-${kebabName(rest)}`,
        `${num(e.value)}ms`,
      );
      durations[camelName(rest)] = e.value;
    } else if (e.kind === 'cubicBezier' && m.name.startsWith('Easing')) {
      const rest = m.name.replace(/^Easing/, '').replace(/CubicBezier$/, '');
      emit(
        sys,
        'MotionTokens',
        m,
        `--m3e-sys-motion-easing-${kebabName(rest)}`,
        `cubic-bezier(${e.points.map(num).join(', ')})`,
      );
      easings[camelName(rest)] = e.points;
    } else {
      throw new Error(`MotionTokens.${m.name}: unexpected ${e.kind}`);
    }
  }
  interface Spring {
    dampingRatio: number;
    stiffness: number;
  }
  const springs: Record<string, Record<string, Spring>> = {};
  const aliases: Emitted[] = [];
  for (const [object, scheme] of [
    ['StandardMotionTokens', 'standard'],
    ['ExpressiveMotionTokens', 'expressive'],
  ] as const) {
    for (const m of parsed.get(object)?.members ?? []) {
      const match = /^Spring(Fast|Default|Slow)(Spatial|Effects)(Damping|Stiffness)$/.exec(m.name);
      if (!match || m.expr.kind !== 'number')
        throw new Error(`${object}.${m.name}: unexpected token`);
      const [, speed, type, field] = match as unknown as [string, string, string, string];
      // Compose `Damping` is the damping *ratio* ζ (Spring.DampingRatio*), not a coefficient.
      const cssField = field === 'Damping' ? 'damping-ratio' : 'stiffness';
      const token = `${kebab([speed, type])}-${cssField}`;
      emit(sys, object, m, `--m3e-sys-motion-spring-${scheme}-${token}`, num(m.expr.value));
      const spring = ((springs[scheme] ??= {})[camel([speed, type])] ??= {
        dampingRatio: 0,
        stiffness: 0,
      });
      spring[field === 'Damping' ? 'dampingRatio' : 'stiffness'] = m.expr.value;
      if (scheme === DEFAULT_MOTION_SCHEME) {
        emit(
          aliases,
          object,
          m,
          `--m3e-sys-motion-spring-${token}`,
          `var(--m3e-sys-motion-spring-${scheme}-${token})`,
          `active motion scheme alias (default ${DEFAULT_MOTION_SCHEME}, REQUIREMENTS §9)`,
        );
      }
    }
  }
  sys.push(...aliases);

  // --- Spring curves for CSS --------------------------------------------------------------------
  // `-easing`/`-duration`: linear() sampled from the springs above (m3e-motion, a bit-exact port
  // of Compose's SpringSimulation; FOUNDATIONS §4). `-bezier`/`-bezier-duration`: the official
  // m3.material.io stand-in curves. Reduced motion (FOUNDATIONS §4, project policy): spatial
  // springs snap; default/slow effects use fast effects.
  interface SpringCss {
    easing: string;
    durationMillis: number;
    bezier: readonly number[];
    bezierDurationMillis: number;
  }
  const motionCss: Record<string, Record<string, SpringCss>> = {};
  const curveAliases: Emitted[] = [];
  const reducedMotion: string[] = [];
  for (const scheme of ['standard', 'expressive'] as const) {
    for (const [token, spec] of Object.entries(springs[scheme] ?? {})) {
      const curve = SPRING_CURVES.find((c) => c.scheme === scheme && c.token === token);
      if (!curve) throw new Error(`No m3.material.io curve for ${scheme}.${token}`);
      const linear = springToLinear(spec);
      const tk = kebab(words(token[0]!.toUpperCase() + token.slice(1)));
      const base = `--m3e-sys-motion-spring-${scheme}-${tk}`;
      const derived = (field: string, value: string, cite: string): Emitted => ({
        name: `${base}-${field}`,
        value,
        object: 'm3e-motion',
        member: `${scheme}.${token}`,
        raw: `ζ=${num(spec.dampingRatio)}, k=${num(spec.stiffness)}`,
        line: 0,
        cite,
      });
      const linearCite = `springToLinear() (m3e-motion; Compose SpringSimulation port), ${String(linear.stops.length)} stops, max error ${linear.maxError.toFixed(4)}`;
      sys.push(
        derived('easing', linear.easing, linearCite),
        derived(
          'duration',
          `${String(linear.durationMillis)}ms`,
          `${linearCite}; Compose duration estimate at 0.1% of travel`,
        ),
        derived('bezier', `cubic-bezier(${curve.bezier.map(num).join(', ')})`, SPRING_CURVES_CITE),
        derived('bezier-duration', `${String(curve.durationMillis)}ms`, SPRING_CURVES_CITE),
      );
      if (scheme === DEFAULT_MOTION_SCHEME) {
        for (const field of ['easing', 'duration', 'bezier', 'bezier-duration']) {
          curveAliases.push({
            ...derived(
              field,
              `var(${base}-${field})`,
              'active motion scheme alias (REQUIREMENTS §9)',
            ),
            name: `--m3e-sys-motion-spring-${tk}-${field}`,
          });
        }
      }
      if (tk.endsWith('spatial')) {
        reducedMotion.push(`${base}-duration: 0ms;`, `${base}-bezier-duration: 0ms;`);
      } else if (!tk.startsWith('fast')) {
        for (const field of ['easing', 'duration', 'bezier', 'bezier-duration']) {
          reducedMotion.push(
            `${base}-${field}: var(--m3e-sys-motion-spring-${scheme}-fast-effects-${field});`,
          );
        }
      }
      (motionCss[scheme] ??= {})[token] = {
        easing: linear.easing,
        durationMillis: linear.durationMillis,
        bezier: curve.bezier,
        bezierDurationMillis: curve.durationMillis,
      };
    }
  }
  sys.push(...curveAliases);

  // --- Supplementary sys tokens (m3.material.io; no androidx source at the pin) ---------------
  const supplementary = (t: SupplementaryToken): Emitted => ({
    name: t.name,
    value: px(t.dp),
    object: 'm3.material.io',
    member: t.token,
    raw: `${num(t.dp)}dp`,
    line: 0,
    cite: t.cite,
  });
  sys.push(...FOCUS_INDICATOR.map(supplementary), ...SPACE.map(supplementary));

  // --- Window size class breakpoints (window-core WindowSizeClass.kt): min-width/min-height ---
  // lower bounds. CSS cannot use custom properties in @media/@container conditions; these are
  // for sizes and JS. Queries write the px value (m3e-tokens README).
  const breakpoints = extractWindowBreakpoints(windowSizeClassKt, commit);
  const windowBreakpoints: Record<string, Record<string, number>> = { width: {}, height: {} };
  for (const b of breakpoints) {
    sys.push({
      name: `--m3e-sys-window-${b.axis}-${b.sizeClass}`,
      value: px(b.dp),
      object: 'WindowSizeClass.kt',
      member: b.member,
      raw: String(b.dp),
      line: b.line,
      cite: b.cite,
    });
    windowBreakpoints[b.axis]![camel(b.sizeClass.split('-'))] = b.dp;
  }

  // --- DisabledAlpha (ColorScheme.kt): content alpha of disabled components without a token ----
  const disabledAlpha = /internal const val DisabledAlpha = ([\d.]+)f/.exec(
    colorSchemeKt.replace(/\r\n/g, '\n'),
  );
  if (!disabledAlpha) throw new Error('ColorScheme.kt: DisabledAlpha not found');
  sys.push({
    name: '--m3e-sys-state-disabled-alpha',
    value: num(Number(disabledAlpha[1])),
    object: 'ColorScheme.kt',
    member: 'DisabledAlpha',
    raw: `${disabledAlpha[1]!}f`,
    line: 0,
    cite: `${MATERIAL3_DIR}/ColorScheme.kt@${commit} L${String(colorSchemeKt.replace(/\r\n/g, '\n').slice(0, disabledAlpha.index).split('\n').length)}`,
  });
  state['disabledAlpha'] = Number(disabledAlpha[1]);

  // --- Icon axis defaults (Material Symbols fvar; consumed by .m3e-icon) ----------------------
  const ICON_AXES = [
    ['FILL', 'fill'],
    ['GRAD', 'grade'],
    ['opsz', 'optical-size'],
    ['wght', 'weight'],
  ] as const;
  const icon: Record<string, number> = {};
  for (const [tag, field] of ICON_AXES) {
    const value = iconAxes[tag];
    if (value === undefined) throw new Error(`Material Symbols has no ${tag} axis`);
    sys.push({
      name: `--m3e-ref-typeface-icon-${field}`,
      value: num(value),
      object: 'Material Symbols',
      member: `fvar ${tag} default`,
      raw: num(value),
      line: 0,
      cite: `Material Symbols ${iconVersion} fvar default (packages/m3e-codegen/vendor/material-symbols/manifest.json)`,
    });
    icon[camel(field.split('-'))] = value;
  }
  // FILL is 0 (outlined) to 1 (filled); m3.material.io uses 1 for selected icons.
  sys.push({
    name: '--m3e-ref-typeface-icon-filled',
    value: num(iconFillMax),
    object: 'Material Symbols',
    member: 'fvar FILL max',
    raw: num(iconFillMax),
    line: 0,
    cite: `Material Symbols ${iconVersion} fvar FILL max (packages/m3e-codegen/vendor/material-symbols/manifest.json)`,
  });
  icon['filled'] = iconFillMax;
  const lastSegment = (token: string) => token.slice(token.lastIndexOf('.') + 1);
  const focusIndicator = Object.fromEntries(
    FOCUS_INDICATOR.map((t) => [camel(lastSegment(t.token).split('-')), t.dp]),
  );
  const space = Object.fromEntries(SPACE.map((t) => [lastSegment(t.token), t.dp]));

  // --- Components ---------------------------------------------------------------------------
  const components = new Map<
    string,
    { object: string; tokens: Emitted[]; js: Record<string, unknown> }
  >();
  for (const [object, tokens] of parsed) {
    if (SYS_OBJECTS.has(object) || COLOR_OBJECTS.has(object) || object in NOT_EMITTED) continue;
    const emitMember = (
      m: Member,
      reorder: boolean,
      out: Emitted[],
      js: Record<string, unknown>,
    ) => {
      const e = m.expr;
      const name = (member: string, extra: readonly string[] = []) =>
        compVar(object, member, extra, reorder);
      const jsKey = camel(reorder ? reorderStates(words(m.name)) : words(m.name));
      const note = reorder
        ? undefined
        : 'upstream word order kept: state reordering would collide with another token';
      const single = (value: string, jsValue: unknown) => {
        emit(out, object, m, name(m.name), value, note);
        js[jsKey] = jsValue;
      };
      if (e.kind === 'dp') single(px(e.value), e.value);
      else if (e.kind === 'sp') single(rem(e.value), e.value);
      else if (e.kind === 'number') single(num(e.value), e.value);
      else if (e.kind === 'corners' && isUniform(e)) single(px(e.topStart), e.topStart);
      else if (e.kind === 'ref' && e.object === 'ColorSchemeKeyTokens') {
        lookup('ColorSchemeKeyTokens', e.member);
        const v = `var(--m3e-sys-color-${kebabName(e.member)})`;
        single(v, v);
      } else if (e.kind === 'ref' && e.object === 'ElevationTokens') {
        lookup('ElevationTokens', e.member);
        const v = `var(--m3e-sys-elevation-${kebabName(e.member)})`;
        single(v, v);
        // Companion shadow (CSS cannot turn a dp level into a box-shadow): *Elevation → *Shadow.
        if (m.name.endsWith('Elevation')) {
          emit(
            out,
            object,
            m,
            name(m.name.replace(/Elevation$/, 'Shadow')),
            `var(--m3e-sys-elevation-${kebabName(e.member)}-shadow)`,
            'derived: box-shadow of the referenced elevation level',
          );
        }
      } else if (e.kind === 'ref' && e.object === 'ShapeTokens') {
        lookup('ShapeTokens', e.member);
        const v = `var(--m3e-sys-shape-${kebabName(e.member)})`;
        single(v, v);
      } else if (e.kind === 'ref' && e.object === 'ShapeKeyTokens') {
        lookup('ShapeKeyTokens', e.member);
        const uniform = shapeIsUniform.get(e.member);
        if (uniform === undefined)
          throw new Error(`${object}.${m.name}: ShapeTokens.${e.member} missing`);
        const base = `--m3e-sys-shape-${kebabName(e.member)}`;
        if (uniform) single(`var(${base})`, `var(${base})`);
        else {
          const corners: Record<string, string> = {};
          for (const [, suffix, cornerKey] of CORNERS) {
            const v = `var(${base}-${kebab(suffix)})`;
            emit(out, object, m, name(m.name, suffix), v, note);
            corners[cornerKey] = v;
          }
          js[jsKey] = corners;
        }
      } else if (e.kind === 'ref' && e.object === 'TypographyKeyTokens') {
        lookup('TypographyKeyTokens', e.member);
        const base = m.name.replace(/Font$/, '');
        const style: Record<string, string> = {};
        for (const [field, cssField] of TYPESCALE_FIELDS) {
          const v = `var(--m3e-sys-typescale-${kebabName(e.member)}-${cssField})`;
          emit(out, object, m, name(base, words(field)), v, note);
          style[camelName(field)] = v;
        }
        js[jsKey] = style;
      } else {
        throw new Error(`${object}.${m.name}: unsupported component value ${e.kind} "${m.raw}"`);
      }
    };
    // Pre-pass: members whose reordered names would collide keep upstream word order.
    const owners = new Map<string, Set<string>>();
    for (const m of tokens.members) {
      const probe: Emitted[] = [];
      emitMember(m, true, probe, {});
      for (const t of probe)
        (owners.get(t.name) ?? owners.set(t.name, new Set()).get(t.name)!).add(m.name);
    }
    const colliding = new Set(
      [...owners.values()].filter((o) => o.size > 1).flatMap((o) => [...o]),
    );
    const out: Emitted[] = [];
    const js: Record<string, unknown> = {};
    for (const m of tokens.members) emitMember(m, !colliding.has(m.name), out, js);
    const seen = new Map<string, string>();
    for (const t of out) {
      const prev = seen.get(t.name);
      if (prev !== undefined && prev !== t.member) {
        throw new Error(`Name collision ${t.name}: ${object}.${prev} and ${object}.${t.member}`);
      }
      seen.set(t.name, t.member);
    }
    components.set(componentName(object), { object, tokens: out, js });
  }

  // --- Writers ------------------------------------------------------------------------------
  const banner = (what: string, source = upstreamPath) => [
    `Generated by @kyralabs/m3e-codegen — do not edit. ${what}`,
    `Source: ${source} @ ${commit}`,
    'Values: Copyright (C) The Android Open Source Project, Apache License 2.0 (see NOTICE).',
  ];
  const cssFile = (
    what: string,
    tokens: readonly Emitted[],
    extra: readonly string[] = [],
    source?: string,
  ) =>
    [
      '/*',
      ...banner(what, source).map((l) => ` * ${l}`),
      ' */',
      '@layer m3e.tokens {',
      '  :root {',
      ...tokens.map((t) => `    ${t.name}: ${t.value};`),
      '  }',
      ...extra.map((l) => `  ${l}`),
      '}',
      '',
    ].join('\n');
  const tsHeader = (what: string) => [...banner(what).map((l) => `// ${l}`), ''];
  const literal = (value: unknown): string =>
    JSON.stringify(
      value,
      (_k, v: unknown) => (v === Number.POSITIVE_INFINITY ? '__INFINITY__' : v),
      2,
    )
      .replace(/"__INFINITY__"/g, 'Number.POSITIVE_INFINITY')
      .replace(/"([A-Za-z_$][\w$]*)":/g, '$1:');

  const out = new Map<string, string>();
  out.set(
    'tokens.css',
    cssFile('Reference + system tokens (color: theme.css).', sys, [
      '@media (prefers-reduced-motion: reduce) {',
      '  :root {',
      ...reducedMotion.map((l) => `    ${l}`),
      '  }',
      '}',
    ]),
  );

  // Baseline color: Compose expressiveLightColorScheme() / darkColorScheme().
  const baseline = baselineColors(parsed, colorSchemeKt, graphicsLayerScopeKt);
  const roles = (colors: readonly BaselineColor[]) =>
    Object.fromEntries(colors.map((c) => [c.role, c.hex]));
  out.set(
    'theme.css',
    themeCss({
      light: roles(baseline.light),
      dark: roles(baseline.dark),
      mode: 'system',
      layer: 'm3e.tokens',
      comment: [
        ...banner('Baseline color: Compose expressiveLightColorScheme() and darkColorScheme().'),
        'Seed-based themes: createTheme() from @kyralabs/m3e-tokens/theme, or the m3e-theme CLI.',
      ],
    }),
  );
  const baselineJs = { light: roles(baseline.light), dark: roles(baseline.dark) };
  out.set(
    'baseline-colors.ts',
    [
      ...tsHeader('Baseline color: Compose expressiveLightColorScheme() and darkColorScheme().'),
      `export const baselineColors = ${literal(baselineJs)} as const;`,
      '',
    ].join('\n'),
  );
  const colorRows = (['light', 'dark'] as const).flatMap((mode) =>
    baseline[mode].map((c) => {
      const cssVar = `--m3e-sys-color-${kebab(words(c.role[0]!.toUpperCase() + c.role.slice(1)))}`;
      return `| ${mode} | \`${c.role}\` | \`${c.via}\` | ${c.file}:${String(c.line)} | \`${cssVar}\` | \`${c.hex}\` | ${c.note ?? ''} |`;
    }),
  );
  // ButtonDefaults / ToggleButtonDefaults literals Compose renders (see button-defaults.ts).
  const buttonDefaults = extractButtonDefaults(material3Sources);
  components.set('button-defaults', {
    object: 'ButtonDefaults',
    tokens: buttonDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: px(d.dp),
        object: d.owner,
        member: d.member,
        raw: `${num(d.dp)}.dp`,
        line: d.line,
        cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      buttonDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.dp]),
    ),
  });

  // TopAppBarDefaults heights, layout literals, snap spring and two-rows easings (AppBar.kt; see
  // app-bar-defaults.ts).
  const appBarDefaults = extractAppBarDefaults(material3Sources, files, easingKt);
  components.set('top-app-bar-defaults', {
    object: 'AppBar.kt',
    tokens: appBarDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${d.file === 'Easing.kt' ? ANIMATION_CORE_DIR : MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      appBarDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // AssistChipDefaults literals Compose renders (see chip-defaults.ts).
  const chipDefaults = extractChipDefaults(material3Sources);
  components.set('assist-chip-defaults', {
    object: 'AssistChipDefaults',
    tokens: chipDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: px(d.dp),
        object: d.owner,
        member: d.member,
        raw: `${num(d.dp)}.dp`,
        line: d.line,
        cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      chipDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.dp]),
    ),
  });

  // Elevation interaction tweens (material3 internal/Elevation.kt; see elevation-motion.ts).
  const elevationMotion = extractElevationMotion(material3Sources['Elevation.kt'] ?? '', easingKt);
  components.set('elevation-motion', {
    object: 'ElevationDefaults',
    tokens: elevationMotion.map((t) => ({
      name: t.name,
      value: t.value,
      object: t.file === 'Easing.kt' ? 'Easing' : 'ElevationDefaults',
      member: t.member,
      raw: t.value,
      line: t.line,
      cite: `${t.file === 'Easing.kt' ? ANIMATION_CORE_DIR : MATERIAL3_DIR}/${t.file}@${commit} L${String(t.line)}`,
    })),
    js: Object.fromEntries(
      elevationMotion.map((t) => [camel(t.name.replace(/^--m3e-comp-/, '').split('-')), t.value]),
    ),
  });

  // Indeterminate LoadingIndicator choreography literals (see loading-indicator-motion.ts).
  const loadingIndicatorMotion = extractLoadingIndicatorMotion(
    material3Sources['LoadingIndicator.kt'] ?? '',
  );
  components.set('loading-indicator-motion', {
    object: 'LoadingIndicator',
    tokens: loadingIndicatorMotion.map((t) => ({
      name: t.name,
      value: t.value,
      object: 'LoadingIndicator',
      member: t.member,
      raw: t.value,
      line: t.line,
      cite: `${MATERIAL3_DIR}/LoadingIndicator.kt@${commit} L${String(t.line)}`,
    })),
    js: Object.fromEntries(
      loadingIndicatorMotion.map((t) => [
        camel(t.name.replace(/^--m3e-comp-/, '').split('-')),
        t.number,
      ]),
    ),
  });

  // Navigation bar / rail layout literals and the Centered arrangement (see navigation-defaults.ts).
  const navigationDefaults = extractNavigationDefaults(material3Sources);
  const centeredPadding = extractCenteredPadding(material3Sources);
  const wideRailDefaults = extractWideRailDefaults(
    material3Sources,
    Object.fromEntries(files.map((f) => [f.name, f.content])),
  );
  components.set('navigation-defaults', {
    object: 'NavigationDefaults',
    tokens: [
      ...navigationDefaults.map((d) => {
        const e: Emitted = {
          name: d.name,
          value: px(d.dp),
          object: d.owner,
          member: d.member,
          raw: `${num(d.dp)}.dp`,
          line: d.line,
          cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
        };
        if (d.note !== undefined) e.note = d.note;
        return e;
      }),
      ...centeredPadding.map((p) => ({
        name: p.name,
        value: `${num(p.percent)}%`,
        object: p.file,
        member: p.member,
        raw: p.raw,
        line: p.line,
        cite: `${MATERIAL3_DIR}/${p.file}@${commit} L${String(p.line)}`,
        note: 'of the bar width (Centered arrangement); EqualWeight above the largest item count',
      })),
      ...wideRailDefaults.map((d) => {
        const e: Emitted = {
          name: d.name,
          value: d.value,
          object: d.owner,
          member: d.member,
          raw: d.raw,
          line: d.line,
          cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
        };
        if (d.note !== undefined) e.note = d.note;
        return e;
      }),
    ],
    js: Object.fromEntries([
      ...navigationDefaults.map((d): [string, number | string] => [
        camel(d.name.replace(/^--m3e-comp-/, '').split('-')),
        d.dp,
      ]),
      ...centeredPadding.map((p): [string, number | string] => [
        camel(p.name.replace(/^--m3e-comp-/, '').split('-')),
        `${num(p.percent)}%`,
      ]),
      ...wideRailDefaults.map((d): [string, number | string] => [
        camel(d.name.replace(/^--m3e-comp-/, '').split('-')),
        d.value,
      ]),
    ]),
  });

  // FloatingActionButtonDefaults literals and expressive extended FAB values (see fab-defaults.ts).
  const fabDefaults = extractFabDefaults(material3Sources);
  components.set('fab-defaults', {
    object: 'FloatingActionButtonDefaults',
    tokens: fabDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      fabDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // FloatingActionButtonMenu / ToggleFloatingActionButton values (see fab-menu-defaults.ts).
  const fabMenuDefaults = extractFabMenuDefaults(material3Sources, files);
  components.set('fab-menu-defaults', {
    object: 'FloatingActionButtonMenuDefaults',
    tokens: fabMenuDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      fabMenuDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // FloatingToolbarDefaults values Compose renders (see floating-toolbar-defaults.ts).
  const floatingToolbarDefaults = extractFloatingToolbarDefaults(material3Sources, files);
  components.set('floating-toolbar-defaults', {
    object: 'FloatingToolbarDefaults',
    tokens: floatingToolbarDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      floatingToolbarDefaults.map((d) => [
        camel(d.name.replace(/^--m3e-comp-/, '').split('-')),
        d.js,
      ]),
    ),
  });

  // BottomAppBarDefaults values Compose renders for the docked toolbar (FlexibleBottomAppBar) and
  // the legacy BottomAppBar, plus the AppBarSamples.kt arrangements (see docked-toolbar-defaults.ts).
  const dockedToolbarDefaults = extractDockedToolbarDefaults(material3Sources, files);
  const dockedDir = (file: string) =>
    file === 'AppBarSamples.kt' ? MATERIAL3_SAMPLES_DIR : MATERIAL3_DIR;
  for (const [name, prefix, object] of [
    ['docked-toolbar-defaults', '--m3e-comp-docked-toolbar-defaults-', 'DockedToolbarDefaults'],
    ['bottom-app-bar-defaults', '--m3e-comp-bottom-app-bar-defaults-', 'BottomAppBarDefaults'],
  ] as const) {
    const values = dockedToolbarDefaults.filter((d) => d.name.startsWith(prefix));
    components.set(name, {
      object,
      tokens: values.map((d) => {
        const e: Emitted = {
          name: d.name,
          value: d.value,
          object: d.owner,
          member: d.member,
          raw: d.raw,
          line: d.line,
          cite: `${dockedDir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
        };
        if (d.note !== undefined) e.note = d.note;
        return e;
      }),
      js: Object.fromEntries(
        values.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
      ),
    });
  }

  // Menu layout literals and open/close targets (Menu.kt, MenuDefaults.kt; see menu-defaults.ts).
  const menuDefaults = extractMenuDefaults(material3Sources);
  components.set('menu-defaults', {
    object: 'MenuDefaults',
    tokens: menuDefaults.map((d) => {
      const dir = d.file === 'AndroidMenu.android.kt' ? MATERIAL3_ANDROID_DIR : MATERIAL3_DIR;
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${dir}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      menuDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.number]),
    ),
  });

  // SearchBarDefaults values, SearchBar.kt measurement literals, state springs and fades, the
  // InputField text paddings and the samples' result row padding (see search-defaults.ts).
  const searchDefaults = extractSearchDefaults(
    material3Sources,
    Object.fromEntries(files.map((f) => [f.name, f.content])),
  );
  const searchDir = (file: string) =>
    file === 'SearchBarSamples.kt'
      ? MATERIAL3_SAMPLES_DIR
      : file === 'TextFieldImpl.kt'
        ? `${MATERIAL3_DIR}/internal`
        : MATERIAL3_DIR;
  components.set('search-defaults', {
    object: 'SearchBarDefaults',
    tokens: searchDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${searchDir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      searchDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // Navigation drawer values Compose renders that are not in NavigationDrawerTokens, plus the
  // m3.material.io headline / divider values Compose lacks (see navigation-drawer-defaults.ts).
  const drawerDefaults = extractNavigationDrawerDefaults(
    material3Sources,
    Object.fromEntries(files.map((f) => [f.name, f.content])),
    easingKt,
  );
  const drawerDir = (file: string) =>
    file === 'DrawerSamples.kt'
      ? MATERIAL3_SAMPLES_DIR
      : file === 'AnimationSpec.kt'
        ? ANIMATION_CORE_DIR
        : MATERIAL3_DIR;
  components.set('navigation-drawer-defaults', {
    object: 'NavigationDrawerDefaults',
    tokens: drawerDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line ?? 0,
        cite:
          d.file === undefined
            ? (d.cite ?? '')
            : `${drawerDir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      drawerDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // Navigation suite scaffold values (material3-adaptive-navigation-suite; no tokens exist): the
  // scaffold colors, the primary action placement and the show / hide spring (see
  // navigation-suite-defaults.ts).
  const suiteDefaults = extractNavigationSuiteDefaults(material3Sources);
  const suitePath = MATERIAL3_ADAPTIVE_SOURCES.find((p) =>
    p.endsWith('/NavigationSuiteScaffold.kt'),
  )!;
  const suiteDir = (file: string) =>
    file === 'VectorizedAnimationSpec.kt'
      ? ANIMATION_CORE_DIR
      : `${MATERIAL3_ADAPTIVE_PATH}/${suitePath.slice(0, suitePath.lastIndexOf('/'))}`;
  components.set('navigation-suite-defaults', {
    object: 'NavigationSuiteScaffoldDefaults',
    tokens: suiteDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${suiteDir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      suiteDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // Canonical layouts (material3-adaptive adaptive-layout; no tokens exist): the directive's
  // partition spacer and default pane sizes, the pane motion spring, and the feed values (see
  // pane-scaffold-defaults.ts).
  const paneDefaults = extractPaneScaffoldDefaults(material3Sources);
  const directivePath = MATERIAL3_ADAPTIVE_SOURCES.find((p) =>
    p.endsWith('/PaneScaffoldDirective.kt'),
  )!;
  const layoutDir = `${MATERIAL3_ADAPTIVE_PATH}/${directivePath.slice(0, directivePath.lastIndexOf('/'))}`;
  components.set('pane-scaffold-defaults', {
    object: 'PaneScaffoldDefaults',
    tokens: paneDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite:
          d.file === null ? (d.cite ?? '') : `${layoutDir}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      paneDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // TabRowDefaults / Tab.kt values Compose renders that are not in *NavigationTabTokens: layout
  // literals, indicator defaults, colors, divider and springs (see tabs-defaults.ts).
  // Component tokens resolve to sys tokens: references to the tab / divider token objects are
  // replaced by their generated values (PARITY.md keeps the reference as the raw expression).
  const componentValues = new Map(
    [...components.values()].flatMap((c) => c.tokens.map((t) => [t.name, t.value] as const)),
  );
  const resolveComponentRef = (value: string) =>
    value.replace(/var\((--m3e-comp-[\w-]+)\)/g, (_, name: string) => {
      const resolved = componentValues.get(name);
      if (resolved === undefined) throw new Error(`tabs-defaults: ${name} is not generated`);
      return resolved;
    });
  const tabsDefaults = extractTabsDefaults(material3Sources, fontMetrics).map((d) => ({
    ...d,
    value: resolveComponentRef(d.value),
    js: typeof d.js === 'string' ? resolveComponentRef(d.js) : d.js,
  }));
  components.set('tabs-defaults', {
    object: 'TabsDefaults',
    tokens: tabsDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite:
          d.cite ??
          `${d.file === 'TabSamples.kt' ? MATERIAL3_SAMPLES_DIR : MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      tabsDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // The selection controls' composable literals (compose-literals.ts): `<Object>Tokens`
  // references resolve to their generated values, as for the tabs; samples cite the samples dir.
  const setLiterals = (name: string, object: string, literals: readonly ComposeLiteral[]) => {
    const resolved = literals.map((d) => ({
      ...d,
      value: resolveComponentRef(d.value),
      js: typeof d.js === 'string' ? resolveComponentRef(d.js) : d.js,
    }));
    components.set(name, {
      object,
      tokens: resolved.map((d) => {
        const e: Emitted = {
          name: d.name,
          value: d.value,
          object: d.owner,
          member: d.member,
          raw: d.raw,
          line: d.line,
          cite:
            d.cite ??
            `${d.file.endsWith('Samples.kt') ? MATERIAL3_SAMPLES_DIR : d.file === 'BasicTooltip.kt' ? `${MATERIAL3_DIR}/internal` : MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
        };
        if (d.note !== undefined) e.note = d.note;
        return e;
      }),
      js: Object.fromEntries(
        resolved.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
      ),
    });
  };

  // Checkbox.kt values Compose renders with ComposeMaterial3Flags.isCheckboxStylingFixEnabled
  // off (the pin's default): box size / padding / corners, stroke, check path points, colors and
  // springs, plus the CheckboxWithTextSample label and the m3.material.io unchecked state layer
  // colors (see checkbox-defaults.ts).
  setLiterals('checkbox-defaults', 'CheckboxDefaults', extractCheckboxDefaults(material3Sources));

  // RadioButton.kt values Compose renders: padding, dot size, stroke, colors, springs and the
  // ripple, plus the RadioGroupSample rows (see radio-button-defaults.ts).
  setLiterals(
    'radio-button-defaults',
    'RadioButtonDefaults',
    extractRadioButtonDefaults(material3Sources),
  );

  // Switch.kt values Compose renders: handle diameters, the FastSpatial / SnapSpec handle motion,
  // colors (disabled ones composited over Surface), icon size and ripple, plus the inline label
  // from the expressive ListItem (see switch-defaults.ts).
  setLiterals('switch-defaults', 'SwitchDefaults', extractSwitchDefaults(material3Sources));

  // Chip.kt values Compose renders for filter, input and suggestion chips: spacing and padding,
  // the flat filter chip's elevations (owner decision M8 #11), tonal colors, the selectable chips'
  // shape and icon motion, plus the ChipGroupReflowSample spacing (see chip-defaults.ts).
  setLiterals('chips-defaults', 'FilterChipDefaults', extractChipsDefaults(material3Sources));

  // Slider.kt values Compose renders: track / thumb geometry, gaps, stop and tick sizes, colors (and
  // the SliderWithTrackIconsSample icon colors), plus the m3.material.io sizes XS–XL, inset icon
  // and value indicator container (owner decisions M8 #16, #18, #19; see slider-defaults.ts).
  checkSliderXSmallAgainstCompose((name) => componentValues.get(name));
  setLiterals('slider-defaults', 'SliderDefaults', extractSliderDefaults(material3Sources));

  // TextField.kt / OutlinedTextField.kt / TextFieldDefaults.kt / TextFieldImpl.kt values Compose
  // renders: layout constants, min sizes, indicator and border thicknesses, the label / placeholder /
  // affix / supporting type, the motion, both default color sets and the selection color (see
  // text-field-defaults.ts).
  setLiterals(
    'text-field-defaults',
    'TextFieldDefaults',
    extractTextFieldDefaults(material3Sources),
  );

  // ListItem.kt / ListItemDefaults.kt values Compose renders: the expressive item's padding,
  // spacing, minimum heights, slot text styles, motion, state shapes, segmented corners and gap,
  // shadows and content colors, plus the legacy ListItem's paddings and shape (see
  // list-defaults.ts).
  setLiterals('list-defaults', 'ListItemDefaults', extractListDefaults(material3Sources));

  // Tooltip.kt / internal/BasicTooltip.kt values Compose renders: spacing, min / max sizes,
  // paddings and baselines, the caret size, the rich tooltip's shadow, the show / hide springs and
  // the non-persistent duration, plus the font's baseline position (see tooltip-defaults.ts).
  setLiterals(
    'tooltip-defaults',
    'TooltipDefaults',
    extractTooltipDefaults(material3Sources, fontMetrics),
  );

  // Badge.kt values Compose renders: the container color, the label padding and BadgedBox's
  // offsets for the dot and the badge with content (see badge-defaults.ts).
  setLiterals('badge-defaults', 'BadgeDefaults', extractBadgeDefaults(material3Sources));

  // AlertDialog.kt values Compose renders (sizes, paddings, the buttons' spacing, no shadow), the
  // ModalBottomSheet scrim fade, Material Web's dialog motion and window margin, and the
  // m3.material.io full-screen dialog (owner decisions M9 #8, #9, #11; see dialog-defaults.ts).
  setLiterals(
    'dialog-defaults',
    'AlertDialogDefaults',
    extractDialogDefaults(material3Sources, materialWebVersion),
  );

  // Snackbar.kt / SnackbarHost.kt / Scaffold.kt values Compose renders: the
  // isSnackbarStylingFixEnabled layout (owner decision M9 #19), the host's 12dp padding, the
  // durations, the fade / scale springs and the FAB spacing above which the host sits (owner
  // decisions M9 #20, #21; see snackbar-defaults.ts).
  setLiterals('snackbar-defaults', 'SnackbarDefaults', extractSnackbarDefaults(material3Sources));

  // SheetDefaults.kt / BottomSheet.kt / ModalBottomSheet.kt values Compose renders: the 640dp
  // max width (owner decision M9 #12), the scaffold's 56dp peek (#13), the release thresholds and
  // dampening zone, the drag handle's shape and padding, the show / hide / settle / scrim springs
  // and the scrim (see bottom-sheet-defaults.ts).
  setLiterals(
    'bottom-sheet-defaults',
    'BottomSheetDefaults',
    extractBottomSheetDefaults(material3Sources),
  );

  // Side sheets (D8: m3.material.io only): the token DB and Specs values, the navigation drawer's
  // springs and scrim mirrored to the end edge (owner decisions M9 #14–#18; see
  // side-sheet-defaults.ts).
  setLiterals(
    'side-sheet-defaults',
    'SideSheetDefaults',
    extractSideSheetDefaults(material3Sources),
  );

  // Carousel (no CarouselTokens.kt): CarouselDefaults, the samples' mask, the programmatic scroll
  // spring and the m3.material.io state layer / full-screen gap (owner decisions M9 #22–#26; see
  // carousel-defaults.ts).
  setLiterals(
    'carousel-defaults',
    'CarouselDefaults',
    extractCarouselDefaults(material3Sources, commit),
  );

  // Pull to refresh (no PullToRefreshTokens.kt): PullToRefreshDefaults, the indicator's private
  // sizes, alpha and cross-fade, and the state's Animatable spring (owner decisions M9 #27, #28;
  // see pull-to-refresh-defaults.ts).
  setLiterals(
    'pull-to-refresh-defaults',
    'PullToRefreshDefaults',
    extractPullToRefreshDefaults(material3Sources, commit),
  );

  // Time picker (M10 §28): TimePicker.kt's private sizes, the default and vibrant colors with
  // isUpdatedTimepickerToggleEnabled, the AM/PM toggle buttons, the dial / wheel motion and the
  // pager springs, ScrollField, and the dialogs' layout (see time-picker-defaults.ts).
  setLiterals(
    'time-picker-defaults',
    'TimePickerDefaults',
    extractTimePickerDefaults(material3Sources, commit),
  );

  // Segmented button (deprecated, D4): SegmentedButtonDefaults colors, padding, spacing and motion,
  // ButtonDefaults' minimum size, the z-index factor and the Surface's ripple (see
  // segmented-button-defaults.ts).
  setLiterals(
    'segmented-button-defaults',
    'SegmentedButtonDefaults',
    extractSegmentedButtonDefaults(material3Sources),
  );

  // SplitButtonDefaults values, optical centering and the samples' icon rotation (see
  // split-button-defaults.ts).
  const splitButtonDefaults = extractSplitButtonDefaults(
    material3Sources,
    Object.fromEntries(files.map((f) => [f.name, f.content])),
  );
  const splitButtonDir = (file: string) =>
    file === 'SplitButtonSamples.kt'
      ? MATERIAL3_SAMPLES_DIR
      : /^(AnimateAsState|AnimationSpec|VectorizedAnimationSpec)\.kt$/.test(file)
        ? ANIMATION_CORE_DIR
        : MATERIAL3_DIR;
  components.set('split-button-defaults', {
    object: 'SplitButtonDefaults',
    tokens: splitButtonDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line,
        cite: `${splitButtonDir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      splitButtonDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  // Progress indicator values Compose renders that are not in *ProgressIndicatorTokens, plus the
  // indeterminate keyframes for CSS (see progress-indicator-defaults.ts).
  const progressIndicator = extractProgressIndicatorDefaults(
    material3Sources,
    Object.fromEntries(files.map((f) => [f.name, f.content])),
  );
  const progressDir = (file: string) =>
    file === 'ProgressIndicatorSamples.kt'
      ? MATERIAL3_SAMPLES_DIR
      : file === 'VectorizedAnimationSpec.kt'
        ? ANIMATION_CORE_DIR
        : file.endsWith('WavyProgressModifiers.kt')
          ? `${MATERIAL3_DIR}/internal`
          : MATERIAL3_DIR;
  components.set('progress-indicator-defaults', {
    object: 'ProgressIndicatorDefaults',
    tokens: progressIndicator.tokens.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line ?? 0,
        cite:
          d.file === undefined
            ? (d.cite ?? '')
            : `${progressDir(d.file)}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      progressIndicator.tokens.map((d) => [
        camel(d.name.replace(/^--m3e-comp-/, '').split('-')),
        d.js,
      ]),
    ),
  });

  // ButtonGroupDefaults values Compose renders + the per-size m3.material.io values it lacks
  // (see button-group-defaults.ts).
  const buttonGroupDefaults = extractButtonGroupDefaults(material3Sources);
  checkSmallAgainstCompose(
    Object.fromEntries(
      ['button-group-small', 'connected-button-group-small'].flatMap((n) =>
        (components.get(n)?.tokens ?? []).map((t) => [t.name, t.value]),
      ),
    ),
    Object.fromEntries(
      sys.filter((t) => t.value.endsWith('px')).map((t) => [t.name, Number.parseFloat(t.value)]),
    ),
  );
  components.set('button-group-defaults', {
    object: 'ButtonGroupDefaults',
    tokens: buttonGroupDefaults.map((d) => {
      const e: Emitted = {
        name: d.name,
        value: d.value,
        object: d.owner,
        member: d.member,
        raw: d.raw,
        line: d.line ?? 0,
        cite:
          d.file === undefined
            ? (d.cite ?? '')
            : `${MATERIAL3_DIR}/${d.file}@${commit} L${String(d.line)}`,
      };
      if (d.note !== undefined) e.note = d.note;
      return e;
    }),
    js: Object.fromEntries(
      buttonGroupDefaults.map((d) => [camel(d.name.replace(/^--m3e-comp-/, '').split('-')), d.js]),
    ),
  });

  for (const [name, c] of [...components].sort(([a], [b]) => a.localeCompare(b))) {
    out.set(
      `components/${name}.css`,
      name === 'elevation-motion'
        ? cssFile(
            'How Compose animates elevation on interaction (ElevationDefaults tweens; lines: PARITY.md).',
            c.tokens,
            [],
            `${MATERIAL3_DIR}/internal/Elevation.kt + ${ANIMATION_CORE_DIR}/Easing.kt`,
          )
        : name === 'loading-indicator-motion'
          ? cssFile(
              'How the indeterminate Compose LoadingIndicator morphs and rotates (literals in LoadingIndicator.kt; lines: PARITY.md).',
              c.tokens,
              [],
              `${MATERIAL3_DIR}/LoadingIndicator.kt`,
            )
          : name === 'top-app-bar-defaults'
            ? cssFile(
                'Compose top app bar values that are not in AppBar*Tokens (lines: PARITY.md).',
                c.tokens,
                [
                  '@media (prefers-reduced-motion: reduce) {',
                  '  :root {',
                  ...TOP_APP_BAR_REDUCED_MOTION.map((l) => `    ${l}`),
                  '  }',
                  '}',
                ],
                `${MATERIAL3_DIR}/AppBar.kt + ${ANIMATION_CORE_DIR}/Easing.kt`,
              )
            : name === 'assist-chip-defaults'
              ? cssFile(
                  'Compose AssistChipDefaults values that are not in AssistChipTokens (lines: PARITY.md).',
                  c.tokens,
                  [],
                  `${MATERIAL3_DIR}/Chip.kt`,
                )
              : name === 'button-defaults'
                ? cssFile(
                    'Compose ButtonDefaults / ToggleButtonDefaults values that are not in Button*Tokens (lines: PARITY.md).',
                    c.tokens,
                    [],
                    `${MATERIAL3_DIR}/{Button,ToggleButton,InteractiveComponentSize}.kt`,
                  )
                : name === 'fab-defaults'
                  ? cssFile(
                      'Compose FloatingActionButtonDefaults / extended FAB values that are not in Fab*Tokens (lines: PARITY.md).',
                      c.tokens,
                      [],
                      `${MATERIAL3_DIR}/{FloatingActionButton,Shapes}.kt`,
                    )
                  : name === 'fab-menu-defaults'
                    ? cssFile(
                        'Compose FloatingActionButtonMenu / ToggleFloatingActionButton values that are not in FabMenuBaselineTokens (lines: PARITY.md).',
                        c.tokens,
                        [],
                        `${MATERIAL3_DIR}/FloatingActionButtonMenu.kt`,
                      )
                    : name === 'navigation-defaults'
                      ? cssFile(
                          'Compose navigation bar / rail values that are not in Navigation*Tokens: layout literals and the animated / modal wide rail springs, colors and shapes (lines: PARITY.md).',
                          c.tokens,
                          [],
                          `${MATERIAL3_DIR}/{NavigationBar,NavigationRail,ShortNavigationBar,WideNavigationRail,WideNavigationRailState,NavigationItem}.kt`,
                        )
                      : name === 'button-group-defaults'
                        ? cssFile(
                            'Compose ButtonGroupDefaults values that are not in ButtonGroup*Tokens, plus the per-size m3.material.io token DB values Compose lacks (lines: PARITY.md).',
                            c.tokens,
                            [],
                            `${MATERIAL3_DIR}/ButtonGroup.kt + m3.material.io token DB md.comp.button-group`,
                          )
                        : name === 'menu-defaults'
                          ? cssFile(
                              'Compose menu values that are not in Menu*Tokens (lines: PARITY.md).',
                              c.tokens,
                              [],
                              `${MATERIAL3_DIR}/{Menu,MenuDefaults}.kt + ${MATERIAL3_ANDROID_DIR}/AndroidMenu.android.kt`,
                            )
                          : name === 'split-button-defaults'
                            ? cssFile(
                                'Compose split button values that are not in SplitButton*Tokens (lines: PARITY.md).',
                                c.tokens,
                                [
                                  '@media (prefers-reduced-motion: reduce) {',
                                  '  :root {',
                                  ...SPLIT_BUTTON_REDUCED_MOTION.map((l) => `    ${l}`),
                                  '  }',
                                  '}',
                                ],
                                `${MATERIAL3_DIR}/{SplitButton,HorizontalCenterOptically}.kt + ${MATERIAL3_SAMPLES_DIR}/SplitButtonSamples.kt + ${ANIMATION_CORE_DIR}/{AnimateAsState,AnimationSpec,VectorizedAnimationSpec}.kt`,
                              )
                            : name === 'navigation-drawer-defaults'
                              ? cssFile(
                                  'Compose navigation drawer values that are not in NavigationDrawerTokens, plus the m3.material.io headline / divider values Compose lacks (lines: PARITY.md).',
                                  c.tokens,
                                  [
                                    '@media (prefers-reduced-motion: reduce) {',
                                    '  :root {',
                                    ...NAVIGATION_DRAWER_REDUCED_MOTION.map((l) => `    ${l}`),
                                    '  }',
                                    '}',
                                  ],
                                  `${MATERIAL3_DIR}/{NavigationDrawer,MaterialTheme}.kt + ${MATERIAL3_SAMPLES_DIR}/DrawerSamples.kt + ${ANIMATION_CORE_DIR}/{AnimationSpec,Easing}.kt + m3.material.io md.comp.navigation-drawer`,
                                )
                              : name === 'search-defaults'
                                ? cssFile(
                                    'Compose search values that are not in SearchBarTokens / SearchViewTokens (lines: PARITY.md).',
                                    c.tokens,
                                    [
                                      '@media (prefers-reduced-motion: reduce) {',
                                      '  :root {',
                                      ...SEARCH_REDUCED_MOTION.map((l) => `    ${l}`),
                                      '  }',
                                      '}',
                                    ],
                                    `${MATERIAL3_DIR}/{SearchBar,ListItem,ListItemDefaults,ComposeMaterial3Flags,InteractiveComponentSize,internal/TextFieldImpl}.kt + ${MATERIAL3_SAMPLES_DIR}/SearchBarSamples.kt`,
                                  )
                                : name === 'chips-defaults'
                                  ? cssFile(
                                      'Compose FilterChip / InputChip / SuggestionChip values that are not in their *ChipTokens, or that pick one of them, and the chip group spacing (lines: PARITY.md).',
                                      c.tokens,
                                      [],
                                      `${MATERIAL3_DIR}/Chip.kt + ${MATERIAL3_SAMPLES_DIR}/ChipSamples.kt`,
                                    )
                                  : name === 'slider-defaults'
                                    ? cssFile(
                                        'Compose Slider values that are not in SliderTokens, or that pick one of them, and the m3.material.io sizes XS–XL, inset icon and value indicator container (lines: PARITY.md).',
                                        c.tokens,
                                        [],
                                        `${MATERIAL3_DIR}/Slider.kt + ${MATERIAL3_SAMPLES_DIR}/SliderSamples.kt + m3.material.io TOKEN_TABLE.0045edb815f2325e`,
                                      )
                                    : name === 'bottom-sheet-defaults'
                                      ? cssFile(
                                          'Compose BottomSheet / ModalBottomSheet values that are not in SheetBottomTokens, or that pick one of them (lines: PARITY.md).',
                                          c.tokens,
                                          [
                                            '@media (prefers-reduced-motion: reduce) {',
                                            '  :root {',
                                            ...BOTTOM_SHEET_REDUCED_MOTION.map((l) => `    ${l}`),
                                            '  }',
                                            '}',
                                          ],
                                          `${MATERIAL3_DIR}/{SheetDefaults,BottomSheet,ModalBottomSheet,BottomSheetScaffold,Scrim,ComposeMaterial3Flags}.kt + ${MATERIAL3_SAMPLES_DIR}/BottomSheetSamples.kt + compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/gestures/{AnchoredDraggable,snapping/SnapFlingBehavior}.kt`,
                                        )
                                      : name === 'segmented-button-defaults'
                                        ? cssFile(
                                            'Compose SegmentedButton values that are not in OutlinedSegmentedButtonTokens, or that pick one of them (deprecated, D4; lines: PARITY.md).',
                                            c.tokens,
                                            [],
                                            `${MATERIAL3_DIR}/{SegmentedButton,Button,Surface}.kt + ${MATERIAL3_SAMPLES_DIR}/SegmentedButtonSamples.kt`,
                                          )
                                        : name === 'time-picker-defaults'
                                          ? cssFile(
                                              'Time picker values that are not in TimePickerTokens / TimeInputTokens, or that pick one of them (isUpdatedTimepickerToggleEnabled on, owner decisions M10 T1–T9; lines: PARITY.md).',
                                              c.tokens,
                                              [
                                                '@media (prefers-reduced-motion: reduce) {',
                                                '  :root {',
                                                ...TIME_PICKER_REDUCED_MOTION.map(
                                                  (l) => `    ${l}`,
                                                ),
                                                '  }',
                                                '}',
                                              ],
                                              `${MATERIAL3_DIR}/{TimePicker,TimePickerDialog,ScrollField,ComposeMaterial3Flags}.kt + compose/foundation/foundation/src/commonMain/kotlin/androidx/compose/foundation/pager/{Pager,PagerState}.kt + ${ANIMATION_CORE_DIR}/{AnimationSpec,VectorizedAnimationSpec}.kt`,
                                            )
                                          : name === 'pull-to-refresh-defaults'
                                            ? cssFile(
                                                'Pull-to-refresh values (no PullToRefreshTokens.kt, no m3.material.io page): PullToRefreshDefaults, the indicator’s private sizes and alpha, its springs (owner decisions M9 #27, #28; lines: PARITY.md).',
                                                c.tokens,
                                                [
                                                  '@media (prefers-reduced-motion: reduce) {',
                                                  '  :root {',
                                                  ...PULL_TO_REFRESH_REDUCED_MOTION.map(
                                                    (l) => `    ${l}`,
                                                  ),
                                                  '  }',
                                                  '}',
                                                ],
                                                `${MATERIAL3_DIR}/{pulltorefresh/PullToRefresh,LoadingIndicator}.kt + ${MATERIAL3_SAMPLES_DIR}/PullToRefreshSamples.kt + ${ANIMATION_CORE_DIR}/{Animatable,AnimationSpec,VectorizedAnimationSpec}.kt`,
                                              )
                                            : name === 'carousel-defaults'
                                              ? cssFile(
                                                  'Carousel values (no CarouselTokens.kt): CarouselDefaults, the samples’ item mask, CarouselState’s scroll spring and the m3.material.io state layer and full-screen layout (owner decisions M9 #22–#26; lines: PARITY.md).',
                                                  c.tokens,
                                                  [
                                                    '@media (prefers-reduced-motion: reduce) {',
                                                    '  :root {',
                                                    ...CAROUSEL_REDUCED_MOTION.map(
                                                      (l) => `    ${l}`,
                                                    ),
                                                    '  }',
                                                    '}',
                                                  ],
                                                  `${MATERIAL3_DIR}/carousel/{Carousel,CarouselState}.kt + ${MATERIAL3_SAMPLES_DIR}/CarouselSamples.kt + ${ANIMATION_CORE_DIR}/{AnimationSpec,VectorizedAnimationSpec}.kt + m3.material.io TOKEN_TABLE.43a124d2adc8a2ef + Carousel › Specs`,
                                                )
                                              : name === 'side-sheet-defaults'
                                                ? cssFile(
                                                    'Side sheet values from m3.material.io (D8: no Compose side sheet), with the navigation drawer’s springs and scrim (owner decision M9 #16; lines: PARITY.md).',
                                                    c.tokens,
                                                    [
                                                      '@media (prefers-reduced-motion: reduce) {',
                                                      '  :root {',
                                                      ...SIDE_SHEET_REDUCED_MOTION.map(
                                                        (l) => `    ${l}`,
                                                      ),
                                                      '  }',
                                                      '}',
                                                    ],
                                                    `${MATERIAL3_DIR}/{NavigationDrawer,AlertDialog}.kt + m3.material.io TOKEN_TABLE.06c2c925cf96adca + Side sheets › Specs`,
                                                  )
                                                : name === 'snackbar-defaults'
                                                  ? cssFile(
                                                      'Compose Snackbar / SnackbarHost values that are not in SnackbarTokens, or that pick one of them (isSnackbarStylingFixEnabled on, owner decision M9 #19), and the Scaffold placement (lines: PARITY.md).',
                                                      c.tokens,
                                                      [],
                                                      `${MATERIAL3_DIR}/{Snackbar,SnackbarHost,Scaffold,ComposeMaterial3Flags}.kt + ${MATERIAL3_SAMPLES_DIR}/ScaffoldSamples.kt`,
                                                    )
                                                  : name === 'dialog-defaults'
                                                    ? cssFile(
                                                        'Compose AlertDialog / BasicAlertDialog values that are not in DialogTokens, or that pick one of them, the modal scrim fade, Material Web’s dialog motion and the m3.material.io full-screen dialog (lines: PARITY.md).',
                                                        c.tokens,
                                                        [],
                                                        `${MATERIAL3_DIR}/{AlertDialog,Button,ModalBottomSheet}.kt + ${MATERIAL3_SAMPLES_DIR}/AlertDialogSamples.kt + @material/web@${materialWebVersion} dialog/internal/{animations.js,_dialog.scss} + m3.material.io TOKEN_TABLE.0b1e39a67d5bafdc`,
                                                      )
                                                    : name === 'badge-defaults'
                                                      ? cssFile(
                                                          'Compose Badge / BadgedBox values that are not in BadgeTokens, or that pick one of them (lines: PARITY.md).',
                                                          c.tokens,
                                                          [],
                                                          `${MATERIAL3_DIR}/{Badge,ColorScheme}.kt + ${MATERIAL3_SAMPLES_DIR}/BadgeSamples.kt`,
                                                        )
                                                      : name === 'tooltip-defaults'
                                                        ? cssFile(
                                                            'Compose PlainTooltip / RichTooltip / TooltipBox values that are not in Plain/RichTooltipTokens, or that pick one of them (lines: PARITY.md).',
                                                            c.tokens,
                                                            [],
                                                            `${MATERIAL3_DIR}/{Tooltip,internal/BasicTooltip}.kt + ${MATERIAL3_SAMPLES_DIR}/TooltipSamples.kt`,
                                                          )
                                                        : name === 'list-defaults'
                                                          ? cssFile(
                                                              'Compose ListItem / SegmentedListItem values that are not in ListTokens, or that pick one of them, and the legacy ListItem (lines: PARITY.md).',
                                                              c.tokens,
                                                              [],
                                                              `${MATERIAL3_DIR}/{ListItem,ListItemDefaults,Checkbox,RadioButton,Switch}.kt + ${MATERIAL3_SAMPLES_DIR}/ListSamples.kt`,
                                                            )
                                                          : name === 'text-field-defaults'
                                                            ? cssFile(
                                                                'Compose TextField / OutlinedTextField values that are not in Filled/OutlinedTextFieldTokens, or that pick one of them (lines: PARITY.md).',
                                                                c.tokens,
                                                                [],
                                                                `${MATERIAL3_DIR}/{TextField,OutlinedTextField,TextFieldDefaults,internal/TextFieldImpl,MaterialTheme,InteractiveComponentSize,internal/Strings}.kt + ${MATERIAL3_SAMPLES_DIR}/TextFieldSamples.kt`,
                                                              )
                                                            : name === 'switch-defaults'
                                                              ? cssFile(
                                                                  'Compose Switch values that are not in SwitchTokens, or that pick one of them, and the inline label from the expressive ListItem (lines: PARITY.md).',
                                                                  c.tokens,
                                                                  [],
                                                                  `${MATERIAL3_DIR}/{Switch,ListItem}.kt + ${MATERIAL3_SAMPLES_DIR}/SwitchSamples.kt`,
                                                                )
                                                              : name === 'radio-button-defaults'
                                                                ? cssFile(
                                                                    'Compose RadioButton values that are not in RadioButtonTokens, or that pick one of them (lines: PARITY.md).',
                                                                    c.tokens,
                                                                    [],
                                                                    `${MATERIAL3_DIR}/RadioButton.kt + ${MATERIAL3_SAMPLES_DIR}/RadioButtonSamples.kt`,
                                                                  )
                                                                : name === 'checkbox-defaults'
                                                                  ? cssFile(
                                                                      'Compose Checkbox / TriStateCheckbox values that are not in CheckboxTokens, or that pick one of them (isCheckboxStylingFixEnabled off; lines: PARITY.md), and the m3.material.io unchecked state layer colors.',
                                                                      c.tokens,
                                                                      [],
                                                                      `${MATERIAL3_DIR}/{Checkbox,ComposeMaterial3Flags}.kt + ${MATERIAL3_SAMPLES_DIR}/CheckboxSamples.kt + m3.material.io TOKEN_TABLE.31f16b44fe03b0c0`,
                                                                    )
                                                                  : name === 'tabs-defaults'
                                                                    ? cssFile(
                                                                        'Compose tab row / tab values that are not in Primary/SecondaryNavigationTabTokens (lines: PARITY.md).',
                                                                        c.tokens,
                                                                        [],
                                                                        `${MATERIAL3_DIR}/{TabRow,Tab}.kt + ${MATERIAL3_SAMPLES_DIR}/TabSamples.kt`,
                                                                      )
                                                                    : name ===
                                                                        'progress-indicator-defaults'
                                                                      ? cssFile(
                                                                          'Compose progress indicator values that are not in *ProgressIndicatorTokens, and the indeterminate keyframes of the flat indicators (lines: PARITY.md).',
                                                                          c.tokens,
                                                                          [
                                                                            '@media (prefers-reduced-motion: reduce) {',
                                                                            '  :root {',
                                                                            ...PROGRESS_INDICATOR_REDUCED_MOTION.map(
                                                                              (l) => `    ${l}`,
                                                                            ),
                                                                            '  }',
                                                                            '}',
                                                                            ...progressIndicatorKeyframes(
                                                                              progressIndicator.timing,
                                                                            ),
                                                                          ],
                                                                          `${MATERIAL3_DIR}/{ProgressIndicator,WavyProgressIndicator,internal/LinearWavyProgressModifiers,internal/CircularWavyProgressModifiers}.kt + ${MATERIAL3_SAMPLES_DIR}/ProgressIndicatorSamples.kt + m3.material.io token DB md.comp.progress-indicator`,
                                                                        )
                                                                      : cssFile(
                                                                          `Component tokens: ${c.object}.`,
                                                                          c.tokens,
                                                                        ),
    );
  }
  out.set(
    'components/floating-toolbar-defaults.css',
    cssFile(
      'Compose FloatingToolbarDefaults values that are not in FloatingToolbarTokens (lines: PARITY.md).',
      components.get('floating-toolbar-defaults')!.tokens,
      [
        '@media (prefers-reduced-motion: reduce) {',
        '  :root {',
        ...FLOATING_TOOLBAR_REDUCED_MOTION.map((l) => `    ${l}`),
        '  }',
        '}',
      ],
      `${MATERIAL3_DIR}/{FloatingToolbar,FloatingActionButton,ColorScheme}.kt`,
    ),
  );

  out.set(
    'components/navigation-suite-defaults.css',
    cssFile(
      'Compose navigation suite scaffold values (NavigationSuiteScaffoldDefaults and the scaffold layout; no tokens exist; lines: PARITY.md).',
      components.get('navigation-suite-defaults')!.tokens,
      [
        '@media (prefers-reduced-motion: reduce) {',
        '  :root {',
        ...NAVIGATION_SUITE_REDUCED_MOTION.map((l) => `    ${l}`),
        '  }',
        '}',
      ],
      `${MATERIAL3_ADAPTIVE_PATH}/${suitePath} + ${ANIMATION_CORE_DIR}/VectorizedAnimationSpec.kt`,
    ),
  );
  out.set(
    'components/pane-scaffold-defaults.css',
    cssFile(
      'Compose three-pane scaffold values (PaneScaffoldDirective, PaneMotionDefaults; no tokens exist) and the m3.material.io feed values (lines and citations: PARITY.md).',
      components.get('pane-scaffold-defaults')!.tokens,
      [
        '@media (prefers-reduced-motion: reduce) {',
        '  :root {',
        ...PANE_SCAFFOLD_REDUCED_MOTION.map((l) => `    ${l}`),
        '  }',
        '}',
      ],
      `${layoutDir}/{PaneScaffoldDirective,PaneMotion,PaneExpansionState,ThreePaneScaffold}.kt + m3.material.io`,
    ),
  );
  out.set(
    'components/docked-toolbar-defaults.css',
    cssFile(
      'Compose FlexibleBottomAppBar (docked toolbar) values that are not in DockedToolbarTokens (lines: PARITY.md).',
      components.get('docked-toolbar-defaults')!.tokens,
      [],
      `${MATERIAL3_DIR}/AppBar.kt + ${MATERIAL3_SAMPLES_DIR}/AppBarSamples.kt`,
    ),
  );
  out.set(
    'components/bottom-app-bar-defaults.css',
    cssFile(
      'Compose BottomAppBar (@deprecated, D4) values that are not in BottomAppBarTokens (lines: PARITY.md).',
      components.get('bottom-app-bar-defaults')!.tokens,
      [],
      `${MATERIAL3_DIR}/{AppBar,FloatingActionButton,ColorScheme}.kt`,
    ),
  );

  out.set(
    'sys.ts',
    [
      ...tsHeader(
        'System tokens. Lengths are dp (= CSS px), type sizes sp (= CSS px at 100% zoom).',
      ),
      `export const typeface = ${literal(typeface)} as const;`,
      '',
      `export const typescale = ${literal(typescale)} as const;`,
      '',
      `export const shape = ${literal(shape)} as const;`,
      '',
      `export const elevation = ${literal(elevation)} as const;`,
      `export const elevationShadow = ${literal(elevationShadow)} as const;`,
      `export const iconAxisDefaults = ${literal(icon)} as const;`,
      '',
      `export const state = ${literal({ ...state, focusIndicator })} as const;`,
      '',
      `export const space = ${literal(space)} as const;`,
      '',
      '/** Window size class lower bounds in dp (= CSS px): min-width / min-height of each class. */',
      `export const windowBreakpoints = ${literal(windowBreakpoints)} as const;`,
      '',
      `export const motion = ${literal({ defaultScheme: DEFAULT_MOTION_SCHEME, springs, css: motionCss, durations, easings })} as const;`,
      '',
    ].join('\n'),
  );
  out.set(
    'components.ts',
    [
      ...tsHeader('Component tokens. Lengths are dp (= CSS px); references are CSS var() strings.'),
      ...[...components]
        .sort(([a], [b]) => a.localeCompare(b))
        .flatMap(([, c]) => [
          `/** ${c.object} */`,
          `export const ${camelName(c.object)} = ${literal(c.js)} as const;`,
          '',
        ]),
    ].join('\n'),
  );

  // Parity table.
  const rows = (tokens: readonly Emitted[]) =>
    tokens.map((t) => {
      const where = t.cite ?? `${parsed.get(t.object)!.file}:${String(t.line)}`;
      return `| \`${t.object}.${t.member}\` | \`${t.raw.replace(/\|/g, '\\|')}\` | ${where} | \`${t.name}\` | \`${t.value}\` | ${t.note ?? ''} |`;
    });
  const header = [
    '| Source token | Source value | Line | CSS variable | Emitted | Note |',
    '|---|---|---|---|---|---|',
  ];
  const parity = [
    '# Token parity',
    '',
    ...banner('Every androidx token and the variable it becomes.').map((l) => `> ${l}  `),
    '',
    `Emitted: ${String(sys.length)} system and ${String([...components.values()].reduce((n, c) => n + c.tokens.length, 0))} component variables from ${String(components.size)} component token objects.`,
    '',
    '## Not emitted here',
    '',
    '| Object | Reason |',
    '|---|---|',
    ...Object.entries(NOT_EMITTED).map(([o, why]) => `| \`${o}\` | ${why} |`),
    '',
    '## System',
    '',
    ...header,
    ...rows(sys),
    '',
    '## Baseline color',
    '',
    '| Mode | Role | Resolved from | Line | CSS variable | Emitted | Note |',
    '|---|---|---|---|---|---|---|',
    ...colorRows,
    '',
    ...[...components]
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([name, c]) => {
        const notes = parsed.get(c.object)?.notes;
        return [
          `## ${name}`,
          '',
          ...(notes ? [`> Upstream note: ${notes.join(' ')}`, ''] : []),
          ...header,
          ...rows(c.tokens),
          '',
        ];
      }),
  ].join('\n');
  out.set('PARITY.md', parity);
  return out;
}
