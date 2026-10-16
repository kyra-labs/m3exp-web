import '@kyralabs/m3e-elements/linear-progress.js';
import '@kyralabs/m3e-elements/circular-progress.js';
import type { CSSProperties } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { elementContract, reactContract, renderElement, renderReact } from '../test/parity.js';
import { CircularProgress, LinearProgress } from './Progress.js';

const P = '--m3e-comp-progress-indicator-defaults-';
// Inline on the root (happy-dom does not inherit custom properties).
const TOKENS = {
  [`${P}progress-damping-ratio`]: '1',
  [`${P}progress-stiffness`]: '50',
  [`${P}progress-visibility-threshold`]: '0.001',
  [`${P}progress-duration`]: '1305ms',
} as CSSProperties;

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

describe('<LinearProgress>', () => {
  it('renders the determinate contract', async () => {
    const container = await renderReact(
      <LinearProgress value={0.4} aria-label="Loading news" className="extra" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toBe('m3e-linear-progress extra');
    expect(root.getAttribute('role')).toBe('progressbar');
    expect(root.getAttribute('aria-label')).toBe('Loading news');
    expect(root.getAttribute('aria-valuenow')).toBe('40');
    expect(root.style.getPropertyValue('--m3e-comp-progress-indicator-value')).toBe('0.4');
  });

  it('springs value changes (velocity kept by the shared driver)', async () => {
    const container = document.createElement('div');
    document.body.append(container);
    const react = createRoot(container);
    await act(async () => {
      react.render(<LinearProgress value={0} style={TOKENS} />);
      await Promise.resolve();
    });
    await act(async () => {
      react.render(<LinearProgress value={1} style={TOKENS} />);
      await Promise.resolve();
    });
    const root = container.firstElementChild as HTMLElement;
    now = 1200;
    for (const cb of frames.splice(0)) cb(now);
    const v = Number(root.style.getPropertyValue('--m3e-comp-progress-indicator-value'));
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
    expect(root.getAttribute('aria-valuenow')).toBe('100');
    act(() => {
      react.unmount();
    });
  });
});

describe('DOM parity with the elements', () => {
  const cases: [string, string, React.ReactElement][] = [
    [
      'linear determinate',
      '<m3e-linear-progress value="0.4" aria-label="Loading"></m3e-linear-progress>',
      <LinearProgress value={0.4} aria-label="Loading" />,
    ],
    [
      'linear indeterminate thick',
      '<m3e-linear-progress thickness="thick" aria-label="Loading"></m3e-linear-progress>',
      <LinearProgress thickness="thick" aria-label="Loading" />,
    ],
    [
      'linear wavy determinate',
      '<m3e-linear-progress shape="wavy" value="0.5" aria-label="Loading"></m3e-linear-progress>',
      <LinearProgress shape="wavy" value={0.5} aria-label="Loading" />,
    ],
    [
      'linear wavy indeterminate',
      '<m3e-linear-progress shape="wavy" aria-label="Loading"></m3e-linear-progress>',
      <LinearProgress shape="wavy" aria-label="Loading" />,
    ],
    [
      'circular determinate',
      '<m3e-circular-progress value="0.25" aria-label="Loading"></m3e-circular-progress>',
      <CircularProgress value={0.25} aria-label="Loading" />,
    ],
    [
      'circular wavy indeterminate thick',
      '<m3e-circular-progress shape="wavy" thickness="thick" aria-label="Loading"></m3e-circular-progress>',
      <CircularProgress shape="wavy" thickness="thick" aria-label="Loading" />,
    ],
  ];
  for (const [name, html, ui] of cases) {
    it(name, async () => {
      const host = await renderElement(html);
      const container = await renderReact(ui);
      expect(reactContract(container)).toBe(elementContract(host));
    });
  }
});
