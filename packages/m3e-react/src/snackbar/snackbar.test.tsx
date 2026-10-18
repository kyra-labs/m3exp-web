import '@kyralabs/m3e-elements/snackbar-host.js';
import type { M3eSnackbarHost } from '@kyralabs/m3e-elements/snackbar-host.js';
import type { SnackbarHostState } from '@kyralabs/m3e-elements/snackbar-layout.js';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { Snackbar, SnackbarHost, useSnackbarHostState } from './Snackbar.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

let captured: SnackbarHostState | null = null;
function Demo(props: { actionOnNewLine?: boolean }) {
  const state = useSnackbarHostState();
  captured = state;
  return <SnackbarHost hostState={state} {...props} />;
}

/** Shows a snackbar inside act; returns the pending result (wrapped: awaiting it would wait). */
const show = async (
  state: SnackbarHostState,
  ...args: Parameters<SnackbarHostState['showSnackbar']>
): Promise<{ result: Promise<string> }> => {
  let result!: Promise<string>;
  await act(async () => {
    result = state.showSnackbar(...args);
    await Promise.resolve();
  });
  return { result };
};

describe('<SnackbarHost> (COMPONENT_SPEC §32)', () => {
  it('renders the live region; the action, Escape and the timer resolve showSnackbar', async () => {
    const container = await renderReact(<Demo />);
    const state = captured!;
    const root = container.querySelector('.m3e-snackbar-host')!;
    expect(root.getAttribute('role')).toBe('status');
    expect(root.children).toHaveLength(0);

    const { result: undo } = await show(state, { message: 'Archived', actionLabel: 'Undo' });
    expect(root.querySelector('.m3e-snackbar__text')!.textContent).toBe('Archived');
    act(() => {
      root.querySelector<HTMLButtonElement>('.m3e-snackbar__action')!.click();
    });
    await expect(undo).resolves.toBe('action-performed');

    const { result: escaped } = await show(state, { message: 'Deleted', actionLabel: 'Undo' });
    expect(state.focus()).toBe(true);
    const action = root.querySelector<HTMLButtonElement>('.m3e-snackbar__action')!;
    expect(document.activeElement).toBe(action);
    act(() => {
      action.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    await expect(escaped).resolves.toBe('dismissed');

    // React's act schedules with real timers: fake only the snackbar's.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result: timed } = await show(state, 'Saved');
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    vi.useRealTimers();
    await expect(timed).resolves.toBe('dismissed');
    await act(async () => {
      await Promise.resolve();
    });
    expect(root.children).toHaveLength(0);
  });

  it('one snackbar at a time; the dismiss button carries the built-in tooltip', async () => {
    const container = await renderReact(<Demo />);
    const state = captured!;
    const root = container.querySelector('.m3e-snackbar-host')!;
    const { result: first } = await show(state, { message: 'One', withDismissAction: true });
    await show(state, 'Two');
    expect(root.querySelectorAll('.m3e-snackbar')).toHaveLength(1);
    const dismiss = root.querySelector<HTMLButtonElement>('.m3e-snackbar__dismiss')!;
    expect(dismiss.getAttribute('aria-label')).toBe('Dismiss');
    const tooltip = root.querySelector('.m3e-tooltip')!;
    expect(tooltip.getAttribute('aria-hidden')).toBe('true');
    expect(dismiss.hasAttribute('aria-describedby')).toBe(false);
    act(() => {
      dismiss.click();
    });
    await expect(first).resolves.toBe('dismissed');
    await act(async () => {
      await Promise.resolve();
    });
    expect([...root.querySelectorAll('.m3e-snackbar__text')].map((t) => t.textContent)).toEqual([
      'Two',
    ]);
  });

  it('<Snackbar> renders custom content and slots without a host', async () => {
    const container = await renderReact(
      <Snackbar
        action={
          <button type="button" className="m3e-button m3e-button--text m3e-snackbar__action">
            Retry
          </button>
        }
        actionOnNewLine
      >
        Connection lost
      </Snackbar>,
    );
    const snackbar = container.firstElementChild!;
    expect(snackbar.className).toBe('m3e-snackbar m3e-snackbar--action-on-new-line');
    expect(snackbar.textContent).toBe('Connection lostRetry');
  });
});

describe('<SnackbarHost> ⇔ <m3e-snackbar-host> DOM parity', () => {
  const normalize = (html: string, ids: string[]) =>
    ids.reduce((out, id, i) => out.replaceAll(id, `ID${String(i)}`), html);
  const idsOf = (root: Element) => [
    ...new Set([root, ...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean)),
  ];

  it('text only, action, action + dismiss, action on a new line', async () => {
    const cases: [boolean, Parameters<SnackbarHostState['showSnackbar']>[0]][] = [
      [false, 'Saved'],
      [false, { message: 'Archived', actionLabel: 'Undo' }],
      [false, { message: 'Snackbar # 1', actionLabel: 'Action', withDismissAction: true }],
      [true, { message: 'Text', actionLabel: 'Long action', withDismissAction: true }],
    ];
    for (const [newLine, visuals] of cases) {
      const host = await renderElement(
        `<m3e-snackbar-host${newLine ? ' action-on-new-line' : ''}></m3e-snackbar-host>`,
      );
      void (host as M3eSnackbarHost).showSnackbar(visuals);
      const elementRoot = host.querySelector('.m3e-snackbar-host')!;
      const element = normalize(canonical(elementRoot), idsOf(elementRoot));
      document.body.innerHTML = '';
      const container = await renderReact(<Demo actionOnNewLine={newLine} />);
      await show(captured!, visuals);
      const reactRoot = container.querySelector('.m3e-snackbar-host')!;
      expect(normalize(canonical(reactRoot), idsOf(reactRoot)), JSON.stringify(visuals)).toBe(
        element,
      );
      document.body.innerHTML = '';
    }
  });
});
