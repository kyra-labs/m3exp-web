import '@kyralabs/m3e-elements/menu.js';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../button/Button.js';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { Menu, MenuItem, MenuSection } from './Menu.js';
import { MenuTrigger } from './MenuTrigger.js';

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
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
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
const items = (root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>('.m3e-menu__item'),
];
const menu = () => document.querySelector<HTMLElement>('.m3e-menu');

function Basic(props: { onAction?: (key: unknown) => void; defaultOpen?: boolean }) {
  return (
    <MenuTrigger {...(props.defaultOpen ? { defaultOpen: true } : {})}>
      <Button>More</Button>
      <Menu {...(props.onAction ? { onAction: props.onAction } : {})}>
        <MenuItem id="edit" icon="edit">
          Edit
        </MenuItem>
        <MenuItem id="share">Share</MenuItem>
        <MenuItem id="off" isDisabled>
          Disabled
        </MenuItem>
        <MenuItem id="settings">Settings</MenuItem>
      </Menu>
    </MenuTrigger>
  );
}

describe('<Menu> inline', () => {
  it('renders the .m3e-menu contract without a popover', async () => {
    const c = await renderReact(
      <Menu aria-label="Actions" variant="baseline">
        <MenuItem id="a">A</MenuItem>
      </Menu>,
    );
    const root = c.querySelector('.m3e-menu')!;
    expect(root.className).toBe('m3e-menu m3e-menu--baseline');
    expect(root.getAttribute('role')).toBe('menu');
    expect(root.hasAttribute('popover')).toBe(false);
    expect(items(c)[0]!.getAttribute('role')).toBe('menuitem');
  });
});

describe('<MenuTrigger> + <Menu>', () => {
  it('a press opens the menu as a popover and the trigger reflects it', async () => {
    const c = await renderReact(<Basic />);
    const trigger = c.querySelector('button')!;
    expect(menu()).toBeNull();
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await press(trigger);
    expect(menu()!.getAttribute('popover')).toBe('manual');
    expect(menu()!.hasAttribute('data-driven')).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(menu()!.id);
    expect(menu()!.getAttribute('aria-labelledby')).toBe(trigger.id);
  });

  it('ArrowDown on the trigger opens on the first item; arrows wrap; typeahead', async () => {
    const c = await renderReact(<Basic />);
    const trigger = c.querySelector('button')!;
    trigger.focus();
    await key('ArrowDown', trigger);
    const [edit, share, , settings] = items();
    expect(document.activeElement).toBe(edit);
    await key('ArrowUp');
    expect(document.activeElement).toBe(settings);
    await key('ArrowDown');
    expect(document.activeElement).toBe(edit);
    await key('s');
    expect(document.activeElement).toBe(share);
  });

  it('Enter activates, closes and returns focus to the trigger; the menu unmounts after', async () => {
    const onAction = vi.fn();
    const c = await renderReact(<Basic onAction={onAction} />);
    const trigger = c.querySelector('button')!;
    trigger.focus();
    await key('ArrowDown', trigger);
    await key('ArrowDown');
    await key('Enter');
    expect(onAction.mock.calls[0]![0]).toBe('share');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    await act(async () => {
      flushFrames();
      await Promise.resolve();
    });
    expect(menu()).toBeNull();
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const c = await renderReact(<Basic />);
    const trigger = c.querySelector('button')!;
    trigger.focus();
    await key('ArrowDown', trigger);
    await key('Escape');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('checkable items (selectionMode multiple) toggle aria-checked and keep the menu open', async () => {
    const onSelectionChange = vi.fn();
    const c = await renderReact(
      <MenuTrigger>
        <Button>Style</Button>
        <Menu selectionMode="multiple" onSelectionChange={onSelectionChange}>
          <MenuItem id="bold" checkedIcon="check">
            Bold
          </MenuItem>
          <MenuItem id="italic">Italic</MenuItem>
        </Menu>
      </MenuTrigger>,
    );
    await press(c.querySelector('button')!);
    const [bold] = items();
    expect(bold!.getAttribute('role')).toBe('menuitemcheckbox');
    expect(bold!.getAttribute('aria-checked')).toBe('false');
    expect(bold!.querySelector('.m3e-menu__item-leading--toggle')).not.toBeNull();
    await press(bold!);
    expect(items()[0]!.getAttribute('aria-checked')).toBe('true');
    expect(menu()).not.toBeNull();
    expect(c.querySelector('button')!.getAttribute('aria-expanded')).toBe('true');
    expect([...(onSelectionChange.mock.calls[0]![0] as Set<string>)]).toEqual(['bold']);
  });

  it('selectable items (selectionMode single) are radios', async () => {
    await renderReact(
      <Menu aria-label="Align" selectionMode="single" defaultSelectedKeys={['left']}>
        <MenuItem id="left">Left</MenuItem>
        <MenuItem id="right">Right</MenuItem>
      </Menu>,
    );
    expect(items().map((i) => [i.getAttribute('role'), i.getAttribute('aria-checked')])).toEqual([
      ['menuitemradio', 'true'],
      ['menuitemradio', 'false'],
    ]);
  });

  it('a submenu opens with ArrowRight and closes with ArrowLeft', async () => {
    const c = await renderReact(
      <MenuTrigger>
        <Button>Format</Button>
        <Menu>
          <MenuItem id="cut">Cut</MenuItem>
          <MenuItem
            id="align"
            trailingIcon="arrow_right"
            submenu={
              <Menu>
                <MenuItem id="left">Left</MenuItem>
                <MenuItem id="right">Right</MenuItem>
              </Menu>
            }
          >
            Align
          </MenuItem>
        </Menu>
      </MenuTrigger>,
    );
    const trigger = c.querySelector('button')!;
    trigger.focus();
    await key('ArrowDown', trigger);
    await key('ArrowDown');
    const align = items()[1]!;
    expect(align.getAttribute('aria-haspopup')).toBe('menu');
    await key('ArrowRight');
    const menus = document.querySelectorAll('.m3e-menu');
    expect(menus).toHaveLength(2);
    expect(align.getAttribute('aria-expanded')).toBe('true');
    expect(align.getAttribute('aria-controls')).toBe(menus[1]!.id);
    expect(document.activeElement).toBe(items(menus[1])[0]);
    await key('ArrowLeft');
    expect(align.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(align);
  });
});

/**
 * Canonical DOM without React Aria's bookkeeping (data-key, data-collection,
 * data-react-aria-pressable), with ids numbered by first appearance and the popup's runtime
 * position/spring values dropped, so only the m3e-css contract is compared.
 */
function contract(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  const ids = new Map<string, string>();
  const idOf = (id: string) => {
    if (!ids.has(id)) ids.set(id, `id${String(ids.size)}`);
    return ids.get(id)!;
  };
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    for (const name of ['data-key', 'data-collection', 'data-react-aria-pressable', 'style']) {
      el.removeAttribute(name);
    }
    for (const name of ['id', 'aria-labelledby', 'aria-describedby', 'aria-controls']) {
      const value = el.getAttribute(name);
      if (value) el.setAttribute(name, value.split(' ').map(idOf).join(' '));
    }
  }
  return canonical(clone);
}

describe('<Menu> ⇔ <m3e-menu> DOM parity', () => {
  it('render the same contract (groups, checkable items, icons, supporting and trailing text)', async () => {
    const react = await renderReact(
      <MenuTrigger defaultOpen>
        <Button>More</Button>
        <Menu variant="vibrant" selectionMode="multiple" defaultSelectedKeys={['bold']}>
          <MenuSection title="Style" divider>
            <MenuItem id="edit" icon="edit" supportingText="Edit mode" trailingText="⌘E">
              Edit
            </MenuItem>
            <MenuItem id="bold" checkedIcon="check">
              Bold
            </MenuItem>
          </MenuSection>
          <MenuSection aria-label="More">
            <MenuItem id="off" isDisabled trailingIcon="arrow_right">
              Off
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuTrigger>,
    );
    const host = await renderElement(`
      <m3e-menu variant="vibrant" label="x">
        <m3e-menu-group label="Style" divider>
          <m3e-menu-item type="checkbox" icon="edit" supporting-text="Edit mode" trailing-text="⌘E">Edit</m3e-menu-item>
          <m3e-menu-item type="checkbox" checked-icon="check" checked>Bold</m3e-menu-item>
        </m3e-menu-group>
        <m3e-menu-group aria-label="More">
          <m3e-menu-item type="checkbox" disabled trailing-icon="arrow_right">Off</m3e-menu-item>
        </m3e-menu-group>
      </m3e-menu>`);
    const reactMenu = react.querySelector('.m3e-menu')!;
    const elementMenu = host.querySelector('.m3e-menu')!;
    // Labelling differs by setup only (trigger vs label attribute).
    reactMenu.removeAttribute('aria-labelledby');
    elementMenu.removeAttribute('aria-label');
    // Focus state differs (React Aria focused the selected item on open).
    for (const el of [reactMenu, elementMenu, ...items(reactMenu), ...items(elementMenu)]) {
      if (el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    }
    reactMenu.removeAttribute('data-driven');
    reactMenu.removeAttribute('data-positioned');
    expect(contract(elementMenu)).toBe(contract(reactMenu));
  });
});
