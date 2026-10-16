// Arrow-key navigation in a toolbar (WAI-ARIA APG toolbar pattern, as React Aria's useToolbar and
// the button group do it): one key pair along the orientation moves to the next / previous item
// without wrapping (ArrowRight / ArrowLeft, mirrored in RTL; ArrowDown / ArrowUp when vertical),
// Home and End jump to the first / last. Pure index math shared by m3e-elements' RovingFocus (the
// floating toolbar, the docked toolbar) and m3e-react.

export type ToolbarOrientation = 'horizontal' | 'vertical';

/**
 * The item index `key` moves focus to from `current` (−1: none focused) among `count` items, or
 * null when the key does not navigate. At either end the index stays put (no wrapping).
 */
export function toolbarNavigationTarget(
  key: string,
  count: number,
  current: number,
  orientation: ToolbarOrientation = 'horizontal',
  rtl = false,
): number | null {
  if (count === 0) return null;
  let step: number;
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'ArrowRight':
    case 'ArrowLeft':
      if (orientation !== 'horizontal') return null;
      step = (key === 'ArrowRight') !== rtl ? 1 : -1;
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      if (orientation !== 'vertical') return null;
      step = key === 'ArrowDown' ? 1 : -1;
      break;
    default:
      return null;
  }
  if (current < 0) return step > 0 ? 0 : count - 1;
  return Math.min(Math.max(current + step, 0), count - 1);
}
