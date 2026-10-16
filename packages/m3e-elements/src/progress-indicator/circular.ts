import { AmplitudeAnimation, circularIndeterminateFrame } from '@kyralabs/m3e-motion';
import {
  CircularWavyPathCache,
  circularWavyVertexCount,
  toSvgPathData,
} from '@kyralabs/m3e-shapes';
import {
  ProgressIndicatorDriver,
  type ProgressIndicatorOptions,
  SVG_NS,
  circularTiming,
  renderProgressRoot,
} from './driver.js';

const B = 'm3e-circular-progress';

/** What `<m3e-circular-progress>` and m3e-react `<CircularProgress>` render. */
export interface CircularProgressContract extends ProgressIndicatorOptions {
  thickness: 'default' | 'thick';
  label?: string | null | undefined;
}

export const circularProgressClass = (c: Pick<CircularProgressContract, 'shape' | 'thickness'>) =>
  [B, c.shape === 'wavy' && `${B}--wavy`, c.thickness === 'thick' && `${B}--thick`]
    .filter(Boolean)
    .join(' ');

/**
 * Writes the `.m3e-circular-progress` contract into `root` (the same DOM m3e-react renders): an
 * SVG with the track and the indicator, `<circle>`s m3e-css lays out (flat) or `<path>`s the
 * driver draws (wavy).
 */
export function renderCircularProgress(root: HTMLElement, c: CircularProgressContract): void {
  renderProgressRoot(root, circularProgressClass(c), c.value, c.label);
  const doc = root.ownerDocument;
  const tag = c.shape === 'wavy' ? 'path' : 'circle';
  let svg = root.firstElementChild as SVGSVGElement | null;
  if (root.childElementCount !== 1 || svg?.localName !== 'svg') {
    svg = doc.createElementNS(SVG_NS, 'svg');
    root.replaceChildren(svg);
  }
  svg.setAttribute('class', `${B}__svg`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (svg.childElementCount !== 2 || svg.firstElementChild?.localName !== tag) {
    svg.replaceChildren(
      ...['track', 'indicator'].map((part) => {
        const el = doc.createElementNS(SVG_NS, tag);
        el.setAttribute('class', `${B}__${part}`);
        return el;
      }),
    );
  }
  if (c.shape !== 'wavy' || c.value !== null) svg.style.removeProperty('rotate');
}

/**
 * Animates a rendered `.m3e-circular-progress` (see ProgressIndicatorDriver). Wavy indicators draw
 * CircularWavyProgressModifiers.kt every frame: a star with one point per wavelength around the
 * circle, morphed from the track's circle by the amplitude (which tweens; determinate: flat at
 * ≤ 10% and ≥ 95%), travelling one wavelength per second while it is wavy (held still under
 * reduced motion); indeterminate ones also rotate and sweep on Compose's keyframes. Flat
 * indeterminate ones are pure CSS.
 */
export class CircularProgressDriver extends ProgressIndicatorDriver {
  #paths = new CircularWavyPathCache();
  #morph = false;

  protected draw(now: number): boolean {
    const progress = this.progressAt(now);
    const springing = this.value?.isRunning ?? false;
    const svg = this.root.querySelector('svg');
    const t = this.tokens!;
    const size = Math.min(this.root.clientWidth, this.root.clientHeight);
    if (this.options.shape !== 'wavy' || !svg || size <= 0) return springing;
    const wavelength = this.options.wavelength ?? t.wavelength;
    const travel = this.travel(wavelength, circularWavyVertexCount(size, wavelength, t.thickness));
    let amplitude: number;
    let end = progress ?? 0;
    let wavy: boolean;
    let motion: boolean;
    if (progress === null) {
      // A fixed amplitude: a Morph only for one between 0 and 1 (requiresMorph).
      amplitude = this.targetAmplitude(null);
      this.#morph ||= amplitude > 0 && amplitude < 1;
      const timing = circularTiming(t.style);
      if (timing) {
        const frame = circularIndeterminateFrame(now - this.startedAt, timing);
        end = frame.sweep;
        svg.style.setProperty(
          'rotate',
          `${String(Math.round((frame.rotation + 90) * 1000) / 1000)}deg`,
        );
      }
      wavy = amplitude > 0;
      motion = wavy && Number.isFinite(travel);
    } else {
      const target = this.targetAmplitude(progress);
      this.amplitude ??= new AmplitudeAnimation(target);
      // The Morph exists once an amplitude tween has started (requiresMorph).
      if (this.amplitude.update(target, now, t.increase, t.decrease)) this.#morph = true;
      amplitude = this.amplitude.sample(now);
      // The wave travels while it shows or heads up, and pauses once it settles flat.
      wavy = amplitude > 0 || target > 0;
      motion = Number.isFinite(travel);
    }
    if (wavy) this.offset.run(now, travel);
    else this.offset.stop(now);
    const paths = this.#paths.paths(
      {
        size,
        wavelength,
        start: 0,
        end,
        amplitude,
        waveOffset: amplitude > 0 ? this.offset.value(now) : 0,
        motion,
        gap: t.gap,
        stroke: t.thickness,
        trackStroke: t.trackThickness,
      },
      this.#morph,
    );
    const [track, indicator] = [...svg.children];
    track?.setAttribute('d', toSvgPathData(paths.track, 3));
    indicator?.setAttribute('d', toSvgPathData(paths.progress, 3));
    return (
      springing ||
      progress === null ||
      (this.amplitude?.isRunning ?? false) ||
      (amplitude > 0 && this.offset.running)
    );
  }
}
