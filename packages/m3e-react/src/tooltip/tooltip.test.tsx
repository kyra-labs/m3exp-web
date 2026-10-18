import '@kyralabs/m3e-elements/tooltip.js';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../button/Button.js';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { PlainTooltip, RichTooltip } from './Tooltip.js';
import { TooltipTrigger } from './TooltipTrigger.js';

let frames: FrameRequestCallback[] = [];
const flushFrames = () => {
  for (let i = 0; i < 10 && frames.length > 0; i++) {
    const run = frames;
    frames = [];
    for (const cb of run) cb(performance.now() + 10_000);
  }
};

beforeEach(() => {
  frames = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  document.documentElement.style.setProperty('--m3e-comp-tooltip-duration', '1500ms');
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const run = async (fn: () => void) => {
  await act(async () => {
    fn();
    await Promise.resolve();
  });
};
const pointer = (target: Element, type: string, pointerType: string) =>
  run(() => {
    target.dispatchEvent(
      new PointerEvent(type, { bubbles: true, cancelable: true, pointerType, pointerId: 1 }),
    );
  });
const tooltip = () => document.querySelector<HTMLElement>('.m3e-tooltip')!;

describe('<PlainTooltip> / <RichTooltip> contract', () => {
  it('a plain tooltip popover described by the anchor', async () => {
    const container = await renderReact(
      <TooltipTrigger>
        <Button aria-describedby="hint">Favorite</Button>
        <PlainTooltip>Add to favorites</PlainTooltip>
      </TooltipTrigger>,
    );
    const anchor = container.querySelector('button')!;
    const tip = tooltip();
    expect(tip.className).toBe('m3e-tooltip');
    expect(tip.getAttribute('role')).toBe('tooltip');
    expect(tip.getAttribute('popover')).toBe('manual');
    expect(tip.textContent).toBe('Add to favorites');
    expect(anchor.getAttribute('aria-describedby')).toBe(`hint ${tip.id}`);
  });

  it('renders inline (no popover) outside a trigger', async () => {
    const container = await renderReact(<PlainTooltip caret>Static</PlainTooltip>);
    const tip = container.firstElementChild!;
    expect(tip.className).toBe('m3e-tooltip m3e-tooltip--caret');
    expect(tip.hasAttribute('popover')).toBe(false);
  });

  it('a rich tooltip with an action is a dialog named by its subhead', async () => {
    await renderReact(
      <TooltipTrigger isPersistent>
        <Button>Info</Button>
        <RichTooltip subhead="Permissions" action="Request access">
          Configure
        </RichTooltip>
      </TooltipTrigger>,
    );
    const tip = tooltip();
    expect(tip.getAttribute('role')).toBe('dialog');
    const subhead = tip.querySelector('.m3e-tooltip__subhead')!;
    expect(tip.getAttribute('aria-labelledby')).toBe(subhead.id);
    expect(tip.querySelector('.m3e-tooltip__supporting-text')!.textContent).toBe('Configure');
    expect(tip.querySelector('.m3e-tooltip__action button')!.textContent).toBe('Request access');
  });
});

describe('<TooltipTrigger> behavior (the shared TooltipController)', () => {
  it('mouse hover shows and leaving hides; onOpenChange reports both', async () => {
    const onOpenChange = vi.fn();
    const container = await renderReact(
      <TooltipTrigger onOpenChange={onOpenChange}>
        <Button>Favorite</Button>
        <PlainTooltip>Add to favorites</PlainTooltip>
      </TooltipTrigger>,
    );
    const anchor = container.querySelector('button')!;
    await pointer(anchor, 'pointerenter', 'mouse');
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    expect(tooltip().hasAttribute('data-driven')).toBe(true);
    expect(tooltip().hasAttribute('data-positioned')).toBe(true);
    await pointer(anchor, 'pointerleave', 'mouse');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    flushFrames();
    expect(tooltip().hasAttribute('data-driven')).toBe(false);
  });

  it('keyboard focus shows it; Escape hides it', async () => {
    const container = await renderReact(
      <TooltipTrigger>
        <Button>Favorite</Button>
        <PlainTooltip>Add to favorites</PlainTooltip>
      </TooltipTrigger>,
    );
    const anchor = container.querySelector('button')!;
    await run(() => {
      anchor.focus();
    });
    expect(tooltip().hasAttribute('data-driven')).toBe(true);
    await run(() => {
      anchor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    flushFrames();
    expect(tooltip().hasAttribute('data-driven')).toBe(false);
  });

  it('controlled: isOpen shows it; a persistent tooltip ignores leaving the anchor', async () => {
    const onOpenChange = vi.fn();
    const container = await renderReact(
      <TooltipTrigger isOpen isPersistent onOpenChange={onOpenChange} position="below">
        <Button>Info</Button>
        <RichTooltip caret>Details</RichTooltip>
      </TooltipTrigger>,
    );
    expect(tooltip().hasAttribute('data-driven')).toBe(true);
    // happy-dom has no layout: the caret direction is covered by m3e-motion's tests.
    expect(tooltip().hasAttribute('data-caret')).toBe(true);
    const anchor = container.querySelector('button')!;
    await pointer(anchor, 'pointerleave', 'mouse');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('pressing the action calls onAction and hides the tooltip', async () => {
    const onAction = vi.fn();
    const onOpenChange = vi.fn();
    await renderReact(
      <TooltipTrigger defaultOpen isPersistent onOpenChange={onOpenChange}>
        <Button>Info</Button>
        <RichTooltip action="Got it" onAction={onAction}>
          Details
        </RichTooltip>
      </TooltipTrigger>,
    );
    await run(() => {
      tooltip().querySelector('button')!.click();
    });
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});

describe('<PlainTooltip> / <RichTooltip> ⇔ <m3e-tooltip> DOM parity', () => {
  // Generated ids differ between the layers; React Aria's runtime marker is not contract.
  const normalize = (html: string, ids: string[]) =>
    ids
      .reduce((out, id, i) => out.replaceAll(id, `ID${String(i)}`), html)
      .replaceAll(' data-react-aria-pressable="true"', '');
  const idsOf = (root: Element) => [
    ...new Set([root, ...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean)),
  ];

  it('plain, rich, caret and action render the same contract', async () => {
    const cases: [string, React.ReactElement][] = [
      [
        '<m3e-tooltip anchor="a">Add to favorites</m3e-tooltip>',
        <PlainTooltip key="p">Add to favorites</PlainTooltip>,
      ],
      [
        '<m3e-tooltip anchor="a" caret>Save</m3e-tooltip>',
        <PlainTooltip key="c" caret>
          Save
        </PlainTooltip>,
      ],
      [
        '<m3e-tooltip anchor="a" variant="rich">Details</m3e-tooltip>',
        <RichTooltip key="r">Details</RichTooltip>,
      ],
      [
        '<m3e-tooltip anchor="a" variant="rich" subhead="Permissions" action="Request access" caret>Configure</m3e-tooltip>',
        <RichTooltip key="ra" subhead="Permissions" action="Request access" caret>
          Configure
        </RichTooltip>,
      ],
    ];
    for (const [html, ui] of cases) {
      document.body.innerHTML = '<button id="a">A</button>';
      const host = await renderElement(html);
      const elementRoot = host.firstElementChild!;
      const element = normalize(canonical(elementRoot), idsOf(elementRoot));
      document.body.innerHTML = '';
      const container = await renderReact(
        <TooltipTrigger>
          <button type="button">A</button>
          {ui}
        </TooltipTrigger>,
      );
      const reactRoot = container.querySelector('.m3e-tooltip')!;
      expect(normalize(canonical(reactRoot), idsOf(reactRoot)), html).toBe(element);
    }
  });
});
