import '@kyralabs/m3e-elements/loading-indicator.js';
import { indeterminateFrame, initialIndeterminateFrame } from '@kyralabs/m3e-motion';
import { determinateFrame, loadingIndicatorShapes } from '@kyralabs/m3e-shapes';
import type { CSSProperties } from 'react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elementContract, reactContract, renderElement, renderReact } from '../test/parity.js';
import { LoadingIndicator } from './LoadingIndicator.js';

// The generated token values, inline on the root (happy-dom does not inherit custom properties).
const TOKENS = {
  '--m3e-comp-loading-indicator-active-size': '38px',
  '--m3e-comp-loading-indicator-container-width': '48px',
  '--m3e-comp-loading-indicator-container-height': '48px',
  '--m3e-comp-loading-indicator-morph-interval': '650ms',
  '--m3e-comp-loading-indicator-rotation-duration': '4666ms',
  '--m3e-comp-loading-indicator-morph-spring-damping-ratio': '0.6',
  '--m3e-comp-loading-indicator-morph-spring-stiffness': '200',
  '--m3e-comp-loading-indicator-morph-spring-visibility-threshold': '0.1',
} as CSSProperties;
const TIMING = {
  morphIntervalMillis: 650,
  rotationDurationMillis: 4666,
  spring: { dampingRatio: 0.6, stiffness: 200 },
  visibilityThreshold: 0.1,
};
const SCALE = 38 / 48;
const rotation = (degrees: number) => `${String(Math.round(degrees * 1000) / 1000)}deg`;

let frames: FrameRequestCallback[];
let reduced = false;

beforeEach(() => {
  frames = [];
  reduced = false;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced,
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

const parts = (container: HTMLElement) => ({
  root: container.querySelector('.m3e-loading-indicator')!,
  d: container.querySelector('path')!.getAttribute('d'),
  rotate: container.querySelector('svg')!.style.getPropertyValue('rotate'),
});

describe('<LoadingIndicator>', () => {
  it('renders the progressbar contract', async () => {
    const { root } = parts(
      await renderReact(<LoadingIndicator contained aria-label="Loading" className="extra" />),
    );
    expect(root.className).toBe('m3e-loading-indicator m3e-loading-indicator--contained extra');
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-label')).toBe('Loading');
    expect(root.hasAttribute('aria-valuenow')).toBe(false);
  });

  it('is determinate with progress (coerced into 0–1)', async () => {
    const container = await renderReact(<LoadingIndicator progress={0.4} style={TOKENS} />);
    const { root, d, rotate } = parts(container);
    expect(root.getAttribute('aria-valuenow')).toBe('40');
    const shapes = loadingIndicatorShapes(null, false, SCALE);
    const frame = determinateFrame(0.4, shapes.morphs.length);
    expect(d).toBe(shapes.pathData(frame.morphIndex, frame.morphProgress, 100));
    expect(rotate).toBe(rotation(frame.rotation));
    const over = await renderReact(<LoadingIndicator progress={7} />);
    expect(parts(over).root.getAttribute('aria-valuenow')).toBe('100');
  });

  it('morphs through the indeterminate sequence on the token timeline', async () => {
    let now = 500;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const container = await renderReact(<LoadingIndicator style={TOKENS} />);
    const shapes = loadingIndicatorShapes(null, true, SCALE);
    expect(parts(container).d).toBe(shapes.pathData(0, 0, 100));
    for (const elapsed of [90, 650 * 2, 650 * 5 + 300]) {
      now = 500 + elapsed;
      act(() => {
        frames.shift()!(now);
      });
      const frame = indeterminateFrame(elapsed, 7, TIMING);
      expect(parts(container).d).toBe(shapes.pathData(frame.morphIndex, frame.morphProgress, 100));
      expect(parts(container).rotate).toBe(rotation(frame.rotation));
    }
  });

  it('holds the first frame under prefers-reduced-motion', async () => {
    reduced = true;
    const container = await renderReact(<LoadingIndicator style={TOKENS} />);
    expect(parts(container).rotate).toBe(rotation(initialIndeterminateFrame.rotation));
    expect(frames).toHaveLength(0);
  });
});

describe('<LoadingIndicator> ⇔ <m3e-loading-indicator> DOM parity', () => {
  it.each([
    ['indeterminate', <LoadingIndicator />, '<m3e-loading-indicator></m3e-loading-indicator>'],
    [
      'contained, labelled',
      <LoadingIndicator contained aria-label="Loading" />,
      '<m3e-loading-indicator contained aria-label="Loading"></m3e-loading-indicator>',
    ],
    [
      'determinate',
      <LoadingIndicator progress={0.4} aria-label="Uploading" />,
      '<m3e-loading-indicator progress="0.4" label="Uploading"></m3e-loading-indicator>',
    ],
    [
      'determinate, complete',
      <LoadingIndicator progress={1} contained />,
      '<m3e-loading-indicator progress="1" contained></m3e-loading-indicator>',
    ],
  ])('%s', async (_, react, html) => {
    const fromReact = reactContract(await renderReact(react));
    const fromElement = elementContract(await renderElement(html));
    expect(fromReact).toBe(fromElement);
  });
});
