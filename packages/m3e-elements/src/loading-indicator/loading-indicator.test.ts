import { indeterminateFrame, initialIndeterminateFrame } from '@kyralabs/m3e-motion';
import { determinateFrame, loadingIndicatorShapes } from '@kyralabs/m3e-shapes';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './index.js';

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

// The generated token values as the minified CSS build ships them (650ms → .65s).
const TOKENS = {
  '--m3e-comp-loading-indicator-active-size': '38px',
  '--m3e-comp-loading-indicator-container-width': '48px',
  '--m3e-comp-loading-indicator-container-height': '48px',
  '--m3e-comp-loading-indicator-morph-interval': '.65s',
  '--m3e-comp-loading-indicator-rotation-duration': '4.666s',
  '--m3e-comp-loading-indicator-morph-spring-damping-ratio': '0.6',
  '--m3e-comp-loading-indicator-morph-spring-stiffness': '200',
  '--m3e-comp-loading-indicator-morph-spring-visibility-threshold': '0.1',
};
const TIMING = {
  morphIntervalMillis: 650,
  rotationDurationMillis: 4666,
  spring: { dampingRatio: 0.6, stiffness: 200 },
  visibilityThreshold: 0.1,
};
const SCALE = 38 / 48;

const TOKEN_STYLE = Object.entries(TOKENS)
  .map(([name, value]) => `${name}: ${value}`)
  .join('; ');
/** Markup with the tokens on the host (happy-dom does not inherit custom properties). */
const withTokens = (attributes = '') =>
  `<m3e-loading-indicator style="${TOKEN_STYLE}" ${attributes}></m3e-loading-indicator>`;
const setTokens = (host: HTMLElement) => {
  for (const [name, value] of Object.entries(TOKENS)) host.style.setProperty(name, value);
};

const parts = (host: HTMLElement) => ({
  root: host.querySelector('.m3e-loading-indicator')!,
  svg: host.querySelector('svg')!,
  d: host.querySelector('path')!.getAttribute('d'),
  rotate: host.querySelector('svg')!.style.getPropertyValue('rotate'),
});

const rotation = (degrees: number) => `${String(Math.round(degrees * 1000) / 1000)}deg`;

let frames: FrameRequestCallback[];

beforeEach(() => {
  frames = [];
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

describe('<m3e-loading-indicator>', () => {
  it('renders the progressbar contract and moves the host aria-label onto it', async () => {
    const host = await mount(
      '<m3e-loading-indicator aria-label="Loading"></m3e-loading-indicator>',
    );
    const { root, svg } = parts(host);
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(root.className).toBe('m3e-loading-indicator');
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-label')).toBe('Loading');
    expect(root.hasAttribute('data-driven')).toBe(true);
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(svg.getAttribute('class')).toBe('m3e-loading-indicator__shape');
    expect(svg.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('draws the container when contained', async () => {
    const host = await mount('<m3e-loading-indicator contained></m3e-loading-indicator>');
    expect(parts(host).root.className).toBe(
      'm3e-loading-indicator m3e-loading-indicator--contained',
    );
  });

  it('is determinate with progress: aria values and the determinate morph by progress', async () => {
    const host = await mount(withTokens('progress="0.4"'));
    const { root, d, rotate } = parts(host);
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuemax')).toBe('100');
    expect(root.getAttribute('aria-valuenow')).toBe('40');
    const shapes = loadingIndicatorShapes(null, false, SCALE);
    const frame = determinateFrame(0.4, shapes.morphs.length);
    expect(d).toBe(shapes.pathData(frame.morphIndex, frame.morphProgress, 100));
    expect(rotate).toBe(rotation(frame.rotation));
    expect(frames).toHaveLength(0);
  });

  it('morphs through the indeterminate sequence on the token timeline', async () => {
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const host = await mount(withTokens());
    const shapes = loadingIndicatorShapes(null, true, SCALE);
    expect(parts(host).d).toBe(shapes.pathData(0, 0, 100));
    for (const elapsed of [120, 650, 650 * 3 + 200, 650 * 9]) {
      now = 1000 + elapsed;
      frames.shift()!(now);
      const frame = indeterminateFrame(elapsed, 7, TIMING);
      const { d, rotate } = parts(host);
      expect(d, String(elapsed)).toBe(shapes.pathData(frame.morphIndex, frame.morphProgress, 100));
      expect(rotate).toBe(rotation(frame.rotation));
    }
  });

  it('holds the first frame under prefers-reduced-motion', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    const host = await mount(withTokens());
    const shapes = loadingIndicatorShapes(null, true, SCALE);
    expect(parts(host).d).toBe(shapes.pathData(0, 0, 100));
    expect(parts(host).rotate).toBe(rotation(initialIndeterminateFrame.rotation));
    expect(frames).toHaveLength(0);
  });

  it('holds still without the choreography tokens and stops when removed', async () => {
    const host = await mount('<m3e-loading-indicator></m3e-loading-indicator>');
    expect(frames).toHaveLength(0);
    expect(parts(host).rotate).toBe(rotation(initialIndeterminateFrame.rotation));
    setTokens(host);
    host.toggleAttribute('contained', true);
    await flush();
    expect(frames).toHaveLength(1);
    host.remove();
    expect(cancelAnimationFrame).toHaveBeenCalled();
  });

  it('keeps a running animation when only the label changes', async () => {
    const host = await mount(withTokens());
    expect(frames).toHaveLength(1);
    host.setAttribute('label', 'Fetching');
    await flush();
    expect(parts(host).root.getAttribute('aria-label')).toBe('Fetching');
    expect(cancelAnimationFrame).not.toHaveBeenCalled();
  });
});
