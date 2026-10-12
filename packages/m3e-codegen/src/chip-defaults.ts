// Values Compose's AssistChip renders that are literals in Chip.kt rather than AssistChipTokens:
// the content padding and the icon/label spacing. Each is read with a targeted regex, scoped to the
// declaring object, and cited by the line of the value.
import type { ExtractedDefault } from './button-defaults.js';

interface Rule {
  name: string;
  owner: string;
  member: string;
  /** First capture group is the dp value. */
  pattern: RegExp;
  note?: string;
}

const FILE = 'Chip.kt';

const RULES: readonly Rule[] = [
  {
    name: '--m3e-comp-assist-chip-content-padding-horizontal',
    owner: 'AssistChipDefaults',
    member: 'ContentPadding (horizontal)',
    pattern:
      /public object AssistChipDefaults \{[\s\S]*?public val ContentPadding: PaddingValues = PaddingValues\(horizontal = (\d+)\.dp\)/d,
  },
  {
    name: '--m3e-comp-assist-chip-horizontal-spacing',
    owner: 'SuggestionChipDefaults',
    member: 'HorizontalSpacing',
    pattern:
      /public object SuggestionChipDefaults \{[\s\S]*?public val HorizontalSpacing: Dp = (\d+)\.dp/d,
    note: 'AssistChipDefaults.horizontalArrangement() = ChipArrangement(SuggestionChipDefaults.HorizontalSpacing)',
  },
];

/** The arrangement AssistChipDefaults.horizontalArrangement() returns; the spacing rule depends on it. */
const ARRANGEMENT = [
  /public object AssistChipDefaults \{[\s\S]*?public fun horizontalArrangement\(\): Arrangement\.Horizontal = DefaultHorizontalArrangement/,
  /private val DefaultHorizontalArrangement = ChipArrangement\(SuggestionChipDefaults\.HorizontalSpacing\)/,
];

export const CHIP_DEFAULTS_SOURCES = [FILE];

export function extractChipDefaults(sources: Readonly<Record<string, string>>): ExtractedDefault[] {
  const text = sources[FILE]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`${FILE} is not vendored`);
  if (!ARRANGEMENT.every((pattern) => pattern.test(text))) {
    throw new Error(
      `${FILE}: AssistChip arrangement changed upstream (DefaultHorizontalArrangement)`,
    );
  }
  return RULES.map((rule) => {
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${FILE}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const out: ExtractedDefault = {
      name: rule.name,
      dp: Number(match[1]),
      owner: rule.owner,
      member: rule.member,
      file: FILE,
      line: text.slice(0, at).split('\n').length,
    };
    if (rule.note !== undefined) out.note = rule.note;
    return out;
  });
}
