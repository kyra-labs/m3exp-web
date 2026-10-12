// m3e-elements is bundled (a devDependency), so the public type comes from m3e-motion, a
// dependency, keeping the published d.ts free of m3e-elements imports.
import { attachTopAppBarScroll } from '@kyralabs/m3e-elements/top-app-bar.js';
import type { AppBarScrollBehavior } from '@kyralabs/m3e-motion';
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

export type TopAppBarScrollBehavior = AppBarScrollBehavior;

export interface TopAppBarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Only the small (single-row) bar ships in M4. */
  variant?: 'small';
  title: ReactNode;
  subtitle?: ReactNode;
  /** Usually one `<IconButton>`. */
  navigationIcon?: ReactNode;
  /** Usually `<IconButton>`s. */
  actions?: ReactNode;
  /**
   * `pinned`: the container color changes when content scrolls under the bar. `enter-always`: the
   * bar also hides on scroll down and returns on scroll up. Default: none (static bar).
   */
  scrollBehavior?: TopAppBarScrollBehavior;
  /** The scrolling element the bar sits over. Default: the document. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /** Heading level of the title (COMPONENT_SPEC §11: chosen by the consumer). Default 1. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Small top app bar (COMPONENT_SPEC §11, Compose `TopAppBar`): the `.m3e-top-app-bar` contract in a
 * `<header>`. Scroll behaviors run m3e-elements' `attachTopAppBarScroll`, so both layers write the
 * same attributes.
 */
export const TopAppBar = forwardRef(function TopAppBar(
  {
    variant: _variant = 'small',
    title,
    subtitle,
    navigationIcon,
    actions,
    scrollBehavior,
    scrollTarget,
    headingLevel = 1,
    className,
    ...rest
  }: TopAppBarProps,
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
  const Heading = `h${String(headingLevel)}` as 'h1';
  return (
    <header {...rest} ref={ref} className={cx('m3e-top-app-bar', className)}>
      {navigationIcon !== undefined && (
        <div className="m3e-top-app-bar__navigation">{navigationIcon}</div>
      )}
      <div className="m3e-top-app-bar__headline">
        <Heading className="m3e-top-app-bar__title">{title}</Heading>
        {subtitle !== undefined && <p className="m3e-top-app-bar__subtitle">{subtitle}</p>}
      </div>
      {actions !== undefined && <div className="m3e-top-app-bar__actions">{actions}</div>}
    </header>
  );
});
