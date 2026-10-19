import '@kyralabs/m3e-elements/side-sheet.js';
import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { Button } from '../button/Button.js';
import { SideSheet } from './SideSheet.js';

/** The window is at least medium (600dp) when `wide` (the adaptive variant reads it). */
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
  stubWindow(true);
});

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
  vi.unstubAllGlobals();
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

describe('<SideSheet> (COMPONENT_SPEC §31)', () => {
  it('standard: an <aside> named by its headline; the close button closes it (uncontrolled)', async () => {
    const onOpenChange = vi.fn();
    const container = await renderReact(
      <SideSheet defaultOpen headline="Filters" onOpenChange={onOpenChange}>
        <p>Content</p>
      </SideSheet>,
    );
    const root = container.firstElementChild!;
    expect(root.localName).toBe('aside');
    expect(root.className).toBe('m3e-side-sheet m3e-side-sheet--open');
    expect(root.getAttribute('aria-labelledby')).toBe(
      root.querySelector('.m3e-side-sheet__headline')!.id,
    );
    await click(root.querySelector<HTMLElement>('.m3e-side-sheet__close')!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(root.className).toBe('m3e-side-sheet');
  });

  it('modal (controlled): opens modally, Escape asks to close, the back button calls onBack', async () => {
    let setOpen!: (open: boolean) => void;
    const onBack = vi.fn();
    function Demo() {
      const [open, set] = useState(false);
      setOpen = set;
      return (
        <SideSheet
          variant="modal"
          isOpen={open}
          onOpenChange={set}
          backButton
          onBack={onBack}
          aria-label="Details"
          actions={<Button>Save</Button>}
        >
          <p>Content</p>
        </SideSheet>
      );
    }
    const container = await renderReact(<Demo />);
    const dialog = container.querySelector('dialog')!;
    expect(dialog.getAttribute('aria-label')).toBe('Details');
    expect(dialog.open).toBe(false);
    await act(async () => {
      setOpen(true);
      await Promise.resolve();
    });
    expect(dialog.open).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.activeElement?.className).toContain('m3e-side-sheet__back');
    await click(dialog.querySelector<HTMLElement>('.m3e-side-sheet__back')!);
    expect(onBack).toHaveBeenCalledTimes(1);
    await press(dialog, 'Escape');
    expect(dialog.className).not.toContain('m3e-side-sheet--open');
  });

  it('adaptive: modal below 600dp, standard from it', async () => {
    stubWindow(false);
    const narrow = await renderReact(<SideSheet variant="adaptive" defaultOpen headline="A" />);
    expect(narrow.firstElementChild!.localName).toBe('dialog');
    document.body.innerHTML = '';
    stubWindow(true);
    const wide = await renderReact(<SideSheet variant="adaptive" defaultOpen headline="A" />);
    expect(wide.firstElementChild!.localName).toBe('aside');
  });
});

describe('<SideSheet> ⇔ <m3e-side-sheet> DOM parity', () => {
  const normalize = (html: string, ids: string[]) =>
    ids.reduce((out, id, i) => out.replaceAll(id, `ID${String(i)}`), html);
  const idsOf = (root: Element) => [
    ...new Set([root, ...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean)),
  ];
  const same = async (html: string, ui: React.ReactElement) => {
    const host = await renderElement(html);
    const elementRoot = host.querySelector('.m3e-side-sheet')!;
    const element = normalize(canonical(elementRoot), idsOf(elementRoot));
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    const container = await renderReact(ui);
    const reactRoot = container.querySelector('.m3e-side-sheet')!;
    expect(normalize(canonical(reactRoot), idsOf(reactRoot)), html).toBe(element);
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
  };

  it('standard: open with a headline, closed with a back button and a label', async () => {
    await same(
      '<m3e-side-sheet headline="Filters" open divider><p>Content</p></m3e-side-sheet>',
      <SideSheet headline="Filters" defaultOpen divider>
        <p>Content</p>
      </SideSheet>,
    );
    await same(
      '<m3e-side-sheet back back-label="Up" close-label="Dismiss" label="Details"></m3e-side-sheet>',
      <SideSheet backButton backLabel="Up" closeLabel="Dismiss" aria-label="Details" />,
    );
  });

  it('modal: open, detached, with actions; closed', async () => {
    await same(
      '<m3e-side-sheet variant="modal" headline="Filters" open detached divider><p>Content</p><button slot="actions" type="button">Save</button></m3e-side-sheet>',
      <SideSheet
        variant="modal"
        headline="Filters"
        defaultOpen
        detached
        divider
        actions={<button type="button">Save</button>}
      >
        <p>Content</p>
      </SideSheet>,
    );
    await same(
      '<m3e-side-sheet variant="modal" headline="Filters"></m3e-side-sheet>',
      <SideSheet variant="modal" headline="Filters" />,
    );
  });

  it('adaptive: the same root for the window size class', async () => {
    stubWindow(false);
    await same(
      '<m3e-side-sheet variant="adaptive" headline="Filters" open></m3e-side-sheet>',
      <SideSheet variant="adaptive" headline="Filters" defaultOpen />,
    );
  });
});
