// m3e-elements is bundled (a devDependency); the public types come from m3e-motion (a dependency).
import {
  currentWindowSizeClass,
  observeWindowSizeClass,
} from '@kyralabs/m3e-elements/window-size-class.js';
import {
  type WindowSizeClass,
  type WindowSizeClassOptions,
  sameWindowSizeClass,
  windowSizeClass,
} from '@kyralabs/m3e-motion';
import { type RefObject, useLayoutEffect, useState } from 'react';

export interface UseWindowSizeClassOptions extends WindowSizeClassOptions {
  /**
   * Classify this element's content box (container-based layouts) instead of the viewport. The
   * element must be mounted when the hook's component mounts.
   */
  target?: RefObject<Element | null> | undefined;
  /**
   * The value until the first measurement (a `target` not measured yet). Default: compact width
   * and height. Without `target`, the first render already reads the viewport (D6: client only).
   */
  initial?: WindowSizeClass | undefined;
}

/**
 * The current window size class (FOUNDATIONS §9; Compose `currentWindowAdaptiveInfoV2()
 * .windowSizeClass`), re-rendering only when the width or height class changes. Follows the
 * viewport, or `target`'s content box, through m3e-elements' `observeWindowSizeClass`. Pass the
 * result to `isWidthAtLeastBreakpoint`, `paneScaffoldDirective` or `navigationSuiteType`
 * (`@kyralabs/m3e-motion`, also re-exported by `@kyralabs/m3e-elements` and the umbrella).
 */
export function useWindowSizeClass(options: UseWindowSizeClassOptions = {}): WindowSizeClass {
  const { target, largeAndExtraLargeWidth, initial } = options;
  const [sizeClass, setSizeClass] = useState<WindowSizeClass>(
    () =>
      (target ? null : currentWindowSizeClass({ largeAndExtraLargeWidth })) ??
      initial ??
      windowSizeClass({ width: 0, height: 0 }),
  );
  useLayoutEffect(() => {
    const element = target?.current;
    if (target && !element) return;
    const controller = new AbortController();
    observeWindowSizeClass(
      (next) => {
        setSizeClass((prev) => (sameWindowSizeClass(prev, next) ? prev : next));
      },
      {
        signal: controller.signal,
        largeAndExtraLargeWidth,
        ...(element ? { target: element } : {}),
      },
    );
    return () => {
      controller.abort();
    };
  }, [target, largeAndExtraLargeWidth]);
  return sizeClass;
}
