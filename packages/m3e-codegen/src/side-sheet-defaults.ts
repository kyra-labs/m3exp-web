// Side sheet values (COMPONENT_SPEC §31). Compose Material3 has no side sheet, so D8 makes
// m3.material.io the only fidelity reference:
// - the m3.material.io token DB (md.comp.sheet.side): the docked width (256dp; owner decision M9
//   #14), the standard / modal container colors, the modal sheet's level 1 elevation and
//   large-start shape, the detached shape, the divider color (outline; owner decision M9 #15), the
//   headline type and color;
// - the Side sheets › Specs tables and redlines: start / end padding 24dp (16dp before a back
//   icon), 12dp between the top elements, the 400dp max width (#14), the bottom actions (72dp, 16 /
//   24dp padding, start-aligned), the 16dp detached margin (owner decision M9 #18), the 24dp above
//   the header row (redline only), the icon colors (legend only);
// - the motion is the navigation drawer's (owner decision M9 #16: NavigationDrawer.kt, the Compose
//   component with the same geometry, mirrored to the end edge; no drag): open DefaultSpatial,
//   close FastEffects (0ms under reduced motion, the drawer's policy), the scrim
//   (DrawerDefaults.scrimColor) at the open fraction;
// - the spacing between the action buttons, which m3.material.io does not give, is AlertDialog's
//   (ButtonsMainAxisSpacing; register #81).
// The m3.material.io values that need an owner decision are SOURCES register #78–#81 (D8). The Compose
// literals are read with targeted regexes and cited by line; CHECKS throw when the wiring
// side-sheet.css and the side sheet layout assume changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type SideSheetDefault = ComposeLiteral;

const DRAWER = 'NavigationDrawer.kt';
const DIALOG = 'AlertDialog.kt';

export const SIDE_SHEET_DEFAULTS_SOURCES = [DRAWER, DIALOG];

const P = '--m3e-comp-side-sheet';

/** The close moves the sheet on an effects spring: it jumps under reduced motion (the drawer's). */
export const SIDE_SHEET_REDUCED_MOTION = [`${P}-close-duration: 0ms;`];

const RULES: readonly LiteralRule[] = [
  {
    kind: 'motion',
    name: `${P}-open`,
    owner: 'ModalNavigationDrawer',
    member: 'openMotion',
    file: DRAWER,
    pattern:
      /public fun ModalNavigationDrawer\([\s\S]*?val openMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'owner decision M9 #16 (TODO(verify) SOURCES register #80: no side sheet motion in any source): the drawer’s DrawerState.open(), mirrored to the end edge; from the current offset and velocity',
  },
  {
    kind: 'motion',
    name: `${P}-close`,
    owner: 'ModalNavigationDrawer',
    member: 'closeMotion',
    file: DRAWER,
    pattern:
      /public fun ModalNavigationDrawer\([\s\S]*?val closeMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.(\w+)\.value\(\)/d,
    note: 'owner decision M9 #16 (TODO(verify) SOURCES register #80): the drawer’s DrawerState.close(); jumps under reduced motion (it moves the sheet)',
  },
  {
    kind: 'token',
    name: `${P}-scrim-color`,
    owner: 'DrawerDefaults',
    member: 'scrimColor',
    file: DRAWER,
    pattern:
      /public val scrimColor: Color\n\s*@Composable get\(\) = (ScrimTokens\.ContainerColor)\.value\.copy\(ScrimTokens\.ContainerOpacity\)/d,
    note: 'the modal side sheet’s scrim (m3.material.io anatomy: "Scrim"); the drawer’s',
  },
  {
    kind: 'token',
    name: `${P}-scrim-opacity`,
    owner: 'DrawerDefaults',
    member: 'scrimColor',
    file: DRAWER,
    pattern:
      /public val scrimColor: Color\n\s*@Composable get\(\) = ScrimTokens\.ContainerColor\.value\.copy\((ScrimTokens\.ContainerOpacity)\)/d,
    note: 'times the open fraction (ModalNavigationDrawer: calculateFraction)',
  },
  {
    kind: 'dp',
    name: `${P}-actions-spacing`,
    owner: 'AlertDialog.kt',
    member: 'ButtonsMainAxisSpacing',
    file: DIALOG,
    pattern: /private val ButtonsMainAxisSpacing\n\s*get\(\) = (\d+)\.dp/d,
    note: 'TODO(verify) SOURCES register #81: m3.material.io gives no spacing between a side sheet’s action buttons; the dialog’s',
  },
];

/** Wiring side-sheet.css and the side sheet layout (m3e-elements) assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    DRAWER,
    'DismissibleNavigationDrawer (the standard sheet’s analogue: it pushes the content) opens on DefaultSpatial and closes on FastEffects, as ModalNavigationDrawer',
    /public fun DismissibleNavigationDrawer\([\s\S]*?val openMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.DefaultSpatial\.value\(\)\n\s*val closeMotion: FiniteAnimationSpec<Float> = MotionSchemeKeyTokens\.FastEffects\.value\(\)/,
  ],
  [
    DRAWER,
    'the scrim alpha is the open fraction (calculateFraction(minValue, maxValue, offset))',
    /alpha = \{ calculateFraction\(minValue, maxValue, drawerState\.requireOffset\(\)\) \},\n\s*color = scrimColor,/,
  ],
];

// --- m3.material.io (D8) ------------------------------------------------------------------------

/** m3.material.io token DB the side sheet values come from (read 2026-10-19). */
const DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.06c2c925cf96adca.json, Side sheets › Tokens & specs: md.comp.sheet.side)';

/** m3.material.io page whose Specs tables, color legends and redlines are cited. */
const PAGE =
  'm3.material.io Side sheets › Specs (_dsm/content/m3/2026-10-13_06-10-19/040dabe3-ed0f-4759-824d-812224e78af3.json, updated 2026-07-28)';

const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;
const CORNERS = ['start-start', 'start-end', 'end-end', 'end-start'] as const;

function m3Rows(): SideSheetDefault[] {
  const base = { owner: 'm3.material.io', file: 'm3.material.io', line: 0 };
  const row = (
    name: string,
    value: string,
    member: string,
    raw: string,
    cite: string,
    note?: string,
  ): SideSheetDefault => ({
    ...base,
    name: `${P}-${name}`,
    value,
    js: value,
    raw,
    member,
    cite,
    ...(note === undefined ? {} : { note }),
  });
  const color = (name: string, token: string, role: string, note?: string) =>
    row(name, `var(--m3e-sys-color-${role})`, token, `${token} = md.sys.color.${role}`, DSDB, note);
  const dp = (name: string, member: string, value: number, cite: string, note?: string) => ({
    ...row(name, `${String(value)}px`, member, `${member} = ${String(value)}dp`, cite, note),
    js: value,
  });
  const width =
    'TODO(verify) SOURCES register #78 (owner decision M9 #14): the DB’s docked width is the default; the Specs tables say "Max-width 400dp"';
  return [
    dp('container-width', 'md.comp.sheet.side.docked.container.width', 256, DSDB, width),
    dp('max-width', 'Max-width', 400, PAGE, width),
    color(
      'standard-container-color',
      'md.comp.sheet.side.docked.standard.container.color',
      'surface',
      'standard color legend: "Surface"; elevation level0 (no shadow), shape corner.none',
    ),
    color(
      'modal-container-color',
      'md.comp.sheet.side.docked.modal.container.color',
      'surface-container-low',
      'modal color legend: "Surface container low"',
    ),
    row(
      'modal-container-shadow',
      'var(--m3e-sys-elevation-level1-shadow)',
      'md.comp.sheet.side.docked.modal.container.elevation',
      'md.comp.sheet.side.docked.modal.container.elevation = md.sys.elevation.level1',
      DSDB,
    ),
    ...CORNERS.map((corner) =>
      row(
        `modal-container-shape-${corner}`,
        `var(--m3e-sys-shape-corner-large-start-${corner})`,
        'md.comp.sheet.side.docked.modal.container.shape',
        'md.comp.sheet.side.docked.modal.container.shape = md.sys.shape.corner.large.start',
        DSDB,
        corner === 'start-start'
          ? 'Overview: "Modal side sheets have a 16dp corner radius" (the corners away from the window edge)'
          : undefined,
      ),
    ),
    row(
      'detached-container-shape',
      'var(--m3e-sys-shape-corner-large)',
      'md.comp.sheet.side.detached.container.shape',
      'md.comp.sheet.side.detached.container.shape = md.sys.shape.corner.large',
      DSDB,
      'owner decision M9 #18: the --detached modifier',
    ),
    dp(
      'detached-margin',
      'Margins (when detached)',
      16,
      PAGE,
      'owner decision M9 #18; Guidelines: "They can be slightly inset by 16dp"',
    ),
    color(
      'divider-color',
      'md.comp.sheet.side.docked.divider.color',
      'outline',
      'TODO(verify) SOURCES register #79 (owner decision M9 #15): the standard color legend says "Outline variant" for the divider',
    ),
    color('headline-color', 'md.comp.sheet.side.docked.headline.color', 'on-surface-variant'),
    ...TYPE_FIELDS.map((field) =>
      row(
        `headline-${field}`,
        `var(--m3e-sys-typescale-title-large-${field})`,
        `md.comp.sheet.side.docked.headline.${field}`,
        `md.comp.sheet.side.docked.headline.type = md.sys.typescale.title-large (${field})`,
        DSDB,
      ),
    ),
    row(
      'icon-color',
      'var(--m3e-sys-color-on-surface-variant)',
      'Side sheet color roles (close / back icon)',
      'color legend: "On surface variant" (close icon; modal: back icon too)',
      PAGE,
      'TODO(verify) SOURCES register #81: the legends only (the DB has no icon color token)',
    ),
    dp('padding-inline', 'Start/end padding', 24, PAGE),
    dp('padding-inline-start-icon', 'Start padding with icon', 16, PAGE, 'before the back icon'),
    dp(
      'header-spacing',
      'Padding between top elements',
      12,
      PAGE,
      'between the icons and the headline',
    ),
    dp(
      'header-padding-top',
      'Padding and size measurements (redline)',
      24,
      PAGE,
      'TODO(verify) SOURCES register #81: the redlines’ 24dp above the header row (the 24dp icons and the headline); not in the tables',
    ),
    dp('actions-height', 'Bottom actions height', 72, PAGE),
    dp('actions-padding-top', 'Bottom actions top padding', 16, PAGE),
    dp('actions-padding-bottom', 'Bottom actions bottom padding', 24, PAGE),
  ];
}

/** `sources`: vendored Material3 files by name (NavigationDrawer.kt, AlertDialog.kt). */
export function extractSideSheetDefaults(
  sources: Readonly<Record<string, string>>,
): SideSheetDefault[] {
  return [
    ...extractLiterals('side-sheet-defaults', SIDE_SHEET_DEFAULTS_SOURCES, RULES, CHECKS, sources),
    ...m3Rows(),
  ];
}
