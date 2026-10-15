import { type RefObject, useEffect, useState } from 'react';

export interface ExtendedFabScrollOptions {
  /** Scroll container; the window when omitted or while the ref is empty. */
  target?: RefObject<HTMLElement | null>;
  /** Stays expanded while the scroll offset is at most this many px. Default 0. */
  threshold?: number;
  /**
   * Also expand whenever the content scrolls back up (m3.material.io Extended FAB › Guidelines ›
   * Scrolling); otherwise only near the top (the Compose samples). Default false.
   */
  expandOnScrollUp?: boolean;
}

/**
 * Scroll-driven `expanded` for `<ExtendedFab>` (COMPONENT_SPEC §5 "scroll-collapse"). The Compose
 * samples (`AnimatedExtendedFloatingActionButtonSample`, FloatingActionButtonSamples.kt) expand
 * the FAB only while the list is at its start (`firstVisibleItemIndex == 0`); m3.material.io also
 * shows it expanding again on scroll up (`expandOnScrollUp`).
 */
export function useExtendedFabScroll({
  target,
  threshold = 0,
  expandOnScrollUp = false,
}: ExtendedFabScrollOptions = {}): boolean {
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    const el = target?.current ?? null;
    const read = () => (el ? el.scrollTop : window.scrollY);
    let last = read();
    setExpanded(last <= threshold);
    const onScroll = () => {
      const offset = read();
      if (offset === last) return;
      const up = offset < last;
      last = offset;
      setExpanded(offset <= threshold || (expandOnScrollUp && up));
    };
    const source: EventTarget = el ?? window;
    source.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      source.removeEventListener('scroll', onScroll);
    };
  }, [target, threshold, expandOnScrollUp]);
  return expanded;
}
