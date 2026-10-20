/**
 * Event detail shapes shared by several elements (M11 API review, M1). Type-only: nothing here
 * ships in the bundles.
 *
 * Every element event is a kebab-case `CustomEvent` with a `detail`. Each element with events
 * exports an `M3e<Name>EventMap` (it extends `HTMLElementEventMap`, so native events stay typed)
 * and merges typed `addEventListener` / `removeEventListener` overloads into its class, so
 * `el.addEventListener('open-change', (e) => e.detail.open)` is typed without a global
 * `HTMLElementEventMap` augmentation (which would clash with native `change`, `input` and
 * `select`).
 */

/** `open-change` detail (dialog, side sheet, navigation drawer, menu, FAB menu, tooltip, bottom sheet). */
export interface OpenChangeDetail {
  open: boolean;
}

/** `expanded-change` detail (wide navigation rails, search, floating toolbar). */
export interface ExpandedChangeDetail {
  expanded: boolean;
}

/** A `detail` that carries one value (e.g. `selection-change` on tabs and navigation containers). */
export interface ValueDetail<T> {
  value: T;
}

/** `selection-change` detail of `<m3e-tabs>` and the navigation containers: the selected value. */
export type SelectionChangeDetail = ValueDetail<string>;

/** The `detail` of an event that carries nothing: `{}` (`back`, `press`). */
export type EmptyDetail = Record<string, never>;
