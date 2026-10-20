// m3e-elements is bundled (a devDependency), so the public types live here, keeping the published
// d.ts free of m3e-elements imports.
import { DockedToolbarLayout } from '@kyralabs/m3e-elements/docked-toolbar-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';
import { warnDeprecatedProp } from '../utils/deprecated.js';

/**
 * How the items are spaced (Compose FlexibleBottomAppBar `horizontalArrangement`):
 * - `spread` (default): BottomAppBarDefaults.FlexibleHorizontalArrangement (space between, the
 *   ends keep the 16dp padding);
 * - `center`: BottomAppBarDefaults.FlexibleFixedHorizontalArrangement (32dp apart, centered);
 * - `space-around` / `space-evenly`: the Compose samples' Arrangement.SpaceAround / SpaceEvenly
 *   (no horizontal padding).
 */
export type DockedToolbarArrangement = 'spread' | 'center' | 'space-around' | 'space-evenly';
/** `standard` (surface container) or `vibrant` (primary container, the Compose sample). */
export type DockedToolbarColorStyle = 'standard' | 'vibrant';
/**
 * `exit-always` (BottomAppBarDefaults.exitAlwaysScrollBehavior): hides on scroll down, returns on
 * scroll up. `'exitAlways'` is the deprecated spelling (since 1.8, removed in 2.0; it warns once in
 * development): use `'exit-always'`, as `<m3e-docked-toolbar scroll-behavior>` and TopAppBar do.
 */
export type DockedToolbarScrollBehavior = 'exit-always' | 'exitAlways';

export interface DockedToolbarClassOptions {
  arrangement?: DockedToolbarArrangement | undefined;
  colorStyle?: DockedToolbarColorStyle | undefined;
}

/** Classes for the `.m3e-docked-toolbar` root (the m3e-css contract). */
export const dockedToolbarClassName = (
  { arrangement = 'spread', colorStyle = 'standard' }: DockedToolbarClassOptions,
  className?: string,
): string =>
  cx(
    'm3e-docked-toolbar',
    arrangement !== 'spread' && `m3e-docked-toolbar--${arrangement}`,
    colorStyle === 'vibrant' && 'm3e-docked-toolbar--vibrant',
    className,
  );

/**
 * Runs m3e-elements' DockedToolbarLayout (roving focus and the exit-always scroll behavior) on a
 * rendered `.m3e-docked-toolbar` / `.m3e-bottom-app-bar`, as `<m3e-docked-toolbar>` does.
 */
export function useDockedToolbarLayout(
  ref: RefObject<HTMLElement | null>,
  scrollBehavior: DockedToolbarScrollBehavior | undefined,
  scrollTarget: RefObject<HTMLElement | null> | undefined,
): void {
  const layoutRef = useRef<DockedToolbarLayout | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    layoutRef.current ??= new DockedToolbarLayout(el);
    layoutRef.current.update();
  });
  useLayoutEffect(() => {
    layoutRef.current?.setScroll({
      behavior:
        scrollBehavior === 'exit-always' || scrollBehavior === 'exitAlways' ? 'exit-always' : null,
      target: scrollTarget?.current ?? window,
    });
  }, [scrollBehavior, scrollTarget]);
  useLayoutEffect(
    () => () => {
      layoutRef.current?.destroy();
      layoutRef.current = null;
    },
    [],
  );
}

export interface DockedToolbarProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** The toolbar items, usually `<IconButton>`s (each takes a 48dp slot). */
  children?: ReactNode;
  /** Default `spread`. */
  arrangement?: DockedToolbarArrangement;
  /** Default `standard`. */
  colorStyle?: DockedToolbarColorStyle;
  /** Default: none (static). `'exitAlways'` is deprecated: use `'exit-always'`. */
  scrollBehavior?: DockedToolbarScrollBehavior;
  /** The scrolling element the toolbar is docked under. Default: the document. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /** The toolbar's accessible name (or use `aria-labelledby`). */
  'aria-label'?: string;
}

/**
 * Docked toolbar (COMPONENT_SPEC §10; Compose `FlexibleBottomAppBar`): the `.m3e-docked-toolbar`
 * contract with `role="toolbar"`. Roving focus and the exit-always scroll behavior come from
 * m3e-elements' DockedToolbarLayout, the same code `<m3e-docked-toolbar>` runs. Dock it at the
 * bottom of the screen or of a container yourself (position fixed / sticky / absolute).
 */
export const DockedToolbar = /* @__PURE__ */ forwardRef(function DockedToolbar(
  props: DockedToolbarProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    children,
    arrangement = 'spread',
    colorStyle = 'standard',
    scrollBehavior,
    scrollTarget,
    className,
    ...rest
  } = props;
  if (scrollBehavior === 'exitAlways') {
    warnDeprecatedProp(
      'DockedToolbar scrollBehavior="exitAlways"',
      'DockedToolbar scrollBehavior="exit-always"',
    );
  }
  const ref = useObjectRef(forwardedRef);
  useDockedToolbarLayout(ref, scrollBehavior, scrollTarget);
  return (
    <div
      {...rest}
      ref={ref}
      className={dockedToolbarClassName({ arrangement, colorStyle }, className)}
      role="toolbar"
    >
      {children}
    </div>
  );
});
