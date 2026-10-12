// Values Compose's ButtonDefaults / ToggleButtonDefaults render that are not (or not yet) in the
// Button*Tokens files: literals in Button.kt and ToggleButton.kt (several carry upstream
// "TODO … once it's been corrected" notes, so the tokens disagree; Compose renders these), and the
// Material minimum interactive size. Each is read with a targeted regex and cited by line.

export interface ExtractedDefault {
  /** CSS variable emitted. */
  name: string;
  dp: number;
  /** Kotlin object (or file) and member the value comes from. */
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

export interface LiteralRule {
  name: string;
  /** Kotlin object (or file) that declares the member. */
  owner: string;
  member: string;
  file: string;
  pattern: RegExp;
  note?: string;
}

const RULES: readonly LiteralRule[] = [
  {
    name: '--m3e-comp-button-min-width',
    owner: 'ButtonDefaults',
    member: 'MinWidth',
    file: 'Button.kt',
    pattern: /public val MinWidth: Dp = (\d+)\.dp/,
  },
  {
    name: '--m3e-comp-button-x-small-content-padding-horizontal',
    owner: 'ButtonDefaults',
    member: 'ExtraSmallContentPadding (start/end)',
    file: 'Button.kt',
    pattern: /val ExtraSmallContentPadding: PaddingValues[\s\S]*?start = (\d+)\.dp,\s*end = \1\.dp/,
    note: 'upstream TODO: ButtonXSmallTokens.LeadingSpace (16dp) awaits correction',
  },
  {
    name: '--m3e-comp-button-x-small-content-padding-vertical',
    owner: 'ButtonDefaults',
    member: 'ExtraSmallContentPadding (top/bottom)',
    file: 'Button.kt',
    pattern:
      /val ExtraSmallContentPadding: PaddingValues[\s\S]*?top = (\d+)\.dp,\s*bottom = \1\.dp/,
  },
  {
    name: '--m3e-comp-button-x-small-icon-spacing',
    owner: 'ButtonDefaults',
    member: 'ExtraSmallIconSpacing',
    file: 'Button.kt',
    pattern: /public val ExtraSmallIconSpacing: Dp = (\d+)\.dp/,
    note: 'upstream TODO: ButtonXSmallTokens.IconLabelSpace (8dp) awaits correction',
  },
  {
    name: '--m3e-comp-button-small-vertical-padding',
    owner: 'ButtonDefaults',
    member: 'smallVerticalPadding (touch)',
    file: 'Button.kt',
    pattern:
      /val smallVerticalPadding\s*get\(\) = if \(shouldUsePrecisionPointerComponentSizing\.value\) \d+\.dp else (\d+)\.dp/,
    note: 'precision-pointer (desktop) sizing not used',
  },
  {
    name: '--m3e-comp-button-medium-vertical-padding',
    owner: 'ButtonDefaults',
    member: 'MediumVerticalPadding',
    file: 'Button.kt',
    pattern: /private val MediumVerticalPadding = (\d+)\.dp/,
  },
  {
    name: '--m3e-comp-button-large-vertical-padding',
    owner: 'ButtonDefaults',
    member: 'LargeVerticalPadding',
    file: 'Button.kt',
    pattern: /private val LargeVerticalPadding = (\d+)\.dp/,
  },
  {
    name: '--m3e-comp-button-x-large-vertical-padding',
    owner: 'ButtonDefaults',
    member: 'ExtraLargeContentPadding (top/bottom)',
    file: 'Button.kt',
    pattern:
      /val ExtraLargeContentPadding: PaddingValues[\s\S]*?top = (\d+)\.dp,\s*bottom = \1\.dp/,
  },
  {
    name: '--m3e-comp-toggle-button-small-pressed-shape',
    owner: 'ToggleButtonDefaults',
    member: 'pressedShape',
    file: 'ToggleButton.kt',
    pattern:
      /public val pressedShape: Shape\s*@Composable get\(\) = RoundedCornerShape\((\d+)\.dp\)/,
    note: 'ButtonSmallTokens.PressedContainerShape is CornerSmall (8dp); toggle buttons use 6dp',
  },
  {
    name: '--m3e-comp-minimum-interactive-component-size',
    owner: 'InteractiveComponentSize.kt',
    member: 'LocalMinimumInteractiveComponentSize',
    file: 'InteractiveComponentSize.kt',
    pattern:
      /val LocalMinimumInteractiveComponentSize: ProvidableCompositionLocal<Dp> =\s*staticCompositionLocalOf \{\s*(\d+)\.dp/,
  },
];

/** Every file the rules read. */
export const BUTTON_DEFAULTS_SOURCES = [...new Set(RULES.map((r) => r.file))];

export function extractButtonDefaults(
  sources: Readonly<Record<string, string>>,
): ExtractedDefault[] {
  return extractLiteralDefaults(RULES, sources);
}

/** Reads each rule's dp literal from its vendored file (shared by the other *-defaults tables). */
export function extractLiteralDefaults(
  rules: readonly LiteralRule[],
  sources: Readonly<Record<string, string>>,
): ExtractedDefault[] {
  return rules.map((rule) => {
    const text = sources[rule.file]?.replace(/\r\n/g, '\n');
    if (text === undefined) throw new Error(`${rule.file} is not vendored`);
    const match = rule.pattern.exec(text);
    if (!match)
      throw new Error(`${rule.file}: ${rule.member} not found (pattern changed upstream?)`);
    const out: ExtractedDefault = {
      name: rule.name,
      dp: Number(match[1]),
      owner: rule.owner,
      member: rule.member,
      file: rule.file,
      line: text.slice(0, match.index).split('\n').length,
    };
    if (rule.note !== undefined) out.note = rule.note;
    return out;
  });
}
