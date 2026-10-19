import { springValue } from '@kyralabs/m3e-motion';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SideSheetLayout } from '../side-sheet-layout/side-sheet-layout.js';
import { adaptiveSideSheetVariant, sideSheetClass } from './side-sheet.js';
import type { M3eSideSheet } from './side-sheet.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

let frames: FrameRequestCallback[];
let now: number;
const runFrames = (n: number) => {
  for (let i = 0; i < n; i++) {
    now += 16;
    const run = frames;
    frames = [];
    for (const cb of run) cb(now);
  }
};
const settle = () => {
  for (let i = 0; i < 200 && frames.length > 0; i++) runFrames(1);
};

/** The m3.material.io docked width (happy-dom lays nothing out). */
const W = 256;
const DEFAULT_SPATIAL = { dampingRatio: 0.8, stiffness: 380 };
const FAST_EFFECTS = { dampingRatio: 1, stiffness: 3800 };

class FakeResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

/** The window is at least medium (600dp) when `wide`. */
const stubWindow = (wide: boolean) => {
  vi.stubGlobal('matchMedia', (query: string) => {
    const px = Number(/(\d+)px/.exec(query)?.[1] ?? 0);
    const size = query.includes('width') ? (wide ? 1024 : 400) : 800;
    return {
      matches: size >= px,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList;
  });
};

beforeEach(() => {
  frames = [];
  now = 1000;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const width = this.classList.contains('m3e-side-sheet__sheet') ? W : 0;
    return { x: 0, y: 0, top: 0, left: 0, right: width, bottom: 0, width, height: 0 } as DOMRect;
  });
  stubWindow(true);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Mounts `html`; happy-dom does not inherit custom properties, so the root gets the springs. */
async function mount(html: string): Promise<M3eSideSheet> {
  document.body.innerHTML = html;
  const host = document.querySelector<M3eSideSheet>('m3e-side-sheet')!;
  await flush();
  springs(host.sheetElement!);
  return host;
}

function springs(root: HTMLElement): void {
  for (const [name, spec] of Object.entries({ open: DEFAULT_SPATIAL, close: FAST_EFFECTS })) {
    root.style.setProperty(`--m3e-comp-side-sheet-${name}-duration`, '500ms');
    root.style.setProperty(
      `--m3e-comp-side-sheet-${name}-damping-ratio`,
      String(spec.dampingRatio),
    );
    root.style.setProperty(`--m3e-comp-side-sheet-${name}-stiffness`, String(spec.stiffness));
  }
}

const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('sideSheetClass / adaptiveSideSheetVariant', () => {
  it('the root classes and the adaptive switch at the medium window size class', () => {
    expect(sideSheetClass('standard', false, false, false)).toBe('m3e-side-sheet');
    expect(sideSheetClass('modal', true, true, true)).toBe(
      'm3e-side-sheet m3e-side-sheet--modal m3e-side-sheet--open m3e-side-sheet--detached m3e-side-sheet--divider',
    );
    expect(adaptiveSideSheetVariant(true)).toBe('standard');
    expect(adaptiveSideSheetVariant(false)).toBe('modal');
  });
});

describe('<m3e-side-sheet>', () => {
  it('renders the standard contract: an <aside> named by its headline, header, content, actions', async () => {
    const host = await mount(
      '<m3e-side-sheet headline="Filters" back open><p>Content</p><button slot="actions">Save</button></m3e-side-sheet>',
    );
    const root = host.sheetElement!;
    expect(root.localName).toBe('aside');
    expect(root.className).toBe('m3e-side-sheet m3e-side-sheet--open');
    const headline = root.querySelector('.m3e-side-sheet__headline')!;
    expect(headline.localName).toBe('h2');
    expect(root.getAttribute('aria-labelledby')).toBe(headline.id);
    expect(root.hasAttribute('aria-label')).toBe(false);
    const sheet = root.firstElementChild!;
    expect([...sheet.children].map((c) => c.className)).toEqual([
      'm3e-side-sheet__header',
      'm3e-side-sheet__content',
      'm3e-side-sheet__actions',
    ]);
    expect(
      [...sheet.firstElementChild!.children].map((c) => [
        c.className,
        c.getAttribute('aria-label'),
      ]),
    ).toEqual([
      ['m3e-icon-button m3e-side-sheet__back', 'Back'],
      ['m3e-side-sheet__headline', null],
      ['m3e-icon-button m3e-side-sheet__close', 'Close'],
    ]);
    expect(sheet.querySelector('.m3e-side-sheet__content')!.innerHTML).toBe('<p>Content</p>');
    expect(sheet.querySelector('.m3e-side-sheet__actions')!.textContent).toBe('Save');
    expect(root.hasAttribute('data-open')).toBe(true);
  });

  it('without a headline: named by `label` (default "Side sheet"), no actions part', async () => {
    const host = await mount('<m3e-side-sheet close-label="Dismiss"></m3e-side-sheet>');
    const root = host.sheetElement!;
    expect(root.getAttribute('aria-label')).toBe('Side sheet');
    expect(root.querySelector('.m3e-side-sheet__close')!.getAttribute('aria-label')).toBe(
      'Dismiss',
    );
    expect(root.querySelector('.m3e-side-sheet__actions')).toBeNull();
    expect(root.hasAttribute('data-open')).toBe(false);
    host.label = 'Details';
    await flush();
    expect(root.getAttribute('aria-label')).toBe('Details');
  });

  it('standard: opens on the default spatial spring, pushing the content by the width it takes', async () => {
    const host = await mount(
      '<button id="opener">Open</button><m3e-side-sheet headline="Filters"><button id="inside">x</button></m3e-side-sheet>',
    );
    const root = host.sheetElement!;
    const opener = document.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    host.show();
    await flush();
    expect(root.classList.contains('m3e-side-sheet--open')).toBe(true);
    // Focus moves to the sheet's first stop (the close button).
    expect(document.activeElement).toBe(root.querySelector('.m3e-side-sheet__close'));
    for (let i = 1; i <= 4; i++) {
      runFrames(1);
      const offset = springValue(DEFAULT_SPATIAL, 16 * i, -W, 0);
      expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-ss-offset'))).toBeCloseTo(
        offset,
        1,
      );
      expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-ss-inline-size'))).toBeCloseTo(
        W + offset,
        1,
      );
    }
    expect(root.hasAttribute('data-animating')).toBe(true);
    settle();
    expect(root.hasAttribute('data-animating')).toBe(false);
    expect(root.getAttribute('style')).not.toContain('--_m3e-ss');
  });

  it('the close button and Escape ask to close (cancelable open-change); focus returns', async () => {
    const host = await mount(
      '<button id="opener">Open</button><m3e-side-sheet headline="Filters"></m3e-side-sheet>',
    );
    const root = host.sheetElement!;
    document.querySelector<HTMLButtonElement>('#opener')!.focus();
    host.show();
    await flush();
    settle();
    const events: unknown[] = [];
    let veto = true;
    host.addEventListener('open-change', (e) => {
      events.push((e as CustomEvent).detail);
      if (veto) e.preventDefault();
    });
    root.querySelector<HTMLButtonElement>('.m3e-side-sheet__close')!.click();
    await flush();
    expect(events).toEqual([{ open: false }]);
    expect(host.open).toBe(true);
    veto = false;
    press(root.querySelector('.m3e-side-sheet__close')!, 'Escape');
    await flush();
    expect(host.open).toBe(false);
    expect(document.activeElement?.id).toBe('opener');
    // FastEffects from the open anchor.
    runFrames(1);
    expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-ss-offset'))).toBeCloseTo(
      springValue(FAST_EFFECTS, 16, 0, -W),
      1,
    );
    settle();
    expect(root.hasAttribute('data-open')).toBe(false);
  });

  it('the back button emits `back`', async () => {
    const host = await mount('<m3e-side-sheet back open></m3e-side-sheet>');
    const back = vi.fn();
    host.addEventListener('back', back);
    host.sheetElement!.querySelector<HTMLButtonElement>('.m3e-side-sheet__back')!.click();
    expect(back).toHaveBeenCalledTimes(1);
    expect(host.open).toBe(true);
  });

  it('modal: a <dialog> over the scrim, opened modally; Escape and the scrim close it', async () => {
    const host = await mount(
      '<button id="opener">Open</button><m3e-side-sheet variant="modal" headline="Filters" divider detached><button id="inside">x</button><button slot="actions">Save</button></m3e-side-sheet>',
    );
    const root = host.sheetElement as HTMLDialogElement;
    expect(root.localName).toBe('dialog');
    expect(root.className).toBe(
      'm3e-side-sheet m3e-side-sheet--modal m3e-side-sheet--detached m3e-side-sheet--divider',
    );
    expect([...root.children].map((c) => c.className)).toEqual([
      'm3e-side-sheet__scrim',
      'm3e-side-sheet__sheet',
    ]);
    expect(root.querySelector('.m3e-side-sheet__scrim')!.getAttribute('aria-hidden')).toBe('true');
    expect(root.open).toBe(false);
    document.querySelector<HTMLButtonElement>('#opener')!.focus();
    host.show();
    await flush();
    expect(root.open).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.activeElement).toBe(root.querySelector('.m3e-side-sheet__close'));
    runFrames(1);
    const offset = springValue(DEFAULT_SPATIAL, 16, -W, 0);
    expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-ss-offset'))).toBeCloseTo(
      offset,
      1,
    );
    // The scrim alpha is the open fraction (the drawer's calculateFraction).
    expect(Number.parseFloat(root.style.getPropertyValue('--_m3e-ss-fraction'))).toBeCloseTo(
      (offset + W) / W,
      3,
    );
    settle();
    // Escape asks to close; the dialog closes once the sheet is out.
    press(document.activeElement!, 'Escape');
    await flush();
    expect(host.open).toBe(false);
    expect(root.open).toBe(true);
    settle();
    expect(root.open).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(document.activeElement?.id).toBe('opener');
    // The scrim asks to close too.
    host.show();
    await flush();
    settle();
    root.querySelector<HTMLElement>('.m3e-side-sheet__scrim')!.click();
    await flush();
    expect(host.open).toBe(false);
  });

  it('modal: Tab stays inside', async () => {
    const host = await mount(
      '<m3e-side-sheet variant="modal" headline="Filters" open><button id="inside">x</button></m3e-side-sheet>',
    );
    const root = host.sheetElement!;
    const inside = document.querySelector<HTMLButtonElement>('#inside')!;
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      {},
    ] as unknown as DOMRectList);
    inside.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    inside.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.m3e-side-sheet__close'));
  });

  it('adaptive: modal below the medium window size class, standard from it, keeping the state', async () => {
    stubWindow(false);
    const host = await mount(
      '<m3e-side-sheet variant="adaptive" headline="Filters" open><p>Content</p></m3e-side-sheet>',
    );
    expect(host.currentVariant).toBe('modal');
    const modal = host.sheetElement as HTMLDialogElement;
    expect(modal.localName).toBe('dialog');
    expect(modal.open).toBe(true);
    const content = modal.querySelector('.m3e-side-sheet__content')!;
    // The window grows past 600dp: the same parts in an <aside>, still open, not animating.
    stubWindow(true);
    host.variant = 'standard';
    await flush();
    host.variant = 'adaptive';
    await flush();
    expect(host.currentVariant).toBe('standard');
    const aside = host.sheetElement!;
    expect(aside.localName).toBe('aside');
    expect(aside.classList.contains('m3e-side-sheet--open')).toBe(true);
    expect(aside.querySelector('.m3e-side-sheet__content')).toBe(content);
    expect(aside.hasAttribute('data-animating')).toBe(false);
    expect(modal.isConnected).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });
});

describe('SideSheetLayout', () => {
  it('a native close (form method="dialog") is followed and reported, unvetoable', () => {
    document.body.innerHTML =
      '<dialog class="m3e-side-sheet m3e-side-sheet--modal m3e-side-sheet--open"><div class="m3e-side-sheet__sheet"></div></dialog>';
    const dialog = document.querySelector('dialog')!;
    const onOpenChange = vi.fn(() => false);
    const layout = new SideSheetLayout(dialog, { onOpenChange });
    expect(dialog.open).toBe(true);
    dialog.close();
    dialog.dispatchEvent(new Event('close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(layout.isOpen).toBe(false);
    expect(dialog.hasAttribute('data-open')).toBe(false);
  });

  it('reduced motion (duration 0): jumps', () => {
    document.body.innerHTML =
      '<aside class="m3e-side-sheet"><div class="m3e-side-sheet__sheet"></div></aside>';
    const root = document.querySelector<HTMLElement>('aside')!;
    root.style.setProperty('--m3e-comp-side-sheet-open-duration', '0ms');
    const layout = new SideSheetLayout(root);
    layout.setOpen(true);
    expect(frames).toHaveLength(0);
    expect(root.hasAttribute('data-animating')).toBe(false);
    expect(root.hasAttribute('data-open')).toBe(true);
    expect(layout.isOpen).toBe(true);
  });
});
