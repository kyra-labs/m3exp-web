import { AmplitudeAnimation, linearIndeterminateFractions } from '@kyralabs/m3e-motion';
import { LinearWavyPathCache, linearWavyStopIndicator, toSvgPathData } from '@kyralabs/m3e-shapes';
import {
  ProgressIndicatorDriver,
  type ProgressIndicatorOptions,
  type ProgressTokens,
  SVG_NS,
  linearTiming,
  num,
  renderProgressRoot,
} from './driver.js';

const B = 'm3e-linear-progress';

/** What `<m3e-linear-progress>` and m3e-react `<LinearProgress>` render. */
export interface LinearProgressContract extends ProgressIndicatorOptions {
  thickness: 'default' | 'thick';
  label?: string | null | undefined;
}

export const linearProgressClass = (c: Pick<LinearProgressContract, 'shape' | 'thickness'>) =>
  [B, c.shape === 'wavy' && `${B}--wavy`, c.thickness === 'thick' && `${B}--thick`]
    .filter(Boolean)
    .join(' ');

/**
 * The parts inside the root, in drawing order (the same DOM m3e-react renders): flat determinate
 * `track, indicator, stop`; flat indeterminate `track, indicator, track, indicator, track`; wavy an
 * SVG with `__wave-track`, one `__wave-indicator` per line and (determinate) the `__wave-stop`.
 */
export const linearProgressParts = (
  c: Pick<LinearProgressContract, 'shape' | 'value'>,
): string[] =>
  c.shape === 'wavy'
    ? ['wave-track', 'wave-indicator', c.value === null ? 'wave-indicator' : 'wave-stop']
    : c.value === null
      ? ['track', 'indicator', 'track', 'indicator', 'track']
      : ['track', 'indicator', 'stop'];

/** Writes the `.m3e-linear-progress` contract into `root` (reusing matching children). */
export function renderLinearProgress(root: HTMLElement, c: LinearProgressContract): void {
  renderProgressRoot(root, linearProgressClass(c), c.value, c.label);
  const parts = linearProgressParts(c);
  const doc = root.ownerDocument;
  if (c.shape === 'wavy') {
    let svg = root.firstElementChild;
    if (root.childElementCount !== 1 || svg?.localName !== 'svg') {
      svg = doc.createElementNS(SVG_NS, 'svg');
      root.replaceChildren(svg);
    }
    svg.setAttribute('class', `${B}__wave`);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const current = [...svg.children].map((e) => e.getAttribute('class'));
    if (current.join() !== parts.map((p) => `${B}__${p}`).join()) {
      svg.replaceChildren(
        ...parts.map((p) => {
          const el = doc.createElementNS(SVG_NS, p === 'wave-stop' ? 'circle' : 'path');
          el.setAttribute('class', `${B}__${p}`);
          return el;
        }),
      );
    }
    return;
  }
  const current = [...root.children].map((e) => e.className);
  if (current.join() !== parts.map((p) => `${B}__${p}`).join()) {
    root.replaceChildren(
      ...parts.map((p) => {
        const el = doc.createElement('span');
        el.className = `${B}__${p}`;
        return el;
      }),
    );
  }
}

/**
 * Animates a rendered `.m3e-linear-progress` (see ProgressIndicatorDriver). Wavy indicators draw
 * LinearWavyProgressModifiers.kt every frame: the amplitude tweens (determinate: flat at ≤ 10% and
 * ≥ 95%), the wave travels one wavelength per second (held still under reduced motion), and the
 * indeterminate lines run Compose's keyframes; flat indeterminate ones are pure CSS.
 */
export class LinearProgressDriver extends ProgressIndicatorDriver {
  #paths = new LinearWavyPathCache();

  protected draw(now: number, t: ProgressTokens): boolean {
    const progress = this.progressAt(now);
    const springing = this.value?.isRunning ?? false;
    if (this.options.shape !== 'wavy') return springing;
    const svg = this.root.querySelector('svg');
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (!svg || width <= 0 || height <= 0) return springing;
    const timing = progress === null ? linearTiming(t.style) : null;
    const fractions =
      progress === null
        ? timing === null
          ? [0, 0, 0, 0]
          : linearIndeterminateFractions(now - this.startedAt, timing)
        : [0, progress];
    // The amplitude animates toward its target; a running tween is never retargeted.
    const target = this.targetAmplitude(t, progress);
    this.amplitude ??= new AmplitudeAnimation(target);
    this.amplitude.update(target, now, t.increase, t.decrease);
    const amplitude = this.amplitude.sample(now);
    const wavelength = this.options.wavelength ?? t.wavelength;
    this.offset.run(now, this.travel(t, wavelength));
    const paths = this.#paths.paths({
      width,
      height,
      wavelength,
      fractions,
      amplitude,
      waveOffset: amplitude > 0 ? this.offset.value(now) : 0,
      gap: t.gap,
      stroke: t.thickness,
      trackStroke: t.trackThickness,
    });
    const [track, ...rest] = [...svg.children];
    track?.setAttribute('d', toSvgPathData(paths.track, 3));
    rest.forEach((el, i) => {
      if (el.localName === 'path') {
        el.setAttribute('d', toSvgPathData(paths.progress[i] ?? [], 3));
        return;
      }
      // The stop indicator (determinate).
      const stop = linearWavyStopIndicator(
        progress ?? 0,
        width,
        num(t.style, '--_m3e-progress-stop-size') || 0,
        paths.capWidth,
        t.trackThickness,
      );
      const r = stop ? stop.size / 2 : 0;
      el.setAttribute('cx', String(stop ? stop.x + r : 0));
      el.setAttribute('cy', String(height / 2));
      el.setAttribute('r', String(r));
    });
    return (
      springing ||
      this.amplitude.isRunning ||
      progress === null ||
      (amplitude > 0 && this.offset.running)
    );
  }
}
