// Values Compose's date pickers render (DatePicker.kt, DateRangePicker.kt, DateInput.kt,
// DateRangeInput.kt, DatePickerDialog.android.kt) that are not in DatePickerModalTokens, or that
// pick one of them (COMPONENT_SPEC §27), and the docked date picker's values from m3.material.io
// (owner decision M10 D1; Compose has no docked picker at the pin):
// - the private sizes: the 48dp cells (RecommendedSizeForAccessibility), the 56dp navigation row,
//   the 12dp side padding, the header paddings (DatePicker / DateRangePicker), the year grid's row
//   gap, six calendar rows and three year columns, the input field's paddings, the range input's
//   gap, the dialog's button row;
// - the colors DatePickerDefaults hard-codes or borrows: the navigation row (on-surface-variant),
//   the current year (the today date color), the divider;
// - the motion: the picker / input switch (DefaultSpatial slide and size, DefaultEffects fade in,
//   FastEffects fade out, a 48dp parallax), the year grid (DefaultEffects, faded in from 0.6), the
//   days' and years' colors (DefaultEffects), the range picker's switch (FastEffects crossfade),
//   the month arrows' spring() (LazyListState.animateScrollToItem; animation-core), the swipe's
//   snap (DefaultEffects), the input focus delay (MotionTokens.DurationMedium2);
// - the dialog: Compose's TonalElevation Level0 with no shadow (owner decision M10 D13).
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// date-picker.css and the m3e-elements date picker layouts assume changes upstream.
import { springToLinear } from '@kyralabs/m3e-motion';
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';
import {
  ANIMATION_CORE_PATH,
  FOUNDATION_PATH,
  MATERIAL3_ANDROID_PATH,
  MATERIAL3_PATH,
} from './vendor.js';

export type DatePickerDefault = ComposeLiteral;

const KT = 'DatePicker.kt';
const RANGE = 'DateRangePicker.kt';
const INPUT = 'DateInput.kt';
const RANGE_INPUT = 'DateRangeInput.kt';
const DIALOG = 'DatePickerDialog.kt';
const DIALOG_ANDROID = 'DatePickerDialog.android.kt';
const BUTTON = 'Button.kt';
const LAZY = 'LazyLayoutScrollScope.kt';
const LIST_STATE = 'LazyListState.kt';
const SUSPEND = 'SuspendAnimation.kt';
const SPEC = 'AnimationSpec.kt';
const VECTORIZED = 'VectorizedAnimationSpec.kt';

export const DATE_PICKER_DEFAULTS_SOURCES = [
  KT,
  RANGE,
  INPUT,
  RANGE_INPUT,
  DIALOG,
  DIALOG_ANDROID,
  BUTTON,
];

const P = '--m3e-comp-date-picker';

/** What moves (the mode switch, the year grid, the month pages) jumps; fades stay. */
export const DATE_PICKER_REDUCED_MOTION = [
  `${P}-mode-spatial-duration: 0ms;`,
  `${P}-year-grid-duration: 0ms;`,
  `${P}-month-page-duration: 0ms;`,
  `${P}-month-snap-duration: 0ms;`,
];

/** `<private|internal> val <member>\n    get() = <n>.dp`. */
const getter = (member: string) =>
  new RegExp(`(?:private|internal) val ${member}\\n\\s*get\\(\\) = (\\d+)\\.dp`, 'd');

const dp = (name: string, member: string, note: string, file = KT): LiteralRule => ({
  kind: 'dp',
  name: `${P}-${name}`,
  owner: file,
  member,
  file,
  pattern: getter(member),
  note,
});

/** A PaddingValues side: `<member> = PaddingValues(... <side> = <n>.dp ...)`. */
const padding = (
  name: string,
  member: string,
  side: 'start' | 'end' | 'top' | 'bottom',
  note: string,
  file = KT,
): LiteralRule => ({
  kind: 'dp',
  name: `${P}-${name}`,
  owner: file,
  member: `${member}.${side}`,
  file,
  pattern: new RegExp(`val ${member} =\\s*PaddingValues\\([^)]*\\b${side} = (\\d+)\\.dp`, 'd'),
  note,
});

const motion = (
  name: string,
  member: string,
  pattern: RegExp,
  note: string,
  file = KT,
): LiteralRule => ({
  kind: 'motion',
  name: `${P}-${name}`,
  owner: file,
  member,
  file,
  pattern,
  note,
});

const RULES: readonly LiteralRule[] = [
  dp(
    'cell-size',
    'RecommendedSizeForAccessibility',
    'day / weekday cells and month rows (48dp, the touch size)',
  ),
  dp(
    'month-year-height',
    'MonthYearHeight',
    'the navigation row (year menu button, previous / next)',
  ),
  dp(
    'horizontal-padding',
    'DatePickerHorizontalPadding',
    'the navigation row and the calendar, each side',
  ),
  padding(
    'mode-toggle-padding-end',
    'DatePickerModeTogglePadding',
    'end',
    'the header mode toggle, end',
  ),
  padding(
    'mode-toggle-padding-bottom',
    'DatePickerModeTogglePadding',
    'bottom',
    'the header mode toggle, bottom',
  ),
  padding(
    'title-padding-start',
    'DatePickerTitlePadding',
    'start',
    'DatePickerDefaults.DatePickerTitle',
  ),
  padding(
    'title-padding-end',
    'DatePickerTitlePadding',
    'end',
    'DatePickerDefaults.DatePickerTitle',
  ),
  padding(
    'title-padding-top',
    'DatePickerTitlePadding',
    'top',
    'DatePickerDefaults.DatePickerTitle',
  ),
  padding(
    'headline-padding-start',
    'DatePickerHeadlinePadding',
    'start',
    'DatePickerDefaults.DatePickerHeadline',
  ),
  padding(
    'headline-padding-end',
    'DatePickerHeadlinePadding',
    'end',
    'DatePickerDefaults.DatePickerHeadline',
  ),
  padding(
    'headline-padding-bottom',
    'DatePickerHeadlinePadding',
    'bottom',
    'DatePickerDefaults.DatePickerHeadline',
  ),
  {
    kind: 'dp',
    name: `${P}-year-button-padding-inline`,
    owner: 'ButtonDefaults',
    member: 'TextButtonHorizontalPadding',
    file: BUTTON,
    pattern: /private val TextButtonHorizontalPadding = (\d+)\.dp/d,
    note: 'the year menu button: a TextButton (TextButtonContentPadding)',
  },
  {
    kind: 'dp',
    name: `${P}-year-button-padding-block`,
    owner: 'ButtonDefaults',
    member: 'ButtonVerticalPadding',
    file: BUTTON,
    pattern: /private val ButtonVerticalPadding = (\d+)\.dp/d,
    note: 'the year menu button: a TextButton (TextButtonContentPadding)',
  },
  {
    kind: 'token',
    name: `${P}-year-button-height`,
    owner: 'ButtonDefaults',
    member: 'MinHeight',
    file: BUTTON,
    pattern:
      /public val MinHeight: Dp\n\s*get\(\) =\n\s*if \(shouldUsePrecisionPointerComponentSizing\.value\) \{\n\s*\d+\.dp\n\s*\} else \{\n\s*(ButtonSmallTokens\.ContainerHeight)/d,
    note: 'the year menu button’s min height (touch sizing)',
  },
  {
    kind: 'token',
    name: `${P}-year-button-icon-gap`,
    owner: 'ButtonDefaults',
    member: 'IconSpacing',
    file: BUTTON,
    pattern: /public val IconSpacing: Dp = (ButtonSmallTokens\.IconLabelSpace)/d,
    note: 'between the month and year and the arrow',
  },
  dp(
    'years-vertical-padding',
    'YearsVerticalPadding',
    'the year grid’s row gap (Arrangement.spacedBy)',
  ),
  {
    kind: 'fraction',
    name: `${P}-calendar-rows`,
    owner: KT,
    member: 'MaxCalendarRows',
    file: KT,
    pattern: /private const val MaxCalendarRows = (\d+)/d,
    note: 'a month always takes six rows (Month requiredHeight); the year grid is one row more, less the divider',
  },
  {
    kind: 'fraction',
    name: `${P}-years-in-row`,
    owner: KT,
    member: 'YearsInRow',
    file: KT,
    pattern: /private const val YearsInRow: Int = (\d+)/d,
    note: 'the year grid’s columns (GridCells.Fixed)',
  },
  {
    kind: 'dp',
    name: `${P}-mode-parallax`,
    owner: KT,
    member: 'SwitchableDateEntryContent.parallaxTarget',
    file: KT,
    pattern: /val parallaxTarget = with\(LocalDensity\.current\) \{ -(\d+)\.dp\.roundToPx\(\) \}/d,
    note: 'how far the outgoing picker (or the incoming one) slides up while the input slides in',
  },
  {
    kind: 'token',
    name: `${P}-current-year-color`,
    owner: 'DatePickerDefaults',
    member: 'defaultDatePickerColors.currentYearContentColor',
    file: KT,
    pattern:
      /currentYearContentColor =\n\s*fromToken\(DatePickerModalTokens\.(DateTodayLabelTextColor)\),/d,
    tokens: 'DatePickerModalTokens',
    note: 'the current year in the year grid (the today date color; no year token)',
  },
  {
    kind: 'token',
    name: `${P}-divider-color`,
    owner: 'DatePickerDefaults',
    member: 'defaultDatePickerColors.dividerColor',
    file: KT,
    pattern: /dividerColor = fromToken\((DividerTokens\.Color)\),/d,
    note: 'under the header and the year grid',
  },
  motion(
    'mode-spatial',
    'SwitchableDateEntryContent.spatialInOutAnimationSpec',
    /val spatialInOutAnimationSpec: FiniteAnimationSpec<IntOffset> =\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    'the picker / input switch: slides and the size change (SizeTransform)',
  ),
  motion(
    'mode-fade-in',
    'SwitchableDateEntryContent.effectsInAnimationSpec',
    /val effectsInAnimationSpec: FiniteAnimationSpec<Float> =\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    'the incoming mode fades in',
  ),
  motion(
    'mode-fade-out',
    'SwitchableDateEntryContent.effectsOutAnimationSpec',
    /val effectsOutAnimationSpec: FiniteAnimationSpec<Float> =\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    'the outgoing mode fades out',
  ),
  motion(
    'year-grid',
    'DatePickerContent.shrinkExpandAnimationSpec',
    /val shrinkExpandAnimationSpec: FiniteAnimationSpec<IntSize> =\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    'the year grid expands / shrinks vertically and fades in',
  ),
  motion(
    'year-grid-fade-out',
    'DatePickerContent.fadeOutAnimationSpec',
    /val fadeOutAnimationSpec: FiniteAnimationSpec<Float> =\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)\n\s*val shrinkExpandAnimationSpec/d,
    'the year grid fades out',
  ),
  {
    kind: 'fraction',
    name: `${P}-year-grid-initial-alpha`,
    owner: KT,
    member: 'DatePickerContent fadeIn(initialAlpha)',
    file: KT,
    pattern: /fadeIn\(animationSpec = fadeInAnimationSpec, initialAlpha = ([\d.]+)f\)/d,
    note: 'the year grid fades in from 0.6',
  },
  motion(
    'day-color',
    'DatePickerColors.dayContentColor',
    /animateColorAsState\(\n\s*target,\n\s*\/\/ TODO Load the motionScheme tokens from the component tokens file\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    'days’ and years’ label and container colors (the start date’s container; in-range days snap)',
  ),
  motion(
    'month-snap',
    'DatePickerDefaults.rememberSnapFlingBehavior',
    /val animationSpec: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    'a swiped month settles on a page (snapFlingBehavior snapAnimationSpec, one month per fling)',
  ),
  motion(
    'range-mode',
    'DateRangePicker Crossfade',
    /animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    'the range picker’s picker / input switch (a crossfade)',
    RANGE,
  ),
  padding(
    'range-title-padding-start',
    'DateRangePickerTitlePadding',
    'start',
    'DateRangePickerDefaults.DateRangePickerTitle',
    RANGE,
  ),
  padding(
    'range-title-padding-end',
    'DateRangePickerTitlePadding',
    'end',
    'DateRangePickerDefaults.DateRangePickerTitle',
    RANGE,
  ),
  padding(
    'range-headline-padding-start',
    'DateRangePickerHeadlinePadding',
    'start',
    'DateRangePickerDefaults.DateRangePickerHeadline',
    RANGE,
  ),
  padding(
    'range-headline-padding-end',
    'DateRangePickerHeadlinePadding',
    'end',
    'DateRangePickerDefaults.DateRangePickerHeadline',
    RANGE,
  ),
  padding(
    'range-headline-padding-bottom',
    'DateRangePickerHeadlinePadding',
    'bottom',
    'DateRangePickerDefaults.DateRangePickerHeadline',
    RANGE,
  ),
  dp(
    'range-header-height-offset',
    'HeaderHeightOffset',
    'the range header’s min height is RangeSelectionHeaderContainerHeight less this (no Save / close row)',
    RANGE,
  ),
  padding(
    'month-subhead-padding-start',
    'CalendarMonthSubheadPadding',
    'start',
    'the range picker’s month subheads',
    RANGE,
  ),
  padding(
    'month-subhead-padding-top',
    'CalendarMonthSubheadPadding',
    'top',
    'the range picker’s month subheads',
    RANGE,
  ),
  padding(
    'month-subhead-padding-bottom',
    'CalendarMonthSubheadPadding',
    'bottom',
    'the range picker’s month subheads',
    RANGE,
  ),
  {
    kind: 'dp',
    name: `${P}-range-headline-gap`,
    owner: RANGE,
    member: 'DateRangePickerHeadline Row spacedBy',
    file: RANGE,
    pattern: /horizontalArrangement = Arrangement\.spacedBy\((\d+)\.dp\),/d,
    note: 'between the start date, the “-” and the end date',
  },
  padding('input-padding-start', 'InputTextFieldPadding', 'start', 'the date input field', INPUT),
  padding('input-padding-end', 'InputTextFieldPadding', 'end', 'the date input field', INPUT),
  padding('input-padding-top', 'InputTextFieldPadding', 'top', 'the date input field', INPUT),
  dp(
    'input-padding-bottom',
    'InputTextNonErroneousBottomPadding',
    'under the field without an error (with one, less the supporting text’s padding: the height stays)',
    INPUT,
  ),
  dp('range-input-gap', 'TextFieldSpacing', 'between the start and end date fields', RANGE_INPUT),
  padding(
    'dialog-actions-padding-bottom',
    'DialogButtonsPadding',
    'bottom',
    'the dialog’s button row',
    DIALOG_ANDROID,
  ),
  padding(
    'dialog-actions-padding-end',
    'DialogButtonsPadding',
    'end',
    'the dialog’s button row',
    DIALOG_ANDROID,
  ),
  dp(
    'dialog-actions-gap',
    'DialogButtonsMainAxisSpacing',
    'between the buttons (AlertDialogFlowRow)',
    DIALOG_ANDROID,
  ),
];

/** [file, what the CSS / layouts assume, pattern]. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'days are 40dp in a 48dp cell (requiredSize)',
    /Modifier\.requiredSize\(\n\s*DatePickerModalTokens\.DateContainerWidth,\n\s*DatePickerModalTokens\.DateContainerHeight,/,
  ],
  [KT, 'cells outside the month are empty Spacers', /\/\/ Empty cell\./],
  [
    KT,
    'the today outline only on an unselected day',
    /if \(today && !selected\) \{\n\s*BorderStroke\(/,
  ],
  [
    KT,
    'years are 72 × 36dp (requiredSize)',
    /Modifier\.requiredSize\(\n\s*width = DatePickerModalTokens\.SelectionYearContainerWidth,/,
  ],
  [
    KT,
    'the year grid is as tall as the weekdays and six rows, less the divider',
    /RecommendedSizeForAccessibility \* \(MaxCalendarRows \+ 1\) -\n\s*DividerDefaults\.Thickness/,
  ],
  [
    KT,
    'the year arrow rotates without animation',
    /Icons\.Filled\.ArrowDropDown,[\s\S]{0,300}?Modifier\.rotate\(if \(expanded\) 180f else 0f\)/,
  ],
  [
    KT,
    'the header is 120dp tall only with a title',
    /if \(title != null\) \{\n\s*Modifier\.defaultMinSize\(minHeight = minHeight\)/,
  ],
  [RANGE, 'the range headline uses a hyphen-minus between the dates', /Text\(text = "-", color = /],
  [
    INPUT,
    'the input focus waits DurationMedium2',
    /delay\(MotionTokens\.DurationMedium2\.toLong\(\)\)/,
  ],
  [
    DIALOG_ANDROID,
    'the dialog surface is 360dp wide, at most 568dp tall',
    /Modifier\.requiredWidth\(DatePickerModalTokens\.ContainerWidth\)\n\s*\.heightIn\(max = DatePickerModalTokens\.ContainerHeight\)/,
  ],
];

/** `find` a capture with its line. */
function find(
  sources: Readonly<Record<string, string>>,
  file: string,
  pattern: RegExp,
): { value: string; line: number; groups: string[] } {
  const text = sources[file]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`date-picker-defaults: ${file} is not vendored`);
  const match = pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined)
    throw new Error(
      `date-picker-defaults: ${file}: ${String(pattern)} not found (changed upstream?)`,
    );
  return { value: match[1]!, line: text.slice(0, at).split('\n').length, groups: [...match] };
}

/**
 * The month arrows' spring: LazyListState.animateScrollToItem → LazyLayoutScrollScope's
 * `anim.animateTo(target, …)`, whose spec defaults to spring() (ζ 1, StiffnessMedium).
 */
function monthPageSpring(
  sources: Readonly<Record<string, string>>,
  commit: string,
): DatePickerDefault[] {
  find(sources, LIST_STATE, /public suspend fun (animateScrollToItem)\(/d);
  const animate = find(
    sources,
    LAZY,
    /(anim)\.animateTo\(target, sequentialAnimation = \(anim\.velocity != 0f\)\)/d,
  );
  const fallback = find(
    sources,
    SUSPEND,
    /AnimationState<T, V>\.animateTo\(\n\s*targetValue: T,\n\s*animationSpec: AnimationSpec<T> = (spring)\(\),/d,
  );
  const defaults = find(
    sources,
    SPEC,
    /public fun <T> spring\(\n\s*dampingRatio: Float = Spring\.(\w+),\n\s*stiffness: Float = Spring\.(\w+),/d,
  );
  const constant = (name: string) =>
    find(sources, VECTORIZED, new RegExp(`public const val ${name}: Float = ([\\d_.]+)f`, 'd'));
  const damping = constant(defaults.value);
  const stiffness = constant(defaults.groups[2]!);
  const num = (v: string) => Number(v.replace(/_/g, ''));
  const spec = { dampingRatio: num(damping.value), stiffness: num(stiffness.value) };
  const linear = springToLinear(spec);
  const lazyCite = `${FOUNDATION_PATH}/commonMain/kotlin/androidx/compose/foundation/lazy/layout/${LAZY}@${commit} L${String(animate.line)} → ${ANIMATION_CORE_PATH}/${SUSPEND} L${String(fallback.line)}`;
  const base = { owner: 'LazyListState', member: 'animateScrollToItem (spring())' };
  return [
    {
      ...base,
      file: LAZY,
      line: animate.line,
      name: `${P}-month-page-duration`,
      value: `${String(linear.durationMillis)}ms`,
      js: linear.durationMillis,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      cite: lazyCite,
      note: 'the previous / next month buttons and keyboard month changes; springToLinear() (m3e-motion) duration estimate, 0ms with prefers-reduced-motion',
    },
    {
      ...base,
      file: VECTORIZED,
      line: damping.line,
      name: `${P}-month-page-damping-ratio`,
      value: String(spec.dampingRatio),
      js: spec.dampingRatio,
      raw: `Spring.${defaults.value} = ${damping.value}f`,
      cite: `${ANIMATION_CORE_PATH}/${VECTORIZED}@${commit} L${String(damping.line)}`,
    },
    {
      ...base,
      file: VECTORIZED,
      line: stiffness.line,
      name: `${P}-month-page-stiffness`,
      value: String(spec.stiffness),
      js: spec.stiffness,
      raw: `Spring.${defaults.groups[2]!} = ${stiffness.value}f`,
      cite: `${ANIMATION_CORE_PATH}/${VECTORIZED}@${commit} L${String(stiffness.line)}`,
    },
  ];
}

/** The navigation row's color: a ColorScheme role DatePickerDefaults hard-codes. */
function navigationColor(
  sources: Readonly<Record<string, string>>,
  commit: string,
): DatePickerDefault {
  const r = find(sources, KT, /navigationContentColor = (onSurfaceVariant),/d);
  return {
    name: `${P}-navigation-color`,
    value: 'var(--m3e-sys-color-on-surface-variant)',
    js: 'var(--m3e-sys-color-on-surface-variant)',
    raw: r.value,
    owner: 'DatePickerDefaults',
    member: 'defaultDatePickerColors.navigationContentColor',
    file: KT,
    line: r.line,
    cite: `${MATERIAL3_PATH}/${KT}@${commit} L${String(r.line)}`,
    note: 'the year menu button and the previous / next arrows (hard-coded: TODO(b/234060211) upstream)',
  };
}

/** The dialog surface's elevation: TonalElevation Level0, so no shadow (owner decision M10 D13). */
function dialogShadow(
  sources: Readonly<Record<string, string>>,
  commit: string,
): DatePickerDefault {
  const r = find(sources, KT, /public val TonalElevation: Dp = ElevationTokens\.(Level0)/d);
  return {
    name: `${P}-dialog-container-shadow`,
    value: 'var(--m3e-sys-elevation-level0-shadow)',
    js: 'var(--m3e-sys-elevation-level0-shadow)',
    raw: `ElevationTokens.${r.value}`,
    owner: 'DatePickerDefaults',
    member: 'TonalElevation',
    file: KT,
    line: r.line,
    cite: `${MATERIAL3_PATH}/${KT}@${commit} L${String(r.line)}`,
    note: 'the dialog’s surface: tonal elevation only, no shadow (not ContainerElevation level 3)',
  };
}

/** The input focus delay (DateInput.kt: delay(MotionTokens.DurationMedium2)). */
function inputFocusDelay(
  sources: Readonly<Record<string, string>>,
  commit: string,
): DatePickerDefault {
  const r = find(sources, INPUT, /delay\(MotionTokens\.(DurationMedium2)\.toLong\(\)\)/d);
  return {
    name: `${P}-input-focus-delay`,
    value: 'var(--m3e-sys-motion-duration-medium2)',
    js: 'var(--m3e-sys-motion-duration-medium2)',
    raw: `MotionTokens.${r.value}`,
    owner: 'DateInputTextField',
    member: 'LaunchedEffect focus delay',
    file: INPUT,
    line: r.line,
    cite: `${MATERIAL3_PATH}/${INPUT}@${commit} L${String(r.line)}`,
    note: 'before the input field takes the focus (a smooth switch inside a dialog)',
  };
}

// --- m3.material.io (owner decisions M10 D1 docked, D17 state layers) -------------------------

/** The token DB the docked picker and the state layer colors come from (read 2026-10-19). */
const DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.01c5310367774eb8.json, Date pickers › Tokens & specs: md.comp.date-picker.docked / md.comp.date-picker.modal)';

const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

function m3ioRows(): DatePickerDefault[] {
  const base = { owner: 'm3.material.io', file: 'm3.material.io', line: 0, cite: DSDB };
  const row = (
    name: string,
    member: string,
    value: string,
    raw: string,
    js: number | string = value,
    note?: string,
  ): DatePickerDefault => ({
    ...base,
    name: `${P}-${name}`,
    member,
    value,
    js,
    raw,
    ...(note === undefined ? {} : { note }),
  });
  const color = (name: string, token: string, role: string, note?: string) =>
    row(
      name,
      token,
      `var(--m3e-sys-color-${role})`,
      `${token} = md.sys.color.${role}`,
      undefined,
      note,
    );
  const size = (name: string, token: string, px: number, note?: string) =>
    row(name, token, `${String(px)}px`, `${token} = ${String(px)}dp`, px, note);
  const opacity = (name: string, token: string, value: number, note?: string) =>
    row(name, token, String(value), `${token} = ${String(value)}`, value, note);
  const type = (name: string, token: string, style: string) =>
    TYPE_FIELDS.map((field) =>
      row(
        `${name}-${field}`,
        token,
        `var(--m3e-sys-typescale-${style}-${field})`,
        `${token} = md.sys.typescale.${style}`,
      ),
    );
  const D = 'md.comp.date-picker.docked';
  const M = 'md.comp.date-picker.modal';
  return [
    // State layers Compose leaves to the ripple (owner decision M10 D17: the token DB's colors).
    color(
      'date-state-layer-color',
      `${M}.date.unselected.hover.state-layer.color`,
      'on-surface-variant',
      'unselected days (hover / focus / pressed); TODO(verify) SOURCES register #88',
    ),
    color('date-today-state-layer-color', `${M}.date.today.hover.state-layer.color`, 'primary'),
    color(
      'date-selected-state-layer-color',
      `${M}.date.selected.hover.state-layer.color`,
      'on-primary',
    ),
    color(
      'date-in-range-state-layer-color',
      `${M}.range-selection.date.in-range.hover.state-layer.color`,
      'on-primary-container',
      'days inside a range (the content is on-secondary-container); TODO(verify) SOURCES register #88',
    ),
    color(
      'year-state-layer-color',
      `${M}.year-selection.year.unselected.hover.state-layer.color`,
      'on-surface-variant',
    ),
    color(
      'year-selected-state-layer-color',
      `${M}.year-selection.year.selected.hover.state-layer.color`,
      'on-primary',
    ),
    // Docked (owner decision M10 D1).
    size('docked-container-width', `${D}.container.width`, 360),
    size(
      'docked-container-height',
      `${D}.container.height`,
      456,
      'TODO(verify) SOURCES register #87: the Specs redline measures 460dp',
    ),
    row(
      'docked-container-shape',
      `${D}.container.shape`,
      'var(--m3e-sys-shape-corner-large)',
      `${D}.container.shape = md.sys.shape.corner.large`,
    ),
    color('docked-container-color', `${D}.container.color`, 'surface-container-high'),
    row(
      'docked-container-shadow',
      `${D}.container.elevation`,
      'var(--m3e-sys-elevation-level3-shadow)',
      `${D}.container.elevation = md.sys.elevation.level3`,
    ),
    size(
      'docked-header-height',
      `${D}.header.height`,
      64,
      'the navigation row with the month and year menus',
    ),
    size(
      'docked-date-container-size',
      `${D}.date.container.width`,
      48,
      'the date cells (40dp state layer inside); TODO(verify) SOURCES register #87',
    ),
    color(
      'docked-outside-month-color',
      `${D}.date.unselected.outside-month.label-text.color`,
      'on-surface',
    ),
    opacity(
      'docked-outside-month-opacity',
      `${D}.date.unselected.outside-month.label-text.opacity`,
      0.38,
    ),
    size('docked-menu-button-height', `${D}.menu-button.container.height`, 40),
    row(
      'docked-menu-button-shape',
      `${D}.menu-button.container.shape`,
      'var(--m3e-sys-shape-corner-full)',
      `${D}.menu-button.container.shape = md.sys.shape.corner.full`,
    ),
    color(
      'docked-menu-button-color',
      `${D}.menu-button.label-text.color`,
      'on-surface-variant',
      'label, icon and state layer',
    ),
    size('docked-menu-button-icon-size', `${D}.menu-button.icon.size`, 18),
    ...type('docked-menu-button-label', `${D}.menu-button.label-text`, 'label-large'),
    size('docked-menu-item-height', `${D}.menu.list-item.container.height`, 48),
    color(
      'docked-menu-item-color',
      `${D}.menu.list-item.label-text.color`,
      'on-surface',
      'label and state layer',
    ),
    color(
      'docked-menu-item-selected-container-color',
      `${D}.menu.list-item.selected.container.color`,
      'surface-variant',
    ),
    color(
      'docked-menu-item-selected-icon-color',
      `${D}.menu.list-item.selected.leading-icon.color`,
      'on-surface',
    ),
    size(
      'docked-menu-item-selected-icon-size',
      `${D}.menu.list-item.selected.leading-icon.size`,
      24,
    ),
    ...type('docked-menu-item-label', `${D}.menu.list-item.label-text`, 'body-large'),
  ];
}

/** `sources`: vendored files by name (Material3 sources + Android actuals, foundation, animation-core). */
export function extractDatePickerDefaults(
  sources: Readonly<Record<string, string>>,
  commit: string,
): DatePickerDefault[] {
  const literals = extractLiterals(
    'date-picker-defaults',
    DATE_PICKER_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
  return [
    ...literals.map((d) => ({
      ...d,
      cite: `${d.file === DIALOG_ANDROID ? MATERIAL3_ANDROID_PATH : MATERIAL3_PATH}/${d.file}@${commit} L${String(d.line)}`,
    })),
    navigationColor(sources, commit),
    dialogShadow(sources, commit),
    inputFocusDelay(sources, commit),
    ...monthPageSpring(sources, commit),
    ...m3ioRows(),
  ];
}
