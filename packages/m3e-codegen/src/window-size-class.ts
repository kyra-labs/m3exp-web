// Window size class breakpoints (FOUNDATIONS §9) from androidx window-core `WindowSizeClass.kt`
// (companion `WIDTH_DP_*_LOWER_BOUND` / `HEIGHT_DP_*_LOWER_BOUND`), the lower bounds that
// material3-adaptive's currentWindowAdaptiveInfoV2() classifies with. m3.material.io
// (Foundations › Layout › Breakpoints) gives the same widths; it gives no height values.
import { WINDOW_CORE_PATH } from './vendor.js';

export interface WindowBreakpoint {
  axis: 'width' | 'height';
  /** Size class whose lower bound this is (kebab-case, as in the CSS variable name). */
  sizeClass: 'medium' | 'expanded' | 'large' | 'extra-large';
  /** Kotlin constant name. */
  member: string;
  dp: number;
  line: number;
  cite: string;
}

const CONSTANTS = [
  ['width', 'medium', 'WIDTH_DP_MEDIUM_LOWER_BOUND'],
  ['width', 'expanded', 'WIDTH_DP_EXPANDED_LOWER_BOUND'],
  ['width', 'large', 'WIDTH_DP_LARGE_LOWER_BOUND'],
  ['width', 'extra-large', 'WIDTH_DP_EXTRA_LARGE_LOWER_BOUND'],
  ['height', 'medium', 'HEIGHT_DP_MEDIUM_LOWER_BOUND'],
  ['height', 'expanded', 'HEIGHT_DP_EXPANDED_LOWER_BOUND'],
] as const;

/** Reads the six breakpoint constants (in dp = CSS px) with their line numbers. */
export function extractWindowBreakpoints(kt: string, commit: string): WindowBreakpoint[] {
  const text = kt.replace(/\r\n/g, '\n');
  return CONSTANTS.map(([axis, sizeClass, member]) => {
    const match = new RegExp(`public const val ${member}: Int = (\\d+)\\n`).exec(text);
    if (!match) throw new Error(`WindowSizeClass.kt: ${member} not found`);
    const line = text.slice(0, match.index).split('\n').length;
    return {
      axis,
      sizeClass,
      member,
      dp: Number(match[1]),
      line,
      cite: `${WINDOW_CORE_PATH}/WindowSizeClass.kt@${commit} L${String(line)} (= window-core 1.5.0, which material3-adaptive depends on)`,
    };
  });
}
