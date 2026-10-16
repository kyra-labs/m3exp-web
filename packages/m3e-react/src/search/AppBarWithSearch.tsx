// m3e-elements is bundled (a devDependency); no m3e-elements type reaches the published d.ts.
import { attachTopAppBarScroll } from '@kyralabs/m3e-elements/top-app-bar.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  forwardRef,
  useEffect,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';

export interface AppBarWithSearchProps extends HTMLAttributes<HTMLElement> {
  /** The `<SearchBar>`. */
  children: ReactNode;
  /** Usually one `<IconButton>`. */
  navigationIcon?: ReactNode;
  /** Usually `<IconButton>`s. */
  actions?: ReactNode;
  /**
   * `enter-always` (SearchBarDefaults.enterAlwaysSearchBarScrollBehavior): hides on scroll down,
   * returns on any scroll up and takes the scrolled colors. Default: none (static colors).
   */
  scrollBehavior?: 'enter-always';
  /** The scrolling element the bar sits over. Default: the document. */
  scrollTarget?: RefObject<HTMLElement | null>;
}

/**
 * AppBarWithSearch (COMPONENT_SPEC §12; Compose `AppBarWithSearch`): a top app bar
 * (`.m3e-top-app-bar--search`) holding a `<SearchBar>` between the navigation icon and the
 * actions. The scroll behavior is the top app bar's (m3e-elements attachTopAppBarScroll): its
 * enter-always math, overlap and settle are the same as Compose's search bar scroll behavior.
 */
export const AppBarWithSearch = /* @__PURE__ */ forwardRef(function AppBarWithSearch(
  {
    children,
    navigationIcon,
    actions,
    scrollBehavior,
    scrollTarget,
    className,
    ...rest
  }: AppBarWithSearchProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const ref = useObjectRef(forwardedRef);
  useEffect(() => {
    const bar = ref.current;
    if (!bar || scrollBehavior === undefined) return;
    const controller = new AbortController();
    attachTopAppBarScroll(bar, {
      behavior: scrollBehavior,
      target: scrollTarget?.current ?? window,
      signal: controller.signal,
    });
    return () => {
      controller.abort();
    };
  }, [ref, scrollBehavior, scrollTarget]);
  return (
    <header
      {...rest}
      ref={ref}
      className={cx('m3e-top-app-bar m3e-top-app-bar--search', className)}
    >
      {navigationIcon !== undefined && (
        <div className="m3e-top-app-bar__navigation">{navigationIcon}</div>
      )}
      {children}
      {actions !== undefined && <div className="m3e-top-app-bar__actions">{actions}</div>}
    </header>
  );
});
