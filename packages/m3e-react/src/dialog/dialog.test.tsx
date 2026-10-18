import '@kyralabs/m3e-elements/dialog.js';
import { act, useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { AlertDialog, BasicAlertDialog, FullScreenDialog } from './Dialog.js';

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

const escape = async (target: Element) => {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
    await Promise.resolve();
  });
};

const text = (label: string) => (
  <button type="button" className="m3e-button m3e-button--text">
    {label}
  </button>
);

describe('<AlertDialog> (COMPONENT_SPEC §29)', () => {
  it('renders the alertdialog contract and opens modally with focus on the first control', async () => {
    const container = await renderReact(
      <AlertDialog
        defaultOpen
        icon="delete"
        headline="Discard draft?"
        dismissButton={text('Cancel')}
        confirmButton={text('Discard')}
      >
        This permanently deletes the draft.
      </AlertDialog>,
    );
    const dialog = container.querySelector('dialog')!;
    expect(dialog.className).toBe('m3e-dialog');
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    expect(dialog.open).toBe(true);
    const headline = dialog.querySelector('h2')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe(headline.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(
      dialog.querySelector('.m3e-dialog__content')!.id,
    );
    expect(
      [...dialog.querySelectorAll('.m3e-dialog__actions > button')].map((b) => b.textContent),
    ).toEqual(['Cancel', 'Discard']);
    expect(document.activeElement?.textContent).toBe('Cancel');
    expect(document.documentElement.style.overflow).toBe('hidden');
  });

  it('controlled: Escape and the scrim call onOpenChange(false); it closes when isOpen does', async () => {
    const onOpenChange = vi.fn();
    let setOpen!: (open: boolean) => void;
    function Demo() {
      const [open, set] = useState(true);
      setOpen = set;
      return (
        <AlertDialog
          isOpen={open}
          onOpenChange={onOpenChange}
          headline="Title"
          confirmButton={text('OK')}
        >
          Text
        </AlertDialog>
      );
    }
    const container = await renderReact(<Demo />);
    const dialog = container.querySelector('dialog')!;
    await escape(document.activeElement!);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(dialog.open).toBe(true);
    act(() => {
      dialog.querySelector<HTMLElement>('.m3e-dialog__scrim')!.click();
    });
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    await act(async () => {
      setOpen(false);
      await Promise.resolve();
    });
    expect(dialog.open).toBe(false);
    expect(document.documentElement.hasAttribute('style')).toBe(false);
  });

  it('uncontrolled: Escape closes it and returns focus to the opener', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const container = await renderReact(
      <AlertDialog defaultOpen headline="Title" confirmButton={text('OK')} />,
    );
    const dialog = container.querySelector('dialog')!;
    expect(document.activeElement?.textContent).toBe('OK');
    await escape(document.activeElement!);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(opener);
  });
});

describe('<AlertDialog> / <BasicAlertDialog> / <FullScreenDialog> ⇔ <m3e-dialog> DOM parity', () => {
  const normalize = (html: string, ids: string[]) =>
    ids.reduce((out, id, i) => out.replaceAll(id, `ID${String(i)}`), html);
  const idsOf = (root: Element) => [
    ...new Set([root, ...root.querySelectorAll('[id]')].map((el) => el.id).filter(Boolean)),
  ];
  const button = (label: string) =>
    `<button type="button" class="m3e-button m3e-button--text" slot="actions">${label}</button>`;

  it('alert (icon, headline, text, actions), alert without headline, custom, full-screen', async () => {
    const cases: [string, React.ReactElement][] = [
      [
        `<m3e-dialog icon="delete" headline="Discard draft?">Text${button('Cancel')}${button('Discard')}</m3e-dialog>`,
        <AlertDialog
          key="a"
          icon="delete"
          headline="Discard draft?"
          dismissButton={text('Cancel')}
          confirmButton={text('Discard')}
        >
          Text
        </AlertDialog>,
      ],
      [
        `<m3e-dialog label="Confirm">Text${button('OK')}</m3e-dialog>`,
        <AlertDialog key="b" aria-label="Confirm" confirmButton={text('OK')}>
          Text
        </AlertDialog>,
      ],
      [
        '<m3e-dialog variant="custom"><p>Custom</p></m3e-dialog>',
        <BasicAlertDialog key="c">
          <p>Custom</p>
        </BasicAlertDialog>,
      ],
      [
        `<m3e-dialog variant="full-screen" headline="New event"><p>Form</p>${button('Save')}</m3e-dialog>`,
        <FullScreenDialog key="d" headline="New event" action={text('Save')}>
          <p>Form</p>
        </FullScreenDialog>,
      ],
    ];
    for (const [html, ui] of cases) {
      const host = await renderElement(html);
      const elementRoot = host.querySelector('dialog')!;
      const element = normalize(canonical(elementRoot), idsOf(elementRoot));
      document.body.innerHTML = '';
      const container = await renderReact(ui);
      const reactRoot = container.querySelector('dialog')!;
      expect(normalize(canonical(reactRoot), idsOf(reactRoot)), html).toBe(element);
      document.body.innerHTML = '';
    }
  });
});
