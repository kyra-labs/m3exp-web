import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './index.js';
import type { M3eTooltip } from './tooltip.js';
import { LONG_PRESS_TIMEOUT_MS } from '../tooltip-popup/index.js';

// happy-dom has no layout or motion tokens: springs settle on the first frame; the duration is set
// on the root as tooltip-defaults.css would.
let frames: FrameRequestCallback[] = [];
const flushFrames = () => {
  for (let i = 0; i < 10 && frames.length > 0; i++) {
    const run = frames;
    frames = [];
    for (const cb of run) cb(performance.now() + 10_000);
  }
};
const settle = async () => {
  for (let i = 0; i < 4; i++) await Promise.resolve();
};

const durationStyle = document.createElement('style');

beforeEach(() => {
  frames = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  // As the minified CSS ships it (`1500ms` → `1.5s`).
  durationStyle.textContent = '.m3e-tooltip { --m3e-comp-tooltip-duration: 1.5s; }';
  document.head.append(durationStyle);
});

afterEach(() => {
  document.body.innerHTML = '';
  durationStyle.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup(html: string) {
  document.body.innerHTML = html;
  await settle();
  const hosts = [...document.querySelectorAll<M3eTooltip>('m3e-tooltip')];
  const host = hosts[0]!;
  const tooltip = host.tooltipElement!;
  const anchor = document.getElementById(host.anchor!)!;
  return { host, hosts, tooltip, anchor };
}

const pointer = (target: Element, type: string, pointerType: string, init: PointerEventInit = {}) =>
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, cancelable: true, pointerType, pointerId: 1, ...init }),
  );
const key = (target: Element, k: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }),
  );

const PLAIN = `<button id="fav">Favorite</button><m3e-tooltip anchor="fav">Add to favorites</m3e-tooltip>`;

describe('<m3e-tooltip> contract', () => {
  it('renders a plain .m3e-tooltip popover holding its text, described by the anchor', async () => {
    const { host, tooltip, anchor } = await setup(PLAIN);
    expect(tooltip.parentElement).toBe(host);
    expect(tooltip.className).toBe('m3e-tooltip');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.getAttribute('popover')).toBe('manual');
    expect(tooltip.textContent).toBe('Add to favorites');
    expect([...host.childNodes]).toEqual([tooltip]);
    expect(anchor.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('text that repeats the anchor’s name: no aria-describedby, the tooltip is aria-hidden', async () => {
    const { tooltip, anchor } = await setup(
      `<button id="fav" aria-label="Add to favorites"><span aria-hidden="true">favorite</span></button><m3e-tooltip anchor="fav">Add to Favorites</m3e-tooltip>`,
    );
    expect(anchor.hasAttribute('aria-describedby')).toBe(false);
    expect(tooltip.getAttribute('aria-hidden')).toBe('true');
    const { tooltip: other, anchor: textAnchor } = await setup(
      `<button id="b">Save <span aria-hidden="true">save</span></button><m3e-tooltip anchor="b">save</m3e-tooltip>`,
    );
    // The visible text is the name (aria-hidden glyphs skipped): it repeats too.
    expect(textAnchor.hasAttribute('aria-describedby')).toBe(false);
    expect(other.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps the anchor’s own descriptions and removes its id on disconnect', async () => {
    const { host, tooltip, anchor } = await setup(
      `<span id="hint">Hint</span><button id="fav" aria-describedby="hint">Fav</button><m3e-tooltip anchor="fav">Add</m3e-tooltip>`,
    );
    expect(anchor.getAttribute('aria-describedby')).toBe(`hint ${tooltip.id}`);
    host.remove();
    expect(anchor.getAttribute('aria-describedby')).toBe('hint');
  });

  it('rich: subhead, supporting text and a text-button action; a dialog named by the subhead', async () => {
    const { tooltip } = await setup(
      `<button id="info">Info</button><m3e-tooltip anchor="info" variant="rich" subhead="Permissions" action="Request access" caret>Configure permissions</m3e-tooltip>`,
    );
    expect(tooltip.className).toBe('m3e-tooltip m3e-tooltip--rich m3e-tooltip--caret');
    const [subhead, text, action] = [...tooltip.children] as HTMLElement[];
    expect(subhead!.className).toBe('m3e-tooltip__subhead');
    expect(subhead!.textContent).toBe('Permissions');
    expect(text!.className).toBe('m3e-tooltip__supporting-text');
    expect(text!.textContent).toBe('Configure permissions');
    expect(action!.className).toBe('m3e-tooltip__action');
    const button = action!.firstElementChild as HTMLButtonElement;
    expect(button.className).toBe(
      'm3e-button m3e-button--text m3e-button--size-s m3e-button--round',
    );
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('Request access');
    expect(tooltip.getAttribute('role')).toBe('dialog');
    expect(tooltip.getAttribute('aria-labelledby')).toBe(subhead!.id);
  });

  it('rich without an action stays a tooltip; switching variants keeps the text', async () => {
    const { host, tooltip } = await setup(
      `<button id="info">Info</button><m3e-tooltip anchor="info" variant="rich">Details</m3e-tooltip>`,
    );
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.querySelector('.m3e-tooltip__supporting-text')!.textContent).toBe('Details');
    host.variant = 'plain';
    await settle();
    expect(tooltip.className).toBe('m3e-tooltip');
    expect(tooltip.innerHTML).toBe('Details');
  });
});

describe('<m3e-tooltip> behavior (TooltipBox)', () => {
  it('mouse: shows on entering the anchor, hides 1.5s after leaving it', async () => {
    const { host, anchor, tooltip } = await setup(PLAIN);
    const changes: boolean[] = [];
    host.addEventListener('open-change', (e) => {
      changes.push((e as CustomEvent<{ open: boolean }>).detail.open);
    });
    pointer(anchor, 'pointerenter', 'mouse');
    await settle();
    expect(host.open).toBe(true);
    expect(tooltip.hasAttribute('data-positioned')).toBe(true);
    expect(tooltip.style.getPropertyValue('--_m3e-tooltip-x')).toMatch(/px$/);
    // No timeout while hovered (MutatePriority.UserInput).
    vi.advanceTimersByTime(5000);
    expect(host.open).toBe(true);
    pointer(anchor, 'pointerleave', 'mouse');
    await settle();
    // m3.material.io's linger (owner decision M9 #1).
    vi.advanceTimersByTime(1499);
    expect(host.open).toBe(true);
    vi.advanceTimersByTime(1);
    await settle();
    expect(host.open).toBe(false);
    flushFrames();
    expect(tooltip.hasAttribute('data-driven')).toBe(false);
    expect(changes).toEqual([true, false]);
  });

  it('stays open while the tooltip itself is hovered; re-entering the anchor cancels the linger', async () => {
    const { host, anchor, tooltip } = await setup(PLAIN);
    pointer(anchor, 'pointerenter', 'mouse');
    pointer(anchor, 'pointerleave', 'mouse');
    pointer(tooltip, 'pointerenter', 'mouse');
    vi.advanceTimersByTime(5000);
    await settle();
    expect(host.open).toBe(true);
    pointer(tooltip, 'pointerleave', 'mouse');
    vi.advanceTimersByTime(1000);
    pointer(anchor, 'pointerenter', 'mouse');
    vi.advanceTimersByTime(5000);
    await settle();
    expect(host.open).toBe(true);
    pointer(anchor, 'pointerleave', 'mouse');
    vi.advanceTimersByTime(1500);
    await settle();
    expect(host.open).toBe(false);
  });

  it('touch hover does nothing; a persistent tooltip stays after the mouse leaves', async () => {
    const { host, anchor } = await setup(PLAIN);
    pointer(anchor, 'pointerenter', 'touch');
    await settle();
    expect(host.open).toBeFalsy();
    host.persistent = true;
    await settle();
    pointer(anchor, 'pointerenter', 'mouse');
    pointer(anchor, 'pointerleave', 'mouse');
    await settle();
    expect(host.open).toBe(true);
  });

  it('a pointer down outside the tooltip (the anchor too) hides it; inside does not', async () => {
    const { host, anchor, tooltip } = await setup(PLAIN);
    host.persistent = true;
    pointer(anchor, 'pointerenter', 'mouse');
    await settle();
    pointer(tooltip, 'pointerdown', 'mouse');
    await settle();
    expect(host.open).toBe(true);
    pointer(anchor, 'pointerdown', 'mouse');
    await settle();
    expect(host.open).toBe(false);
  });

  it('long press: shows after the timeout, swallows the click, hides when released after the duration', async () => {
    const { host, anchor } = await setup(PLAIN);
    const clicks = vi.fn();
    anchor.addEventListener('click', clicks);
    pointer(anchor, 'pointerdown', 'touch');
    // Android's default long-press timeout (SOURCES register #71, D19 (10)).
    expect(LONG_PRESS_TIMEOUT_MS).toBe(400);
    vi.advanceTimersByTime(399);
    await settle();
    expect(host.open).toBeFalsy();
    vi.advanceTimersByTime(1);
    await settle();
    expect(host.open).toBe(true);
    // Released before TooltipDuration: it stays until the duration ends.
    pointer(document.body, 'pointerup', 'touch');
    anchor.click();
    expect(clicks).not.toHaveBeenCalled();
    await settle();
    expect(host.open).toBe(true);
    vi.advanceTimersByTime(1500);
    await settle();
    expect(host.open).toBe(false);
    // Held past the duration: it hides on release.
    pointer(anchor, 'pointerdown', 'touch');
    vi.advanceTimersByTime(2500);
    await settle();
    expect(host.open).toBe(true);
    pointer(document.body, 'pointerup', 'touch');
    await settle();
    expect(host.open).toBe(false);
    // A short tap is an ordinary click.
    pointer(anchor, 'pointerdown', 'touch');
    vi.advanceTimersByTime(100);
    pointer(document.body, 'pointerup', 'touch');
    anchor.click();
    expect(clicks).toHaveBeenCalledTimes(1);
    expect(host.open).toBe(false);
  });

  it('keyboard focus shows it until focus leaves; Escape hides it', async () => {
    const { host, anchor } = await setup(`${PLAIN}<button id="next">Next</button>`);
    anchor.focus();
    await settle();
    expect(host.open).toBe(true);
    // Focus-shown tooltips outlast the duration (PreventUserInput).
    vi.advanceTimersByTime(3000);
    expect(host.open).toBe(true);
    key(anchor, 'Escape');
    await settle();
    expect(host.open).toBe(false);
    document.getElementById('next')!.focus();
    anchor.focus();
    await settle();
    expect(host.open).toBe(true);
    document.getElementById('next')!.focus();
    await settle();
    expect(host.open).toBe(false);
  });

  it('show() hides a non-persistent tooltip after the duration; a persistent one stays', async () => {
    const { host } = await setup(PLAIN);
    host.show();
    await settle();
    expect(host.open).toBe(true);
    vi.advanceTimersByTime(1500);
    await settle();
    expect(host.open).toBe(false);
    host.persistent = true;
    await settle();
    host.show();
    vi.advanceTimersByTime(5000);
    await settle();
    expect(host.open).toBe(true);
    host.hide();
    await settle();
    expect(host.open).toBe(false);
  });

  it('one tooltip at a time; a lower priority does not interrupt a higher one', async () => {
    const { hosts } = await setup(
      `<button id="a">A</button><m3e-tooltip anchor="a">A tip</m3e-tooltip><button id="b">B</button><m3e-tooltip anchor="b">B tip</m3e-tooltip>`,
    );
    const [a, b] = hosts as [M3eTooltip, M3eTooltip];
    const anchorA = document.getElementById('a')!;
    const anchorB = document.getElementById('b')!;
    pointer(anchorA, 'pointerenter', 'mouse');
    await settle();
    pointer(anchorB, 'pointerenter', 'mouse');
    await settle();
    expect([a.open, b.open]).toEqual([false, true]);
    pointer(anchorB, 'pointerleave', 'mouse');
    vi.advanceTimersByTime(1500);
    // Keyboard focus (PreventUserInput) holds the mutex: a hover elsewhere does not show.
    anchorA.focus();
    await settle();
    expect(a.open).toBe(true);
    pointer(anchorB, 'pointerenter', 'mouse');
    await settle();
    expect(b.open).toBe(false);
    expect(a.open).toBe(true);
  });

  it('manual: no hover, focus or long-press handling', async () => {
    const { host, anchor } = await setup(
      `<button id="fav">Fav</button><m3e-tooltip anchor="fav" manual>Add</m3e-tooltip>`,
    );
    pointer(anchor, 'pointerenter', 'mouse');
    anchor.focus();
    await settle();
    expect(host.open).toBeFalsy();
    host.open = true;
    await settle();
    expect(host.tooltipElement!.hasAttribute('data-driven')).toBe(true);
  });
});

describe('<m3e-tooltip> with an action', () => {
  const RICH = `<button id="info">Info</button><m3e-tooltip anchor="info" variant="rich" subhead="Permissions" action="Request access" persistent>Configure</m3e-tooltip><button id="after">After</button>`;

  it('the action fires `action` and hides the tooltip unless cancelled', async () => {
    const { host, anchor, tooltip } = await setup(RICH);
    pointer(anchor, 'pointerenter', 'mouse');
    await settle();
    const button = tooltip.querySelector('button')!;
    const once = vi.fn((e: Event) => {
      e.preventDefault();
    });
    host.addEventListener('action', once, { once: true });
    button.click();
    await settle();
    expect(once).toHaveBeenCalledTimes(1);
    expect(host.open).toBe(true);
    button.click();
    await settle();
    expect(host.open).toBe(false);
  });

  it('Tab from the anchor moves into the tooltip; Escape returns to the anchor', async () => {
    const { host, anchor, tooltip } = await setup(RICH);
    anchor.focus();
    await settle();
    expect(host.open).toBe(true);
    const button = tooltip.querySelector('button')!;
    expect(key(anchor, 'Tab')).toBe(false);
    expect(document.activeElement).toBe(button);
    await settle();
    expect(host.open).toBe(true);
    key(button, 'Escape');
    await settle();
    expect(document.activeElement).toBe(anchor);
    // Focus came back from the tooltip: it does not show again.
    expect(host.open).toBe(false);
  });

  it('no Tab trap (D21 (1)): Tab from the last control goes past the anchor, Shift+Tab back to it', async () => {
    const { host, anchor, tooltip } = await setup(RICH);
    const after = document.getElementById('after')!;
    anchor.focus();
    await settle();
    const button = tooltip.querySelector('button')!;
    // Shift+Tab on the anchor is the browser's (backwards, out of the tooltip's way).
    expect(key(anchor, 'Tab', { shiftKey: true })).toBe(true);
    key(anchor, 'Tab');
    expect(document.activeElement).toBe(button);
    // Shift+Tab from the first control returns to the anchor; the tooltip stays.
    expect(key(button, 'Tab', { shiftKey: true })).toBe(false);
    expect(document.activeElement).toBe(anchor);
    await settle();
    expect(host.open).toBe(true);
    key(anchor, 'Tab');
    expect(document.activeElement).toBe(button);
    // Tab from the last control: the stop after the anchor (the tooltip's own button skipped).
    expect(key(button, 'Tab')).toBe(false);
    expect(document.activeElement).toBe(after);
    await settle();
    // Persistent: focus leaving does not hide it.
    expect(host.open).toBe(true);
  });

  it('a non-persistent tooltip hides when focus leaves it', async () => {
    const { host, anchor, tooltip } = await setup(RICH.replace(' persistent', ''));
    anchor.focus();
    await settle();
    const button = tooltip.querySelector('button')!;
    key(anchor, 'Tab');
    expect(document.activeElement).toBe(button);
    await settle();
    expect(host.open).toBe(true);
    key(button, 'Tab');
    expect(document.activeElement).toBe(document.getElementById('after'));
    await settle();
    expect(host.open).toBe(false);
  });

  it('the tab stop after the anchor skips the tooltip wherever it sits', async () => {
    const { anchor, tooltip } = await setup(
      `<m3e-tooltip anchor="info" variant="rich" action="OK">Text</m3e-tooltip><p><button id="info">Info</button></p><button disabled>Off</button><span tabindex="-1">No</span><a href="#x" id="link">Link</a>`,
    );
    anchor.focus();
    await settle();
    const button = tooltip.querySelector('button')!;
    key(anchor, 'Tab');
    expect(document.activeElement).toBe(button);
    key(button, 'Tab');
    expect(document.activeElement).toBe(document.getElementById('link'));
  });

  it('nothing after the anchor: the browser’s Tab leaves the tooltip', async () => {
    const { anchor, tooltip } = await setup(
      `<button id="info">Info</button><m3e-tooltip anchor="info" variant="rich" action="OK">Text</m3e-tooltip>`,
    );
    anchor.focus();
    await settle();
    const button = tooltip.querySelector('button')!;
    key(anchor, 'Tab');
    expect(document.activeElement).toBe(button);
    expect(key(button, 'Tab')).toBe(true);
  });
});
