import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './index.js';
import { SnackbarHostState, snackbarDurationMillis } from '../snackbar-layout/snackbar-layout.js';
import type { M3eSnackbarHost } from './snackbar-host.js';

// happy-dom has no layout or motion tokens: springs settle on their first write (no frames); the
// durations are set on the root as snackbar-defaults.css would (minified: `4000ms` → `4s`).
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

const durations = document.createElement('style');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('requestAnimationFrame', vi.fn());
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  durations.textContent =
    ':root { --m3e-comp-snackbar-duration-short: 4s; --m3e-comp-snackbar-duration-long: 10000ms; }';
  document.head.append(durations);
});

afterEach(() => {
  document.body.innerHTML = '';
  durations.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup(html = '<m3e-snackbar-host></m3e-snackbar-host>') {
  document.body.innerHTML = `<button id="outside">Outside</button>${html}`;
  await settle();
  const host = document.querySelector<M3eSnackbarHost>('m3e-snackbar-host')!;
  return { host, root: host.hostElement! };
}

const items = (root: Element) => [...root.querySelectorAll('.m3e-snackbar-host__item')];
const key = (target: Element, k: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

describe('SnackbarHostState (Compose SnackbarHostState)', () => {
  it('shows one snackbar at a time, first in first out; the results resolve the calls', async () => {
    const state = new SnackbarHostState();
    const seen: (string | undefined)[] = [];
    state.subscribe(() => seen.push(state.currentSnackbarData?.visuals.message));
    const a = state.showSnackbar('A');
    const b = state.showSnackbar({ message: 'B', actionLabel: 'Undo' });
    const c = state.showSnackbar({ message: 'C', duration: 'long', withDismissAction: true });
    expect(state.currentSnackbarData?.visuals.message).toBe('A');
    state.currentSnackbarData!.dismiss();
    await expect(a).resolves.toBe('dismissed');
    const bData = state.currentSnackbarData!;
    expect(bData.visuals).toEqual({
      message: 'B',
      actionLabel: 'Undo',
      withDismissAction: false,
      duration: 'indefinite',
    });
    bData.performAction();
    bData.dismiss(); // only the first call counts (continuation.isActive)
    await expect(b).resolves.toBe('action-performed');
    expect(state.currentSnackbarData?.visuals.duration).toBe('long');
    state.currentSnackbarData!.dismiss();
    await expect(c).resolves.toBe('dismissed');
    expect(state.currentSnackbarData).toBeNull();
    expect(seen).toEqual(['A', 'B', 'C', undefined]);
  });

  it('an aborted call leaves the queue (queued) or the screen (showing) and rejects', async () => {
    const state = new SnackbarHostState();
    const first = new AbortController();
    const second = new AbortController();
    const a = state.showSnackbar({ message: 'A', signal: first.signal });
    const b = state.showSnackbar({ message: 'B', signal: second.signal });
    const c = state.showSnackbar('C');
    second.abort(new Error('gone'));
    await expect(b).rejects.toThrow('gone');
    expect(state.currentSnackbarData?.visuals.message).toBe('A');
    first.abort(new Error('cancelled'));
    await expect(a).rejects.toThrow('cancelled');
    expect(state.currentSnackbarData?.visuals.message).toBe('C');
    state.currentSnackbarData!.dismiss();
    await expect(c).resolves.toBe('dismissed');
  });

  it('SnackbarDuration.toMillis: 4s / 10s / Infinity, then the recommended timeout', () => {
    const state = new SnackbarHostState();
    void state.showSnackbar('A');
    const data = state.currentSnackbarData!;
    const style = getComputedStyle(document.documentElement);
    expect(snackbarDurationMillis(data, style)).toBe(4000);
    expect(snackbarDurationMillis(data, null)).toBe(4000);
    const recommended = vi.fn((ms: number) => ms * 2);
    expect(snackbarDurationMillis(data, style, recommended)).toBe(8000);
    expect(recommended).toHaveBeenCalledWith(4000, {
      containsIcons: true,
      containsText: true,
      containsControls: false,
    });
  });
});

describe('<m3e-snackbar-host> (COMPONENT_SPEC §32)', () => {
  it('renders the live region and the snackbar contract with the action and dismiss buttons', async () => {
    const { host, root } = await setup();
    expect(root.className).toBe('m3e-snackbar-host');
    expect(root.getAttribute('role')).toBe('status');
    expect(host.style.display).toBe('contents');
    void host.showSnackbar({ message: 'Archived', actionLabel: 'Undo', withDismissAction: true });
    const [item] = items(root);
    const snackbar = item!.firstElementChild!;
    expect(snackbar.className).toBe('m3e-snackbar');
    expect(snackbar.querySelector('.m3e-snackbar__text')!.textContent).toBe('Archived');
    const action = snackbar.querySelector<HTMLButtonElement>('.m3e-snackbar__action')!;
    expect(action.className).toBe('m3e-button m3e-button--text m3e-snackbar__action');
    expect(action.textContent).toBe('Undo');
    const dismiss = snackbar.querySelector<HTMLButtonElement>('.m3e-snackbar__dismiss')!;
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss');
    expect(dismiss.textContent).toBe('close');
    // The built-in tooltip (owner decision M9 #30) repeats the name: aria-hidden, no description.
    const tooltip = snackbar.querySelector('.m3e-tooltip')!;
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.getAttribute('popover')).toBe('manual');
    expect(tooltip.getAttribute('aria-hidden')).toBe('true');
    expect(tooltip.textContent).toBe('Dismiss');
    expect(dismiss.hasAttribute('aria-describedby')).toBe(false);
    // The springs settled (no motion tokens in happy-dom).
    expect(item!.hasAttribute('data-driven')).toBe(true);
    expect((item as HTMLElement).style.getPropertyValue('--_m3e-snackbar-opacity')).toBe('1');
  });

  it('the action and the dismiss button resolve showSnackbar; one snackbar at a time', async () => {
    const { host, root } = await setup();
    const a = host.showSnackbar({ message: 'A', actionLabel: 'Retry' });
    const b = host.showSnackbar({ message: 'B', withDismissAction: true });
    expect(items(root)).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('.m3e-snackbar__action')!.click();
    await expect(a).resolves.toBe('action-performed');
    // The previous one faded out (removed at once without motion tokens); B is shown.
    expect(items(root).map((i) => i.textContent)).toEqual(['BcloseDismiss']);
    root.querySelector<HTMLButtonElement>('.m3e-snackbar__dismiss')!.click();
    await expect(b).resolves.toBe('dismissed');
    expect(items(root)).toHaveLength(0);
  });

  it('dismisses after the duration (short 4s, long 10s); indefinite stays', async () => {
    const { host } = await setup();
    const short = host.showSnackbar('Short');
    vi.advanceTimersByTime(3999);
    expect(host.currentSnackbarData?.visuals.message).toBe('Short');
    vi.advanceTimersByTime(1);
    await expect(short).resolves.toBe('dismissed');
    const long = host.showSnackbar({ message: 'Long', duration: 'long' });
    vi.advanceTimersByTime(9999);
    expect(host.currentSnackbarData?.visuals.message).toBe('Long');
    vi.advanceTimersByTime(1);
    await expect(long).resolves.toBe('dismissed');
    void host.showSnackbar({ message: 'Action', actionLabel: 'Undo' });
    vi.advanceTimersByTime(1e9);
    expect(host.currentSnackbarData?.visuals.message).toBe('Action');
  });

  it('pauses while hovered or focused (owner decision M9 #20) and resumes the rest', async () => {
    const { host, root } = await setup();
    void host.showSnackbar({ message: 'Saved', withDismissAction: true });
    const snackbar = root.querySelector('.m3e-snackbar')!;
    vi.advanceTimersByTime(3000);
    snackbar.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }),
    );
    vi.advanceTimersByTime(60_000);
    expect(host.currentSnackbarData).not.toBeNull();
    snackbar.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: null }),
    );
    // Focus in it pauses too.
    root.querySelector<HTMLButtonElement>('.m3e-snackbar__dismiss')!.focus();
    vi.advanceTimersByTime(60_000);
    expect(host.currentSnackbarData).not.toBeNull();
    document.getElementById('outside')!.focus();
    vi.advanceTimersByTime(999);
    expect(host.currentSnackbarData).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(host.currentSnackbarData).toBeNull();
  });

  it('Escape in the snackbar dismisses it; focus() reaches the action and returns afterwards', async () => {
    const { host, root } = await setup();
    const outside = document.getElementById('outside')!;
    outside.focus();
    expect(host.hostState.focus()).toBe(false);
    const shown = host.showSnackbar({ message: 'Deleted', actionLabel: 'Undo' });
    // Nothing moves focus on its own (m3.material.io).
    expect(document.activeElement).toBe(outside);
    host.focus();
    const action = root.querySelector<HTMLButtonElement>('.m3e-snackbar__action')!;
    expect(document.activeElement).toBe(action);
    key(action, 'Escape');
    await expect(shown).resolves.toBe('dismissed');
    expect(document.activeElement).toBe(outside);
    // Escape outside a snackbar does nothing.
    void host.showSnackbar({ message: 'Again', actionLabel: 'Undo' });
    key(outside, 'Escape');
    expect(host.currentSnackbarData?.visuals.message).toBe('Again');
  });

  it('action-on-new-line and dismiss-label', async () => {
    const { host, root } = await setup(
      '<m3e-snackbar-host action-on-new-line dismiss-label="Close"></m3e-snackbar-host>',
    );
    void host.showSnackbar({
      message: 'Text',
      actionLabel: 'Long action',
      withDismissAction: true,
    });
    const snackbar = root.querySelector('.m3e-snackbar')!;
    expect(snackbar.className).toBe('m3e-snackbar m3e-snackbar--action-on-new-line');
    expect(snackbar.querySelector('.m3e-snackbar__dismiss')!.getAttribute('aria-label')).toBe(
      'Close',
    );
    expect(snackbar.querySelector('.m3e-tooltip')!.textContent).toBe('Close');
    // Without an action the row layout stays (Compose: actionOnNewLine && action != null).
    host.currentSnackbarData!.dismiss();
    await settle();
    void host.showSnackbar('Plain');
    expect(root.querySelector('.m3e-snackbar')!.className).toBe('m3e-snackbar');
  });

  it('shares a hostState; disconnecting stops the timers', async () => {
    const { host, root } = await setup();
    const state = new SnackbarHostState();
    host.hostState = state;
    await settle();
    void state.showSnackbar('From code');
    expect(host.currentSnackbarData?.visuals.message).toBe('From code');
    expect(root.textContent).toBe('From code');
    host.remove();
    vi.advanceTimersByTime(10_000);
    expect(state.currentSnackbarData?.visuals.message).toBe('From code');
  });
});
