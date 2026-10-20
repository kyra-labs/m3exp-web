// m3e-elements is bundled (a devDependency), so the public types come from m3e-motion, a
// dependency, keeping the published d.ts free of m3e-elements imports.
import { FloatingToolbarLayout } from '@kyralabs/m3e-elements/floating-toolbar-layout.js';
import type { FloatingToolbarExitDirection, ToolbarOrientation } from '@kyralabs/m3e-motion';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';
import { warnDeprecatedProp } from '../utils/deprecated.js';

export type { FloatingToolbarExitDirection };
export type FloatingToolbarOrientation = ToolbarOrientation;
/** Compose `standardFloatingToolbarColors()` / `vibrantFloatingToolbarColors()`. */
export type FloatingToolbarColorStyle = 'standard' | 'vibrant';
/**
 * `exit-always` (FloatingToolbarDefaults.exitAlwaysScrollBehavior): hides on scroll down, returns
 * on scroll up. `collapse` (floatingToolbarVerticalNestedScroll): collapses on scroll down and
 * expands on scroll up, through `onExpandedChange`. `'exitAlways'` is the deprecated spelling of
 * `'exit-always'` (since 1.8, removed in 2.0; it warns once in development).
 */
export type FloatingToolbarScrollBehavior = 'exit-always' | 'exitAlways' | 'collapse';

export interface FloatingToolbarClassOptions {
  orientation?: FloatingToolbarOrientation | undefined;
  colorStyle?: FloatingToolbarColorStyle | undefined;
  expanded?: boolean | undefined;
  withFab?: boolean | undefined;
  fabPosition?: 'end' | 'start' | undefined;
}

/** Classes for the `.m3e-floating-toolbar` root (the m3e-css contract). */
export const floatingToolbarClassName = (
  {
    orientation = 'horizontal',
    colorStyle = 'standard',
    expanded = true,
    withFab = false,
    fabPosition = 'end',
  }: FloatingToolbarClassOptions,
  className?: string,
): string =>
  cx(
    'm3e-floating-toolbar',
    orientation === 'vertical' && 'm3e-floating-toolbar--vertical',
    colorStyle === 'vibrant' && 'm3e-floating-toolbar--vibrant',
    !expanded && 'm3e-floating-toolbar--collapsed',
    withFab && 'm3e-floating-toolbar--with-fab',
    withFab && fabPosition === 'start' && 'm3e-floating-toolbar--fab-start',
    className,
  );

export interface FloatingToolbarProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children' | 'role' | 'aria-orientation'
> {
  /** The toolbar items, usually `<IconButton>`s (each takes a 48dp slot). */
  children?: ReactNode;
  /** Items before `children` that show only while expanded (no effect beside a `fab`). */
  leading?: ReactNode;
  /** Items after `children` that show only while expanded (no effect beside a `fab`). */
  trailing?: ReactNode;
  /**
   * A FAB beside the toolbar, usually `<Fab>`: the toolbar sizes it (80dp collapsed, 56dp
   * expanded) and colors it to match `colorStyle`. Collapsed, the whole toolbar folds into it.
   */
  fab?: ReactNode;
  /** Where the FAB sits: `end` (default; bottom when vertical) or `start` (top). */
  fabPosition?: 'end' | 'start';
  /** Default `horizontal`. */
  orientation?: FloatingToolbarOrientation;
  /** Default `standard`. */
  colorStyle?: FloatingToolbarColorStyle;
  /** Controlled expanded state. */
  isExpanded?: boolean;
  /**
   * Controlled expanded state.
   * @deprecated Since 1.8: use `isExpanded`. Removed in 2.0.
   */
  expanded?: boolean;
  /** Uncontrolled initial state. Default `true`. */
  defaultExpanded?: boolean;
  /** Called when the `collapse` scroll behavior expands or collapses the toolbar. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Default: none (static). `'exitAlways'` is deprecated: use `'exit-always'`. */
  scrollBehavior?: FloatingToolbarScrollBehavior;
  /** `exit-always` only. Default `bottom` (horizontal) / `end` (vertical). */
  exitDirection?: FloatingToolbarExitDirection;
  /** The scrolling element the toolbar floats over. Default: the document. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /** The toolbar's accessible name (or use `aria-labelledby`). */
  'aria-label'?: string;
}

/**
 * Floating toolbar (COMPONENT_SPEC §9; Compose `HorizontalFloatingToolbar` /
 * `VerticalFloatingToolbar` and their with-FAB overloads): the `.m3e-floating-toolbar` contract
 * with `role="toolbar"`. The expand/collapse springs, roving focus and scroll behaviors come from
 * m3e-elements' FloatingToolbarLayout, the same code `<m3e-floating-toolbar>` runs (React Aria's
 * useToolbar keeps every item tabbable and has no Home/End, so the shared roving tabindex is used
 * instead).
 */
export const FloatingToolbar = /* @__PURE__ */ forwardRef(function FloatingToolbar(
  props: FloatingToolbarProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    children,
    leading,
    trailing,
    fab,
    fabPosition = 'end',
    orientation = 'horizontal',
    colorStyle = 'standard',
    isExpanded,
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- the 1.x alias (D16)
    expanded: legacyExpanded,
    defaultExpanded = true,
    onExpandedChange,
    scrollBehavior,
    exitDirection,
    scrollTarget,
    className,
    ...rest
  } = props;
  if (legacyExpanded !== undefined) {
    warnDeprecatedProp('FloatingToolbar expanded', 'FloatingToolbar isExpanded');
  }
  if (scrollBehavior === 'exitAlways') {
    warnDeprecatedProp(
      'FloatingToolbar scrollBehavior="exitAlways"',
      'FloatingToolbar scrollBehavior="exit-always"',
    );
  }
  const expandedProp = isExpanded ?? legacyExpanded;
  const ref = useObjectRef(forwardedRef);
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded);
  const expanded = expandedProp ?? uncontrolled;
  const change = useRef<(expanded: boolean) => void>(() => undefined);
  change.current = (next) => {
    if (expandedProp === undefined) setUncontrolled(next);
    onExpandedChange?.(next);
  };
  const layoutRef = useRef<FloatingToolbarLayout | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    layoutRef.current ??= new FloatingToolbarLayout(el, {
      onExpandedChange: (next) => {
        change.current(next);
      },
    });
    layoutRef.current.update();
  });
  useLayoutEffect(() => {
    layoutRef.current?.setScroll({
      behavior:
        scrollBehavior === 'exit-always' || scrollBehavior === 'exitAlways'
          ? 'exit-always'
          : scrollBehavior === 'collapse'
            ? 'collapse'
            : null,
      exitDirection: exitDirection ?? null,
      target: scrollTarget?.current ?? window,
    });
  }, [scrollBehavior, exitDirection, scrollTarget, orientation]);
  useLayoutEffect(
    () => () => {
      layoutRef.current?.destroy();
      layoutRef.current = null;
    },
    [],
  );

  const withFab = fab !== undefined && fab !== null && fab !== false;
  const fabSlot = withFab ? <div className="m3e-floating-toolbar__fab">{fab}</div> : null;
  return (
    <div
      {...rest}
      ref={ref}
      className={floatingToolbarClassName(
        { orientation, colorStyle, expanded, withFab, fabPosition },
        className,
      )}
      role="toolbar"
      aria-orientation={orientation}
    >
      {fabPosition === 'start' && fabSlot}
      <div className="m3e-floating-toolbar__bar">
        {leading !== undefined && <div className="m3e-floating-toolbar__leading">{leading}</div>}
        {children}
        {trailing !== undefined && <div className="m3e-floating-toolbar__trailing">{trailing}</div>}
      </div>
      {fabPosition !== 'start' && fabSlot}
    </div>
  );
});
