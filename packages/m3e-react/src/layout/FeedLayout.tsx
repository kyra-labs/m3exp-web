import { type ForwardedRef, type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import { cx } from '../utils/cx.js';

export interface FeedLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** The feed's items (give an item `className="m3e-feed__item--wide"` to span two columns). */
  children?: ReactNode;
}

/**
 * Feed canonical layout (COMPONENT_SPEC §16a; m3.material.io Canonical examples › Feed — Compose
 * has no feed scaffold): a grid of items, one column below 600px of its own width, from 600px as
 * many columns as fit, with m3.material.io's 16 / 24dp margins. CSS only: renders
 * `div.m3e-layout > div.m3e-feed`. Props go to the `.m3e-feed` grid.
 */
export const FeedLayout = /* @__PURE__ */ forwardRef(function FeedLayout(
  { className, children, ...rest }: FeedLayoutProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <div className="m3e-layout">
      <div {...rest} ref={ref} className={cx('m3e-feed', className)}>
        {children}
      </div>
    </div>
  );
});
