import { LinearWavyPathCache, toSvgPathData } from '@kyralabs/m3e-shapes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../linear-progress/index.js';
import '../circular-progress/index.js';
import { CircularProgressDriver } from './circular.js';
import { LinearProgressDriver, renderLinearProgress } from './linear.js';
import { renderCircularProgress } from './circular.js';

const flush = () =>
  new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });

const mount = async (html: string) => {
  document.body.innerHTML = html;
  await flush();
  await flush();
  return document.body.firstElementChild as HTMLElement;
};

// The generated tokens as the minified CSS build ships them, plus m3e-css's resolved privates.
const P = '--m3e-comp-progress-indicator-defaults-';
const TOKENS: Record<string, string> = {
  [`${P}progress-damping-ratio`]: '1',
  [`${P}progress-stiffness`]: '50',
  [`${P}progress-visibility-threshold`]: '0.001',
  [`${P}progress-duration`]: '1.305s',
  [`${P}amplitude-min-progress`]: '0.1',
  [`${P}amplitude-max-progress`]: '0.95',
  [`${P}amplitude-increase-duration`]: '.5s',
  [`${P}amplitude-increase-easing`]: 'cubic-bezier(0.2, 0, 0, 1)',
  [`${P}amplitude-decrease-duration`]: '.5s',
  [`${P}amplitude-decrease-easing`]: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  [`${P}wave-travel-duration`]: '1s',
  [`${P}wave-min-travel-duration`]: '50ms',
  [`${P}linear-indeterminate-duration`]: '1.75s',
  [`${P}linear-first-head-delay`]: '0ms',
  [`${P}linear-first-head-duration`]: '1s',
  [`${P}linear-first-tail-delay`]: '.25s',
  [`${P}linear-first-tail-duration`]: '1s',
  [`${P}linear-second-head-delay`]: '.65s',
  [`${P}linear-second-head-duration`]: '.85s',
  [`${P}linear-second-tail-delay`]: '.9s',
  [`${P}linear-second-tail-duration`]: '.85s',
  [`${P}linear-indeterminate-easing`]: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  [`${P}circular-indeterminate-duration`]: '6s',
  [`${P}circular-rotation`]: '1080deg',
  [`${P}circular-additional-rotation`]: '360deg',
  [`${P}circular-additional-rotation-delay`]: '1.5s',
  [`${P}circular-additional-rotation-duration`]: '.3s',
  [`${P}circular-min-progress`]: '0.1',
  [`${P}circular-max-progress`]: '0.87',
  [`${P}circular-progress-easing`]: 'cubic-bezier(0.2, 0, 0, 1)',
  '--_m3e-progress-thickness': '4px',
  '--_m3e-progress-track-thickness': '4px',
  '--_m3e-progress-gap': '4px',
  '--_m3e-progress-stop-size': '4px',
};

/** A root with the tokens inline and a layout size (happy-dom has no layout). */
function sized(width: number, height: number, wavelength: number): HTMLDivElement {
  const root = document.createElement('div');
  for (const [name, value] of Object.entries(TOKENS)) root.style.setProperty(name, value);
  root.style.setProperty('--_m3e-progress-wavelength', `${String(wavelength)}px`);
  Object.defineProperty(root, 'clientWidth', { value: width });
  Object.defineProperty(root, 'clientHeight', { value: height });
  document.body.append(root);
  return root;
}

let frames: FrameRequestCallback[];
let now = 1000;

beforeEach(() => {
  frames = [];
  now = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Runs the pending frame at `t`. */
const step = (t: number) => {
  now = t;
  const pending = frames.splice(0);
  for (const cb of pending) cb(t);
};

describe('<m3e-linear-progress>', () => {
  it('renders the determinate contract and moves the host aria-label onto it', async () => {
    const host = await mount(
      '<m3e-linear-progress value="0.4" aria-label="Loading news"></m3e-linear-progress>',
    );
    const root = host.firstElementChild as HTMLElement;
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(root.className).toBe('m3e-linear-progress');
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-label')).toBe('Loading news');
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuemax')).toBe('100');
    expect(root.getAttribute('aria-valuenow')).toBe('40');
    expect(root.hasAttribute('data-driven')).toBe(true);
    expect(root.style.getPropertyValue('--m3e-comp-progress-indicator-value')).toBe('0.4');
    expect([...root.children].map((c) => c.className)).toEqual([
      'm3e-linear-progress__track',
      'm3e-linear-progress__indicator',
      'm3e-linear-progress__stop',
    ]);
  });

  it('is indeterminate without a value: five parts, no aria values', async () => {
    const host = await mount('<m3e-linear-progress label="Loading"></m3e-linear-progress>');
    const root = host.firstElementChild as HTMLElement;
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.getAttribute('aria-label')).toBe('Loading');
    expect([...root.children].map((c) => c.className)).toEqual([
      'm3e-linear-progress__track',
      'm3e-linear-progress__indicator',
      'm3e-linear-progress__track',
      'm3e-linear-progress__indicator',
      'm3e-linear-progress__track',
    ]);
  });

  it('wavy and thick modifiers render an SVG with the wave parts', async () => {
    const host = await mount(
      '<m3e-linear-progress shape="wavy" thickness="thick" value="0.5"></m3e-linear-progress>',
    );
    const root = host.firstElementChild as HTMLElement;
    expect(root.className).toBe(
      'm3e-linear-progress m3e-linear-progress--wavy m3e-linear-progress--thick',
    );
    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('class')).toBe('m3e-linear-progress__wave');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect([...svg.children].map((c) => `${c.localName}.${c.getAttribute('class')!}`)).toEqual([
      'path.m3e-linear-progress__wave-track',
      'path.m3e-linear-progress__wave-indicator',
      'circle.m3e-linear-progress__wave-stop',
    ]);
  });

  it('clamps the value into 0–1 for aria-valuenow', async () => {
    const host = await mount('<m3e-linear-progress value="1.7"></m3e-linear-progress>');
    expect(host.firstElementChild!.getAttribute('aria-valuenow')).toBe('100');
  });
});

describe('<m3e-circular-progress>', () => {
  it('renders circles (flat) or paths (wavy) in one SVG', async () => {
    const host = await mount('<m3e-circular-progress value="0.25"></m3e-circular-progress>');
    const root = host.firstElementChild as HTMLElement;
    expect(root.className).toBe('m3e-circular-progress');
    expect(root.getAttribute('aria-valuenow')).toBe('25');
    const kinds = () => [...root.querySelector('svg')!.children].map((c) => c.localName);
    expect(kinds()).toEqual(['circle', 'circle']);
    host.setAttribute('shape', 'wavy');
    await flush();
    await flush();
    expect(root.className).toBe('m3e-circular-progress m3e-circular-progress--wavy');
    expect(kinds()).toEqual(['path', 'path']);
  });
});

describe('ProgressIndicatorDriver', () => {
  it('springs a value change on ProgressAnimationSpec, keeping the velocity on retarget', () => {
    const root = sized(240, 4, 40);
    renderLinearProgress(root, { value: 0, shape: 'flat', thickness: 'default' });
    const driver = new LinearProgressDriver(root);
    driver.update({ value: 0, shape: 'flat' });
    const value = () => Number(root.style.getPropertyValue('--m3e-comp-progress-indicator-value'));
    expect(value()).toBe(0);
    driver.update({ value: 1, shape: 'flat' });
    step(1100);
    const early = value();
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(0.2);
    step(1300);
    const mid = value();
    // Retarget mid-flight: the value keeps moving up for a while (velocity carried over).
    driver.update({ value: 0.2, shape: 'flat' });
    step(1316);
    expect(value()).toBeGreaterThan(mid);
    for (let t = 1316; t < 5000; t += 16) step(t);
    expect(value()).toBe(0.2);
    expect(frames).toHaveLength(0);
  });

  it('snaps the value under reduced motion (0ms progress duration)', () => {
    const root = sized(240, 4, 40);
    root.style.setProperty(`${P}progress-duration`, '0s');
    renderLinearProgress(root, { value: 0, shape: 'flat', thickness: 'default' });
    const driver = new LinearProgressDriver(root);
    driver.update({ value: 0, shape: 'flat' });
    driver.update({ value: 0.7, shape: 'flat' });
    expect(root.style.getPropertyValue('--m3e-comp-progress-indicator-value')).toBe('0.7');
  });

  it('draws the wavy linear paths with the wave offset moving one wavelength per second', () => {
    const root = sized(240, 10, 40);
    renderLinearProgress(root, { value: 0.5, shape: 'wavy', thickness: 'default' });
    const driver = new LinearProgressDriver(root);
    driver.update({ value: 0.5, shape: 'wavy' });
    step(1000);
    const indicator = root.querySelector('.m3e-linear-progress__wave-indicator')!;
    const expected = (waveOffset: number) =>
      toSvgPathData(
        new LinearWavyPathCache().paths({
          width: 240,
          height: 10,
          wavelength: 40,
          fractions: [0, 0.5],
          amplitude: 1,
          waveOffset,
          gap: 4,
          stroke: 4,
          trackStroke: 4,
        }).progress[0]!,
        3,
      );
    expect(indicator.getAttribute('d')).toBe(expected(0));
    step(1250);
    expect(indicator.getAttribute('d')).toBe(expected(0.25));
    step(2250);
    expect(indicator.getAttribute('d')).toBe(expected(0.25));
    const stop = root.querySelector('circle')!;
    expect(stop.getAttribute('cx')).toBe('238');
    expect(stop.getAttribute('r')).toBe('2');
  });

  it('holds the wave still under reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const root = sized(240, 10, 40);
    renderLinearProgress(root, { value: 0.5, shape: 'wavy', thickness: 'default' });
    const driver = new LinearProgressDriver(root);
    driver.update({ value: 0.5, shape: 'wavy' });
    step(1000);
    const d = root.querySelector('.m3e-linear-progress__wave-indicator')!.getAttribute('d');
    expect(frames).toHaveLength(0);
    step(1250);
    expect(root.querySelector('.m3e-linear-progress__wave-indicator')!.getAttribute('d')).toBe(d);
  });

  it('tweens the amplitude up past 10% (no wave at first, a full wave 500ms later)', () => {
    const root = sized(240, 10, 40);
    renderLinearProgress(root, { value: 0.05, shape: 'wavy', thickness: 'default' });
    root.style.setProperty(`${P}progress-duration`, '0s');
    const driver = new LinearProgressDriver(root);
    driver.update({ value: 0.05, shape: 'wavy' });
    step(1000);
    const ys = () =>
      (root.querySelector('.m3e-linear-progress__wave-indicator')!.getAttribute('d') ?? '')
        .match(/-?[\d.]+/g)!
        .map(Number)
        .filter((_, i) => i % 2 === 1);
    driver.update({ value: 0.5, shape: 'wavy' });
    step(1001);
    const flatSpread = Math.max(...ys()) - Math.min(...ys());
    step(1600);
    const fullSpread = Math.max(...ys()) - Math.min(...ys());
    expect(flatSpread).toBeLessThan(0.5);
    expect(fullSpread).toBeGreaterThan(5);
  });

  it('turns the indeterminate wavy circular indicator on Compose’s timeline (+90°)', () => {
    const root = sized(48, 48, 15);
    renderCircularProgress(root, { value: null, shape: 'wavy', thickness: 'default' });
    const driver = new CircularProgressDriver(root);
    driver.update({ value: null, shape: 'wavy' });
    step(1000);
    const svg = root.querySelector('svg')!;
    expect(svg.style.getPropertyValue('rotate')).toBe('90deg');
    // 150ms in: 27° global + 45° (half the first step) + 90°.
    step(1150);
    expect(svg.style.getPropertyValue('rotate')).toBe('162deg');
    expect(root.querySelector('.m3e-circular-progress__indicator')!.getAttribute('d')).toMatch(
      /^M/,
    );
  });
});
