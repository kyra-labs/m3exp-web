import type { Page } from '@playwright/test';

// Reduced motion (FOUNDATIONS §4, M11 a11y audit "Reduced motion" method): spatial motion is off
// (the spatial springs' durations are 0, JS springs jump), while effects (opacity, color, the
// state layer and ripple, elevation shadows, press corner morphs on fast effects) keep running.
// These are the CSS properties that move or resize something.
const SPATIAL = [
  'transform',
  'translate',
  'scale',
  'rotate',
  'inset',
  'inset-block',
  'inset-inline',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'inline-size',
  'block-size',
  'margin',
  'padding',
] as const;

/**
 * The running CSS transitions and animations (and Web Animations) on the page that animate a
 * spatial property, as `<element> <property>` strings.
 */
export function runningSpatialAnimations(page: Page): Promise<string[]> {
  return page.evaluate((spatial) => {
    const isSpatial = (prop: string) => {
      const p = prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      return spatial.some((s) => p === s || p.startsWith(`${s}-`));
    };
    return document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .flatMap((a) => {
        const effect = a.effect as KeyframeEffect | null;
        const target = effect?.target;
        const name = target
          ? `${target.localName}.${[...target.classList].join('.')}${effect.pseudoElement ?? ''}`
          : '?';
        const props =
          a instanceof CSSTransition
            ? [a.transitionProperty]
            : (effect
                ?.getKeyframes()
                .flatMap((k) => Object.keys(k))
                .filter((k) => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)) ??
              []);
        return props.filter(isSpatial).map((p) => `${name} ${p}`);
      });
  }, SPATIAL);
}
