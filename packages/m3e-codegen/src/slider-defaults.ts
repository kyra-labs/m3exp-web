// Values Compose's Slider renders (Slider.kt) that are not SliderTokens, or that pick one of them,
// plus the sizes and parts Compose has no API for, from m3.material.io:
// - the thumb and track geometry SliderImpl / SliderDefaults.Track read: TrackHeight
//   (InactiveTrackHeight), ThumbWidth × ThumbHeight (HandleWidth × HandleHeight; vertical: swapped),
//   ThumbTrackGapSize (ActiveHandleLeadingSpace, the gap each side of the thumb beyond half its
//   width), TrackInsideCornerSize (2dp, the corners facing the thumb), TrackStopIndicatorSize and
//   TickSize (StopIndicatorSize);
// - defaultSliderColors: thumb, active / inactive track and tick colors (active ticks are the
//   *inactive* track color and inactive ticks the active one); disabled ones translucent
//   (`copy(alpha)`), the disabled thumb composited over Surface; the stop indicator is drawn in
//   trackColor(enabled, active = true);
// - the inset icon colors of SliderWithTrackIconsSample (activeTickColor on the active track,
//   inactiveTickColor on the inactive one);
// - the sizes XS–XL (owner decision M8 #16) and the inset icon size / padding (M8 #18) from the
//   m3.material.io token DB (Compose's SliderTokens is the XS set; the XS row is checked against it),
//   and the value indicator container from m3.material.io Sliders › Specs (M8 #19).
// Each Compose value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// slider.css and m3e-motion's slider.ts assume (track geometry, gaps, ticks, stop indicators,
// corner shrinking, thumb shrink, keyboard steps) changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type SliderDefault = ComposeLiteral;

const KT = 'Slider.kt';
const SAMPLES = 'SliderSamples.kt';

export const SLIDER_DEFAULTS_SOURCES = [KT, SAMPLES];

const P = '--m3e-comp-slider';

/** m3.material.io token DB the per-size values come from (read 2026-10-18). */
export const SLIDER_DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.0045edb815f2325e.json, Sliders › Tokens & specs: md.comp.slider.{xsmall,small,medium,large,xlarge})';

/** m3.material.io page whose Specs › Measurements table gives the value indicator container. */
export const SLIDER_M3IO_PAGE =
  'm3.material.io Sliders › Specs › Measurements (_dsm/content/m3/2026-10-13_06-10-19/4d160e88-c954-4614-8d11-4ec3ed399c92.json, updated 2026-07-17): "Label container height 44dp", "Label container width 48dp"';

type DsdbSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';

/** Token DB size names → the size words the generated token objects use (button sizes too). */
const SIZE_WORDS: Readonly<Record<DsdbSize, string>> = {
  xsmall: 'x-small',
  small: 'small',
  medium: 'medium',
  large: 'large',
  xlarge: 'x-large',
};

/**
 * md.comp.slider.<size>.* from the token DB, verbatim (dp). The track shape tokens are lengths
 * (the corner size); active and inactive track heights and the leading / trailing shapes are equal
 * at every size (checked). Icons: M, L and XL only ("Avoid adding inset icons to XS or S sliders").
 */
export const SLIDER_DSDB_TOKENS: Readonly<Record<string, number>> = {
  'md.comp.slider.xsmall.active.track.height': 16,
  'md.comp.slider.xsmall.inactive.track.height': 16,
  'md.comp.slider.xsmall.active.handle.height': 44,
  'md.comp.slider.xsmall.active.track.shape.leading': 8,
  'md.comp.slider.xsmall.inactive.track.shape.trailing': 8,
  'md.comp.slider.small.active.track.height': 24,
  'md.comp.slider.small.inactive.track.height': 24,
  'md.comp.slider.small.active.handle.height': 44,
  'md.comp.slider.small.active.track.shape.leading': 8,
  'md.comp.slider.small.inactive.track.shape.trailing': 8,
  'md.comp.slider.medium.active.track.height': 40,
  'md.comp.slider.medium.inactive.track.height': 40,
  'md.comp.slider.medium.active.handle.height': 44,
  'md.comp.slider.medium.active.track.shape.leading': 12,
  'md.comp.slider.medium.inactive.track.shape.trailing': 12,
  'md.comp.slider.medium.icon.size': 24,
  'md.comp.slider.medium.icon.padding': 6,
  'md.comp.slider.large.active.track.height': 56,
  'md.comp.slider.large.inactive.track.height': 56,
  'md.comp.slider.large.active.handle.height': 68,
  'md.comp.slider.large.active.track.shape.leading': 16,
  'md.comp.slider.large.inactive.track.shape.trailing': 16,
  'md.comp.slider.large.icon.size': 24,
  'md.comp.slider.large.icon.padding': 6,
  'md.comp.slider.xlarge.active.track.height': 96,
  'md.comp.slider.xlarge.inactive.track.height': 96,
  'md.comp.slider.xlarge.active.handle.height': 108,
  'md.comp.slider.xlarge.active.track.shape.leading': 28,
  'md.comp.slider.xlarge.inactive.track.shape.trailing': 28,
  'md.comp.slider.xlarge.icon.size': 32,
  'md.comp.slider.xlarge.icon.padding': 8,
};

/** Value indicator container (the Measurements table; the token DB has no current token). */
const VALUE_INDICATOR_CONTAINER = { width: 48, height: 44 } as const;

/** defaultSliderColors, enabled: [variable, SliderColors member] (`fromToken(...)`). */
const COLORS: readonly [string, string][] = [
  ['thumb-color', 'thumbColor'],
  ['track-color-active', 'activeTrackColor'],
  ['tick-color-active', 'activeTickColor'],
  ['track-color-inactive', 'inactiveTrackColor'],
  ['tick-color-inactive', 'inactiveTickColor'],
];

/** defaultSliderColors, disabled: translucent (`fromToken(...).copy(alpha = ...)`). */
const DISABLED: readonly [string, string][] = [
  ['track-color-active-disabled', 'disabledActiveTrackColor'],
  ['tick-color-active-disabled', 'disabledActiveTickColor'],
  ['track-color-inactive-disabled', 'disabledInactiveTrackColor'],
  ['tick-color-inactive-disabled', 'disabledInactiveTickColor'],
];

const RULES: readonly LiteralRule[] = [
  {
    kind: 'token',
    name: `${P}-track-height`,
    owner: KT,
    member: 'TrackHeight',
    file: KT,
    pattern: /internal val TrackHeight\n\s*get\(\) = (SliderTokens\.\w+)/d,
    note: 'the track (Track: height(TrackHeight); a vertical slider: its width); the XS size',
  },
  {
    kind: 'token',
    name: `${P}-thumb-width`,
    owner: KT,
    member: 'ThumbWidth',
    file: KT,
    pattern: /internal val ThumbWidth\n\s*get\(\) = (SliderTokens\.\w+)/d,
    note: 'ThumbSize = DpSize(ThumbWidth, ThumbHeight); VerticalThumbSize swaps them. The thumb keeps this layout size while its handle shrinks (ThumbContent), so the track gaps do not move',
  },
  {
    kind: 'token',
    name: `${P}-thumb-height`,
    owner: KT,
    member: 'ThumbHeight',
    file: KT,
    pattern: /private val ThumbHeight\n\s*get\(\) = (SliderTokens\.\w+)/d,
    note: 'the XS size; S–XL take the token DB handle heights below',
  },
  {
    kind: 'token',
    name: `${P}-thumb-track-gap-size`,
    owner: KT,
    member: 'ThumbTrackGapSize',
    file: KT,
    pattern: /private val ThumbTrackGapSize: Dp\n\s*get\(\) = (SliderTokens\.\w+)/d,
    note: 'drawTrack: each track part ends ThumbWidth / 2 + this from the thumb centre (startGap / endGap); the inset focus ring would add insetFocusRingPadding, not applied (owner decision M8 #23)',
  },
  {
    kind: 'dp',
    name: `${P}-track-inside-corner-size`,
    owner: KT,
    member: 'TrackInsideCornerSize',
    file: KT,
    pattern: /private val TrackInsideCornerSize: Dp\n\s*get\(\) = (\d+)\.dp/d,
    note: 'drawTrack: the corners of the track parts that face a thumb (or the centre of a centered slider); outer corners: the track corner size',
  },
  {
    kind: 'token',
    name: `${P}-track-stop-indicator-size`,
    owner: 'SliderDefaults',
    member: 'TrackStopIndicatorSize',
    file: KT,
    pattern: /public val TrackStopIndicatorSize: Dp = (SliderTokens\.\w+)/d,
    note: 'drawStopIndicator: a circle centred one track corner size from the end of the inactive track (both ends of a range or centered slider)',
  },
  {
    kind: 'token',
    name: `${P}-tick-size`,
    owner: 'SliderDefaults',
    member: 'TickSize',
    file: KT,
    pattern: /public val TickSize: Dp = (SliderTokens\.\w+)/d,
    note: 'steps > 0: circles at lerp(cornerSize, length − cornerSize, i / (steps + 1)); the last one (and the first of a range or centered slider) is the stop indicator; ticks within a thumb gap are not drawn',
  },
  ...COLORS.map(([name, member]): LiteralRule => ({
    kind: 'token',
    name: `${P}-${name}`,
    owner: 'SliderDefaults',
    member: `defaultSliderColors(${member})`,
    file: KT,
    pattern: new RegExp(`\\b${member} = fromToken\\((SliderTokens\\.\\w+)\\),`, 'd'),
    ...(name.startsWith('tick')
      ? {
          note:
            name === 'tick-color-active'
              ? 'ticks on the active track: the inactive track color (owner decision M8 #20; m3.material.io: on-primary)'
              : 'ticks on the inactive track: the active track color (owner decision M8 #20; m3.material.io: on-secondary-container)',
        }
      : {}),
  })),
  {
    kind: 'composite',
    name: `${P}-thumb-color-disabled`,
    owner: 'SliderDefaults',
    member: 'defaultSliderColors(disabledThumbColor)',
    file: KT,
    pattern:
      /\bdisabledThumbColor =\n\s*fromToken\((SliderTokens\.\w+)\)\n\s*\.copy\(alpha = (SliderTokens\.\w+)\)\n\s*\.compositeOver\((\w+)\),/d,
    note: 'Color.copy(alpha).compositeOver(surface): opaque',
  },
  ...DISABLED.map(([name, member]): LiteralRule => ({
    kind: 'alpha',
    name: `${P}-${name}`,
    owner: 'SliderDefaults',
    member: `defaultSliderColors(${member})`,
    file: KT,
    pattern: new RegExp(
      `\\b${member} =\\n\\s*fromToken\\((SliderTokens\\.\\w+)\\)\\n\\s*\\.copy\\(alpha = (SliderTokens\\.\\w+)\\),`,
      'd',
    ),
    note: 'Color.copy(alpha): translucent, drawn over what is behind the slider',
  })),
  {
    kind: 'alias',
    name: `${P}-track-stop-indicator-color`,
    owner: 'SliderDefaults',
    member: 'Track(drawStopIndicator)',
    file: KT,
    alias: `${P}-track-color-active`,
    pattern:
      /drawStopIndicator\(\n\s*offset = it,\n\s*color = colors\.(trackColor)\(enabled, active = true\),\n\s*size = TrackStopIndicatorSize,/d,
    note: 'the end stop: the active track color (owner decision M8 #20; m3.material.io stop-indicator.color: on-secondary-container); SliderTokens.StopIndicatorColor is not read',
  },
  {
    kind: 'alias',
    name: `${P}-track-stop-indicator-color-disabled`,
    owner: 'SliderDefaults',
    member: 'Track(drawStopIndicator)',
    file: KT,
    alias: `${P}-track-color-active-disabled`,
    pattern:
      /drawStopIndicator\(\n\s*offset = it,\n\s*color = colors\.(trackColor)\(enabled, active = true\),\n\s*size = TrackStopIndicatorSize,/d,
  },
  {
    kind: 'alias',
    name: `${P}-icon-color-active`,
    owner: 'SliderWithTrackIconsSample',
    member: 'activeIconColor',
    file: SAMPLES,
    alias: `${P}-tick-color-active`,
    pattern: /val activeIconColor = SliderDefaults\.colors\(\)\.(activeTickColor)/d,
    note: 'the inset icon on the active track (owner decision M8 #18: the sizes come from the token DB)',
  },
  {
    kind: 'alias',
    name: `${P}-icon-color-inactive`,
    owner: 'SliderWithTrackIconsSample',
    member: 'inactiveIconColor',
    file: SAMPLES,
    alias: `${P}-tick-color-inactive`,
    pattern: /val inactiveIconColor = SliderDefaults\.colors\(\)\.(inactiveTickColor)/d,
    note: 'the inset icon once it moves to the inactive track (m3.material.io: "When there’s not enough space for the icon on the active track … the icon moves to the inactive track")',
  },
  {
    kind: 'alias',
    name: `${P}-icon-color-active-disabled`,
    owner: 'SliderWithTrackIconsSample',
    member: 'activeIconColor',
    file: SAMPLES,
    alias: `${P}-tick-color-active-disabled`,
    pattern: /val activeIconColor = SliderDefaults\.colors\(\)\.(activeTickColor)/d,
    note: 'the sample shows no disabled slider; a disabled slider’s icons take the disabled tick colors, as its ticks',
  },
  {
    kind: 'alias',
    name: `${P}-icon-color-inactive-disabled`,
    owner: 'SliderWithTrackIconsSample',
    member: 'inactiveIconColor',
    file: SAMPLES,
    alias: `${P}-tick-color-inactive-disabled`,
    pattern: /val inactiveIconColor = SliderDefaults\.colors\(\)\.(inactiveTickColor)/d,
  },
];

/** Wiring slider.css and m3e-motion's slider.ts assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'SliderImpl: minimum interactive size; the track measured without the thumb width, placed thumb width / 2 in',
    /\.minimumInteractiveComponentSize\(\)[\s\S]*?\.offset\(horizontal = -\(thumbPlaceable\.width - 2 \* trackPadding\)\)[\s\S]*?trackOffsetX = thumbCoreWidth \/ 2/,
  ],
  [
    KT,
    'thumb offset: (track − 2 × corner) × fraction + corner with steps (not on the first / last), else track × fraction',
    /if \(state\.steps > 0 && !isOnFirstOrLastStep\) \{\n\s*\(\(trackPlaceable\.width - trackCornerSize \* 2\) \* valueAsFraction\)\.roundToInt\(\) \+\n\s*trackCornerSize\n\s*\} else \{\n\s*\(trackPlaceable\.width \* valueAsFraction\)\.roundToInt\(\)/,
  ],
  [
    KT,
    'vertical: the track canvas is flipped when reverseVerticalDirection (= !topToBottom)',
    /if \(reverseVerticalDirection\) it\.scale\(1f, -1f\) else it/,
  ],
  [
    SAMPLES,
    'VerticalSliderSample: topToBottom = false (minimum at the bottom; owner decision M8 #21)',
    /track = \{\n\s*SliderDefaults\.Track\([\s\S]*?trackCornerSize = 12\.dp,\n\s*\)\n\s*\},\n\s*topToBottom = false,/,
  ],
  [
    KT,
    'the default Track: no corner shrinking; the trackCornerSize overload and CenteredTrack shrink corners',
    /trackCornerSize = Dp\.Unspecified,[\s\S]*?enableCornerShrinking = false,\n\s*isCentered = false,[\s\S]*?trackCornerSize = trackCornerSize,[\s\S]*?enableCornerShrinking = true,\n\s*isCentered = false,[\s\S]*?enableCornerShrinking = true,\n\s*isCentered = true,/,
  ],
  [
    KT,
    'corner size: height / 2 (a vertical track: width / 2) unless trackCornerSize is given',
    /val cornerSize: Float =\n\s*if \(trackCornerSize == Dp\.Unspecified\) \{\n\s*if \(orientation == Vertical\) \{\n\s*size\.width \/ 2\n\s*\} else \{\n\s*size\.height \/ 2/,
  ],
  [
    KT,
    'gaps: thumb width / 2 + ThumbTrackGapSize each side',
    /startGap = startThumbWidth\.toPx\(\) \/ 2 \+ startThumbTrackGapSize\.toPx\(\)[\s\S]*?endGap = endThumbWidth\.toPx\(\) \/ 2 \+ endThumbTrackGapSize\.toPx\(\)/,
  ],
  [
    KT,
    'centered: a start gap only while the thumb is not after the centre, an end gap only while not before it',
    /val startThumbWidth =\n\s*if \(isCentered && !isThumbAfterCenter\) \{[\s\S]*?val endThumbWidth =\n\s*if \(isCentered\) \{\n\s*if \(!isThumbBeforeCenter\) sliderState\.thumbWidth\.toDp\(\) else 0\.dp/,
  ],
  [
    KT,
    'parts are drawn only past a threshold: the corner size unless corners shrink (and no ticks)',
    /if \(!enableCornerShrinking \|\| tickFractions\.isNotEmpty\(\)\) \{\n\s*rangeInactiveTrackThreshold \+= cornerSize[\s\S]*?if \(!enableCornerShrinking \|\| tickFractions\.isNotEmpty\(\)\) \{\n\s*inactiveTrackThreshold -= cornerSize[\s\S]*?val activeTrackThreshold =\n\s*if \(!enableCornerShrinking \|\| tickFractions\.isNotEmpty\(\)\) startCornerRadius else 0f/,
  ],
  [
    KT,
    'stop indicators one corner size in from the ends; ticks between the corners, the stop ones and the gaps skipped',
    /Offset\(end - cornerSize, center\.y\)[\s\S]*?val start = sliderStart \+ cornerSize\n\s*val end = sliderEnd - cornerSize[\s\S]*?val isStopIndicatorAtStart = \(isCentered \|\| isRangeSlider\) && index == 0\n\s*if \(isStopIndicatorAtStart \|\| index == tickFractions\.size - 1\) \{[\s\S]*?val centerTick = lerp\(start, end, tick\)/,
  ],
  [
    KT,
    'ThumbContent: focus, press or drag halves the handle width (height when vertical), without animation; hover shows the hand pointer',
    /is FocusInteraction\.Focus -> interactions\.add\(interaction\)[\s\S]*?is DragInteraction\.Start -> interactions\.add\(interaction\)[\s\S]*?if \(interactions\.isNotEmpty\(\)\) \{\n\s*if \(isVertical\) \{\n\s*thumbSize\.copy\(height = thumbSize\.height \/ 2\)\n\s*\} else \{\n\s*thumbSize\.copy\(width = thumbSize\.width \/ 2\)[\s\S]*?\.pointerHoverIcon\(icon = PointerIcon\.Hand\)[\s\S]*?Spacer\(\n\s*Modifier\.size\(size\)\n\s*\.background\(colors\.thumbColor\(enabled\), SliderTokens\.HandleShape\.value\)/,
  ],
  [
    KT,
    'keys: a step of range / (steps + 1), or 1% without steps; PageUp / PageDown clamp(actualSteps / 10, 1, 10) steps',
    /val actualSteps = if \(steps > 0\) steps \+ 1 else 100\n\s*val delta = rangeLength \/ actualSteps[\s\S]*?val page = \(actualSteps \/ 10\)\.coerceIn\(1, 10\)/,
  ],
  [
    KT,
    'values snap to the nearest tick; ticks: steps + 2 fractions i / (steps + 1)',
    /\.minByOrNull \{ abs\(lerp\(minPx, maxPx, it\) - current\) \}[\s\S]*?FloatArray\(steps \+ 2\) \{ it\.toFloat\(\) \/ \(steps \+ 1\) \}/,
  ],
  [
    KT,
    'range thumbs: start coerced to ..end, end to start..',
    /val coercedValue = newVal\.coerceIn\(trackRange\.start, endValue\)[\s\S]*?val coercedValue = newVal\.coerceIn\(startValue, trackRange\.endInclusive\)/,
  ],
  [
    KT,
    'range thumbs are labelled Range start / Range end',
    /val startContentDescription = getString\(Strings\.SliderRangeStart\)\n\s*val endContentDescription = getString\(Strings\.SliderRangeEnd\)/,
  ],
  [
    SAMPLES,
    'SliderWithTrackIconsSample: an icon shows on a track part only if it fits with its padding on both sides; no stop indicator',
    /iconSize\.toSize\(\)\.width < activeTrackWidth - iconPadding\.toPx\(\) \* 2[\s\S]*?drawStopIndicator = null,/,
  ],
];

/** The dp a DB row holds (throws if it is missing). */
const dsdb = (token: string): number => {
  const v = SLIDER_DSDB_TOKENS[token];
  if (v === undefined) throw new Error(`slider-defaults: ${token} is not in the DB extract`);
  return v;
};

const dsdbRow = (name: string, token: string, dp: number, note?: string): SliderDefault => ({
  name,
  value: `${String(dp)}px`,
  js: dp,
  raw: `${token} = ${String(dp)}dp`,
  owner: 'm3.material.io',
  member: token,
  file: 'm3.material.io',
  line: 0,
  cite: SLIDER_DSDB,
  ...(note === undefined ? {} : { note }),
});

/** The per-size rows (owner decisions M8 #16 and #18). */
function sizeRows(): SliderDefault[] {
  const out: SliderDefault[] = [];
  for (const size of Object.keys(SIZE_WORDS) as DsdbSize[]) {
    const words = SIZE_WORDS[size];
    const base = `md.comp.slider.${size}`;
    const height = dsdb(`${base}.active.track.height`);
    if (dsdb(`${base}.inactive.track.height`) !== height)
      throw new Error(`slider-defaults: ${size} active and inactive track heights differ`);
    const corner = dsdb(`${base}.active.track.shape.leading`);
    if (dsdb(`${base}.inactive.track.shape.trailing`) !== corner)
      throw new Error(`slider-defaults: ${size} leading and trailing track shapes differ`);
    out.push(
      dsdbRow(`${P}-${words}-track-height`, `${base}.active.track.height`, height),
      dsdbRow(
        `${P}-${words}-thumb-height`,
        `${base}.active.handle.height`,
        dsdb(`${base}.active.handle.height`),
        size === 'medium'
          ? 'TODO(verify) SOURCES register #68: the token DB says 44dp, the Specs › Measurements table 52dp (owner decision M8 #16: the DB)'
          : undefined,
      ),
      dsdbRow(
        `${P}-${words}-track-corner-size`,
        `${base}.active.track.shape.leading`,
        corner,
        size === 'xsmall'
          ? 'the default Track draws height / 2 (no trackCornerSize), the same 8dp'
          : 'Compose reaches this size only through Track(trackCornerSize), which shrinks corners (SliderWithTrackIconsSample, VerticalSliderSample)',
      ),
    );
    const icon = SLIDER_DSDB_TOKENS[`${base}.icon.size`];
    if (icon !== undefined) {
      out.push(
        dsdbRow(`${P}-${words}-icon-size`, `${base}.icon.size`, icon),
        dsdbRow(
          `${P}-${words}-icon-padding`,
          `${base}.icon.padding`,
          dsdb(`${base}.icon.padding`),
          'from the track end and from the thumb gap (SliderWithTrackIconsSample iconPadding)',
        ),
      );
    }
  }
  return out;
}

/** The value indicator (owner decision M8 #19): SliderTokens has its colors, type and spacing. */
function valueIndicatorRows(): SliderDefault[] {
  const row = (part: 'width' | 'height', dp: number): SliderDefault => ({
    name: `${P}-value-indicator-container-${part}`,
    value: `${String(dp)}px`,
    js: dp,
    raw: `Label container ${part} ${String(dp)}dp`,
    owner: 'm3.material.io',
    member: `Label container ${part}`,
    file: 'm3.material.io',
    line: 0,
    cite: SLIDER_M3IO_PAGE,
    note: 'Compose has no built-in value indicator (the samples put a PlainTooltip in a Label)',
  });
  return [
    row('width', VALUE_INDICATOR_CONTAINER.width),
    row('height', VALUE_INDICATOR_CONTAINER.height),
    {
      name: `${P}-value-indicator-container-shape`,
      value: 'var(--m3e-sys-shape-corner-full)',
      js: 'var(--m3e-sys-shape-corner-full)',
      raw: 'not stated',
      owner: 'm3.material.io',
      member: 'Label container shape',
      file: 'm3.material.io',
      line: 0,
      cite: SLIDER_M3IO_PAGE,
      note: 'SOURCES register #69: the Specs redline [1.17.0] draws the label container fully rounded (the token DB’s label.container.* tokens are deprecated)',
    },
  ];
}

/** `sources`: vendored Material3 files and samples by name (Slider.kt, SliderSamples.kt). */
export function extractSliderDefaults(sources: Readonly<Record<string, string>>): SliderDefault[] {
  return [
    ...extractLiterals('slider-defaults', SLIDER_DEFAULTS_SOURCES, RULES, CHECKS, sources),
    ...sizeRows(),
    ...valueIndicatorRows(),
  ];
}

/**
 * The token DB's XS row must equal what Compose renders by default (SliderTokens via TrackHeight /
 * ThumbHeight, and the default Track's height / 2 corner), or the extract above is stale.
 * `value` looks up a generated component variable.
 */
export function checkSliderXSmallAgainstCompose(value: (name: string) => string | undefined): void {
  const px = (name: string) => {
    const v = value(name);
    if (!v?.endsWith('px')) throw new Error(`slider-defaults: ${name} is ${String(v)}`);
    return Number.parseFloat(v);
  };
  const track = px('--m3e-comp-slider-inactive-track-height');
  const expected: [string, number][] = [
    ['md.comp.slider.xsmall.active.track.height', track],
    ['md.comp.slider.xsmall.active.handle.height', px('--m3e-comp-slider-handle-height')],
    ['md.comp.slider.xsmall.active.track.shape.leading', track / 2],
  ];
  for (const [token, compose] of expected) {
    if (dsdb(token) !== compose)
      throw new Error(`${token}: token DB ${String(dsdb(token))}dp ≠ Compose ${String(compose)}dp`);
  }
}
