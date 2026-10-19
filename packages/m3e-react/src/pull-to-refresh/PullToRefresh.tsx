import { PULL_TO_REFRESH_SPINNER_SIZE } from '@kyralabs/m3e-motion';
import {
  PULL_TO_REFRESH_INDICATOR_LABEL,
  PullToRefreshLayout,
} from '@kyralabs/m3e-elements/pull-to-refresh-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useObjectRef } from 'react-aria';
import { LoadingIndicator } from '../loading-indicator/LoadingIndicator.js';
import { cx } from '../utils/cx.js';

/** The pull indicator: Compose's arrow (default) or the loading indicator (owner decision M9 #27). */
export type PullToRefreshIndicator = 'default' | 'loading-indicator';

export interface PullToRefreshProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Compose `isRefreshing`: the indicator rests at the threshold, spinning, while true. */
  isRefreshing?: boolean;
  /**
   * Compose `onRefresh`: a pull released past the threshold. Set `isRefreshing` from it (the
   * visible Refresh button, the keyboard path, calls the same handler; owner decision M9 #28).
   */
  onRefresh?: () => void;
  /** Compose `enabled = false`: pulls are ignored. */
  isDisabled?: boolean;
  /** `loading-indicator`: PullToRefreshDefaults.LoadingIndicator (default: the arrow). */
  indicator?: PullToRefreshIndicator;
  /** px a pull must pass (× 0.5) to refresh (default PositionalThreshold, 80dp). */
  threshold?: number;
  /** The indicator's accessible name (default "Refresh"). */
  indicatorLabel?: string;
  /** The scrolling content. */
  children?: ReactNode;
}

const SIZE = String(PULL_TO_REFRESH_SPINNER_SIZE);

/**
 * Pull to refresh (COMPONENT_SPEC §38; Compose PullToRefreshBox): `children` scroll in
 * `__content` (overscroll contained) under the indicator; a touch or pen pull down at the top
 * brings it down and a release past the threshold calls `onRefresh`. m3e-elements'
 * PullToRefreshLayout (the code `<m3e-pull-to-refresh>` runs) handles the pulls, the spring and
 * the arrow, so both render the same DOM. The default indicator is Compose's arrow and circular
 * progress; `indicator="loading-indicator"` uses contained `<LoadingIndicator>`s. The ref is the
 * `.m3e-pull-to-refresh` root; other props go to it.
 */
export const PullToRefresh = /* @__PURE__ */ forwardRef(function PullToRefresh(
  {
    isRefreshing = false,
    onRefresh,
    isDisabled = false,
    indicator = 'default',
    threshold,
    indicatorLabel = PULL_TO_REFRESH_INDICATOR_LABEL,
    children,
    className,
    style,
    ...rest
  }: PullToRefreshProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const ref = useObjectRef(forwardedRef);
  const layoutRef = useRef<PullToRefreshLayout | null>(null);
  const loading = indicator === 'loading-indicator';
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  // The LoadingIndicator variant's determinate progress follows the distanceFraction.
  const [fraction, setFraction] = useState(isRefreshing ? 1 : 0);
  const initial = useRef({ isRefreshing, isDisabled });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const layout = new PullToRefreshLayout(el, {
      refreshing: initial.current.isRefreshing,
      enabled: !initial.current.isDisabled,
      onRefresh: () => onRefreshRef.current?.(),
      onFraction: (f) => {
        if (loadingRef.current) setFraction(f);
      },
    });
    layoutRef.current = layout;
    return () => {
      layout.destroy();
      layoutRef.current = null;
    };
  }, [ref]);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;
    layout.update();
    layout.setEnabled(!isDisabled);
    layout.setRefreshing(isRefreshing);
    if (loading && layout.distanceFraction !== fraction) setFraction(layout.distanceFraction);
  });

  const thresholdStyle =
    threshold !== undefined && Number.isFinite(threshold) && threshold > 0
      ? { '--m3e-comp-pull-to-refresh-positional-threshold': `${String(threshold)}px` }
      : undefined;

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(
        'm3e-pull-to-refresh',
        loading && 'm3e-pull-to-refresh--loading-indicator',
        className,
      )}
      data-refreshing={isRefreshing ? '' : undefined}
      style={thresholdStyle || style ? { ...thresholdStyle, ...style } : undefined}
    >
      <div className="m3e-pull-to-refresh__content">{children}</div>
      <div className="m3e-pull-to-refresh__indicator">
        <div className="m3e-pull-to-refresh__box">
          {loading ? (
            <>
              <div className="m3e-pull-to-refresh__pull">
                <LoadingIndicator
                  contained
                  progress={Math.min(fraction, 1)}
                  aria-label={indicatorLabel}
                />
              </div>
              <div className="m3e-pull-to-refresh__refreshing">
                <LoadingIndicator contained aria-label={indicatorLabel} />
              </div>
            </>
          ) : (
            <>
              <div
                className="m3e-pull-to-refresh__pull"
                role="progressbar"
                aria-label={indicatorLabel}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <svg
                  className="m3e-pull-to-refresh__arrow"
                  viewBox={`0 0 ${SIZE} ${SIZE}`}
                  aria-hidden="true"
                  focusable="false"
                >
                  <path className="m3e-pull-to-refresh__arc" />
                  <path className="m3e-pull-to-refresh__head" />
                </svg>
              </div>
              <div className="m3e-pull-to-refresh__refreshing">
                <div
                  className="m3e-circular-progress"
                  role="progressbar"
                  aria-label={indicatorLabel}
                >
                  <svg className="m3e-circular-progress__svg" aria-hidden="true" focusable="false">
                    <circle className="m3e-circular-progress__track" />
                    <circle className="m3e-circular-progress__indicator" />
                  </svg>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
