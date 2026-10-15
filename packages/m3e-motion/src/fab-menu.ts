// FAB menu item stagger, as Compose's FloatingActionButtonMenuItemColumn lays it out
// (FloatingActionButtonMenu.kt@19991f2c0858aadfcb442ce02b2c8e4743c96898 L250–307): an Int
// Animatable runs 0 ↔ the item count on the slow effects spring (visibility threshold 1, L208–218),
// and item `index` (0 = top) is visible while `index >= itemCount - value` (L283), so items appear
// from the bottom (next to the toggle) up and disappear top first. Each item then springs its own
// width (fast spatial) and alpha (fast effects) toward 1 or 0 when its visibility flips (L339–376).
// Shared by m3e-elements and m3e-react.

/** `Int.VectorConverter` reads an animated Int by truncating the float toward zero. */
export const animatedInt = (value: number): number => Math.trunc(value);

/** Whether item `index` (0 = top) shows at stagger value `stagger` (0 … `itemCount`). */
export const fabMenuItemVisible = (index: number, itemCount: number, stagger: number): boolean =>
  index >= itemCount - animatedInt(stagger);
