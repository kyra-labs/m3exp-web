import { afterEach, describe, expect, it, vi } from 'vitest';
import { DialogLayout } from '../dialog-layout/dialog-layout.js';
import type { M3eDialog } from './dialog.js';
import './index.js';

const flush = async () => {
  for (let i = 0; i < 4; i++) {
    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
  }
};

const mount = async (html: string): Promise<M3eDialog> => {
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  await flush();
  return container.querySelector('m3e-dialog')!;
};

const key = (target: Element, k: string, shiftKey = false) => {
  const e = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true });
  target.dispatchEvent(e);
  return e;
};

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('style');
});

const ALERT = `<m3e-dialog headline="Discard draft?" icon="delete">
  This permanently deletes the draft.
  <button class="m3e-button m3e-button--text" slot="actions">Cancel</button>
  <button class="m3e-button m3e-button--text" slot="actions">Discard</button>
</m3e-dialog>`;

describe('<m3e-dialog> contract (COMPONENT_SPEC §29)', () => {
  it('renders a <dialog role="alertdialog"> named by the headline and described by the text', async () => {
    const host = await mount(ALERT);
    const dialog = host.dialogElement!;
    expect(dialog.localName).toBe('dialog');
    expect(dialog.className).toBe('m3e-dialog');
    expect(dialog.getAttribute('role')).toBe('alertdialog');
    const [scrim, container] = [...dialog.children];
    expect(scrim!.className).toBe('m3e-dialog__scrim');
    expect(scrim!.getAttribute('aria-hidden')).toBe('true');
    expect([...container!.children].map((c) => c.className)).toEqual([
      'm3e-icon m3e-dialog__icon',
      'm3e-dialog__headline',
      'm3e-dialog__content',
      'm3e-dialog__actions',
    ]);
    const headline = container!.querySelector('h2')!;
    const content = container!.querySelector('.m3e-dialog__content')!;
    expect(dialog.getAttribute('aria-labelledby')).toBe(headline.id);
    expect(dialog.getAttribute('aria-describedby')).toBe(content.id);
    expect(content.textContent.trim()).toBe('This permanently deletes the draft.');
    const buttons = [...container!.querySelectorAll('.m3e-dialog__actions > button')];
    expect(buttons.map((b) => b.textContent)).toEqual(['Cancel', 'Discard']);
    expect(buttons.every((b) => !b.hasAttribute('slot'))).toBe(true);
    expect(dialog.open).toBe(false);
  });

  it('without a headline the dialog is named "Dialog" (Compose Strings.Dialog) or by `label`', async () => {
    const host = await mount('<m3e-dialog>Text</m3e-dialog>');
    expect(host.dialogElement!.getAttribute('aria-label')).toBe('Dialog');
    expect(host.dialogElement!.hasAttribute('aria-labelledby')).toBe(false);
    host.label = 'Confirm';
    await flush();
    expect(host.dialogElement!.getAttribute('aria-label')).toBe('Confirm');
  });

  it('custom (BasicAlertDialog): a plain <dialog>, the children are the container; switching moves them', async () => {
    const host = await mount(
      '<m3e-dialog variant="custom"><div class="m3e-surface">Custom</div></m3e-dialog>',
    );
    const dialog = host.dialogElement!;
    expect(dialog.className).toBe('m3e-dialog m3e-dialog--custom');
    expect(dialog.hasAttribute('role')).toBe(false);
    expect(dialog.getAttribute('aria-label')).toBe('Dialog');
    expect(dialog.querySelector('.m3e-dialog__container > .m3e-surface')?.textContent).toBe(
      'Custom',
    );
    host.variant = 'alert';
    await flush();
    expect(dialog.querySelector('.m3e-dialog__content > .m3e-surface')).not.toBeNull();
    host.variant = 'custom';
    await flush();
    expect(dialog.querySelector('.m3e-dialog__container > .m3e-surface')).not.toBeNull();
    expect(dialog.querySelector('.m3e-dialog__content')).toBeNull();
  });

  it('full-screen: header with a close button and the headline, content, actions', async () => {
    const host = await mount(`<m3e-dialog variant="full-screen" headline="New event">
      <label>Title <input></label>
      <button class="m3e-button m3e-button--text" slot="actions">Save</button>
    </m3e-dialog>`);
    const dialog = host.dialogElement!;
    expect(dialog.className).toBe('m3e-dialog m3e-dialog--full-screen');
    expect(dialog.hasAttribute('role')).toBe(false);
    const container = dialog.querySelector('.m3e-dialog__container')!;
    expect([...container.children].map((c) => c.className)).toEqual([
      'm3e-dialog__header',
      'm3e-dialog__content',
      'm3e-dialog__actions',
    ]);
    const close = container.querySelector<HTMLButtonElement>('.m3e-dialog__close')!;
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.textContent).toBe('close');
    expect(dialog.getAttribute('aria-labelledby')).toBe(container.querySelector('h2')!.id);
    host.closeLabel = 'Discard';
    await flush();
    expect(close.getAttribute('aria-label')).toBe('Discard');
  });
});

describe('<m3e-dialog> behavior (DialogLayout)', () => {
  it('show() opens it modally, locks the scroll and focuses the first control', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const host = await mount(ALERT);
    const changes: boolean[] = [];
    host.addEventListener('open-change', (e) =>
      changes.push((e as CustomEvent<{ open: boolean }>).detail.open),
    );
    host.show();
    await flush();
    const dialog = host.dialogElement!;
    expect(dialog.open).toBe(true);
    expect(host.hasAttribute('open')).toBe(true);
    expect(changes).toEqual([true]);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(document.activeElement?.textContent).toBe('Cancel');
    // happy-dom runs no CSS animations: the open motion ends at once.
    expect(dialog.hasAttribute('data-motion')).toBe(false);
  });

  it('Escape asks to close (cancelable); closing returns focus to the opener', async () => {
    const opener = document.createElement('button');
    document.body.append(opener);
    opener.focus();
    const host = await mount(ALERT);
    host.show();
    await flush();
    const dialog = host.dialogElement!;
    let veto = true;
    host.addEventListener('open-change', (e) => {
      if (veto) e.preventDefault();
    });
    const first = key(document.activeElement!, 'Escape');
    expect(first.defaultPrevented).toBe(true);
    await flush();
    expect(host.open).toBe(true);
    expect(dialog.open).toBe(true);
    veto = false;
    key(document.activeElement!, 'Escape');
    await flush();
    expect(host.open).toBe(false);
    // happy-dom runs no CSS animations: the close completes at once.
    await flush();
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute('data-motion')).toBe(false);
    expect(document.documentElement.hasAttribute('style')).toBe(false);
    expect(document.activeElement).toBe(opener);
  });

  it('a press on the scrim and the full-screen close button ask to close', async () => {
    const host = await mount(
      '<m3e-dialog variant="full-screen" headline="New event"><input></m3e-dialog>',
    );
    host.show();
    await flush();
    const asks: boolean[] = [];
    host.addEventListener('open-change', (e) => {
      asks.push((e as CustomEvent<{ open: boolean }>).detail.open);
      e.preventDefault();
    });
    host.dialogElement!.querySelector<HTMLElement>('.m3e-dialog__scrim')!.click();
    host.dialogElement!.querySelector<HTMLElement>('.m3e-dialog__close')!.click();
    host.dialogElement!.querySelector<HTMLElement>('.m3e-dialog__container')!.click();
    expect(asks).toEqual([false, false]);
    expect(host.open).toBe(true);
  });

  it('Tab wraps inside the dialog', async () => {
    const host = await mount(ALERT);
    host.show();
    await flush();
    const [cancel, discard] = [
      ...host.dialogElement!.querySelectorAll<HTMLButtonElement>('.m3e-dialog__actions > button'),
    ];
    discard!.focus();
    const tab = key(discard!, 'Tab');
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(cancel);
    key(cancel!, 'Tab', true);
    expect(document.activeElement).toBe(discard);
  });

  it('a browser close request (cancel) is turned into an ask; a native close is followed', async () => {
    const host = await mount(ALERT);
    host.open = true;
    await flush();
    const dialog = host.dialogElement!;
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    await flush();
    expect(host.open).toBe(false);
    host.open = true;
    await flush();
    expect(dialog.open).toBe(true);
    dialog.close();
    await flush();
    expect(host.open).toBe(false);
  });

  it('full-screen: data-scrolled while the content is scrolled', async () => {
    const host = await mount(
      '<m3e-dialog variant="full-screen" headline="New event" open><p>Text</p></m3e-dialog>',
    );
    const dialog = host.dialogElement!;
    const content = dialog.querySelector<HTMLElement>('.m3e-dialog__content')!;
    expect(dialog.hasAttribute('data-scrolled')).toBe(false);
    content.scrollTop = 40;
    content.dispatchEvent(new Event('scroll'));
    expect(dialog.hasAttribute('data-scrolled')).toBe(true);
    content.scrollTop = 0;
    content.dispatchEvent(new Event('scroll'));
    expect(dialog.hasAttribute('data-scrolled')).toBe(false);
  });

  it('closing waits for the exit animations, then closes the <dialog>', async () => {
    const dialog = document.createElement('dialog');
    dialog.className = 'm3e-dialog';
    document.body.append(dialog);
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const animation = { animationName: 'm3e-dialog-slide-out', finished };
    const other = { animationName: 'm3e-loading', finished: new Promise(() => undefined) };
    dialog.getAnimations = vi.fn(() => [animation, other] as unknown as Animation[]);
    const layout = new DialogLayout(dialog, { open: true });
    expect(dialog.open).toBe(true);
    layout.setOpen(false);
    expect(dialog.getAttribute('data-motion')).toBe('exit');
    await flush();
    expect(dialog.open).toBe(true);
    finish();
    await flush();
    expect(dialog.open).toBe(false);
    expect(dialog.hasAttribute('data-motion')).toBe(false);
    layout.destroy();
  });
});
