// Values Compose's menus render that are literals in Menu.kt, MenuDefaults.kt and the Android
// DropdownMenu actual rather than Menu*Tokens: item and group paddings, the item width range, the
// open/close scale and alpha targets, and the popup margins DropdownMenuPositionProvider keeps from
// the window edges. Each is read with a targeted regex and cited by the line of the value.
// Touch sizing: `shouldUsePrecisionPointerComponentSizing` is an opt-in flag
// (ComposeMaterial3Flags.isPrecisionPointerComponentSizingEnabled), so its `else` branch is used.

export interface MenuDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value (px for dp, plain number for unitless targets). */
  value: string;
  /** The number behind the value (dp, scale or alpha). */
  number: number;
  /** Source text of the value. */
  raw: string;
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

interface Rule {
  name: string;
  owner: string;
  member: string;
  file: string;
  /** First capture group is the value; `d` flag required for its line. */
  pattern: RegExp;
  unit: 'dp' | 'float';
  note?: string;
}

const MENU = 'Menu.kt';
const DEFAULTS = 'MenuDefaults.kt';
const ANDROID = 'AndroidMenu.android.kt';
const TOUCH = 'touch sizing (precision-pointer sizing is an opt-in flag)';

const RULES: readonly Rule[] = [
  {
    name: '--m3e-comp-menu-vertical-margin',
    owner: MENU,
    member: 'MenuVerticalMargin',
    file: MENU,
    pattern: /internal val MenuVerticalMargin\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'DropdownMenuPositionProvider.verticalMargin: distance kept from the window top/bottom',
  },
  {
    name: '--m3e-comp-menu-horizontal-margin',
    owner: MENU,
    member: 'MenuHorizontalMargin',
    file: MENU,
    pattern: /internal val MenuHorizontalMargin\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'DropdownMenuPositionProvider.horizontalMargin default (DropdownMenuPopup)',
  },
  {
    name: '--m3e-comp-menu-baseline-horizontal-margin',
    owner: 'DropdownMenu (Android actual)',
    member: 'DropdownMenuPositionProvider(horizontalMargin)',
    file: ANDROID,
    pattern:
      /public actual fun DropdownMenu\([\s\S]*?DropdownMenuPositionProvider\([\s\S]*?horizontalMargin = (\d+),/d,
    unit: 'dp',
    note: 'DropdownMenu passes 0 (px) instead of MenuHorizontalMargin',
  },
  {
    name: '--m3e-comp-menu-baseline-vertical-padding',
    owner: MENU,
    member: 'DropdownMenuVerticalPadding',
    file: MENU,
    pattern: /internal val DropdownMenuVerticalPadding\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'DropdownMenuContent column padding (vertical)',
  },
  {
    name: '--m3e-comp-menu-baseline-item-height',
    owner: MENU,
    member: 'MenuListItemContainerHeight',
    file: MENU,
    pattern: /private val MenuListItemContainerHeight\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'min height of the non-expressive DropdownMenuItem',
  },
  {
    name: '--m3e-comp-menu-item-horizontal-padding',
    owner: MENU,
    member: 'DropdownMenuItemHorizontalPadding',
    file: MENU,
    pattern: /internal val DropdownMenuItemHorizontalPadding\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'content padding (start/end) of every item; label-to-icon space in the non-expressive item',
  },
  {
    name: '--m3e-comp-menu-item-vertical-padding',
    owner: 'MenuDefaults',
    member: 'SelectableItemVerticalPadding',
    file: DEFAULTS,
    pattern: /private val SelectableItemVerticalPadding = (\d+)\.dp/d,
    unit: 'dp',
    note: 'DropdownMenuSelectableItemContentPadding (top/bottom)',
  },
  {
    name: '--m3e-comp-menu-item-outer-padding-horizontal',
    owner: MENU,
    member: 'DropdownMenuSelectableItemPadding',
    file: MENU,
    pattern:
      /private val DropdownMenuSelectableItemPadding = PaddingValues\(horizontal = (\d+)\.dp\)/d,
    unit: 'dp',
    note: 'outside the item surface (expressive items)',
  },
  {
    name: '--m3e-comp-menu-item-outer-padding-vertical-supporting',
    owner: MENU,
    member: 'DropdownMenuSelectableItemWithSupportTexPadding (vertical)',
    file: MENU,
    pattern:
      /private val DropdownMenuSelectableItemWithSupportTexPadding =\s*PaddingValues\(horizontal = \d+\.dp, vertical = (\d+)\.dp\)/d,
    unit: 'dp',
    note: 'outside the item surface when it has supporting text',
  },
  {
    name: '--m3e-comp-menu-item-icon-label-space',
    owner: 'MenuDefaults',
    member: 'itemHorizontalArrangement (spacing)',
    file: DEFAULTS,
    pattern:
      /internal fun itemHorizontalArrangement\([\s\S]*?val spacing = if \(shouldUsePrecisionPointerComponentSizing\.value\) \d+\.dp else (\d+)\.dp/d,
    unit: 'dp',
    note: `MenuArrangement spacing; ${TOUCH}`,
  },
  {
    name: '--m3e-comp-menu-item-min-width',
    owner: MENU,
    member: 'DropdownMenuItemDefaultMinWidth',
    file: MENU,
    pattern: /internal val DropdownMenuItemDefaultMinWidth\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
  },
  {
    name: '--m3e-comp-menu-item-max-width',
    owner: MENU,
    member: 'DropdownMenuItemDefaultMaxWidth',
    file: MENU,
    pattern: /internal val DropdownMenuItemDefaultMaxWidth\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
  },
  {
    name: '--m3e-comp-menu-group-vertical-padding',
    owner: MENU,
    member: 'DropdownMenuGroupVerticalPadding',
    file: MENU,
    pattern: /internal val DropdownMenuGroupVerticalPadding\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'MenuDefaults.DropdownMenuGroupContentPadding (vertical)',
  },
  {
    name: '--m3e-comp-menu-group-label-min-height',
    owner: MENU,
    member: 'DropdownMenuGroupDefaultMinHeight',
    file: MENU,
    pattern: /internal val DropdownMenuGroupDefaultMinHeight\s+get\(\) = (\d+)\.dp/d,
    unit: 'dp',
    note: 'MenuDefaults.DropdownMenuGroupLabel',
  },
  {
    name: '--m3e-comp-menu-group-label-padding-start',
    owner: 'MenuDefaults',
    member: 'DropdownMenuGroupLabelHorizontalPadding (start)',
    file: DEFAULTS,
    pattern:
      /public val DropdownMenuGroupLabelHorizontalPadding: PaddingValues =\s*PaddingValues\(start = (\d+)\.dp, end = \d+\.dp\)/d,
    unit: 'dp',
  },
  {
    name: '--m3e-comp-menu-group-label-padding-end',
    owner: 'MenuDefaults',
    member: 'DropdownMenuGroupLabelHorizontalPadding (end)',
    file: DEFAULTS,
    pattern:
      /public val DropdownMenuGroupLabelHorizontalPadding: PaddingValues =\s*PaddingValues\(start = \d+\.dp, end = (\d+)\.dp\)/d,
    unit: 'dp',
  },
  {
    name: '--m3e-comp-menu-divider-padding-horizontal',
    owner: 'MenuDefaults',
    member: 'HorizontalDividerPadding (horizontal)',
    file: DEFAULTS,
    pattern:
      /public val HorizontalDividerPadding: PaddingValues =\s*PaddingValues\(horizontal = (\d+)\.dp, vertical = \d+\.dp\)/d,
    unit: 'dp',
  },
  {
    name: '--m3e-comp-menu-divider-padding-vertical',
    owner: 'MenuDefaults',
    member: 'HorizontalDividerPadding (vertical)',
    file: DEFAULTS,
    pattern:
      /public val HorizontalDividerPadding: PaddingValues =\s*PaddingValues\(horizontal = \d+\.dp, vertical = (\d+)\.dp\)/d,
    unit: 'dp',
  },
  {
    name: '--m3e-comp-menu-closed-scale',
    owner: MENU,
    member: 'ClosedScaleTarget',
    file: MENU,
    pattern: /internal const val ClosedScaleTarget = ([\d.]+)f/d,
    unit: 'float',
    note: 'open/close scale (fast spatial spring); ExpandedScaleTarget = 1',
  },
  {
    name: '--m3e-comp-menu-closed-opacity',
    owner: MENU,
    member: 'ClosedAlphaTarget',
    file: MENU,
    pattern: /internal const val ClosedAlphaTarget = ([\d.]+)f/d,
    unit: 'float',
    note: 'open/close alpha (fast effects spring); ExpandedAlphaTarget = 1',
  },
];

/**
 * Wiring the emitted values depend on: the expressive items use these paddings and arrangement,
 * the open/close motion uses the fast spatial/effects springs on these targets.
 */
const WIRING: readonly [file: string, what: string, pattern: RegExp][] = [
  [
    DEFAULTS,
    'DropdownMenuSelectableItemContentPadding (touch)',
    /PaddingValues\(\s*horizontal = DropdownMenuItemHorizontalPadding,\s*vertical = SelectableItemVerticalPadding,\s*\)/,
  ],
  [
    MENU,
    'DropdownMenuPopupContent scale/alpha springs',
    /fun DropdownMenuPopupContent\([\s\S]*?val scaleAnimationSpec = MotionSchemeKeyTokens\.FastSpatial\.value<Float>\(\)\s*val alphaAnimationSpec = MotionSchemeKeyTokens\.FastEffects\.value<Float>\(\)/,
  ],
  [MENU, 'item min height SegmentedMenuTokens.Item', /minHeight = SegmentedMenuTokens\.Item,/],
];

export const MENU_DEFAULTS_SOURCES = [MENU, DEFAULTS, 'MenuPosition.kt', ANDROID];

const num = (n: number) => String(Number(n.toFixed(6)));

export function extractMenuDefaults(sources: Readonly<Record<string, string>>): MenuDefault[] {
  const text = (file: string) => {
    const t = sources[file]?.replace(/\r\n/g, '\n');
    if (t === undefined) throw new Error(`${file} is not vendored`);
    return t;
  };
  for (const [file, what, pattern] of WIRING) {
    if (!pattern.test(text(file))) throw new Error(`${file}: ${what} changed upstream`);
  }
  return RULES.map((rule) => {
    const t = text(rule.file);
    const match = rule.pattern.exec(t);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined) {
      throw new Error(
        `${rule.file}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    }
    const n = Number(match[1]);
    const out: MenuDefault = {
      name: rule.name,
      value: rule.unit === 'dp' ? (n === 0 ? '0' : `${num(n)}px`) : num(n),
      number: n,
      raw:
        rule.unit === 'dp'
          ? rule.file === ANDROID
            ? match[1]!
            : `${match[1]!}.dp`
          : `${match[1]!}f`,
      owner: rule.owner,
      member: rule.member,
      file: rule.file,
      line: t.slice(0, at).split('\n').length,
    };
    if (rule.note !== undefined) out.note = rule.note;
    return out;
  });
}
