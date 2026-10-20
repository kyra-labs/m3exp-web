// Values Compose's tab rows and tabs render (TabRow.kt, Tab.kt) that are not in
// PrimaryNavigationTabTokens / SecondaryNavigationTabTokens:
// - TabRowDefaults: ScrollableTabRowMinTabWidth (90dp), ScrollableTabRowEdgeStartPadding (52dp),
//   the row colors (primaryContainerColor / primaryContentColor and the secondary pair), the
//   PrimaryIndicator / SecondaryIndicator defaults (the secondary indicator reads the *primary*
//   tokens' height and color and has no shape) and the 24dp minimum indicator width the rows
//   enforce ("minimum touch target of 24.dp");
// - Tab.kt's private layout literals: SmallTabHeight (= ContainerHeight 48dp), LargeTabHeight 72dp
//   (PrimaryNavigationTabTokens.IconAndLabelTextContainerHeight 64dp is not read),
//   HorizontalTextPadding 16dp, SingleLineTextBaselineWithIcon 14dp, IconDistanceFromBaseline
//   20sp, TextDistanceFromLeadingIcon 8dp, and the label style (PrimaryNavigationTabTokens
//   .LabelTextFont for every tab, primary or secondary);
// - the divider every row draws (HorizontalDivider(): DividerTokens; SecondaryNavigationTabTokens
//   .DividerColor / DividerHeight are not read);
// - the motion: the indicator offset and width on DefaultSpatial (fixed and scrollable rows), the
//   scroll to the selected tab on DefaultSpatial, the content color on DefaultEffects (to
//   selected) / FastEffects (to unselected) (all under upstream "TODO Load the motionScheme tokens
//   from the component tokens file").
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// tabs.css and m3e-motion's tabs port assume changes upstream.
// From m3.material.io where Compose has nothing (no badge API on Tab, no stacked-tab badge
// sample): the badge's overlap on a stacked tab's icon (Tabs › Specs, D20 (1)).
import { type FontMetrics, baselineShiftLiteral } from './compose-literals.js';
import { kebabName } from './names.js';

export interface TabsDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value. */
  value: string;
  /** JS value for components.ts (dp number or the CSS string). */
  js: number | string;
  /** Source expression as written upstream. */
  raw: string;
  owner: string;
  member: string;
  /** Vendored file name. */
  file: string;
  line: number;
  /** Citation for a value that does not come from an androidx file. */
  cite?: string;
  note?: string;
}

const ROW = 'TabRow.kt';
const TAB = 'Tab.kt';
const SAMPLES = 'TabSamples.kt';

export const TABS_DEFAULTS_SOURCES = [ROW, TAB, SAMPLES];

const P = '--m3e-comp-tabs';
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;
const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

type Kind = 'dp' | 'count' | 'zero' | 'motion' | 'token' | 'type' | 'divider';

interface Rule {
  kind: Kind;
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group: a dp literal, a motion key, a `<Object>.<Member>` token reference. */
  pattern: RegExp;
  note?: string;
}

const MOTION_TODO = String.raw`\/\/ TODO Load the motionScheme tokens from the component tokens file\n`;

const RULES: readonly Rule[] = [
  {
    kind: 'dp',
    name: `${P}-scrollable-min-tab-width`,
    owner: 'TabRowDefaults',
    member: 'ScrollableTabRowMinTabWidth',
    file: ROW,
    pattern: /public val ScrollableTabRowMinTabWidth: Dp = (\d+)\.dp/d,
    note: 'minTabWidth of PrimaryScrollableTabRow / SecondaryScrollableTabRow: each tab is at least this wide',
  },
  {
    kind: 'dp',
    name: `${P}-scrollable-edge-padding`,
    owner: 'TabRowDefaults',
    member: 'ScrollableTabRowEdgeStartPadding',
    file: ROW,
    pattern: /public val ScrollableTabRowEdgeStartPadding: Dp = (\d+)\.dp/d,
    note: 'edgePadding: before the first and after the last tab (the layout is padding * 2 + the tabs wide)',
  },
  {
    kind: 'dp',
    name: `${P}-indicator-min-width`,
    owner: 'TabRowImpl / ScrollableTabRowImpl',
    member: 'contentWidth',
    file: ROW,
    pattern:
      /\/\/ Enforce minimum touch target of 24\.dp\n\s*val indicatorWidth = maxOf\(contentWidth, (\d+)\.dp\)/d,
    note: 'TabPosition.contentWidth = the tab content width (its intrinsic width less 2 × HorizontalTextPadding), at least this (scrollable rows: L608)',
  },
  {
    kind: 'token',
    name: `${P}-primary-container-color`,
    owner: 'TabRowDefaults',
    member: 'primaryContainerColor',
    file: ROW,
    pattern:
      /public val primaryContainerColor: Color\n\s*@Composable get\(\) = (PrimaryNavigationTabTokens\.ContainerColor)\.value/d,
  },
  {
    kind: 'token',
    name: `${P}-secondary-container-color`,
    owner: 'TabRowDefaults',
    member: 'secondaryContainerColor',
    file: ROW,
    pattern:
      /public val secondaryContainerColor: Color\n\s*@Composable get\(\) = (SecondaryNavigationTabTokens\.ContainerColor)\.value/d,
  },
  {
    kind: 'token',
    name: `${P}-primary-content-color`,
    owner: 'TabRowDefaults',
    member: 'primaryContentColor',
    file: ROW,
    pattern:
      /public val primaryContentColor: Color\n\s*@Composable get\(\) = (PrimaryNavigationTabTokens\.ActiveLabelTextColor)\.value/d,
    note: 'LocalContentColor inside the row: a Tab’s selectedContentColor and, by default, its unselectedContentColor (= selectedContentColor, Tab.kt L99) and ripple color; the Inactive*/Hover*/Focus*/Pressed* tokens are not read',
  },
  {
    kind: 'token',
    name: `${P}-secondary-content-color`,
    owner: 'TabRowDefaults',
    member: 'secondaryContentColor',
    file: ROW,
    pattern:
      /public val secondaryContentColor: Color\n\s*@Composable get\(\) = (SecondaryNavigationTabTokens\.ActiveLabelTextColor)\.value/d,
    note: 'as primaryContentColor: selected, unselected (default) and ripple color',
  },
  {
    kind: 'token',
    name: `${P}-primary-indicator-height`,
    owner: 'TabRowDefaults',
    member: 'PrimaryIndicator(height)',
    file: ROW,
    pattern:
      /public fun PrimaryIndicator\([\s\S]*?height: Dp = (PrimaryNavigationTabTokens\.ActiveIndicatorHeight),/d,
    note: 'width = Dp.Unspecified in the rows: the selected tab’s contentWidth (tabIndicatorOffset matchContentSize = true)',
  },
  {
    kind: 'token',
    name: `${P}-primary-indicator-color`,
    owner: 'TabRowDefaults',
    member: 'PrimaryIndicator(color)',
    file: ROW,
    pattern:
      /public fun PrimaryIndicator\([\s\S]*?color: Color = (PrimaryNavigationTabTokens\.ActiveIndicatorColor)\.value,/d,
  },
  {
    kind: 'token',
    name: `${P}-primary-indicator-shape`,
    owner: 'TabRowDefaults',
    member: 'PrimaryIndicator(shape)',
    file: ROW,
    pattern:
      /public fun PrimaryIndicator\([\s\S]*?shape: Shape = (PrimaryNavigationTabTokens\.ActiveIndicatorShape),/d,
    note: 'RoundedCornerShape(3.0.dp): all four corners (m3.material.io: 3, 3, 0, 0)',
  },
  {
    kind: 'token',
    name: `${P}-secondary-indicator-height`,
    owner: 'TabRowDefaults',
    member: 'SecondaryIndicator(height)',
    file: ROW,
    pattern:
      /public fun SecondaryIndicator\(\n\s*modifier: Modifier = Modifier,\n\s*height: Dp = (PrimaryNavigationTabTokens\.ActiveIndicatorHeight),/d,
    note: 'the primary token (3dp; m3.material.io: 2dp); full tab width (tabIndicatorOffset matchContentSize = false)',
  },
  {
    kind: 'token',
    name: `${P}-secondary-indicator-color`,
    owner: 'TabRowDefaults',
    member: 'SecondaryIndicator(color)',
    file: ROW,
    pattern:
      /public fun SecondaryIndicator\([\s\S]*?color: Color = (PrimaryNavigationTabTokens\.ActiveIndicatorColor)\.value,\n\s*\) \{\n\s*Box\(modifier\.fillMaxWidth\(\)\.height\(height\)\.background\(color = color\)\)/d,
  },
  {
    kind: 'zero',
    name: `${P}-secondary-indicator-shape`,
    owner: 'TabRowDefaults',
    member: 'SecondaryIndicator',
    file: ROW,
    pattern:
      /public fun SecondaryIndicator\([\s\S]*?Box\(modifier\.fillMaxWidth\(\)\.height\(height\)\.(background)\(color = color\)\)/d,
    note: 'background without a shape: a rectangle',
  },
  {
    kind: 'divider',
    name: `${P}-divider`,
    owner: 'PrimaryTabRow / SecondaryTabRow',
    member: 'divider',
    file: ROW,
    pattern: /divider: @Composable \(\) -> Unit = @Composable \{ (HorizontalDivider)\(\) \},/d,
    note: 'DividerDefaults (DividerTokens); full row width at the bottom, under the indicator, inside the row height. SecondaryNavigationTabTokens.DividerColor / DividerHeight are not read',
  },
  {
    kind: 'motion',
    name: `${P}-indicator`,
    owner: 'TabRowImpl',
    member: 'tabIndicatorAnimationSpec',
    file: ROW,
    pattern: new RegExp(
      MOTION_TODO +
        String.raw`\s*val tabIndicatorAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Dp>\(\)`,
      'd',
    ),
    note: 'TabIndicatorOffsetNode: the indicator offset and width are two Animatables retargeted from their current value and velocity (scrollable rows: L526-527)',
  },
  {
    kind: 'motion',
    name: `${P}-scroll`,
    owner: 'ScrollableTabRowImpl',
    member: 'scrollAnimationSpec',
    file: ROW,
    pattern: new RegExp(
      MOTION_TODO +
        String.raw`\s*val scrollAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)\n\s*val tabIndicatorAnimationSpec`,
      'd',
    ),
    note: 'ScrollableTabData: scrollState.animateScrollTo the selected tab centred (clamped), from rest; jumps under reduced motion',
  },
  {
    kind: 'dp',
    name: `${P}-horizontal-text-padding`,
    owner: TAB,
    member: 'HorizontalTextPadding',
    file: TAB,
    pattern: /internal val HorizontalTextPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'each side of the text (Tab) and of the LeadingIconTab row',
  },
  {
    kind: 'token',
    name: `${P}-small-tab-height`,
    owner: TAB,
    member: 'SmallTabHeight',
    file: TAB,
    pattern:
      /private val SmallTabHeight\n\s*get\(\) = (PrimaryNavigationTabTokens\.ContainerHeight)/d,
    note: 'text-only and icon-only tabs (at least; content + IconDistanceFromBaseline when taller) and LeadingIconTab (exactly)',
  },
  {
    kind: 'dp',
    name: `${P}-large-tab-height`,
    owner: TAB,
    member: 'LargeTabHeight',
    file: TAB,
    pattern: /private val LargeTabHeight\n\s*get\(\) = (\d+)\.dp/d,
    note: 'icon + text tabs (at least); PrimaryNavigationTabTokens.IconAndLabelTextContainerHeight (64dp, also m3.material.io) is not read',
  },
  {
    kind: 'dp',
    name: `${P}-single-line-text-baseline-with-icon`,
    owner: TAB,
    member: 'SingleLineTextBaselineWithIcon',
    file: TAB,
    pattern: /private val SingleLineTextBaselineWithIcon\n\s*get\(\) = (\d+)\.dp/d,
    note: 'from the top of the indicator (ActiveIndicatorHeight above the bottom) to the text baseline of an icon + text tab',
  },
  {
    kind: 'dp',
    name: `${P}-icon-distance-from-baseline`,
    owner: TAB,
    member: 'IconDistanceFromBaseline',
    file: TAB,
    pattern: /private val IconDistanceFromBaseline\n\s*get\(\) = (\d+)\.sp/d,
    note: '20.sp (px on the web): the icon bottom to the first text baseline; also the extra height over the content (tabHeight = max(spec height, icon + text + this))',
  },
  {
    kind: 'dp',
    name: `${P}-leading-icon-label-space`,
    owner: TAB,
    member: 'TextDistanceFromLeadingIcon',
    file: TAB,
    pattern: /private val TextDistanceFromLeadingIcon\n\s*get\(\) = (\d+)\.dp/d,
    note: 'LeadingIconTab: Spacer(requiredWidth) between the icon and the text',
  },
  {
    kind: 'type',
    name: `${P}-label-text`,
    owner: TAB,
    member: 'styledText',
    file: TAB,
    pattern:
      /val style =\n\s*(PrimaryNavigationTabTokens\.LabelTextFont)\.value\.copy\(textAlign = TextAlign\.Center\)\n\s*ProvideTextStyle\(style, content = text\)\n\s*\}\n\s*\}\n\s*Tab\(/d,
    note: 'every Tab and LeadingIconTab (primary or secondary row), centred',
  },
  {
    kind: 'count',
    name: `${P}-label-max-lines`,
    owner: 'PrimaryTextTabs',
    member: 'Text(maxLines)',
    file: SAMPLES,
    pattern:
      /fun PrimaryTextTabs\(\)[\s\S]*?text = \{ Text\(text = title, maxLines = (\d+), overflow = TextOverflow\.Ellipsis\) \},/d,
    note: 'fixed-row samples (Compose catalog: primary / secondary text and icon tabs): labels wrap to two lines, then ellipsize; scrollable rows keep one line (Text(title) at its intrinsic width)',
  },
  {
    kind: 'motion',
    name: `${P}-content-color-in`,
    owner: 'TabTransition',
    member: 'animateColor (false → true)',
    file: TAB,
    pattern:
      /if \(false isTransitioningTo true\) \{\n\s*\/\/ Fade-in\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'LocalContentColor towards selectedContentColor',
  },
  {
    kind: 'motion',
    name: `${P}-content-color-out`,
    owner: 'TabTransition',
    member: 'animateColor (true → false)',
    file: TAB,
    pattern: /\} else \{\n\s*\/\/ Fade-out\n\s*MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'LocalContentColor towards unselectedContentColor',
  },
];

/** m3.material.io page of the stacked-tab badge overlap (read 2026-10-13). */
const PAGE =
  'm3.material.io Tabs › Specs › Measurements (_dsm/content/m3/2026-10-13_06-10-19/f37f47ba-8e67-4f1e-98a3-3bea94879e52.json)';

/** Values from m3.material.io (Compose has no stacked-tab badge). */
const M3_ROWS: readonly TabsDefault[] = [
  {
    name: `${P}-stacked-badge-overlap`,
    value: '6px',
    js: 6,
    raw: 'Overlap of badge on stacked icon = 6dp',
    owner: 'm3.material.io',
    member: 'Measurements › Overlap of badge on stacked icon',
    file: 'm3.material.io',
    line: 0,
    cite: PAGE,
    note: 'D20 (1): a stacked tab (icon above the label) badges its icon; the badge’s inline overlap on the icon, dot or count (the anatomy draws a count on the icon); vertically the BadgedBox offsets (Badge.kt). Text-only and leading-icon tabs keep the badge on the label (BadgedBox, TabSamples.kt LeadingIconTabs; D20 (1))',
  },
];

/** Wiring tabs.css, m3e-motion's tabs port and the elements' TabsLayout assume. */
const CHECKS: readonly [string, string, RegExp][] = [
  [
    ROW,
    'PrimaryTabRow: PrimaryIndicator with tabIndicatorOffset(matchContentSize = true), width Unspecified',
    /public fun PrimaryTabRow\([\s\S]*?TabRowDefaults\.PrimaryIndicator\(\n\s*modifier = Modifier\.tabIndicatorOffset\(selectedTabIndex, matchContentSize = true\),\n\s*width = Dp\.Unspecified,/,
  ],
  [
    ROW,
    'SecondaryTabRow: SecondaryIndicator with tabIndicatorOffset(matchContentSize = false)',
    /public fun SecondaryTabRow\([\s\S]*?TabRowDefaults\.SecondaryIndicator\(\n\s*Modifier\.tabIndicatorOffset\(selectedTabIndex, matchContentSize = false\)/,
  ],
  [
    ROW,
    'fixed rows: equal tab widths (row width / tab count), height = the tallest tab',
    /tabWidth = \(tabRowWidth \/ tabCount\)[\s\S]*?maxOf\(curr\.maxIntrinsicHeight\(tabWidth\), max\)/,
  ],
  [
    ROW,
    'fixed rows: contentWidth = min(intrinsic width, tab width) − 2 × HorizontalTextPadding',
    /minOf\(tabMeasurables\[index\]\.maxIntrinsicWidth\(tabRowHeight\), tabWidth\)\n\s*\.toDp\(\)\n\s*contentWidth -= HorizontalTextPadding \* 2/,
  ],
  [
    ROW,
    'scrollable rows: tab width = max(minTabWidth, measured); contentWidth = intrinsic − 2 × HorizontalTextPadding (≥ 24dp)',
    /val tabWidth = maxOf\(minTabWidth, tabPlaceables\[index\]\.width\.toDp\(\)\)[\s\S]*?maxOf\(indicatorWidth\[index\]\.toDp\(\) - \(HorizontalTextPadding \* 2\), 24\.dp\)/,
  ],
  [
    ROW,
    'TabIndicatorOffsetNode: width and offset Animatables retargeted with animateTo (velocity kept); RTL negates the offset',
    /coroutineScope\.launch \{ widthAnim\.animateTo\(currentTabWidth, animationSpec\) \}[\s\S]*?coroutineScope\.launch \{ offsetAnim\.animateTo\(indicatorOffset, animationSpec\) \}[\s\S]*?-\(offsetAnimatable\?\.value \?: indicatorOffset\)/,
  ],
  [
    ROW,
    'ScrollableTabData: centre the selected tab, clamped to the scroll range',
    /val centeredTabOffset = tabOffset - \(scrollerCenter - tabWidth \/ 2\)[\s\S]*?return centeredTabOffset\.coerceIn\(0, availableSpace\)/,
  ],
  [
    TAB,
    'Tab: unselectedContentColor defaults to selectedContentColor (LocalContentColor); ripple in selectedContentColor',
    /selectedContentColor: Color = LocalContentColor\.current,\n\s*unselectedContentColor: Color = selectedContentColor,\n\s*interactionSource: MutableInteractionSource\? = null,\n\s*content: @Composable ColumnScope\.\(\) -> Unit,\n\s*\) \{[\s\S]*?val ripple = ripple\(bounded = true, color = selectedContentColor\)/,
  ],
  [
    TAB,
    'icon + text tab: text baseline offset = SingleLineTextBaselineWithIcon + ActiveIndicatorHeight; icon IconDistanceFromBaseline above it',
    /baselineOffset\.roundToPx\(\) \+\n\s*PrimaryNavigationTabTokens\.ActiveIndicatorHeight\.roundToPx\(\)[\s\S]*?iconPlaceable\.height \+ IconDistanceFromBaseline\.roundToPx\(\) - firstBaseline/,
  ],
  [
    TAB,
    'LeadingIconTab: SmallTabHeight row, HorizontalTextPadding, icon + TextDistanceFromLeadingIcon + text, centred',
    /\.height\(SmallTabHeight\)[\s\S]*?\.padding\(horizontal = HorizontalTextPadding\)[\s\S]*?horizontalArrangement = Arrangement\.Center,[\s\S]*?Spacer\(Modifier\.requiredWidth\(TextDistanceFromLeadingIcon\)\)/,
  ],
];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** `PrimaryNavigationTabTokens.ActiveIndicatorHeight` → its generated custom property. */
const tokenVar = (ref: string) => {
  const [object, member] = ref.split('.') as [string, string];
  return `var(--m3e-comp-${kebabName(object.replace(/Tokens$/, ''))}-${kebabName(member)})`;
};

/**
 * `sources`: vendored Material3 files and samples by name (TabRow.kt, Tab.kt, TabSamples.kt);
 * `font`: Google Sans Flex's hhea metrics (the fonts manifest), for the label baseline.
 */
export function extractTabsDefaults(
  sources: Readonly<Record<string, string>>,
  font: FontMetrics,
): TabsDefault[] {
  const texts = Object.fromEntries(
    TABS_DEFAULTS_SOURCES.map((file) => [file, normalize(sources[file], file)]),
  );
  for (const [file, what, pattern] of CHECKS) {
    if (!pattern.test(texts[file]!)) throw new Error(`${file}: ${what} (changed upstream?)`);
  }
  const out = RULES.flatMap((rule): TabsDefault[] => {
    const text = texts[rule.file]!;
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${rule.file}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const captured = match[1]!;
    const base = {
      name: rule.name,
      owner: rule.owner,
      member: rule.member,
      file: rule.file,
      line: text.slice(0, at).split('\n').length,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    switch (rule.kind) {
      case 'dp': {
        const unit = text.slice(at, at + captured.length + 3).includes('.sp') ? 'sp' : 'dp';
        return [
          { ...base, value: `${captured}px`, js: Number(captured), raw: `${captured}.${unit}` },
        ];
      }
      case 'count':
        return [{ ...base, value: captured, js: Number(captured), raw: `maxLines = ${captured}` }];
      case 'zero':
        return [{ ...base, value: '0px', js: 0, raw: `Modifier.${captured}(color) (no shape)` }];
      case 'token':
        return [{ ...base, value: tokenVar(captured), js: tokenVar(captured), raw: captured }];
      case 'type': {
        const prefix = tokenVar(captured)
          .replace(/-font\)$/, '')
          .replace(/^var\(/, '');
        return TYPE_FIELDS.map((field) => ({
          ...base,
          name: `${rule.name}-${field}`,
          value: `var(${prefix}-${field})`,
          js: `var(${prefix}-${field})`,
          raw: captured,
        }));
      }
      case 'divider':
        return (['thickness', 'color'] as const).map((field) => ({
          ...base,
          name: `${rule.name}-${field}`,
          value: `var(--m3e-comp-divider-${field})`,
          js: `var(--m3e-comp-divider-${field})`,
          raw: `${captured}() = DividerDefaults.${field === 'color' ? 'color' : 'Thickness'}`,
        }));
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
  // The text baseline Compose places by (Tab.kt placeTextAndIcon: firstBaseline / lastBaseline).
  out.push(
    baselineShiftLiteral(
      `${P}-label-baseline-shift`,
      font,
      'the label baseline sits this × the font size below the middle of its line box: an icon + text tab places its label from it (tabs.css)',
    ),
  );
  out.push(...M3_ROWS);
  return out;
}
