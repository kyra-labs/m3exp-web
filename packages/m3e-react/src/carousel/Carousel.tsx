import { CarouselLayout } from '@kyralabs/m3e-elements/carousel-layout.js';
import {
  Children,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  forwardRef,
  isValidElement,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import { type PressEvent, mergeProps, useButton, useLink, useObjectRef } from 'react-aria';
import { useStateLayer } from '../state-layer/useStateLayer.js';
import { cx, defined } from '../utils/cx.js';

/**
 * The carousel layouts (owner decision M9 #22): Compose's HorizontalMultiBrowseCarousel,
 * HorizontalUncontainedCarousel and HorizontalCenteredHeroCarousel, the start-aligned hero
 * (`hero`) and the CSS-only full-screen layout (one item filling the carousel, scrolling
 * vertically).
 */
export type CarouselLayoutType =
  'multi-browse' | 'uncontained' | 'hero' | 'centered-hero' | 'full-screen';

export interface CarouselItemProps {
  /** Makes the item a link (`<a>`): state layer and ripple (owner decision M9 #25). */
  href?: string | undefined;
  /** The link's target. */
  target?: string | undefined;
  /** Makes the item a button (unless `href`): state layer and ripple. */
  onPress?: ((e: PressEvent) => void) | undefined;
  /** The item's accessible name (default: "2 of 5", or `itemLabel`). */
  'aria-label'?: string | undefined;
  children?: ReactNode;
}

/**
 * One item of a {@link Carousel}. Renders nothing itself: `<Carousel>` renders the
 * `.m3e-carousel__item` contract around its children.
 */
export function CarouselItem(_props: CarouselItemProps): ReactNode {
  return null;
}

/** The scroll controls of a carousel (Compose CarouselState). */
export interface CarouselHandle {
  /** Scrolls item `index` to its snap position (CarouselState.animateScrollToItem). */
  scrollToItem(index: number, animate?: boolean): void;
  /** The item the carousel rests on. */
  readonly currentItem: number;
  /** The `.m3e-carousel` root. */
  readonly element: HTMLDivElement | null;
}

export interface CarouselProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Default `multi-browse`. */
  layout?: CarouselLayoutType;
  /**
   * px. Multi-browse and hero: `preferredItemWidth` (hero without it fills the carousel but for
   * the small items); uncontained: `itemWidth`. Multi-browse and uncontained need it.
   */
  itemWidth?: number | undefined;
  /** px between items (default CarouselDefaults.ItemSpacing, 0dp). */
  itemSpacing?: number | undefined;
  /** px before the first and after the last item (default CarouselDefaults.ContentPadding, 0dp). */
  contentPadding?: number | undefined;
  /** Item names (default "n of N"). */
  itemLabel?: ((index: number, count: number) => string) | undefined;
  /** `<CarouselItem>`s. */
  children?: ReactNode;
}

const defaultItemLabel = (index: number, count: number) =>
  `${String(index + 1)} of ${String(count)}`;

const px = (v: number) => `${String(v)}px`;

/** The root's custom properties (the element's carouselStyle). */
function carouselStyle(
  itemWidth: number | undefined,
  itemSpacing: number | undefined,
  contentPadding: number | undefined,
): Record<string, string> {
  const style: Record<string, string> = {};
  if (itemWidth !== undefined && Number.isFinite(itemWidth)) {
    style['--m3e-comp-carousel-item-width'] = px(itemWidth);
  }
  if (itemSpacing !== undefined && Number.isFinite(itemSpacing)) {
    style['--m3e-comp-carousel-item-spacing'] = px(itemSpacing);
  }
  if (contentPadding !== undefined && Number.isFinite(contentPadding)) {
    style['--m3e-comp-carousel-content-padding-start'] = px(contentPadding);
    style['--m3e-comp-carousel-content-padding-end'] = px(contentPadding);
  }
  return style;
}

/** The `.m3e-carousel__item` contract: a slide around the mask (a link or button if interactive). */
function CarouselItemView({ item, label }: { item: CarouselItemProps; label: string }): ReactNode {
  const { href, target, onPress, children } = item;
  const ref = useRef<HTMLElement>(null);
  const stateLayer = useStateLayer();
  const press = {
    ...defined({ onPress }),
    onPressStart: stateLayer.onPressStart,
    onPressEnd: stateLayer.onPressEnd,
  };
  const link = useLink({ ...press, ...defined({ href }) }, ref);
  const button = useButton({ ...press, type: 'button' }, ref as React.RefObject<HTMLButtonElement>);
  const interactive = href !== undefined || onPress !== undefined;
  let mask: ReactNode;
  if (href !== undefined) {
    mask = (
      <a
        {...mergeProps(link.linkProps, stateLayer.stateLayerProps, {
          className: 'm3e-carousel__mask m3e-carousel__action',
        })}
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        target={target}
      >
        {children}
      </a>
    );
  } else if (onPress !== undefined) {
    mask = (
      <button
        {...mergeProps(button.buttonProps, stateLayer.stateLayerProps, {
          className: 'm3e-carousel__mask m3e-carousel__action',
        })}
        ref={ref as React.Ref<HTMLButtonElement>}
      >
        {children}
      </button>
    );
  } else {
    mask = <div className="m3e-carousel__mask">{children}</div>;
  }
  return (
    <div
      className="m3e-carousel__item"
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      tabIndex={interactive ? undefined : 0}
    >
      {mask}
    </div>
  );
}

/**
 * Carousel (COMPONENT_SPEC §36; Compose HorizontalMultiBrowseCarousel /
 * HorizontalUncontainedCarousel / HorizontalCenteredHeroCarousel, owner decisions M9 #22–#26): a
 * WAI-ARIA APG carousel (`role="region"`, `aria-roledescription="carousel"`, named by
 * `aria-label`) of `<CarouselItem>` slides. m3e-elements' CarouselLayout (the code
 * `<m3e-carousel>` runs) sizes and masks the items from Compose's keylines as they scroll, snaps
 * them natively, moves between them with the arrow keys and scrolls a focused item to its snap
 * position. Other props go to the `.m3e-carousel` root; the ref is a {@link CarouselHandle}.
 */
export const Carousel = /* @__PURE__ */ forwardRef(function Carousel(
  {
    layout = 'multi-browse',
    itemWidth,
    itemSpacing,
    contentPadding,
    itemLabel = defaultItemLabel,
    children,
    className,
    style,
    ...rest
  }: CarouselProps,
  forwardedRef: ForwardedRef<CarouselHandle>,
) {
  const ref = useObjectRef<HTMLDivElement>(null);
  const layoutRef = useRef<CarouselLayout | null>(null);
  const items = Children.toArray(children).filter(
    (c): c is ReactElement<CarouselItemProps> => isValidElement(c) && c.type === CarouselItem,
  );

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const controller = new CarouselLayout(el);
    layoutRef.current = controller;
    return () => {
      controller.destroy();
      layoutRef.current = null;
    };
  }, [ref]);

  useLayoutEffect(() => {
    layoutRef.current?.update();
  });

  useImperativeHandle(
    forwardedRef,
    () => ({
      scrollToItem(index: number, animate = true) {
        layoutRef.current?.scrollToItem(index, animate);
      },
      get currentItem() {
        return layoutRef.current?.currentItem ?? 0;
      },
      get element() {
        return ref.current;
      },
    }),
    [ref],
  );

  return (
    <div
      {...rest}
      ref={ref}
      className={cx('m3e-carousel', `m3e-carousel--${layout}`, className)}
      role="region"
      aria-roledescription="carousel"
      style={{ ...carouselStyle(itemWidth, itemSpacing, contentPadding), ...style }}
    >
      <div className="m3e-carousel__viewport" tabIndex={-1}>
        {items.map((item, index) => (
          <CarouselItemView
            key={item.key ?? index}
            item={item.props}
            label={item.props['aria-label'] ?? itemLabel(index, items.length)}
          />
        ))}
      </div>
    </div>
  );
});
