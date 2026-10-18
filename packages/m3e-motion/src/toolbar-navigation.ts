// Arrow-key navigation in a toolbar (WAI-ARIA APG toolbar pattern, as React Aria's useToolbar and
// the button group do it): one key pair along the orientation moves to the next / previous item
// without wrapping (ArrowRight / ArrowLeft, mirrored in RTL; ArrowDown / ArrowUp when vertical),
// Home and End jump to the first / last. Pure index math shared by m3e-elements' RovingFocus (the
// floating toolbar, the docked toolbar, the chip set, the interactive list) and m3e-react.
//
// Options for other composites: `wrap` moves from the last item to the first and back (an
// interactive list, m3.material.io Lists › Accessibility "focus wraps"), and the `both`
// orientation takes both key pairs (Down / Right next, Up / Left previous, Left / Right mirrored in
// RTL), as m3.material.io's list keyboard table does.

export type ToolbarOrientation = 'horizontal' | 'vertical';

/** A toolbar orientation, or `both`: both arrow key pairs move along the one item order. */
export type NavigationOrientation = ToolbarOrientation | 'both';

/**
 * The item index `key` moves focus to from `current` (−1: none focused) among `count` items, or
 * null when the key does not navigate. At either end the index stays put unless `wrap`.
 */
export function toolbarNavigationTarget(
  key: string,
  count: number,
  current: number,
  orientation: NavigationOrientation = 'horizontal',
  rtl = false,
  wrap = false,
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
      if (orientation === 'vertical') return null;
      step = (key === 'ArrowRight') !== rtl ? 1 : -1;
      break;
    case 'ArrowDown':
    case 'ArrowUp':
      if (orientation === 'horizontal') return null;
      step = key === 'ArrowDown' ? 1 : -1;
      break;
    default:
      return null;
  }
  if (current < 0) return step > 0 ? 0 : count - 1;
  const next = current + step;
  if (wrap) return (next + count) % count;
  return Math.min(Math.max(next, 0), count - 1);
}
