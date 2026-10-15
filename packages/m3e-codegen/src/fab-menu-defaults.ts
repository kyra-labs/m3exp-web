// Values Compose's FloatingActionButtonMenu.kt renders that are not (or not yet) in
// FabMenuBaselineTokens: the private ToggleFloatingActionButton / FAB menu layout literals (one with
// an upstream "TODO … is incorrect"), the ToggleFloatingActionButtonDefaults color pairs, the menu
// item label style and the motion-scheme springs behind the toggle, the item stagger and each item's
// width/alpha ("TODO Load the motionScheme tokens from the component tokens file"). Each is read
// with a targeted regex from the vendored file and cited by line.
import { kebabName } from './names.js';

export interface FabMenuDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value: px for dp literals, var() references otherwise. */
  value: string;
  /** JS value for components.ts (dp / plain number, or the var() string). */
  js: number | string;
  /** Source expression as written upstream. */
  raw: string;
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

const FILE = 'FloatingActionButtonMenu.kt';
const TOKENS_FILE = 'FabMenuBaselineTokens.kt';
const PREFIX = '--m3e-comp-fab-menu-defaults';

type Kind = 'dp' | 'number' | 'half-token' | 'color' | 'typography' | 'motion';

interface Rule {
  kind: Kind;
  /** Variable name without the `--m3e-comp-fab-menu-defaults-` prefix. */
  name: string;
  owner: string;
  member: string;
  /**
   * First capture group: a dp literal, a number, a FabMenuBaselineTokens member, a ColorScheme
   * role, a Typography style or a MotionSchemeKeyTokens member.
   */
  pattern: RegExp;
  note?: string;
}

const TOGGLE = 'ToggleFloatingActionButton';
const TOGGLE_DEFAULTS = 'ToggleFloatingActionButtonDefaults';
const ITEM = 'FloatingActionButtonMenuItem';
const MENU = 'FloatingActionButtonMenu';

const RULES: readonly Rule[] = [
  {
    kind: 'dp',
    name: 'toggle-initial-corner-radius',
    owner: FILE,
    member: 'FabInitialCornerRadius',
    pattern: /private val FabInitialCornerRadius\n\s*get\(\) = (\d+)\.dp/d,
    note: 'ToggleFloatingActionButtonDefaults.containerCornerRadius() at progress 0 (baseline FAB)',
  },
  {
    kind: 'dp',
    name: 'toggle-medium-initial-corner-radius',
    owner: FILE,
    member: 'FabMediumInitialCornerRadius',
    pattern: /private val FabMediumInitialCornerRadius\n\s*get\(\) = (\d+)\.dp/d,
    note: 'containerCornerRadiusMedium() at progress 0',
  },
  {
    kind: 'dp',
    name: 'toggle-large-initial-corner-radius',
    owner: FILE,
    member: 'FabLargeInitialCornerRadius',
    pattern: /private val FabLargeInitialCornerRadius\n\s*get\(\) = (\d+)\.dp/d,
    note: 'containerCornerRadiusLarge() at progress 0',
  },
  {
    kind: 'dp',
    name: 'toggle-large-initial-icon-size',
    owner: FILE,
    member: 'FabLargeInitialIconSize',
    pattern: /private val FabLargeInitialIconSize = (\d+)\.dp/d,
    note: 'iconSizeLarge() at progress 0; upstream TODO: FabLargeTokens.IconSize (32dp) is incorrect',
  },
  {
    kind: 'half-token',
    name: 'toggle-final-corner-radius',
    owner: FILE,
    member: 'FabFinalCornerRadius',
    pattern: /private val FabFinalCornerRadius = FabFinalSize\.div\(2\)/d,
    note: 'FabFinalSize = FabMenuBaselineTokens.CloseButtonContainerHeight, halved (a circle)',
  },
  {
    kind: 'dp',
    name: 'padding-horizontal',
    owner: FILE,
    member: 'FabMenuPaddingHorizontal',
    pattern: /private val FabMenuPaddingHorizontal\n\s*get\(\) = (\d+)\.dp/d,
    note: 'FloatingActionButtonMenu: Modifier.padding(horizontal = …)',
  },
  {
    kind: 'dp',
    name: 'button-padding-bottom',
    owner: FILE,
    member: 'FabMenuButtonPaddingBottom',
    pattern: /private val FabMenuButtonPaddingBottom\n\s*get\(\) = (\d+)\.dp/d,
    note: 'below the toggle; the items sit FabMenuBaselineTokens.CloseButtonBetweenSpace above it',
  },
  {
    kind: 'color',
    name: 'toggle-container-color',
    owner: TOGGLE_DEFAULTS,
    member: 'containerColor(initialColor)',
    pattern:
      /public fun containerColor\(\n\s*initialColor: Color = MaterialTheme\.colorScheme\.(\w+),/d,
    note: 'at checked progress 0; lerped (Oklab, clamped) to the checked color',
  },
  {
    kind: 'color',
    name: 'toggle-checked-container-color',
    owner: TOGGLE_DEFAULTS,
    member: 'containerColor(finalColor)',
    pattern:
      /public fun containerColor\(\n[^)]*?finalColor: Color = MaterialTheme\.colorScheme\.(\w+),/d,
  },
  {
    kind: 'color',
    name: 'toggle-icon-color',
    owner: TOGGLE_DEFAULTS,
    member: 'iconColor(initialColor)',
    pattern: /public fun iconColor\(\n\s*initialColor: Color = MaterialTheme\.colorScheme\.(\w+),/d,
  },
  {
    kind: 'color',
    name: 'toggle-checked-icon-color',
    owner: TOGGLE_DEFAULTS,
    member: 'iconColor(finalColor)',
    pattern:
      /public fun iconColor\(\n[^)]*?finalColor: Color = MaterialTheme\.colorScheme\.(\w+),/d,
  },
  {
    kind: 'color',
    name: 'item-container-color',
    owner: ITEM,
    member: 'containerColor',
    pattern:
      /containerColor: Color = MaterialTheme\.colorScheme\.(\w+),\n\s*contentColor: Color = contentColorFor\(containerColor\)/d,
    note: 'content color = contentColorFor(containerColor)',
  },
  {
    kind: 'typography',
    name: 'item-label',
    owner: ITEM,
    member: 'LocalTextStyle',
    pattern: /LocalTextStyle provides MaterialTheme\.typography\.(\w+)/d,
  },
  {
    kind: 'motion',
    name: 'toggle-progress',
    owner: TOGGLE,
    member: 'checkedProgress',
    pattern:
      /animateFloatAsState\(\n\s*targetValue = if \(checked\) 1f else 0f,\n(?:\s*\/\/.*\n)*\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'drives the container size, corner radius and colors and the icon size and color',
  },
  {
    kind: 'motion',
    name: 'item-width',
    owner: ITEM,
    member: 'widthSpring',
    pattern:
      /val widthSpring: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'item width = full row width × progress, clipped by the pill',
  },
  {
    kind: 'motion',
    name: 'item-opacity',
    owner: ITEM,
    member: 'alphaSpring',
    pattern:
      /val alphaSpring: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
  },
  {
    kind: 'motion',
    name: 'stagger',
    owner: MENU,
    member: 'staggerAnimSpec',
    pattern:
      /var staggerAnimSpec: FiniteAnimationSpec<Int> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'an Int animated 0 ↔ item count; item i (top = 0) shows while i ≥ count − value',
  },
  {
    kind: 'number',
    name: 'stagger-visibility-threshold',
    owner: MENU,
    member: 'staggerAnimSpec',
    pattern: /stiffness = staggerAnimSpec\.stiffness,\n[^\n]*\n\s*visibilityThreshold = (\d+),/d,
    note: 'in items: the stagger spring ends within one item of its target',
  },
];

const TYPESCALE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;
/** CSS linear() timing (CSS-only transitions) and the spring itself (m3e-elements / m3e-react). */
const SPRING_FIELDS = ['duration', 'easing', 'damping-ratio', 'stiffness'] as const;

export const FAB_MENU_DEFAULTS_SOURCES = [FILE];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** `FabMenuBaselineTokens.CloseButtonContainerHeight` in dp, from the vendored token file. */
function closeButtonHeight(tokens: string): number {
  const match =
    /val CloseButtonContainerHeight: androidx\.compose\.ui\.unit\.Dp\n\s*get\(\) = ([\d.]+)\.dp/.exec(
      tokens,
    );
  if (!match) throw new Error(`${TOKENS_FILE}: CloseButtonContainerHeight not found`);
  return Number(match[1]);
}

export function extractFabMenuDefaults(
  sources: Readonly<Record<string, string>>,
  tokenFiles: readonly { name: string; content: string }[],
): FabMenuDefault[] {
  const text = normalize(sources[FILE], FILE);
  const tokens = normalize(tokenFiles.find((f) => f.name === TOKENS_FILE)?.content, TOKENS_FILE);
  return RULES.flatMap((rule): FabMenuDefault[] => {
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[rule.kind === 'half-token' ? 0 : 1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${FILE}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const line = text.slice(0, at).split('\n').length;
    const captured = match[1] ?? '';
    const base = {
      owner: rule.owner,
      member: rule.member,
      file: FILE,
      line,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    const name = `${PREFIX}-${rule.name}`;
    switch (rule.kind) {
      case 'dp':
        return [
          { ...base, name, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` },
        ];
      case 'number':
        return [{ ...base, name, value: captured, js: Number(captured), raw: captured }];
      case 'half-token': {
        const half = closeButtonHeight(tokens) / 2;
        return [
          {
            ...base,
            name,
            value: `${String(half)}px`,
            js: half,
            raw: 'FabMenuBaselineTokens.CloseButtonContainerHeight.div(2)',
          },
        ];
      }
      case 'color': {
        const value = `var(--m3e-sys-color-${kebabName(captured[0]!.toUpperCase() + captured.slice(1))})`;
        return [{ ...base, name, value, js: value, raw: `MaterialTheme.colorScheme.${captured}` }];
      }
      case 'typography':
        return TYPESCALE_FIELDS.map((field) => {
          const value = `var(--m3e-sys-typescale-${kebabName(captured[0]!.toUpperCase() + captured.slice(1))}-${field})`;
          return {
            ...base,
            name: `${name}-${field}`,
            value,
            js: value,
            raw: `MaterialTheme.typography.${captured}`,
          };
        });
      case 'motion':
        return SPRING_FIELDS.map((field) => {
          const value = `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`;
          return {
            ...base,
            name: `${name}-${field}`,
            value,
            js: value,
            raw: `MotionSchemeKeyTokens.${captured}`,
          };
        });
    }
  });
}
