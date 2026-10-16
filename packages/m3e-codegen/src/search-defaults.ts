// Values Compose renders for search (SearchBar.kt) that are not in SearchBarTokens /
// SearchViewTokens:
// - the private measurement literals at the end of SearchBar.kt (360–720dp width, 8dp vertical
//   padding, the 4dp icon offset, the AppBarWithSearch paddings, the contained full-screen
//   padding, the docked results' 240dp minimum and 2/3 · 1/2 window maximum, the collapsed corner
//   radius InputFieldHeight / 2);
// - SearchBarDefaults literals and references: elevations (Level0), the docked drop-down shape
//   (12dp) and gap (2dp) and its scrim, the contained full-screen color (SurfaceContainerLow) and
//   the AppBarWithSearch scrolled search bar color (SurfaceContainerHighest), all under upstream
//   "TODO: replace with token" comments;
// - the expand / collapse springs of rememberSearchBarState (docked, full-screen),
//   rememberContainedSearchBarState and rememberSearchBarWithGapState, the content fade tweens of
//   the latter two, the AppBarWithSearch container color spring and the enter-always snap spring;
// - the InputField's text field paddings (TextFieldImpl.kt: TextFieldPadding and the 12dp icon
//   padding textFieldHorizontalIconPadding derives from the 48dp interactive size and the 24dp
//   icon), and the result row padding of the SearchBarSamples (the Compose catalog), whose
//   ListItem otherwise renders ListTokens values (list.css).
// Each value is read with a targeted regex and cited by line. The checks below throw when the
// wiring the CSS assumes (search.css) changes upstream.
import { kebabName } from './names.js';

export interface SearchDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (dp number, or the CSS string). */
  js: number | string;
  /** Source expression as written upstream (resolved). */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file name. */
  file: string;
  line: number;
  note?: string;
}

const SEARCH = 'SearchBar.kt';
const TEXT_FIELD = 'TextFieldImpl.kt';
const TEXT_FIELD_DEFAULTS = 'TextFieldDefaults.kt';
const SAMPLES = 'SearchBarSamples.kt';
const LIST_ITEM = 'ListItem.kt';
const LIST_DEFAULTS = 'ListItemDefaults.kt';
const FLAGS = 'ComposeMaterial3Flags.kt';
const INTERACTIVE = 'InteractiveComponentSize.kt';

export const SEARCH_DEFAULTS_SOURCES = [
  SEARCH,
  TEXT_FIELD,
  TEXT_FIELD_DEFAULTS,
  SAMPLES,
  LIST_ITEM,
  LIST_DEFAULTS,
  FLAGS,
  INTERACTIVE,
];

const P = '--m3e-comp-search';
const DEFAULTS = 'SearchBarDefaults';
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;

/**
 * Reduced motion (project policy, as the top app bar): AppBarWithSearch's enter-always snap uses
 * the default *effects* spring, which the motion policy keeps animating, but it moves geometry, so
 * it jumps under `prefers-reduced-motion`. The expand / collapse springs are spatial and already
 * resolve to 0ms there (tokens.css).
 */
export const SEARCH_REDUCED_MOTION = [`${P}-app-bar-snap-duration: 0ms;`];

type Kind = 'dp' | 'ratio' | 'motion' | 'color' | 'elevation' | 'duration' | 'easing' | 'ref';

interface Rule {
  kind: Kind;
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: a dp literal, a ratio, a motion / color / elevation / duration key. */
  pattern: RegExp;
  note?: string;
}

const measurement = (
  name: string,
  member: string,
  modifier: 'private' | 'internal',
  note?: string,
): Rule => ({
  kind: 'dp',
  name: `${P}-${name}`,
  owner: SEARCH,
  member,
  file: SEARCH,
  pattern: new RegExp(`${modifier} val ${member}(?:: Dp)?\\n\\s*get\\(\\) = (\\d+)\\.dp`, 'd'),
  ...(note === undefined ? {} : { note }),
});

/** `<fun>(…animationSpecFor<Which>: AnimationSpec<Float> = MotionSchemeKeyTokens.<Key>.value()` */
const stateSpring = (name: string, fun: string, which: 'Expand' | 'Collapse', note: string) =>
  ({
    kind: 'motion',
    name: `${P}-${name}`,
    owner: fun,
    member: `animationSpecFor${which}`,
    file: SEARCH,
    pattern: new RegExp(
      `public fun ${fun}\\(\\n\\s*initialValue: SearchBarValue = SearchBarValue\\.Collapsed,\\n(?:.*\\n)*?\\s*animationSpecFor${which}: AnimationSpec<Float> = MotionSchemeKeyTokens\\.(\\w+)\\.value\\(\\),`,
      'd',
    ),
    note,
  }) satisfies Rule;

/** A field of one of the private content fade tweens (`AnimationForContentFade{In,Out}Spec`). */
const fade = (
  name: string,
  member: 'AnimationForContentFadeInSpec' | 'AnimationForContentFadeOutSpec',
  field: 'durationMillis' | 'delayMillis' | 'easing',
  note: string,
): Rule => ({
  kind: field === 'easing' ? 'easing' : 'duration',
  name: `${P}-${name}`,
  owner: SEARCH,
  member: `${member}.${field}`,
  file: SEARCH,
  pattern: new RegExp(
    `private val ${member}: FiniteAnimationSpec<Float> =\\n\\s*tween\\(\\n(?:.*\\n)*?\\s*${field} = MotionTokens\\.(\\w+?)(?:CubicBezier|\\.toInt\\(\\)),`,
    'd',
  ),
  note,
});

const RULES: readonly Rule[] = [
  measurement(
    'min-width',
    'SearchBarMinWidth',
    'internal',
    'InputField sizeIn(minWidth), AppBarWithSearch widthIn(min)',
  ),
  measurement(
    'max-width',
    'SearchBarMaxWidth',
    'internal',
    'InputField sizeIn(maxWidth), AppBarWithSearch widthIn(max)',
  ),
  measurement(
    'vertical-padding',
    'SearchBarVerticalPadding',
    'internal',
    'full-screen view: above the input field (plus the top inset) and between it and the results',
  ),
  measurement(
    'icon-offset',
    'SearchBarIconOffsetX',
    'private',
    'InputField moves the leading icon in and the trailing icon out by this (16dp from the edges instead of the text field’s 12dp)',
  ),
  measurement(
    'app-bar-horizontal-padding',
    'AppBarWithSearchHorizontalPadding',
    'private',
    'AppBarWithSearch: before the navigation icon and after the actions',
  ),
  measurement(
    'app-bar-vertical-padding',
    'AppBarWithSearchVerticalPadding',
    'internal',
    'AppBarWithSearch: above and below the search bar; the contained full-screen view: above the input field',
  ),
  measurement(
    'app-bar-search-padding',
    'SearchBarAsTopBarPadding',
    'internal',
    'AppBarWithSearch: on both sides of the search bar',
  ),
  measurement(
    'contained-horizontal-padding',
    'FullScreenExpandedHorizontalPadding',
    'private',
    'ExpandedFullScreenContainedSearchBar: on both sides of the expanded input field',
  ),
  measurement(
    'docked-min-height',
    'DockedExpandedTableMinHeight',
    'internal',
    'expanded docked views: at least this tall (at most the maximum below)',
  ),
  {
    kind: 'ratio',
    name: `${P}-docked-max-height-ratio`,
    owner: SEARCH,
    member: 'DockedExpandedTableMaxHeightScreenRatio',
    file: SEARCH,
    pattern: /private const val DockedExpandedTableMaxHeightScreenRatio: Float = (\d+f \/ \d+f)/d,
    note: 'ExpandedDockedSearchBar: at most this fraction of the window height',
  },
  {
    kind: 'ratio',
    name: `${P}-docked-with-gap-max-height-ratio`,
    owner: SEARCH,
    member: 'DockedExpandedWithGapTableMaxHeightScreenRatio',
    file: SEARCH,
    pattern:
      /private const val DockedExpandedWithGapTableMaxHeightScreenRatio: Float = (\d+f \/ \d+f)/d,
    note: 'ExpandedDockedSearchBarWithGap: at most this fraction of the window height',
  },
  {
    kind: 'ref',
    name: `${P}-collapsed-corner-radius`,
    owner: SEARCH,
    member: 'SearchBarCornerRadius',
    file: SEARCH,
    pattern: /private val SearchBarCornerRadius: Dp\n\s*get\(\) = (InputFieldHeight \/ 2)/d,
    note: 'the full-screen views animate the corner radius from this to 0 (CircleShape → RectangleShape)',
  },
  {
    kind: 'dp',
    name: `${P}-dropdown-corner-radius`,
    owner: DEFAULTS,
    member: 'dockedDropdownShape',
    file: SEARCH,
    pattern:
      /public val dockedDropdownShape: Shape\n\s*get\(\) = RoundedCornerShape\(corner = CornerSize\((\d+)\.dp\)\) \/\/ TODO: replace with token\./d,
    note: 'ExpandedDockedSearchBarWithGap results (upstream “TODO: replace with token”)',
  },
  {
    kind: 'dp',
    name: `${P}-dropdown-gap`,
    owner: DEFAULTS,
    member: 'dockedDropdownGapSize',
    file: SEARCH,
    pattern: /public val dockedDropdownGapSize: Dp = (\d+)\.dp \/\/ TODO: replace with token\./d,
    note: 'ExpandedDockedSearchBarWithGap: between the search bar and the results (upstream “TODO: replace with token”)',
  },
  {
    kind: 'ref',
    name: `${P}-scrim-color`,
    owner: DEFAULTS,
    member: 'dockedDropdownScrimColor',
    file: SEARCH,
    pattern:
      /public val dockedDropdownScrimColor: Color\n\s*@Composable\n\s*get\(\) = (ScrimTokens\.ContainerColor)\.value\.copy\(alpha = ScrimTokens\.ContainerOpacity\)/d,
    note: 'ExpandedDockedSearchBarWithGap scrim, drawn at alpha × expand progress',
  },
  {
    kind: 'ref',
    name: `${P}-scrim-opacity`,
    owner: DEFAULTS,
    member: 'dockedDropdownScrimColor',
    file: SEARCH,
    pattern:
      /public val dockedDropdownScrimColor: Color\n\s*@Composable\n\s*get\(\) = ScrimTokens\.ContainerColor\.value\.copy\(alpha = (ScrimTokens\.ContainerOpacity)\)/d,
  },
  {
    kind: 'elevation',
    name: `${P}-shadow-elevation`,
    owner: DEFAULTS,
    member: 'ShadowElevation',
    file: SEARCH,
    pattern: /public val ShadowElevation: Dp = ElevationTokens\.(Level\d)/d,
    note: 'every search bar and view (SearchBarTokens.ContainerElevation Level3 is not read); TonalElevation is Level0 too',
  },
  {
    kind: 'color',
    name: `${P}-contained-container-color`,
    owner: DEFAULTS,
    member: 'fullScreenContainedSearchBarColor',
    file: SEARCH,
    pattern:
      /public val fullScreenContainedSearchBarColor: Color\n\s*@Composable\n\s*get\(\) = ColorSchemeKeyTokens\.(\w+)\.value \/\/ TODO: replace with token\./d,
    note: 'ExpandedFullScreenContainedSearchBar surface while expanded (containedColors; upstream “TODO: replace with token”); the input field keeps SearchBarTokens.ContainerColor',
  },
  {
    kind: 'color',
    name: `${P}-scrolled-container-color`,
    owner: DEFAULTS,
    member: 'appBarWithSearchColors.scrolledSearchBarContainerColor',
    file: SEARCH,
    pattern:
      /\/\/ TODO Load the color tokens from the component tokens file\n\s*scrolledSearchBarContainerColor: Color = ColorSchemeKeyTokens\.(\w+)\.value,/d,
    note: 'AppBarWithSearch: the search bar once content scrolls under the bar (switches, not animated)',
  },
  stateSpring(
    'expand',
    'rememberSearchBarState',
    'Expand',
    'ExpandedFullScreenSearchBar / ExpandedDockedSearchBar expand',
  ),
  stateSpring(
    'collapse',
    'rememberSearchBarState',
    'Collapse',
    'ExpandedFullScreenSearchBar / ExpandedDockedSearchBar collapse',
  ),
  stateSpring(
    'contained-expand',
    'rememberContainedSearchBarState',
    'Expand',
    'ExpandedFullScreenContainedSearchBar expand',
  ),
  stateSpring(
    'contained-collapse',
    'rememberContainedSearchBarState',
    'Collapse',
    'ExpandedFullScreenContainedSearchBar collapse',
  ),
  stateSpring(
    'with-gap-expand',
    'rememberSearchBarWithGapState',
    'Expand',
    'ExpandedDockedSearchBarWithGap expand (also slides the results in)',
  ),
  stateSpring(
    'with-gap-collapse',
    'rememberSearchBarWithGapState',
    'Collapse',
    'ExpandedDockedSearchBarWithGap collapse (also slides the results out)',
  ),
  fade(
    'content-fade-in-duration',
    'AnimationForContentFadeInSpec',
    'durationMillis',
    'contained / with-gap results fade in (contentProgress)',
  ),
  fade(
    'content-fade-in-delay',
    'AnimationForContentFadeInSpec',
    'delayMillis',
    'contained / with-gap results fade in after this',
  ),
  fade(
    'content-fade-in-easing',
    'AnimationForContentFadeInSpec',
    'easing',
    'contained / with-gap results fade in',
  ),
  fade(
    'content-fade-out-duration',
    'AnimationForContentFadeOutSpec',
    'durationMillis',
    'contained / with-gap results fade out (no delay)',
  ),
  fade(
    'content-fade-out-easing',
    'AnimationForContentFadeOutSpec',
    'easing',
    'contained / with-gap results fade out',
  ),
  {
    kind: 'motion',
    name: `${P}-app-bar-color`,
    owner: 'AppBarWithSearch',
    member: 'animationSpec',
    file: SEARCH,
    pattern:
      /\/\/ TODO Load the motionScheme tokens from the component tokens file\n\s*val animationSpec = MotionSchemeKeyTokens\.(\w+)\n/d,
    note: 'AppBarWithSearch container color change when content scrolls under it (animateColorAsState)',
  },
  {
    kind: 'motion',
    name: `${P}-app-bar-snap`,
    owner: DEFAULTS,
    member: 'enterAlwaysSearchBarScrollBehavior.snapAnimationSpec',
    file: SEARCH,
    pattern:
      /public fun enterAlwaysSearchBarScrollBehavior\(\n\s*scrollState: SearchBarScrollState = rememberSearchBarScrollState\(\),\n\s*canScroll: \(\) -> Boolean = \{ true \},\n\s*\/\/ TODO Load the motionScheme tokens from the component tokens file\n\s*snapAnimationSpec: AnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\),/d,
    note: 'AppBarWithSearch enter-always: settles a partly hidden bar (settleSearchBar)',
  },
  {
    kind: 'dp',
    name: `${P}-input-padding`,
    owner: TEXT_FIELD,
    member: 'TextFieldPadding',
    file: TEXT_FIELD,
    pattern: /internal val TextFieldPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'InputField: TextFieldDefaults.contentPaddingWithoutLabel() on both sides of the text',
  },
  {
    kind: 'dp',
    name: `${P}-result-padding-horizontal`,
    owner: 'SampleSearchResults',
    member: 'padding(horizontal)',
    file: SAMPLES,
    pattern: /\.padding\(horizontal = (\d+)\.dp, vertical = \d+\.dp\),/d,
    note: 'result rows of the SearchBarSamples (outside the ListItem, inside the clickable row)',
  },
  {
    kind: 'dp',
    name: `${P}-result-padding-vertical`,
    owner: 'SampleSearchResults',
    member: 'padding(vertical)',
    file: SAMPLES,
    pattern: /\.padding\(horizontal = \d+\.dp, vertical = (\d+)\.dp\),/d,
    note: 'result rows of the SearchBarSamples (outside the ListItem, inside the clickable row)',
  },
];

/** Upstream wiring the CSS and the elements rely on (search.css, search-layout.ts). */
const CHECKS: readonly [string, string, RegExp][] = [
  [
    SEARCH,
    'SearchBar: inputFieldShape, colors(), TonalElevation / ShadowElevation',
    /public fun SearchBar\(\n\s*state: SearchBarState,\n\s*inputField: @Composable \(\) -> Unit,\n\s*modifier: Modifier = Modifier,\n\s*shape: Shape = SearchBarDefaults\.inputFieldShape,\n\s*colors: SearchBarColors = SearchBarDefaults\.colors\(\),\n\s*tonalElevation: Dp = SearchBarDefaults\.TonalElevation,\n\s*shadowElevation: Dp = SearchBarDefaults\.ShadowElevation,/,
  ],
  [SEARCH, 'TonalElevation is Level0', /public val TonalElevation: Dp = ElevationTokens\.Level0/],
  [
    SEARCH,
    'inputFieldShape / dockedShape / fullScreenShape tokens',
    /public val inputFieldShape: Shape\n\s*@Composable get\(\) = SearchBarTokens\.ContainerShape\.value[\s\S]*?public val fullScreenShape: Shape\n\s*@Composable get\(\) = SearchViewTokens\.FullScreenContainerShape\.value[\s\S]*?public val dockedShape: Shape\n\s*@Composable get\(\) = SearchViewTokens\.DockedContainerShape\.value/,
  ],
  [
    SEARCH,
    'colors(): SearchBarTokens.ContainerColor, SearchViewTokens.DividerColor',
    /public fun colors\(\n\s*containerColor: Color = SearchBarTokens\.ContainerColor\.value,\n\s*dividerColor: Color = SearchViewTokens\.DividerColor\.value,\n\s*inputFieldColors: TextFieldColors = inputFieldColors\(\),/,
  ],
  [
    SEARCH,
    'inputFieldColors(): SearchBarTokens text / icon / placeholder colors, transparent container',
    /focusedTextColor: Color = SearchBarTokens\.InputTextColor\.value,[\s\S]*?cursorColor: Color = FilledTextFieldTokens\.CaretColor\.value,[\s\S]*?focusedLeadingIconColor: Color = SearchBarTokens\.LeadingIconColor\.value,[\s\S]*?focusedTrailingIconColor: Color = SearchBarTokens\.TrailingIconColor\.value,[\s\S]*?focusedPlaceholderColor: Color = SearchBarTokens\.SupportingTextColor\.value,[\s\S]*?focusedContainerColor: Color = Color\.Transparent,/,
  ],
  [
    SEARCH,
    'containedColors(): expanded fullScreenContainedSearchBarColor, input field collapsedContainedSearchBarColor',
    /public fun containedColors\(state: SearchBarState\): SearchBarColors \{\n\s*val containerColor =\n\s*if \(state\.isExpanded\) \{\n\s*fullScreenContainedSearchBarColor\n\s*\} else \{\n\s*collapsedContainedSearchBarColor\n\s*\}[\s\S]*?focusedContainerColor = collapsedContainedSearchBarColor,/,
  ],
  [
    SEARCH,
    'collapsedContainedSearchBarColor = SearchBarTokens.ContainerColor',
    /public val collapsedContainedSearchBarColor: Color\n\s*@Composable get\(\) = SearchBarTokens\.ContainerColor\.value/,
  ],
  [
    SEARCH,
    'appBarWithSearchColors(): AppBarTokens container / on-scroll / leading / trailing colors',
    /appBarContainerColor: Color = AppBarTokens\.ContainerColor\.value,\n\s*scrolledAppBarContainerColor: Color = AppBarTokens\.OnScrollContainerColor\.value,\n\s*appBarNavigationIconColor: Color = AppBarTokens\.LeadingIconColor\.value,\n\s*appBarActionIconColor: Color = AppBarTokens\.TrailingIconColor\.value,/,
  ],
  [
    SEARCH,
    'InputField: 360–720dp wide, at least InputFieldHeight tall; icons offset by SearchBarIconOffsetX',
    /\.sizeIn\(\n\s*minWidth = SearchBarMinWidth,\n\s*maxWidth = SearchBarMaxWidth,\n\s*minHeight = InputFieldHeight,\n\s*\)[\s\S]*?\{ Box\(Modifier\.offset\(x = SearchBarIconOffsetX\)\) \{ leading\(\) \} \}[\s\S]*?\{ Box\(Modifier\.offset\(x = -SearchBarIconOffsetX\)\) \{ trailing\(\) \} \}[\s\S]*?contentPadding = TextFieldDefaults\.contentPaddingWithoutLabel\(\),/,
  ],
  [
    SEARCH,
    'InputFieldHeight = SearchBarTokens.ContainerHeight',
    /public val InputFieldHeight: Dp = SearchBarTokens\.ContainerHeight/,
  ],
  [
    SEARCH,
    'InputField: ArrowDown expands (non-touch); typing and a click expand',
    /val expandOnDownKey = !isInTouchMode && !searchBarState\.isExpanded\n\s*if \(\n\s*expandOnDownKey &&\n\s*\(it\.key == Key\.DirectionDown[\s\S]*?DetectClickFromInteractionSource\(interactionSource\) \{\n\s*if \(!searchBarState\.isExpanded\) \{[\s\S]*?if \(currLength > prevLength && focused && !searchBarState\.isExpanded\) \{/,
  ],
  [
    SEARCH,
    'AppBarWithSearch layout: navigation / search / actions paddings, 360–720dp centered search bar',
    /Box\(Modifier\.padding\(start = AppBarWithSearchHorizontalPadding\)\)[\s\S]*?Modifier\.padding\(\n\s*horizontal = SearchBarAsTopBarPadding,\n\s*vertical = AppBarWithSearchVerticalPadding,\n\s*\)\n\s*\.widthIn\(min = SearchBarMinWidth, max = SearchBarMaxWidth\)\n\s*\.align\(Alignment\.Center\),[\s\S]*?Box\(Modifier\.padding\(end = AppBarWithSearchHorizontalPadding\)\)/,
  ],
  [
    SEARCH,
    'AppBarWithSearch colors: binary scrolled fraction; app bar color animated, search bar color not',
    /val colorTransitionFraction = if \(overlappingFraction > 0\.01f\) 1f else 0f[\s\S]*?val appBarContainerColor by\n\s*animateColorAsState\(targetAppBarContainerColor, animationSpec = animationSpec\.value\(\)\)\n\n\s*val searchBarContainerColor by\n\s*remember\(targetSearchBarContainerColor\) \{ mutableStateOf\(targetSearchBarContainerColor\) \}/,
  ],
  [
    SEARCH,
    'enter-always: the bar content moves by the whole offset and is clipped',
    /\.clipToBounds\(\)\n\s*\.layout \{ measurable, constraints ->\n\s*val placeable = measurable\.measure\(constraints\)\n\s*val scrollOffset = scrollState\.scrollOffset\.roundToInt\(\)\n\s*val scrolledHeight = \(placeable\.height \+ scrollOffset\)\.coerceAtLeast\(0\)\n\s*layout\(placeable\.width, scrolledHeight\) \{\n\s*placeable\.placeWithLayer\(0, scrollOffset\)/,
  ],
  [
    SEARCH,
    'full-screen views: contained input top padding AppBarWithSearchVerticalPadding, otherwise SearchBarVerticalPadding',
    /if \(isContained\) \{\n\s*AppBarWithSearchVerticalPadding\.roundToPx\(\)\n\s*\} else \{\n\s*SearchBarVerticalPadding\.roundToPx\(\)\n\s*\}/,
  ],
  [
    SEARCH,
    'ExpandedFullScreenContainedSearchBar pads the input field by FullScreenExpandedHorizontalPadding',
    /inputFieldPadding = PaddingValues\(horizontal = FullScreenExpandedHorizontalPadding\),\n\s*modifier = modifier,\n\s*collapsedShape = collapsedShape,\n\s*containerColor = colors\.containerColor,/,
  ],
  [
    SEARCH,
    'docked with gap: results slide by half their height once progress > 0.1',
    /derivedStateOf\(structuralEqualityPolicy\(\)\) \{ state\.progress > 0\.1f \}[\s\S]*?Modifier\.padding\(top = dropdownGapSize \?: 0\.dp\)[\s\S]*?initialOffset = \{\n\s*IntOffset\(x = 0, y = \(-it\.height \/ 2f\)\.roundToInt\(\)\)/,
  ],
  [
    SEARCH,
    'SearchBarState.currentValue: expanded above 0.02',
    /val threshold = 0\.02f \/\/ tolerance for spring anim/,
  ],
  [
    SAMPLES,
    'the scaffold samples pair the contained / with-gap views with their state functions',
    /val searchBarState = rememberContainedSearchBarState\(\)[\s\S]*?ExpandedFullScreenContainedSearchBar\([\s\S]*?val searchBarState = rememberSearchBarWithGapState\(\)[\s\S]*?ExpandedDockedSearchBarWithGap\(/,
  ],
  [
    TEXT_FIELD,
    'text field: text padded (padding - icon padding) beside an icon; icon padding = (48dp - 24dp) / 2',
    /val startPadding =\n\s*if \(leading != null\) \{\n\s*\(startTextFieldPadding - horizontalIconPadding\)\.coerceAtLeast\(0\.dp\)[\s\S]*?return \(\(interactiveSize - SmallIconButtonTokens\.IconSize\) \/ 2\)\.coerceAtLeast\(0\.dp\)/,
  ],
  [
    TEXT_FIELD_DEFAULTS,
    'contentPaddingWithoutLabel(): TextFieldPadding on every side',
    /public fun contentPaddingWithoutLabel\(\n\s*start: Dp = TextFieldPadding,\n\s*top: Dp = TextFieldPadding,\n\s*end: Dp = TextFieldPadding,\n\s*bottom: Dp = TextFieldPadding,/,
  ],
  [
    LIST_DEFAULTS,
    'ListItemDefaults.ContentPadding: ListTokens leading / trailing / top / bottom space',
    /start = InteractiveListStartPadding,\n\s*end = InteractiveListEndPadding,\n\s*top = InteractiveListTopPadding,\n\s*bottom = InteractiveListBottomPadding,[\s\S]*?ListTokens\.ItemTopSpace[\s\S]*?ListTokens\.ItemBottomSpace/,
  ],
  [
    LIST_ITEM,
    'ListItem: leading content end spacing and the start / end paddings are ListTokens',
    /internal val InteractiveListStartPadding\n\s*get\(\) = ListTokens\.ItemLeadingSpace\ninternal val InteractiveListEndPadding\n\s*get\(\) = ListTokens\.ItemTrailingSpace\ninternal val InteractiveListInternalSpacing\n\s*get\(\) = ListTokens\.ItemBetweenSpace/,
  ],
  [
    LIST_ITEM,
    'ListItem: one / two / three-line minimum heights (behind the flag below)',
    /ListItemType\.OneLine -> ListTokens\.ItemOneLineContainerHeight\n\s*ListItemType\.TwoLine -> ListTokens\.ItemTwoLineContainerHeight/,
  ],
  [
    FLAGS,
    'isExpressiveListItemHeightBasedOnTextLinesFixEnabled defaults to true',
    /public var isExpressiveListItemHeightBasedOnTextLinesFixEnabled: Boolean = true/,
  ],
];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** A dp member of a vendored token file. */
function tokenDp(tokens: Readonly<Record<string, string>>, object: string, member: string): number {
  const text = normalize(tokens[`${object}.kt`], `${object}.kt`);
  const match = new RegExp(`val ${member}: [\\w.]+\\n\\s*get\\(\\) = ([\\d.]+)\\.dp\\n`).exec(text);
  if (!match) throw new Error(`${object}.kt: ${member} is not a dp token`);
  return Number(match[1]);
}

/**
 * `sources`: vendored Material3 / samples files by name; `tokens`: the vendored token files by
 * name (the 12dp icon padding and the corner radius resolve token values).
 */
export function extractSearchDefaults(
  sources: Readonly<Record<string, string>>,
  tokens: Readonly<Record<string, string>>,
): SearchDefault[] {
  const texts = Object.fromEntries(
    SEARCH_DEFAULTS_SOURCES.map((file) => [file, normalize(sources[file], file)]),
  );
  for (const [file, what, pattern] of CHECKS) {
    if (!pattern.test(texts[file]!)) throw new Error(`${file}: ${what} (changed upstream?)`);
  }

  const out = RULES.flatMap((rule): SearchDefault[] => {
    const text = texts[rule.file]!;
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${rule.file}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const line = text.slice(0, at).split('\n').length;
    const captured = match[1]!;
    const base = {
      name: rule.name,
      owner: rule.owner,
      member: rule.member,
      file: rule.file,
      line,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    switch (rule.kind) {
      case 'dp':
        return [{ ...base, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` }];
      case 'ratio': {
        const [a, b] = captured.split(' / ').map((p) => Number.parseFloat(p)) as [number, number];
        return [{ ...base, value: `calc(${String(a)} / ${String(b)})`, js: a / b, raw: captured }];
      }
      case 'ref': {
        if (captured === 'InputFieldHeight / 2') {
          const height = tokenDp(tokens, 'SearchBarTokens', 'ContainerHeight');
          return [
            {
              ...base,
              value: `${String(height / 2)}px`,
              js: height / 2,
              raw: `InputFieldHeight / 2 = SearchBarTokens.ContainerHeight / 2 = ${String(height)}.dp / 2`,
            },
          ];
        }
        // Component CSS references sys tokens only: resolve the ScrimTokens members.
        const scrim = normalize(tokens['ScrimTokens.kt'], 'ScrimTokens.kt');
        if (captured === 'ScrimTokens.ContainerColor') {
          const role =
            /val ContainerColor: ColorToken\n\s*get\(\) = ColorSchemeKeyTokens\.(\w+)/.exec(
              scrim,
            )?.[1];
          if (role === undefined) throw new Error('ScrimTokens.kt: ContainerColor not found');
          const value = `var(--m3e-sys-color-${kebabName(role)})`;
          return [
            {
              ...base,
              value,
              js: value,
              raw: `ScrimTokens.ContainerColor = ColorSchemeKeyTokens.${role}`,
            },
          ];
        }
        if (captured === 'ScrimTokens.ContainerOpacity') {
          const opacity = /const val ContainerOpacity = ([\d.]+)f/.exec(scrim)?.[1];
          if (opacity === undefined) throw new Error('ScrimTokens.kt: ContainerOpacity not found');
          return [
            {
              ...base,
              value: String(Number(opacity)),
              js: Number(opacity),
              raw: `ScrimTokens.ContainerOpacity = ${opacity}f`,
            },
          ];
        }
        throw new Error(`${rule.file}: unexpected reference ${captured}`);
      }
      case 'color': {
        const value = `var(--m3e-sys-color-${kebabName(captured)})`;
        return [{ ...base, value, js: value, raw: `ColorSchemeKeyTokens.${captured}` }];
      }
      case 'elevation': {
        const level = kebabName(captured);
        return [
          {
            ...base,
            value: `var(--m3e-sys-elevation-${level})`,
            js: `var(--m3e-sys-elevation-${level})`,
            raw: `ElevationTokens.${captured}`,
          },
          {
            ...base,
            name: rule.name.replace(/-elevation$/, ''),
            value: `var(--m3e-sys-elevation-${level}-shadow)`,
            js: `var(--m3e-sys-elevation-${level}-shadow)`,
            raw: `ElevationTokens.${captured}`,
            note: 'derived: box-shadow of the referenced elevation level',
          },
        ];
      }
      case 'duration': {
        const value = `var(--m3e-sys-motion-duration-${kebabName(captured.replace(/^Duration/, ''))})`;
        return [{ ...base, value, js: value, raw: `MotionTokens.${captured}` }];
      }
      case 'easing': {
        const value = `var(--m3e-sys-motion-easing-${kebabName(captured.replace(/^Easing/, ''))})`;
        return [{ ...base, value, js: value, raw: `MotionTokens.${captured}CubicBezier` }];
      }
      case 'motion':
        return SPRING_FIELDS.map((field) => ({
          ...base,
          name: `${rule.name}-${field}`,
          value: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
          js: `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`,
          raw: `MotionSchemeKeyTokens.${captured}`,
        }));
    }
  });

  // The text's start padding beside an icon: TextFieldPadding − (48dp − SmallIconButtonTokens.IconSize) / 2.
  const interactive =
    /val LocalMinimumInteractiveComponentSize: ProvidableCompositionLocal<Dp> =\s*staticCompositionLocalOf \{\s*(\d+)\.dp/d.exec(
      texts[INTERACTIVE]!,
    );
  const formula = /internal fun textFieldHorizontalIconPadding\(\): Dp \{/d.exec(
    texts[TEXT_FIELD]!,
  );
  if (!interactive || !formula) throw new Error(`${TEXT_FIELD}: icon padding inputs not found`);
  const icon = tokenDp(tokens, 'SmallIconButtonTokens', 'IconSize');
  const iconPadding = (Number(interactive[1]) - icon) / 2;
  const formulaLine = texts[TEXT_FIELD]!.slice(0, formula.index).split('\n').length;
  out.push({
    name: `${P}-input-icon-padding`,
    value: `${String(iconPadding)}px`,
    js: iconPadding,
    raw: `(LocalMinimumInteractiveComponentSize ${interactive[1]!}.dp - SmallIconButtonTokens.IconSize ${String(icon)}.dp) / 2`,
    owner: TEXT_FIELD,
    member: 'textFieldHorizontalIconPadding',
    file: TEXT_FIELD,
    line: formulaLine,
    note: 'InputField: the text starts input-padding − this after a leading icon (and ends as far before a trailing one)',
  });
  return out;
}
