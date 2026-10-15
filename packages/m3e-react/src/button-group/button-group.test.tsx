import '@kyralabs/m3e-elements/button-group.js';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderElement, renderReact, canonical } from '../test/parity.js';
import { ButtonGroup, ButtonGroupItem } from './ButtonGroup.js';

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const press = async (el: Element) => {
  await act(async () => {
    (el as HTMLElement).click();
    await Promise.resolve();
  });
};
const key = async (k: string, target: Element = document.activeElement ?? document.body) => {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};
const flush = async () => {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
};

describe('<ButtonGroup>', () => {
  it('renders the m3e-css contract (standard / s / round / filled)', async () => {
    const container = await renderReact(
      <ButtonGroup aria-label="Text">
        <ButtonGroupItem id="bold" icon="format_bold">
          Bold
        </ButtonGroupItem>
        <ButtonGroupItem id="italic">Italic</ButtonGroupItem>
      </ButtonGroup>,
    );
    const group = container.querySelector('.m3e-button-group')!;
    expect(group.className).toBe(
      'm3e-button-group m3e-button-group--standard m3e-button-group--size-s',
    );
    expect(group.getAttribute('role')).toBe('group');
    const buttons = group.querySelectorAll('button');
    expect(buttons[0]!.className).toBe(
      'm3e-button m3e-button--filled m3e-button--size-s m3e-button--round m3e-button-group__item',
    );
    expect(buttons[0]!.hasAttribute('data-spring')).toBe(true);
    expect(buttons[0]!.textContent).toBe('format_boldBold');
  });

  it('single selection: radios, onSelectionChange, roving tabindex on the checked radio', async () => {
    const onSelectionChange = vi.fn();
    const container = await renderReact(
      <ButtonGroup
        variant="connected"
        selectionMode="single"
        defaultSelectedKeys={['week']}
        onSelectionChange={onSelectionChange}
        aria-label="View"
      >
        <ButtonGroupItem id="day">Day</ButtonGroupItem>
        <ButtonGroupItem id="week">Week</ButtonGroupItem>
        <ButtonGroupItem id="month">Month</ButtonGroupItem>
      </ButtonGroup>,
    );
    await flush();
    const group = container.querySelector('.m3e-button-group')!;
    expect(group.getAttribute('role')).toBe('radiogroup');
    const buttons = () => [...group.querySelectorAll('button')];
    expect(buttons().map((b) => b.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
    ]);
    expect(buttons().map((b) => b.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
    await press(buttons()[2]!);
    expect(onSelectionChange).toHaveBeenCalledWith(new Set(['month']));
    expect(buttons()[2]!.getAttribute('aria-checked')).toBe('true');
  });

  it('multiple selection: aria-pressed toggles', async () => {
    const container = await renderReact(
      <ButtonGroup selectionMode="multiple">
        <ButtonGroupItem id="a">A</ButtonGroupItem>
        <ButtonGroupItem id="b">B</ButtonGroupItem>
      </ButtonGroup>,
    );
    const [a] = container.querySelectorAll('button');
    expect(a!.getAttribute('aria-pressed')).toBe('false');
    await press(a!);
    expect(a!.getAttribute('aria-pressed')).toBe('true');
  });

  it('onAction and item onPress fire for plain buttons', async () => {
    const onAction = vi.fn();
    const onPress = vi.fn();
    const container = await renderReact(
      <ButtonGroup onAction={onAction}>
        <ButtonGroupItem id="save" onPress={onPress}>
          Save
        </ButtonGroupItem>
      </ButtonGroup>,
    );
    await press(container.querySelector('button')!);
    expect(onAction).toHaveBeenCalledWith('save');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('arrow keys move focus (ButtonGroupLayout)', async () => {
    const container = await renderReact(
      <ButtonGroup>
        <ButtonGroupItem id="a">A</ButtonGroupItem>
        <ButtonGroupItem id="b" isDisabled>
          B
        </ButtonGroupItem>
        <ButtonGroupItem id="c">C</ButtonGroupItem>
      </ButtonGroup>,
    );
    await flush();
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons.map((b) => b.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    buttons[0]!.focus();
    await key('ArrowRight');
    expect(document.activeElement).toBe(buttons[2]);
    await key('Home');
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('overflow: hidden items go to a baseline menu behind "More options"', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      const w = this.classList.contains('m3e-button-group__overflow') ? 40 : 100;
      return { width: w, height: 40 } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.classList.contains('m3e-button-group') ? 280 : 0;
    });
    const onAction = vi.fn();
    const container = await renderReact(
      <ButtonGroup overflow onAction={onAction} aria-label="Tools">
        <ButtonGroupItem id="a">A</ButtonGroupItem>
        <ButtonGroupItem id="b">B</ButtonGroupItem>
        <ButtonGroupItem id="c" icon="star">
          C
        </ButtonGroupItem>
      </ButtonGroup>,
    );
    await flush();
    const group = container.querySelector('.m3e-button-group')!;
    expect(group.classList.contains('m3e-button-group--overflow')).toBe(true);
    const items = [...group.querySelectorAll<HTMLElement>('.m3e-button-group__item')];
    expect(items.map((b) => b.hidden)).toEqual([false, false, true]);
    const trigger = group.querySelector<HTMLButtonElement>('.m3e-button-group__overflow')!;
    expect(trigger.hidden).toBe(false);
    expect(trigger.getAttribute('aria-label')).toBe('More options');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await press(trigger);
    const menu = document.querySelector('.m3e-menu')!;
    expect(menu.className).toBe('m3e-menu m3e-menu--baseline');
    const entry = menu.querySelector('.m3e-menu__item')!;
    expect(entry.textContent).toBe('starC');
    await press(entry);
    expect(onAction).toHaveBeenCalledWith('c');
  });
});

/** Canonical DOM without React Aria's bookkeeping, with ids numbered by first appearance. */
function contract(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  clone.querySelector('m3e-menu')?.remove();
  const ids = new Map<string, string>();
  const idOf = (id: string) => {
    if (!ids.has(id)) ids.set(id, `id${String(ids.size)}`);
    return ids.get(id)!;
  };
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of ['data-react-aria-pressable', 'style']) el.removeAttribute(name);
    const id = el.getAttribute('id');
    if (id) el.setAttribute('id', idOf(id));
  }
  return canonical(clone);
}

describe('<ButtonGroup> ⇔ <m3e-button-group> DOM parity', () => {
  it('standard group with a hidden overflow button', async () => {
    const react = await renderReact(
      <ButtonGroup size="m" shape="square" buttonVariant="tonal" overflow aria-label="Text">
        <ButtonGroupItem id="bold" icon="format_bold">
          Bold
        </ButtonGroupItem>
        <ButtonGroupItem id="italic" isDisabled>
          Italic
        </ButtonGroupItem>
        <ButtonGroupItem id="under" icon="format_underlined" aria-label="Underline" />
      </ButtonGroup>,
    );
    const host = await renderElement(`
      <m3e-button-group size="m" shape="square" button-variant="tonal" overflow label="Text">
        <m3e-button-group-item value="bold" icon="format_bold">Bold</m3e-button-group-item>
        <m3e-button-group-item value="italic" disabled>Italic</m3e-button-group-item>
        <m3e-button-group-item value="under" icon="format_underlined" label="Underline"></m3e-button-group-item>
      </m3e-button-group>`);
    await flush();
    expect(contract(host.querySelector('.m3e-button-group')!)).toBe(
      contract(react.querySelector('.m3e-button-group')!),
    );
  });

  it('connected single-select group', async () => {
    const react = await renderReact(
      <ButtonGroup variant="connected" selectionMode="single" defaultSelectedKeys={['b']}>
        <ButtonGroupItem id="a">A</ButtonGroupItem>
        <ButtonGroupItem id="b">B</ButtonGroupItem>
      </ButtonGroup>,
    );
    const host = await renderElement(`
      <m3e-button-group variant="connected" selection-mode="single">
        <m3e-button-group-item value="a">A</m3e-button-group-item>
        <m3e-button-group-item value="b" selected>B</m3e-button-group-item>
      </m3e-button-group>`);
    await flush();
    expect(contract(host.querySelector('.m3e-button-group')!)).toBe(
      contract(react.querySelector('.m3e-button-group')!),
    );
  });

  it('multi-select group', async () => {
    const react = await renderReact(
      <ButtonGroup selectionMode="multiple" defaultSelectedKeys={['a']} size="xs">
        <ButtonGroupItem id="a">A</ButtonGroupItem>
        <ButtonGroupItem id="b">B</ButtonGroupItem>
      </ButtonGroup>,
    );
    const host = await renderElement(`
      <m3e-button-group selection-mode="multiple" size="xs">
        <m3e-button-group-item value="a" selected>A</m3e-button-group-item>
        <m3e-button-group-item value="b">B</m3e-button-group-item>
      </m3e-button-group>`);
    await flush();
    expect(contract(host.querySelector('.m3e-button-group')!)).toBe(
      contract(react.querySelector('.m3e-button-group')!),
    );
  });
});
