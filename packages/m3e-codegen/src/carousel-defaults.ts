// Carousel values (COMPONENT_SPEC §36). There is no CarouselTokens.kt at the pin, so the values are
// what the carousel composables render:
// - CarouselDefaults (carousel/Carousel.kt): the 40 / 56dp small item bounds, the 0dp item spacing
//   and content padding (the API defaults; the samples and m3.material.io use 8 / 16dp, SOURCES
//   register #82);
// - the item mask: the samples' `maskClip(MaterialTheme.shapes.extraLarge)` (CarouselSamples.kt),
//   which the m3.material.io token DB's `md.comp.carousel-item.container.shape` (corner
//   extra-large) agrees with (owner decision M9 #25);
// - the programmatic scroll (scrollToItem, keyboard and focus moves):
//   CarouselState.animateScrollToItem's default `spring()` (carousel/CarouselState.kt; ζ 1, k 1500
//   from animation-core AnimationSpec.kt / VectorizedAnimationSpec.kt), 0ms under reduced motion;
// - from m3.material.io where Compose has nothing: the item state layer color (token DB
//   `md.comp.carousel-item.*.state-layer.color` = on-surface) and the full-screen layout's 16dp
//   gap (Carousel › Specs; owner decision M9 #22, register #83).
// CHECKS throw when the wiring carousel.css and CarouselLayout assume changes upstream: the fling
// behaviors each layout uses (scroll snapping, owner decision M9 #23), the extra-large masks of
// every sample, and no shape, ripple or elevation on Compose's item (#25).
import { springToLinear } from '@kyralabs/m3e-motion';
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';
import { ANIMATION_CORE_PATH, MATERIAL3_CAROUSEL_PATH, MATERIAL3_SAMPLES_PATH } from './vendor.js';

export type CarouselDefault = ComposeLiteral;

const CAROUSEL = 'Carousel.kt';
const STATE = 'CarouselState.kt';
const SAMPLES = 'CarouselSamples.kt';
const SPEC = 'AnimationSpec.kt';
const VECTORIZED = 'VectorizedAnimationSpec.kt';

export const CAROUSEL_DEFAULTS_SOURCES = [CAROUSEL, STATE, SAMPLES, SPEC, VECTORIZED];

const P = '--m3e-comp-carousel';

/** The programmatic scroll moves the items: it jumps under reduced motion (spatial). */
export const CAROUSEL_REDUCED_MOTION = [`${P}-scroll-duration: 0ms;`];

const CAROUSEL_SRC = `${MATERIAL3_CAROUSEL_PATH}/src/commonMain/kotlin/androidx/compose/material3/carousel`;

const RULES: readonly LiteralRule[] = [
  {
    kind: 'dp',
    name: `${P}-min-small-item-width`,
    owner: 'CarouselDefaults',
    member: 'MinSmallItemSize',
    file: CAROUSEL,
    pattern: /public val MinSmallItemSize: Dp = (\d+)\.dp/d,
    note: 'minSmallItemWidth of the multi-browse and hero carousels',
  },
  {
    kind: 'dp',
    name: `${P}-max-small-item-width`,
    owner: 'CarouselDefaults',
    member: 'MaxSmallItemSize',
    file: CAROUSEL,
    pattern: /public val MaxSmallItemSize: Dp = (\d+)\.dp/d,
    note: 'maxSmallItemWidth of the multi-browse and hero carousels',
  },
  {
    kind: 'dp',
    name: `${P}-item-spacing`,
    owner: 'CarouselDefaults',
    member: 'ItemSpacing',
    file: CAROUSEL,
    pattern: /public val ItemSpacing: Dp = (\d+)\.dp/d,
    note: 'SOURCES register #82: the samples and m3.material.io Specs use 8dp (owner’s call)',
  },
  {
    kind: 'dp',
    name: `${P}-content-padding-start`,
    owner: 'CarouselDefaults',
    member: 'ContentPadding',
    file: CAROUSEL,
    pattern: /public val ContentPadding: PaddingValues = PaddingValues\((\d+)\.dp\)/d,
    note: 'before the first item (the strategy shifts the keylines into it); SOURCES register #82: the samples and m3.material.io Specs use 16dp (owner’s call)',
  },
  {
    kind: 'dp',
    name: `${P}-content-padding-end`,
    owner: 'CarouselDefaults',
    member: 'ContentPadding',
    file: CAROUSEL,
    pattern: /public val ContentPadding: PaddingValues = PaddingValues\((\d+)\.dp\)/d,
    note: 'after the last item',
  },
  {
    kind: 'keyword',
    name: `${P}-item-shape`,
    owner: 'HorizontalMultiBrowseCarouselSample',
    member: 'maskClip',
    file: SAMPLES,
    pattern: /\.maskClip\((MaterialTheme\.shapes\.extraLarge)\)/d,
    note: 'owner decision M9 #25: every sample masks its items with it; m3.material.io token DB md.comp.carousel-item.container.shape = md.sys.shape.corner.extra-large',
  },
];

/** Wiring carousel.css and the carousel layout (m3e-elements) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    CAROUSEL,
    'multi-browse and centered hero carousels fling at most one item (singleAdvanceFlingBehavior: scroll-snap-stop always)',
    /public fun HorizontalMultiBrowseCarousel\([\s\S]*?flingBehavior: TargetedFlingBehavior =\n\s*CarouselDefaults\.singleAdvanceFlingBehavior\(state = state\),[\s\S]*?public fun HorizontalCenteredHeroCarousel\([\s\S]*?flingBehavior: TargetedFlingBehavior =\n\s*CarouselDefaults\.singleAdvanceFlingBehavior\(state = state\),/,
  ],
  [
    CAROUSEL,
    'singleAdvanceFlingBehavior snaps to the next item only (PagerSnapDistance.atMost(1))',
    /pagerSnapDistance = PagerSnapDistance\.atMost\(1\),/,
  ],
  [
    CAROUSEL,
    'the uncontained carousel does not snap (noSnapFlingBehavior: scroll-snap-type none)',
    /public fun HorizontalUncontainedCarousel\([\s\S]*?flingBehavior: TargetedFlingBehavior = CarouselDefaults\.noSnapFlingBehavior\(\),/,
  ],
  [
    CAROUSEL,
    'items snap to their keyline (KeylineSnapPosition), the main-axis padding is the strategy’s',
    /val snapPosition = KeylineSnapPosition\(pageSize\)[\s\S]*?\/\/ Only pass cross axis padding as main axis padding will be handled by the strategy/,
  ],
  [
    CAROUSEL,
    'the item is a Box clipped to the mask rect (no shape, ripple or elevation of its own; owner decision M9 #25)',
    /Box\(\n\s*modifier =\n\s*Modifier\.carouselItem\(/,
  ],
  [
    CAROUSEL,
    'z-index 1 / (1 + distance from the current page)',
    /val itemZIndex = 1f \/ \(1 \+ distance\)/,
  ],
  [
    SAMPLES,
    'the uncontained and centered hero samples mask with extraLarge too',
    /HorizontalUncontainedCarouselSample[\s\S]*?\.maskClip\(MaterialTheme\.shapes\.extraLarge\)[\s\S]*?HorizontalCenteredHeroCarouselSample[\s\S]*?\.maskClip\(MaterialTheme\.shapes\.extraLarge\)/,
  ],
];

/** m3.material.io token DB the item state layer comes from (read 2026-10-19). */
const DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.43a124d2adc8a2ef.json, Carousel › Tokens & specs: md.comp.carousel-item)';

/** m3.material.io page of the full-screen layout's measurements. */
const PAGE =
  'm3.material.io Carousel › Specs (_dsm/content/m3/2026-10-13_06-10-19/b0726223-2639-4157-84ae-cb84c07ee2e5.json, updated 2026-08-18)';

const find = (sources: Readonly<Record<string, string>>, file: string, pattern: RegExp) => {
  const text = sources[file]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`carousel-defaults: ${file} is not vendored`);
  const match = pattern.exec(text);
  const at = match?.indices?.[1]?.[0];
  if (!match || at === undefined) {
    throw new Error(`carousel-defaults: ${file}: ${String(pattern)} not found (changed upstream?)`);
  }
  return { value: match[1]!, groups: match, line: text.slice(0, at).split('\n').length };
};

/** CarouselState.animateScrollToItem's `spring()`, resolved through animation-core's defaults. */
function scrollSpring(
  sources: Readonly<Record<string, string>>,
  commit: string,
): CarouselDefault[] {
  const animate = find(
    sources,
    STATE,
    /public suspend fun animateScrollToItem\(\n\s*item: Int,\n\s*animationSpec: AnimationSpec<Float> = (spring)\(\),/d,
  );
  const defaults = find(
    sources,
    SPEC,
    /public fun <T> spring\(\n\s*dampingRatio: Float = Spring\.(\w+),\n\s*stiffness: Float = Spring\.(\w+),/d,
  );
  const stiffnessName = defaults.groups[2]!;
  const constant = (name: string) =>
    find(sources, VECTORIZED, new RegExp(`public const val ${name}: Float = ([\\d_.]+)f`, 'd'));
  const damping = constant(defaults.value);
  const stiffness = constant(stiffnessName);
  const spec = {
    dampingRatio: Number(damping.value.replace(/_/g, '')),
    stiffness: Number(stiffness.value.replace(/_/g, '')),
  };
  const linear = springToLinear(spec);
  const via = `CarouselState.animateScrollToItem(animationSpec = spring()) (${STATE} L${String(animate.line)}); spring() defaults (${SPEC} L${String(defaults.line)})`;
  const base = { owner: 'CarouselState', member: 'animateScrollToItem', file: STATE };
  const cite = (file: string, line: number) =>
    `${file === STATE ? CAROUSEL_SRC : ANIMATION_CORE_PATH}/${file}@${commit} L${String(line)}`;
  return [
    {
      ...base,
      name: `${P}-scroll-duration`,
      value: `${String(linear.durationMillis)}ms`,
      js: linear.durationMillis,
      raw: `ζ=${String(spec.dampingRatio)}, k=${String(spec.stiffness)}`,
      line: animate.line,
      cite: cite(STATE, animate.line),
      note: 'springToLinear() (m3e-motion) duration estimate; 0ms with prefers-reduced-motion (spatial). Keyboard / focus moves and scrollToItem; flings are the browser’s (owner decision M9 #23)',
    },
    {
      ...base,
      name: `${P}-scroll-damping-ratio`,
      value: String(spec.dampingRatio),
      js: spec.dampingRatio,
      raw: `Spring.${defaults.value} = ${damping.value}f`,
      line: damping.line,
      cite: cite(VECTORIZED, damping.line),
      note: via,
    },
    {
      ...base,
      name: `${P}-scroll-stiffness`,
      value: String(spec.stiffness),
      js: spec.stiffness,
      raw: `Spring.${stiffnessName} = ${stiffness.value}f`,
      line: stiffness.line,
      cite: cite(VECTORIZED, stiffness.line),
      note: via,
    },
  ];
}

function m3Rows(): CarouselDefault[] {
  const base = { owner: 'm3.material.io', file: 'm3.material.io', line: 0 };
  return [
    {
      ...base,
      name: `${P}-item-state-layer-color`,
      value: 'var(--m3e-sys-color-on-surface)',
      js: 'var(--m3e-sys-color-on-surface)',
      member: 'md.comp.carousel-item.{hover,focus,pressed}.state-layer.color',
      raw: 'md.comp.carousel-item.hover.state-layer.color = md.sys.color.on-surface',
      cite: DSDB,
      note: 'owner decision M9 #25: interactive items only (Compose’s item has no indication; the samples’ clickable draws the ripple over the image); opacities md.sys.state.*; no hover elevation (Compose draws none)',
    },
    {
      ...base,
      name: `${P}-full-screen-item-spacing`,
      value: '16px',
      js: 16,
      member: 'Full-screen › Padding between elements',
      raw: 'Padding between elements = 16dp',
      cite: PAGE,
      note: 'owner decision M9 #22: CSS-only layout (no Compose API); leading / trailing and top / bottom padding 0dp; TODO(verify) SOURCES register #83',
    },
  ];
}

/** `sources`: vendored files by name (the carousel sources, CarouselSamples.kt, animation-core). */
export function extractCarouselDefaults(
  sources: Readonly<Record<string, string>>,
  commit: string,
): CarouselDefault[] {
  const literals = extractLiterals(
    'carousel-defaults',
    CAROUSEL_DEFAULTS_SOURCES,
    RULES,
    CHECKS,
    sources,
  );
  return [
    ...literals.map((d) => ({
      ...d,
      cite: `${d.file === SAMPLES ? MATERIAL3_SAMPLES_PATH : CAROUSEL_SRC}/${d.file}@${commit} L${String(d.line)}`,
    })),
    ...scrollSpring(sources, commit),
    ...m3Rows(),
  ];
}
