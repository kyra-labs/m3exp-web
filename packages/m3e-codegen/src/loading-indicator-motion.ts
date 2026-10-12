// How Compose's indeterminate LoadingIndicator moves (material3 LoadingIndicator.kt): a morph
// spring started every MorphIntervalMillis and a linear global rotation lasting
// GlobalRotationDurationMillis per turn. These are literals in the composable, not tokens in
// LoadingIndicatorTokens, so they are read from the vendored source like ButtonDefaults.

export interface LoadingIndicatorMotionToken {
  name: string;
  value: string;
  /** The number the value is built from (ms for durations). */
  number: number;
  member: string;
  line: number;
}

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

const float = (raw: string) => Number.parseFloat(raw.replace(/[fL]$/, ''));

export function extractLoadingIndicatorMotion(
  loadingIndicatorKt: string,
): LoadingIndicatorMotionToken[] {
  const kt = loadingIndicatorKt.replace(/\r\n/g, '\n');
  const constant = (name: string) => {
    const match = new RegExp(`private const val ${name} = (\\d+)L?\\n`).exec(kt);
    if (!match) throw new Error(`LoadingIndicator.kt: ${name} not found`);
    return { number: Number(match[1]), line: lineOf(kt, match.index) };
  };
  const spring =
    /val morphAnimationSpec =\s*spring\(dampingRatio = ([\d.]+f), stiffness = ([\d.]+f), visibilityThreshold = ([\d.]+f)\)/.exec(
      kt,
    );
  if (!spring) throw new Error('LoadingIndicator.kt: morphAnimationSpec spring not found');
  const springLine = lineOf(kt, spring.index + spring[0].indexOf('spring('));
  const interval = constant('MorphIntervalMillis');
  const rotation = constant('GlobalRotationDurationMillis');
  const ms = (name: string, member: string, c: { number: number; line: number }) => ({
    name,
    value: `${String(c.number)}ms`,
    number: c.number,
    member,
    line: c.line,
  });
  const springToken = (name: string, member: string, raw: string) => ({
    name,
    value: String(float(raw)),
    number: float(raw),
    member: `morphAnimationSpec.${member}`,
    line: springLine,
  });
  return [
    ms('--m3e-comp-loading-indicator-morph-interval', 'MorphIntervalMillis', interval),
    ms('--m3e-comp-loading-indicator-rotation-duration', 'GlobalRotationDurationMillis', rotation),
    springToken(
      '--m3e-comp-loading-indicator-morph-spring-damping-ratio',
      'dampingRatio',
      spring[1]!,
    ),
    springToken('--m3e-comp-loading-indicator-morph-spring-stiffness', 'stiffness', spring[2]!),
    springToken(
      '--m3e-comp-loading-indicator-morph-spring-visibility-threshold',
      'visibilityThreshold',
      spring[3]!,
    ),
  ];
}
