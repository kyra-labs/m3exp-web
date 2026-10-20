import { afterEach, describe, expect, it } from 'vitest';
import { BottomSheetLayout } from '../bottom-sheet-layout/bottom-sheet-layout.js';
import type { M3eBottomSheet } from './bottom-sheet.js';
import './index.js';

// happy-dom has no layout and no m3e tokens: the springs resolve to null (jumps), and the
// geometry tests give the container and the sheet their sizes by hand.
const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

const mount = async (html: string): Promise<M3eBottomSheet> => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  await flush();
  const host = container.querySelector('m3e-bottom-sheet')!;
  // The layout entry is imported when the element first renders.
  await host.ready;
  await flush();
  return host;
};

const key = (target: Element, k: string) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
};

const pointer = (target: Element, type: string, y: number, timeStamp?: number) => {
  const e = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId: 1,
    clientX: 100,
    clientY: y,
  });
  // Event times from 1000ms (a 0 timeStamp means "unknown" to the drag helper).
  if (timeStamp !== undefined) Object.defineProperty(e, 'timeStamp', { value: 1000 + timeStamp });
  target.dispatchEvent(e);
};

/** A standard sheet in an 800px container, 700px tall, measured by hand. */
function standard(value: 'hidden' | 'partially-expanded' | 'expanded' = 'partially-expanded') {
  const root = document.createElement('div');
  root.className = `m3e-bottom-sheet${value === 'hidden' ? '' : ` m3e-bottom-sheet--${value}`}`;
  root.innerHTML =
    '<div class="m3e-bottom-sheet__sheet"><button class="m3e-bottom-sheet__handle" type="button" aria-label="Drag handle"><span class="m3e-bottom-sheet__handle-bar"></span></button><div class="m3e-bottom-sheet__content"><button id="inside">Inside</button></div></div>';
  document.body.append(root);
  Object.defineProperty(root, 'clientHeight', { value: 800 });
  const sheet = root.querySelector<HTMLElement>('.m3e-bottom-sheet__sheet')!;
  sheet.getBoundingClientRect = () => new DOMRect(0, 100, 400, 700);
  sheet.setPointerCapture = () => undefined;
  root.setPointerCapture = () => undefined;
  root.hasPointerCapture = () => false;
  return { root, sheet, handle: root.querySelector<HTMLElement>('.m3e-bottom-sheet__handle')! };
}

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

describe('<m3e-bottom-sheet> contract (COMPONENT_SPEC §30)', () => {
  it('standard: a region named "Bottom Sheet" with the drag handle, its tooltip and the content', async () => {
    const host = await mount(
      '<m3e-bottom-sheet value="partially-expanded"><p>Content</p></m3e-bottom-sheet>',
    );
    const root = host.sheetElement!;
    expect(root.localName).toBe('div');
    expect(root.className).toBe('m3e-bottom-sheet m3e-bottom-sheet--partially-expanded');
    const sheet = root.firstElementChild!;
    expect(sheet.className).toBe('m3e-bottom-sheet__sheet');
    expect(sheet.getAttribute('role')).toBe('region');
    expect(sheet.getAttribute('aria-label')).toBe('Bottom Sheet');
    expect([...sheet.children].map((c) => c.className)).toEqual([
      'm3e-bottom-sheet__handle',
      'm3e-tooltip',
      'm3e-bottom-sheet__content',
    ]);
    const handle = sheet.querySelector('button')!;
    expect(handle.getAttribute('aria-label')).toBe('Drag handle');
    // Owner decision M9 #30 with #2: the tooltip repeats the name, so it is aria-hidden.
    const tip = sheet.querySelector('.m3e-tooltip')!;
    expect([tip.getAttribute('role'), tip.getAttribute('aria-hidden'), tip.textContent]).toEqual([
      'tooltip',
      'true',
      'Drag handle',
    ]);
    expect(sheet.querySelector('.m3e-bottom-sheet__content > p')!.textContent).toBe('Content');
  });

  it('modal: a <dialog> named "Bottom Sheet" over an aria-hidden scrim; opens with its value', async () => {
    const host = await mount(
      '<m3e-bottom-sheet variant="modal" no-drag-handle><p>Content</p></m3e-bottom-sheet>',
    );
    const root = host.sheetElement as HTMLDialogElement;
    expect(root.localName).toBe('dialog');
    expect(root.className).toBe('m3e-bottom-sheet m3e-bottom-sheet--modal');
    expect(root.getAttribute('aria-label')).toBe('Bottom Sheet');
    expect([...root.children].map((c) => c.className)).toEqual([
      'm3e-bottom-sheet__scrim',
      'm3e-bottom-sheet__sheet',
    ]);
    expect(root.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('.m3e-bottom-sheet__handle')).toBeNull();
    expect(root.open).toBe(false);
    host.show();
    await flush();
    expect(host.value).toBe('partially-expanded');
    expect(root.open).toBe(true);
    expect(root.className).toBe(
      'm3e-bottom-sheet m3e-bottom-sheet--modal m3e-bottom-sheet--partially-expanded',
    );
  });

  it('a request before the layout entry has loaded asks, sets the value, and the layout opens there', async () => {
    const container = document.createElement('div');
    container.innerHTML = '<m3e-bottom-sheet variant="modal"></m3e-bottom-sheet>';
    document.body.append(container);
    const host = container.querySelector('m3e-bottom-sheet')!;
    const changes: string[] = [];
    host.addEventListener('value-change', (e) => {
      changes.push((e as CustomEvent<{ value: string }>).detail.value);
    });
    host.show();
    expect([host.value, changes]).toEqual(['partially-expanded', ['partially-expanded']]);
    await flush();
    await host.ready;
    await flush();
    expect((host.sheetElement as HTMLDialogElement).open).toBe(true);
    expect(host.currentValue).toBe('partially-expanded');
  });

  it('peek-height: the --peek modifier and its custom property (standard only)', async () => {
    const host = await mount(
      '<m3e-bottom-sheet peek-height="128" value="partially-expanded"></m3e-bottom-sheet>',
    );
    const root = host.sheetElement!;
    expect(root.className).toBe(
      'm3e-bottom-sheet m3e-bottom-sheet--peek m3e-bottom-sheet--partially-expanded',
    );
    expect(root.style.getPropertyValue('--m3e-comp-bottom-sheet-peek-height')).toBe('128px');
  });
});

describe('the drag handle (BottomSheetImpl clickable, SheetDefaults DragHandleWithTooltip)', () => {
  it('a click expands a partially expanded sheet, then dismisses it; value-change each time', async () => {
    const host = await mount(
      '<m3e-bottom-sheet variant="modal" value="partially-expanded"></m3e-bottom-sheet>',
    );
    const changes: string[] = [];
    host.addEventListener('value-change', (e) => {
      changes.push((e as CustomEvent<{ value: string }>).detail.value);
    });
    const handle = host.sheetElement!.querySelector<HTMLButtonElement>(
      '.m3e-bottom-sheet__handle',
    )!;
    handle.click();
    await flush();
    expect(host.value).toBe('expanded');
    handle.click();
    await flush();
    expect(host.value).toBe('hidden');
    expect(changes).toEqual(['expanded', 'hidden']);
    expect((host.sheetElement as HTMLDialogElement).open).toBe(false);
  });

  it('value-change is cancelable (confirmValueChange)', async () => {
    const host = await mount('<m3e-bottom-sheet value="expanded"></m3e-bottom-sheet>');
    host.addEventListener('value-change', (e) => {
      e.preventDefault();
    });
    host.sheetElement!.querySelector<HTMLButtonElement>('.m3e-bottom-sheet__handle')!.click();
    await flush();
    expect(host.value).toBe('expanded');
  });

  it('keyboard: ArrowUp expands, ArrowDown collapses then dismisses (the accessibility actions)', async () => {
    const host = await mount('<m3e-bottom-sheet value="partially-expanded"></m3e-bottom-sheet>');
    const handle = host.sheetElement!.querySelector<HTMLButtonElement>(
      '.m3e-bottom-sheet__handle',
    )!;
    expect(key(handle, 'ArrowUp').defaultPrevented).toBe(true);
    await flush();
    expect(host.value).toBe('expanded');
    key(handle, 'ArrowDown');
    await flush();
    expect(host.value).toBe('partially-expanded');
    key(handle, 'ArrowDown');
    await flush();
    expect(host.value).toBe('hidden');
    host.gesturesDisabled = true;
    host.value = 'partially-expanded';
    await flush();
    expect(key(handle, 'ArrowUp').defaultPrevented).toBe(false);
  });

  it('skip-partially-expanded: show() expands; the handle of an expanded sheet dismisses', async () => {
    const host = await mount('<m3e-bottom-sheet skip-partially-expanded></m3e-bottom-sheet>');
    host.show();
    await flush();
    expect(host.value).toBe('expanded');
    host.sheetElement!.querySelector<HTMLButtonElement>('.m3e-bottom-sheet__handle')!.click();
    await flush();
    expect(host.value).toBe('hidden');
  });
});

describe('dismissing (ModalBottomSheet)', () => {
  it('Escape hides it (the tooltip takes the first one when shown); focus returns to the opener', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const host = await mount(
      '<m3e-bottom-sheet variant="modal" skip-partially-expanded><button>Inside</button></m3e-bottom-sheet>',
    );
    host.expand();
    await flush();
    const dialog = host.sheetElement as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(key(dialog, 'Escape').defaultPrevented).toBe(true);
    await flush();
    expect(host.value).toBe('hidden');
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('a press on the scrim hides it', async () => {
    const host = await mount(
      '<m3e-bottom-sheet variant="modal" value="expanded"></m3e-bottom-sheet>',
    );
    host.sheetElement!.querySelector<HTMLElement>('.m3e-bottom-sheet__scrim')!.click();
    await flush();
    expect(host.value).toBe('hidden');
  });

  it('standard: Escape in the sheet settles to dismiss too (BottomSheet back handler)', async () => {
    const host = await mount(
      '<m3e-bottom-sheet value="partially-expanded"><button>In</button></m3e-bottom-sheet>',
    );
    key(host.sheetElement!.querySelector('.m3e-bottom-sheet__content button')!, 'Escape');
    await flush();
    expect(host.value).toBe('hidden');
  });
});

describe('the scroll region (M11 a11y audit L9)', () => {
  it('overflowing content is a focusable group named like the sheet; it follows renames', () => {
    const { root, sheet } = standard('expanded');
    sheet.setAttribute('role', 'region');
    sheet.setAttribute('aria-label', 'Bottom Sheet');
    const content = root.querySelector<HTMLElement>('.m3e-bottom-sheet__content')!;
    let overflow = true;
    Object.defineProperty(content, 'scrollHeight', { get: () => (overflow ? 900 : 100) });
    Object.defineProperty(content, 'clientHeight', { get: () => 100 });
    const layout = new BottomSheetLayout(root, { value: 'expanded' });
    expect(content.getAttribute('tabindex')).toBe('0');
    expect(content.getAttribute('role')).toBe('group');
    expect(content.getAttribute('aria-label')).toBe('Bottom Sheet');
    sheet.setAttribute('aria-label', 'Filters');
    layout.update();
    expect(content.getAttribute('aria-label')).toBe('Filters');
    overflow = false;
    layout.update();
    for (const name of ['tabindex', 'role', 'aria-label']) {
      expect(content.hasAttribute(name), name).toBe(false);
    }
    layout.destroy();
  });

  it("modal: the region takes the dialog's name", () => {
    const root = document.createElement('dialog');
    root.className = 'm3e-bottom-sheet m3e-bottom-sheet--modal';
    root.setAttribute('aria-label', 'Bottom Sheet');
    root.innerHTML =
      '<div class="m3e-bottom-sheet__scrim" aria-hidden="true"></div><div class="m3e-bottom-sheet__sheet"><div class="m3e-bottom-sheet__content"></div></div>';
    document.body.append(root);
    const content = root.querySelector<HTMLElement>('.m3e-bottom-sheet__content')!;
    Object.defineProperty(content, 'scrollHeight', { get: () => 900 });
    Object.defineProperty(content, 'clientHeight', { get: () => 100 });
    const layout = new BottomSheetLayout(root);
    expect(content.getAttribute('role')).toBe('group');
    expect(content.getAttribute('aria-label')).toBe('Bottom Sheet');
    layout.destroy();
  });
});

describe('BottomSheetLayout geometry and drags', () => {
  it('measures the anchors (Hidden 800, PartiallyExpanded 400, Expanded 100)', () => {
    const { root } = standard();
    const layout = new BottomSheetLayout(root, { value: 'partially-expanded' });
    layout.setValue('expanded', false);
    const anchors = layout.state.draggable.anchors;
    expect(anchors.keys.map((k) => [k, anchors.positionOf(k)])).toEqual([
      ['hidden', 800],
      ['partially-expanded', 400],
      ['expanded', 100],
    ]);
    expect(layout.state.offset).toBe(100);
    layout.destroy();
  });

  it('a drag down past 56dp released slowly hides the sheet (asking first)', () => {
    const { root, handle } = standard();
    const asked: string[] = [];
    const layout = new BottomSheetLayout(root, {
      value: 'partially-expanded',
      onValueChange: (v) => {
        asked.push(v);
        return undefined;
      },
    });
    layout.setValue('partially-expanded', false);
    pointer(handle, 'pointerdown', 400, 0);
    pointer(handle, 'pointermove', 410, 10);
    expect(root.hasAttribute('data-dragging')).toBe(true);
    // Down 56px with pauses, then 100px/s (under 125dp/s) over the last 100ms.
    pointer(handle, 'pointermove', 466, 500);
    for (let i = 1; i <= 5; i++) pointer(handle, 'pointermove', 466 + i * 2, 500 + i * 20);
    expect(layout.state.offset).toBe(466);
    pointer(handle, 'pointerup', 476, 600);
    expect(asked).toEqual(['hidden']);
    expect(layout.value).toBe('hidden');
    layout.destroy();
  });

  it('a fling down dismisses even inside the dampening zone; a short drag returns', () => {
    const { root, handle } = standard();
    const layout = new BottomSheetLayout(root, { value: 'partially-expanded' });
    layout.setValue('partially-expanded', false);
    pointer(handle, 'pointerdown', 400, 0);
    pointer(handle, 'pointermove', 420, 10);
    pointer(handle, 'pointermove', 440, 20);
    pointer(handle, 'pointerup', 440, 20);
    expect(layout.value).toBe('hidden');
    layout.setValue('partially-expanded', false);
    pointer(handle, 'pointerdown', 400, 1000);
    pointer(handle, 'pointermove', 420, 1100);
    pointer(handle, 'pointermove', 430, 1200);
    pointer(handle, 'pointerup', 430, 1300);
    expect(layout.value).toBe('partially-expanded');
    layout.destroy();
  });

  it('a horizontal movement lets the pointer go; editable targets never drag', () => {
    const { root, handle } = standard();
    const layout = new BottomSheetLayout(root, { value: 'partially-expanded' });
    layout.setValue('partially-expanded', false);
    pointer(handle, 'pointerdown', 400, 0);
    handle.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: 140, clientY: 402 }),
    );
    expect(root.hasAttribute('data-dragging')).toBe(false);
    const input = document.createElement('input');
    root.querySelector('.m3e-bottom-sheet__content')!.append(input);
    pointer(input, 'pointerdown', 400, 0);
    pointer(input, 'pointermove', 440, 10);
    expect(root.hasAttribute('data-dragging')).toBe(false);
    layout.destroy();
  });

  it('Escape (settleToDismiss): an expanded sheet partially expands, then hides', () => {
    const { root } = standard('expanded');
    const layout = new BottomSheetLayout(root, { value: 'expanded' });
    const inside = root.querySelector<HTMLButtonElement>('#inside')!;
    key(inside, 'Escape');
    expect(layout.value).toBe('partially-expanded');
    key(inside, 'Escape');
    expect(layout.value).toBe('hidden');
    layout.destroy();
  });

  it('standard: focus inside a sheet that hides returns to where it was before it showed', () => {
    const { root } = standard('hidden');
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const layout = new BottomSheetLayout(root);
    layout.setValue('expanded', false);
    root.querySelector<HTMLButtonElement>('#inside')!.focus();
    layout.setValue('hidden', false);
    expect(document.activeElement).toBe(opener);
    layout.destroy();
  });
});

describe('<m3e-bottom-sheet>: open and open-change (M11 API, M7)', () => {
  it('open reflects value !== hidden', async () => {
    const host = await mount('<m3e-bottom-sheet variant="modal"></m3e-bottom-sheet>');
    expect(host.open).toBe(false);
    expect(host.hasAttribute('open')).toBe(false);
    host.value = 'expanded';
    await flush();
    expect(host.open).toBe(true);
    expect(host.hasAttribute('open')).toBe(true);
  });

  it('setting open shows (partially expanded) or hides the sheet, like setting value', async () => {
    const host = await mount('<m3e-bottom-sheet variant="modal"></m3e-bottom-sheet>');
    host.open = true;
    await flush();
    expect(host.value).toBe('partially-expanded');
    expect((host.sheetElement as HTMLDialogElement).open).toBe(true);
    host.removeAttribute('open');
    await flush();
    expect(host.value).toBe('hidden');
    const skip = await mount(
      '<m3e-bottom-sheet variant="modal" skip-partially-expanded open></m3e-bottom-sheet>',
    );
    expect(skip.value).toBe('expanded');
  });

  it('open-change { open } follows value-change when the sheet shows or hides; it is cancelable', async () => {
    const host = await mount(
      '<m3e-bottom-sheet variant="modal" value="partially-expanded"></m3e-bottom-sheet>',
    );
    const events: [string, unknown][] = [];
    host.addEventListener('value-change', (e) => events.push([e.type, e.detail]));
    host.addEventListener('open-change', (e) => events.push([e.type, e.detail]));
    const handle = host.sheetElement!.querySelector<HTMLButtonElement>(
      '.m3e-bottom-sheet__handle',
    )!;
    handle.click();
    await flush();
    handle.click();
    await flush();
    expect(events).toEqual([
      ['value-change', { value: 'expanded' }],
      ['value-change', { value: 'hidden' }],
      ['open-change', { open: false }],
    ]);
    expect(host.open).toBe(false);
    // preventDefault() on open-change keeps the sheet shown.
    host.show();
    await flush();
    host.addEventListener('open-change', (e) => {
      e.preventDefault();
    });
    host.hide();
    await flush();
    expect(host.value).toBe('partially-expanded');
    expect(host.open).toBe(true);
  });
});
