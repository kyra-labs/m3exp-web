/* eslint-disable @typescript-eslint/no-deprecated -- the D4 legacy item is tested too */
import '@kyralabs/m3e-elements/list.js';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { List, ListItem, SegmentedListItem } from './index.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const pointer = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };

const press = async (el: Element) => {
  await act(async () => {
    el.dispatchEvent(new PointerEvent('pointerdown', pointer));
    el.dispatchEvent(new PointerEvent('pointerup', pointer));
    (el as HTMLElement).click();
    await Promise.resolve();
  });
};

const key = async (el: Element, k: string) => {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    el.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
};

describe('static <List>', () => {
  it('renders the m3e-css ul / li contract with the slots in order', async () => {
    const container = await renderReact(
      <List aria-label="Contacts">
        <ListItem
          leadingContent={<Icon name="person" />}
          overlineContent="Overline"
          supportingContent="Supporting"
          trailingContent="100+"
        >
          Headline
        </ListItem>
        <SegmentedListItem isDisabled isDragged threeLine>
          Second
        </SegmentedListItem>
      </List>,
    );
    const list = container.querySelector('ul')!;
    expect(list.className).toBe('m3e-list');
    expect(list.getAttribute('aria-label')).toBe('Contacts');
    const [first, second] = [...list.children] as [HTMLElement, HTMLElement];
    expect(first.localName).toBe('li');
    expect(first.className).toBe('m3e-list-item');
    expect([...first.children].map((c) => c.className)).toEqual([
      'm3e-list-item__leading',
      'm3e-list-item__content',
      'm3e-list-item__trailing',
    ]);
    expect(
      [...first.querySelector('.m3e-list-item__content')!.children].map((c) => c.className),
    ).toEqual(['m3e-list-item__overline', 'm3e-list-item__headline', 'm3e-list-item__supporting']);
    expect(second.className).toBe(
      'm3e-list-item m3e-list-item--segmented m3e-list-item--three-line m3e-list-item--disabled',
    );
    expect(second.hasAttribute('data-dragged')).toBe(true);
    expect(second.hasAttribute('role')).toBe(false);
  });

  it('the deprecated headlineContent form is the legacy item and warns once (D4)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = await renderReact(
      <List>
        <ListItem headlineContent="Legacy" supportingContent="Two-line" />
        <ListItem headlineContent="Again" />
      </List>,
    );
    const item = container.querySelector('li')!;
    expect(item.className).toBe('m3e-list-item m3e-list-item--baseline');
    expect(item.querySelector('.m3e-list-item__headline')!.textContent).toBe('Legacy');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('D4');
    warn.mockRestore();
  });
});

describe('interactive <List>', () => {
  it('single selection: a listbox of options; press toggles; the indicator follows', async () => {
    const onSelectionChange = vi.fn();
    const container = await renderReact(
      <List aria-label="Pets" selectionMode="single" onSelectionChange={onSelectionChange}>
        <ListItem id="cat" selectionControl="radio" supportingContent="Purrs">
          Cat
        </ListItem>
        <ListItem id="dog" selectionControl="radio">
          Dog
        </ListItem>
      </List>,
    );
    const list = container.querySelector('.m3e-list')!;
    expect(list.getAttribute('role')).toBe('listbox');
    expect(list.getAttribute('tabindex')).toBe('0');
    const options = [...list.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options.map((o) => o.className)).toEqual([
      'm3e-list-item m3e-list-item--interactive',
      'm3e-list-item m3e-list-item--interactive',
    ]);
    expect(options.map((o) => o.getAttribute('aria-selected'))).toEqual(['false', 'false']);
    const [cat, dog] = options as [HTMLElement, HTMLElement];
    expect(cat.getAttribute('aria-labelledby')).toBe(
      cat.querySelector('.m3e-list-item__headline')!.id,
    );
    expect(cat.getAttribute('aria-describedby')).toBe(
      cat.querySelector('.m3e-list-item__supporting')!.id,
    );
    expect(dog.hasAttribute('aria-describedby')).toBe(false);
    expect(cat.querySelector('.m3e-radio-button')!.hasAttribute('inert')).toBe(true);
    await press(cat);
    expect(cat.getAttribute('aria-selected')).toBe('true');
    expect(cat.querySelector('input')!.checked).toBe(true);
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect([...(onSelectionChange.mock.calls[0]![0] as Set<string>)]).toEqual(['cat']);
    await press(dog);
    expect(cat.getAttribute('aria-selected')).toBe('false');
    expect(dog.getAttribute('aria-selected')).toBe('true');
    expect(cat.querySelector('input')!.checked).toBe(false);
  });

  it('arrow keys wrap; Right / Left move like Down / Up; disabled options are skipped', async () => {
    const container = await renderReact(
      <List aria-label="L" selectionMode="multiple">
        <ListItem id="a">Alpha</ListItem>
        <ListItem id="b" isDisabled>
          Beta
        </ListItem>
        <ListItem id="c">Gamma</ListItem>
      </List>,
    );
    const [a, b, c] = [...container.querySelectorAll<HTMLElement>('[role="option"]')] as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    expect(b.getAttribute('aria-disabled')).toBe('true');
    expect(b.hasAttribute('tabindex')).toBe(false);
    await act(async () => {
      a.focus();
      await Promise.resolve();
    });
    await key(a, 'ArrowDown');
    expect(document.activeElement).toBe(c);
    await key(c, 'ArrowDown');
    expect(document.activeElement).toBe(a);
    await key(a, 'ArrowUp');
    expect(document.activeElement).toBe(c);
    await key(c, 'ArrowRight');
    expect(document.activeElement).toBe(a);
    await key(a, 'ArrowLeft');
    expect(document.activeElement).toBe(c);
    await key(c, ' ');
    expect(c.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('.m3e-list')!.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('onAction without selection: actionable options without aria-selected', async () => {
    const onAction = vi.fn();
    const container = await renderReact(
      <List aria-label="Actions" onAction={onAction}>
        <SegmentedListItem id="open">Open</SegmentedListItem>
      </List>,
    );
    const option = container.querySelector<HTMLElement>('[role="option"]')!;
    expect(option.className).toBe(
      'm3e-list-item m3e-list-item--segmented m3e-list-item--interactive',
    );
    expect(option.hasAttribute('aria-selected')).toBe(false);
    await press(option);
    expect(onAction).toHaveBeenCalledWith('open');
  });

  it('springs the top and bottom corners inline (data-spring)', async () => {
    const container = await renderReact(
      <List aria-label="L" selectionMode="single">
        <ListItem id="a">A</ListItem>
      </List>,
    );
    const option = container.querySelector<HTMLElement>('[role="option"]')!;
    expect(option.hasAttribute('data-spring')).toBe(true);
  });
});

/**
 * The contract both layers render, without React Aria's runtime details: ids are renumbered in
 * document order (the references with them), press and collection markers and the element's
 * authoring attributes are dropped, React's inline corner springs too.
 */
const contract = (el: Element) => {
  const clone = el.cloneNode(true) as Element;
  const nodes = [clone, ...clone.querySelectorAll('*')];
  const ids = new Map<string, string>();
  for (const node of nodes) {
    if (node.id) ids.set(node.id, `id${String(ids.size + 1)}`);
  }
  for (const node of nodes) {
    for (const name of [
      'data-react-aria-pressable',
      'data-collection',
      'data-value',
      'data-spring',
      'style',
    ]) {
      node.removeAttribute(name);
    }
    if (node.id) node.id = ids.get(node.id)!;
    for (const name of ['aria-labelledby', 'aria-describedby']) {
      const value = node.getAttribute(name);
      if (value !== null) {
        node.setAttribute(
          name,
          value
            .split(' ')
            .map((id) => ids.get(id) ?? id)
            .join(' '),
        );
      }
    }
  }
  return canonical(clone);
};

describe('element / React DOM parity (CLAUDE.md "Done means" #8)', () => {
  const radio =
    '<span class="m3e-radio-button" inert=""><input class="m3e-radio-button__input" type="radio"><span class="m3e-radio-button__icon" aria-hidden="true"></span><span class="m3e-radio-button__state" aria-hidden="true"></span></span>';

  it('single selection: <m3e-list> and <List selectionMode="single">', async () => {
    const react = await renderReact(
      <List aria-label="Pets" selectionMode="single">
        <ListItem
          id="cat"
          selectionControl="radio"
          overlineContent="Indoor"
          supportingContent="Purrs"
          trailingContent={<Icon name="favorite" />}
        >
          Cat
        </ListItem>
        <ListItem id="dog" selectionControl="radio" isDisabled>
          Dog
        </ListItem>
      </List>,
    );
    const host = await renderElement(
      '<m3e-list label="Pets" selection="single">' +
        `<div class="m3e-list-item" data-value="cat"><span class="m3e-list-item__leading">${radio}</span><span class="m3e-list-item__content"><span class="m3e-list-item__overline">Indoor</span><span class="m3e-list-item__headline">Cat</span><span class="m3e-list-item__supporting">Purrs</span></span><span class="m3e-list-item__trailing"><span class="m3e-icon" aria-hidden="true">favorite</span></span></div>` +
        `<div class="m3e-list-item" data-value="dog" aria-disabled="true"><span class="m3e-list-item__leading">${radio}</span><span class="m3e-list-item__content"><span class="m3e-list-item__headline">Dog</span></span></div>` +
        '</m3e-list>',
    );
    expect(contract(host.querySelector('.m3e-list')!)).toBe(
      contract(react.querySelector('.m3e-list')!),
    );
  });

  it('segmented multiple selection with switches: <m3e-list> and <List selectionMode="multiple">', async () => {
    const react = await renderReact(
      <List aria-label="Settings" selectionMode="multiple" defaultSelectedKeys={['wifi']}>
        <SegmentedListItem id="wifi" selectionControl="switch">
          Wi-Fi
        </SegmentedListItem>
        <SegmentedListItem id="bt" selectionControl="switch">
          Bluetooth
        </SegmentedListItem>
      </List>,
    );
    const toggle = (checked: boolean) =>
      `<span class="m3e-switch" inert=""><input class="m3e-switch__input" type="checkbox" role="switch"${checked ? ' checked=""' : ''}><span class="m3e-switch__track" aria-hidden="true"><span class="m3e-switch__handle"><span class="m3e-switch__state"></span></span></span></span>`;
    const host = await renderElement(
      '<m3e-list label="Settings" selection="multiple">' +
        `<div class="m3e-list-item m3e-list-item--segmented" data-value="wifi" aria-selected="true"><span class="m3e-list-item__content"><span class="m3e-list-item__headline">Wi-Fi</span></span><span class="m3e-list-item__trailing">${toggle(true)}</span></div>` +
        `<div class="m3e-list-item m3e-list-item--segmented" data-value="bt"><span class="m3e-list-item__content"><span class="m3e-list-item__headline">Bluetooth</span></span><span class="m3e-list-item__trailing">${toggle(false)}</span></div>` +
        '</m3e-list>',
    );
    expect(contract(host.querySelector('.m3e-list')!)).toBe(
      contract(react.querySelector('.m3e-list')!),
    );
  });
});
