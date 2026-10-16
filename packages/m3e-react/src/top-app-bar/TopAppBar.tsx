// m3e-elements is bundled (a devDependency), so the public type comes from m3e-motion, a
// dependency, keeping the published d.ts free of m3e-elements imports.
import { attachTopAppBarScroll } from '@kyralabs/m3e-elements/top-app-bar.js';
import type { AppBarScrollBehavior } from '@kyralabs/m3e-motion';
import {
  type CSSProperties,
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

/**
 * `small` (Compose TopAppBar), `center-aligned` (CenterAlignedTopAppBar), `medium-flexible` /
 * `large-flexible` (MediumFlexibleTopAppBar / LargeFlexibleTopAppBar) and `two-rows`
 * (TwoRowsTopAppBar: medium flexible styles, the expanded title on the bottom edge, and titles that
 * can differ per row).
 */
export type TopAppBarVariant =
  'small' | 'center-aligned' | 'medium-flexible' | 'large-flexible' | 'two-rows';

/** Content per row: a two-rows bar calls it with `true` for the expanded row, `false` for the top. */
export type TopAppBarContent = ReactNode | ((expanded: boolean) => ReactNode);

export interface TopAppBarProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Default `small`. */
  variant?: TopAppBarVariant;
  /** A function renders per row (Compose TwoRowsTopAppBar `title(expanded)`); single-row bars call it with `false`. */
  title: TopAppBarContent;
  subtitle?: TopAppBarContent;
  /** Usually one `<IconButton>`. */
  navigationIcon?: ReactNode;
  /** Usually `<IconButton>`s. */
  actions?: ReactNode;
  /**
   * Horizontal alignment of the title and subtitle (Compose `titleHorizontalAlignment`). Default
   * `start`; `center-aligned` bars are always centered.
   */
  titleHorizontalAlignment?: 'start' | 'center';
  /**
   * Two-rows bars: the collapsed height, default 64 (TopAppBarDefaults.*CollapsedHeight). A number
   * is in px.
   */
  collapsedHeight?: number | string;
  /**
   * Two-rows bars: the expanded height, default per variant and subtitle
   * (TopAppBarDefaults.*ExpandedHeight). A number is in px.
   */
  expandedHeight?: number | string;
  /**
   * `pinned`: the container color changes when content scrolls under a single-row bar.
   * `enter-always`: the bar (a two-rows bar: its expanded row) also hides on scroll down and
   * returns on any scroll up. `exit-until-collapsed`: it collapses on scroll down and expands when
   * the content returns to its start (the two-rows bars' behavior in Compose's samples). Default:
   * none (static bar).
   */
  scrollBehavior?: TopAppBarScrollBehavior;
  /** The scrolling element the bar sits over. Default: the document. */
  scrollTarget?: RefObject<HTMLElement | null>;
  /** Heading level of the title (COMPONENT_SPEC §11: chosen by the consumer). Default 1. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
}

const length = (value: number | string | undefined) =>
  typeof value === 'number' ? `${String(value)}px` : value;

/**
 * Top app bar (COMPONENT_SPEC §11): the `.m3e-top-app-bar` contract in a `<header>`. Two-rows
 * variants render the collapsed title in the top row (hidden from accessibility until the bar is
 * half collapsed) and the expanded one in `__expanded`. Scroll behaviors run m3e-elements'
 * `attachTopAppBarScroll`, so both layers write the same attributes.
 */
export const TopAppBar = /* @__PURE__ */ forwardRef(function TopAppBar(
  {
    variant = 'small',
    title,
    subtitle,
    navigationIcon,
    actions,
    titleHorizontalAlignment = 'start',
    collapsedHeight,
    expandedHeight,
    scrollBehavior,
    scrollTarget,
    headingLevel = 1,
    className,
    style,
    ...rest
  }: TopAppBarProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const twoRows = variant !== 'small' && variant !== 'center-aligned';
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
  }, [ref, scrollBehavior, scrollTarget, twoRows]);
  const Heading = `h${String(headingLevel)}` as 'h1';
  const content = (value: TopAppBarContent, expanded: boolean) =>
    typeof value === 'function' ? value(expanded) : value;
  const headline = (expanded: boolean, hidden?: true) => (
    <div className="m3e-top-app-bar__headline" aria-hidden={hidden}>
      <Heading className="m3e-top-app-bar__title">{content(title, expanded)}</Heading>
      {subtitle !== undefined && (
        <p className="m3e-top-app-bar__subtitle">{content(subtitle, expanded)}</p>
      )}
    </div>
  );
  const heights =
    twoRows && (collapsedHeight !== undefined || expandedHeight !== undefined)
      ? ({
          ...(collapsedHeight === undefined
            ? {}
            : { '--_m3e-top-app-bar-collapsed-height': length(collapsedHeight) }),
          ...(expandedHeight === undefined
            ? {}
            : { '--_m3e-top-app-bar-expanded-height': length(expandedHeight) }),
          ...style,
        } as CSSProperties)
      : style;
  return (
    <header
      {...rest}
      ref={ref}
      style={heights}
      className={cx(
        'm3e-top-app-bar',
        twoRows && `m3e-top-app-bar--${variant}`,
        (variant === 'center-aligned' || titleHorizontalAlignment === 'center') &&
          'm3e-top-app-bar--center-aligned',
        className,
      )}
    >
      {navigationIcon !== undefined && (
        <div className="m3e-top-app-bar__navigation">{navigationIcon}</div>
      )}
      {headline(false, twoRows || undefined)}
      {actions !== undefined && <div className="m3e-top-app-bar__actions">{actions}</div>}
      {twoRows && <div className="m3e-top-app-bar__expanded">{headline(true)}</div>}
    </header>
  );
});
