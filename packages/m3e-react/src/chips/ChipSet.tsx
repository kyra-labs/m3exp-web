// m3e-elements is bundled (a devDependency); ChipSetLayout is the same code <m3e-chip-set> runs.
import { ChipSetLayout } from '@kyralabs/m3e-elements/chip-set-layout.js';
import {
  type ForwardedRef,
  type HTMLAttributes,
  type ReactNode,
  forwardRef,
  useLayoutEffect,
  useRef,
} from 'react';
import { useObjectRef } from 'react-aria';
import { cx } from '../utils/cx.js';

export interface ChipSetProps extends Omit<HTMLAttributes<HTMLDivElement>, 'role'> {
  /** Assist, filter or suggestion chips (for input chips use `<InputChipGroup>`). */
  children?: ReactNode;
  /** One scrolling row (ChipGroupSingleLineSample) instead of wrapping lines (ChipGroupReflowSample). */
  singleLine?: boolean;
}

/**
 * A group of chips (COMPONENT_SPEC §18): the m3e-css `.m3e-chip-set` (`role="group"`; name it
 * with `aria-label`) with one tab stop and arrow keys between the chips, from m3e-elements'
 * ChipSetLayout (the code `<m3e-chip-set>` runs).
 */
export const ChipSet = /* @__PURE__ */ forwardRef(function ChipSet(
  props: ChipSetProps,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const { children, singleLine = false, className, ...rest } = props;
  const ref = useObjectRef(forwardedRef);
  const layout = useRef<ChipSetLayout | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const created = new ChipSetLayout(el);
    layout.current = created;
    return () => {
      created.destroy();
      layout.current = null;
    };
  }, [ref]);

  // Re-sync the tab stop after every render (chips added, removed or disabled).
  useLayoutEffect(() => {
    layout.current?.update();
  });

  return (
    <div
      {...rest}
      ref={ref}
      role="group"
      className={cx('m3e-chip-set', singleLine && 'm3e-chip-set--single-line', className)}
    >
      {children}
    </div>
  );
});
