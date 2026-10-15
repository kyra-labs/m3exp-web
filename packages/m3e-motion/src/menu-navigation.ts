// Arrow-key navigation among menu items (WAI-ARIA APG menu pattern, as React Aria's useMenu
// keyboard delegate does it): ArrowDown / ArrowUp move to the next / previous item and wrap, Home and
// End jump to the first / last. Pure index math shared by m3e-elements and m3e-react.
//
// Scoped to the FAB menu for now (COMPONENT_SPEC §6). Follow-up: unify with the Menus component's
// keyboard helpers (COMPONENT_SPEC §21) once both are on main.

/**
 * The item index `key` moves focus to from `current` (−1: none focused) among `count` items, or
 * null when the key does not navigate.
 */
export function menuNavigationTarget(key: string, count: number, current: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowDown':
      return current < 0 ? 0 : (current + 1) % count;
    case 'ArrowUp':
      return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
