import '@kyralabs/m3e-elements/bottom-sheet.js';
import type { M3eBottomSheet } from '@kyralabs/m3e-elements/bottom-sheet.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { BottomSheet, ModalBottomSheet } from './BottomSheet.js';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

const press = async (target: Element, k: string) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

const click = async (target: HTMLElement) => {
  await act(async () => {
    target.click();
    await Promise.resolve();
  });
};

describe('<BottomSheet> (COMPONENT_SPEC §30)', () => {
  it('renders the standard contract: a region, the drag handle with its tooltip, the content', async () => {
    const container = await renderReact(
      <BottomSheet defaultValue="partially-expanded">
        <p>Content</p>
      </BottomSheet>,
    );
    const root = container.firstElementChild!;
    expect(root.className).toBe('m3e-bottom-sheet m3e-bottom-sheet--partially-expanded');
    const sheet = root.firstElementChild!;
    expect([sheet.getAttribute('role'), sheet.getAttribute('aria-label')]).toEqual([
      'region',
      'Bottom Sheet',
    ]);
    const handle = sheet.querySelector('.m3e-bottom-sheet__handle')!;
    expect(handle.getAttribute('aria-label')).toBe('Drag handle');
    expect(handle.getAttribute('aria-keyshortcuts')).toBe('ArrowUp ArrowDown');
    expect(handle.hasAttribute('aria-describedby')).toBe(false);
    expect(sheet.querySelector('.m3e-tooltip')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('the handle and its arrow keys move it (uncontrolled), reporting onValueChange', async () => {
    const onValueChange = vi.fn<(value: string) => void>();
    const container = await renderReact(
      <BottomSheet defaultValue="partially-expanded" onValueChange={onValueChange} />,
    );
    const root = container.firstElementChild!;
    const handle = root.querySelector<HTMLButtonElement>('.m3e-bottom-sheet__handle')!;
    await click(handle);
    expect(root.className).toBe('m3e-bottom-sheet m3e-bottom-sheet--expanded');
    await press(handle, 'ArrowDown');
    expect(root.className).toBe('m3e-bottom-sheet m3e-bottom-sheet--partially-expanded');
    await press(handle, 'ArrowDown');
    expect(root.className).toBe('m3e-bottom-sheet');
    expect(onValueChange.mock.calls.map((c) => c[0])).toEqual([
      'expanded',
      'partially-expanded',
      'hidden',
    ]);
  });

  it('keyboard focus on content the partially expanded sheet clips expands it (D21 (3))', async () => {
    const onValueChange = vi.fn<(value: string) => void>();
    const container = await renderReact(
      <BottomSheet defaultValue="partially-expanded" onValueChange={onValueChange}>
        <button type="button" id="inside">
          Inside
        </button>
      </BottomSheet>,
    );
    const root = container.firstElementChild as HTMLElement;
    root.getBoundingClientRect = () => new DOMRect(0, 0, 400, 800);
    const inside = root.querySelector<HTMLButtonElement>('#inside')!;
    inside.getBoundingClientRect = () => new DOMRect(0, 820, 100, 40);
    await act(async () => {
      inside.focus();
      await Promise.resolve();
    });
    expect(onValueChange).toHaveBeenCalledWith('expanded');
    expect(root.className).toBe('m3e-bottom-sheet m3e-bottom-sheet--expanded');
  });

  it('controlled: follows `value`', async () => {
    let set!: (v: 'hidden' | 'expanded') => void;
    function Demo() {
      const [value, setValue] = useState<'hidden' | 'expanded'>('hidden');
      set = setValue;
      return <BottomSheet value={value} />;
    }
    const container = await renderReact(<Demo />);
    await act(async () => {
      set('expanded');
      await Promise.resolve();
    });
    expect(container.firstElementChild!.className).toBe(
      'm3e-bottom-sheet m3e-bottom-sheet--expanded',
    );
  });
});

describe('<ModalBottomSheet> (COMPONENT_SPEC §30)', () => {
  it('opens modally, partially expanded, with focus on the drag handle; Escape and the scrim hide it', async () => {
    const onOpenChange = vi.fn();
    const container = await renderReact(
      <ModalBottomSheet defaultOpen onOpenChange={onOpenChange}>
        <button type="button">Inside</button>
      </ModalBottomSheet>,
    );
    const dialog = container.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute('aria-label')).toBe('Bottom Sheet');
    expect(dialog.className).toBe(
      'm3e-bottom-sheet m3e-bottom-sheet--modal m3e-bottom-sheet--partially-expanded',
    );
    expect(document.activeElement?.className).toContain('m3e-bottom-sheet__handle');
    expect(document.documentElement.style.overflow).toBe('hidden');
    await press(dialog, 'Escape');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(dialog.open).toBe(false);
  });

  it('controlled: the scrim asks to hide; it shows again expanded with skipPartiallyExpanded', async () => {
    let setOpen!: (open: boolean) => void;
    const onOpenChange = vi.fn();
    function Demo() {
      const [open, set] = useState(true);
      setOpen = set;
      return (
        <ModalBottomSheet
          isOpen={open}
          skipPartiallyExpanded
          onOpenChange={(o) => {
            onOpenChange(o);
            set(o);
          }}
        />
      );
    }
    const container = await renderReact(<Demo />);
    const dialog = container.querySelector('dialog')!;
    expect(dialog.className).toContain('m3e-bottom-sheet--expanded');
    await click(dialog.querySelector<HTMLElement>('.m3e-bottom-sheet__scrim')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(dialog.open).toBe(false);
    await act(async () => {
      setOpen(true);
      await Promise.resolve();
    });
    expect(dialog.open).toBe(true);
    expect(dialog.className).toContain('m3e-bottom-sheet--expanded');
  });
});

describe('<BottomSheet> / <ModalBottomSheet> ⇔ <m3e-bottom-sheet> DOM parity', () => {
  // The tooltip's runtime state (shown for the focused handle: data-driven / -positioned and its
  // spring variables) is the shared TooltipController's, not the sheet's contract; the element
  // loads that controller lazily, so it may not have run yet.
  const normalize = (html: string, ids: string[]) =>
    ids
      .reduce((out, id, i) => out.replaceAll(id, `ID${String(i)}`), html)
      .replace(/ data-(driven|positioned)=""/g, '')
      .replace(/ style="--_m3e-tooltip[^"]*"/g, '');
  const idsOf = (root: Element) => [
    ...new Set([root, ...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean)),
  ];
  const same = async (html: string, ui: React.ReactElement) => {
    const host = await renderElement(html);
    // The element imports its layout entry when it first renders.
    await (host as M3eBottomSheet).ready;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const elementRoot = host.querySelector('.m3e-bottom-sheet')!;
    const element = normalize(canonical(elementRoot), idsOf(elementRoot));
    document.body.innerHTML = '';
    const container = await renderReact(ui);
    const reactRoot = container.querySelector('.m3e-bottom-sheet')!;
    expect(normalize(canonical(reactRoot), idsOf(reactRoot)), html).toBe(element);
    document.body.innerHTML = '';
  };

  it('standard: partially expanded, expanded without handle, the peek option', async () => {
    await same(
      '<m3e-bottom-sheet value="partially-expanded"><p>Content</p></m3e-bottom-sheet>',
      <BottomSheet defaultValue="partially-expanded">
        <p>Content</p>
      </BottomSheet>,
    );
    await same(
      '<m3e-bottom-sheet value="expanded" no-drag-handle label="Filters"><p>Content</p></m3e-bottom-sheet>',
      <BottomSheet defaultValue="expanded" dragHandle={false} aria-label="Filters">
        <p>Content</p>
      </BottomSheet>,
    );
    await same(
      '<m3e-bottom-sheet value="partially-expanded" peek-height="128" skip-hidden-state></m3e-bottom-sheet>',
      <BottomSheet defaultValue="partially-expanded" peekHeight={128} skipHiddenState />,
    );
    // Without gestures the handle has no arrow keys, so no aria-keyshortcuts (D20 (9)).
    await same(
      '<m3e-bottom-sheet value="partially-expanded" gestures-disabled></m3e-bottom-sheet>',
      <BottomSheet defaultValue="partially-expanded" gesturesEnabled={false} />,
    );
  });

  it('overflowing content: the same named scroll region (M11 a11y audit L9)', async () => {
    const proto = HTMLElement.prototype;
    const scroll = Object.getOwnPropertyDescriptor(proto, 'scrollHeight');
    const client = Object.getOwnPropertyDescriptor(proto, 'clientHeight');
    const content = (el: HTMLElement) => el.classList.contains('m3e-bottom-sheet__content');
    Object.defineProperty(proto, 'scrollHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return content(this) ? 900 : 0;
      },
    });
    Object.defineProperty(proto, 'clientHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return content(this) ? 100 : 0;
      },
    });
    try {
      const host = await renderElement(
        '<m3e-bottom-sheet value="expanded" label="Filters"><p>Content</p></m3e-bottom-sheet>',
      );
      await (host as M3eBottomSheet).ready;
      const region = host.querySelector('.m3e-bottom-sheet__content')!;
      expect(region.getAttribute('role')).toBe('group');
      expect(region.getAttribute('aria-label')).toBe('Filters');
      expect(region.getAttribute('tabindex')).toBe('0');
      document.body.innerHTML = '';
      await same(
        '<m3e-bottom-sheet value="expanded" label="Filters"><p>Content</p></m3e-bottom-sheet>',
        <BottomSheet defaultValue="expanded" aria-label="Filters">
          <p>Content</p>
        </BottomSheet>,
      );
      await same(
        '<m3e-bottom-sheet variant="modal" value="expanded"><p>Content</p></m3e-bottom-sheet>',
        <ModalBottomSheet defaultOpen skipPartiallyExpanded>
          <p>Content</p>
        </ModalBottomSheet>,
      );
    } finally {
      if (scroll) Object.defineProperty(proto, 'scrollHeight', scroll);
      if (client) Object.defineProperty(proto, 'clientHeight', client);
    }
  });

  it('modal: open partially expanded, and hidden', async () => {
    await same(
      '<m3e-bottom-sheet variant="modal" value="partially-expanded"><p>Content</p></m3e-bottom-sheet>',
      <ModalBottomSheet defaultOpen>
        <p>Content</p>
      </ModalBottomSheet>,
    );
    await same(
      '<m3e-bottom-sheet variant="modal" no-drag-handle></m3e-bottom-sheet>',
      <ModalBottomSheet dragHandle={false} />,
    );
  });
});
