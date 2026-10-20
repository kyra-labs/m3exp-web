import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  forwardRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';
import { warnDeprecated } from '../utils/deprecated.js';
import { type DockedToolbarScrollBehavior, useDockedToolbarLayout } from './DockedToolbar.js';

/** @deprecated D4: use {@link DockedToolbarProps} (`<DockedToolbar>`). Removed in 2.0. */
export interface BottomAppBarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'role' | 'children'
> {
  /** The actions, usually `<IconButton>`s (each takes a 48dp slot), from the start. */
  actions?: ReactNode;
  /**
   * A FAB at the end, usually `<Fab>`: colored secondary container with no elevation, as Compose's
   * BottomAppBarWithFAB sample (`bottomAppBarFabColor`, `bottomAppBarFabElevation()`).
   */
  floatingActionButton?: ReactNode;
  /** Default: none (static). */
  scrollBehavior?: DockedToolbarScrollBehavior;
  /** The scrolling element the bar is docked under. Default: the document. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /** The bar's accessible name (or use `aria-labelledby`). */
  'aria-label'?: string;
}

/**
 * Legacy bottom app bar (Compose `BottomAppBar` with `actions` and `floatingActionButton`): 80dp
 * tall, actions from the start, the FAB at the end. `role="toolbar"` with the docked toolbar's
 * roving focus and exit-always scroll behavior.
 *
 * @deprecated D4: use {@link DockedToolbar}. Shipped until 2.0; no new features.
 */
export const BottomAppBar = /* @__PURE__ */ forwardRef(function BottomAppBar(
  {
    actions,
    floatingActionButton,
    scrollBehavior,
    scrollTarget,
    className,
    ...rest
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- D4: the legacy component's own props
  }: BottomAppBarProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  warnDeprecated('BottomAppBar', 'DockedToolbar');
  const ref = useObjectRef(forwardedRef);
  useDockedToolbarLayout(ref, scrollBehavior, scrollTarget);
  const withFab =
    floatingActionButton !== undefined &&
    floatingActionButton !== null &&
    floatingActionButton !== false;
  return (
    <div {...rest} ref={ref} className={cx('m3e-bottom-app-bar', className)} role="toolbar">
      <div className="m3e-bottom-app-bar__actions">{actions}</div>
      {withFab && <div className="m3e-bottom-app-bar__fab">{floatingActionButton}</div>}
    </div>
  );
});
