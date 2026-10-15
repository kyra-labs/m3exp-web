import '@kyralabs/m3e-elements/menu.js';
import '@kyralabs/m3e-elements/split-button.js';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { Menu, MenuItem } from '../menu/Menu.js';
import { canonical, renderElement, renderReact } from '../test/parity.js';
import { SplitButton } from './SplitButton.js';

let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const click = async (el: Element) => {
  await act(async () => {
    const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
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

function Example(props: { onPress?: () => void; onAction?: (key: unknown) => void }) {
  return (
    <SplitButton
      variant="tonal"
      size="m"
      icon={<Icon name="save" />}
      menuLabel="More save options"
      {...(props.onPress ? { onPress: props.onPress } : {})}
      menu={
        <Menu {...(props.onAction ? { onAction: props.onAction } : {})}>
          <MenuItem id="draft">Save as draft</MenuItem>
          <MenuItem id="copy">Save a copy</MenuItem>
        </Menu>
      }
    >
      Save
    </SplitButton>
  );
}

const parts = (root: ParentNode = document) => {
  const [leading, trailing] = root.querySelectorAll<HTMLButtonElement>(
    '.m3e-split-button > button',
  );
  return { leading: leading!, trailing: trailing! };
};

describe('<SplitButton>', () => {
  it('renders the m3e-css contract: leading and trailing .m3e-button parts', async () => {
    const container = await renderReact(<Example />);
    const root = container.querySelector('.m3e-split-button')!;
    const { leading, trailing } = parts();
    expect(root.children).toHaveLength(2);
    expect(leading.className).toBe(
      'm3e-button m3e-button--tonal m3e-button--size-m m3e-button--round m3e-split-button__leading',
    );
    expect(trailing.className).toBe(
      'm3e-button m3e-button--tonal m3e-button--size-m m3e-button--round m3e-split-button__trailing',
    );
    expect(leading.textContent).toBe('saveSave');
    expect(trailing.getAttribute('aria-label')).toBe('More save options');
    expect(trailing.getAttribute('aria-haspopup')).toBe('true');
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
    expect(trailing.querySelector('.m3e-icon')!.textContent).toBe('keyboard_arrow_down');
    expect(trailing.hasAttribute('data-spring')).toBe(true);
  });

  it('the leading button calls onPress; the trailing button toggles the menu', async () => {
    const onPress = vi.fn();
    await renderReact(<Example onPress={onPress} />);
    const { leading, trailing } = parts();
    await click(leading);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.m3e-menu')).toBeNull();
    await click(trailing);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(trailing.getAttribute('aria-expanded')).toBe('true');
    const menu = document.querySelector('.m3e-menu')!;
    expect(trailing.getAttribute('aria-controls')).toBe(menu.id);
    await click(trailing);
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
  });

  it('ArrowDown opens on the first item; Escape closes and returns focus to the trailing button', async () => {
    const onAction = vi.fn();
    await renderReact(<Example onAction={onAction} />);
    const { trailing } = parts();
    act(() => {
      trailing.focus();
    });
    await key('ArrowDown', trailing);
    const first = document.querySelector<HTMLElement>('.m3e-menu__item')!;
    expect(document.activeElement).toBe(first);
    await key('Escape', first);
    expect(trailing.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trailing);
  });

  it('isDisabled disables both buttons', async () => {
    await renderReact(
      <SplitButton
        isDisabled
        menuLabel="More"
        menu={
          <Menu>
            <MenuItem id="a">A</MenuItem>
          </Menu>
        }
      >
        Send
      </SplitButton>,
    );
    const { leading, trailing } = parts();
    expect(leading.disabled && trailing.disabled).toBe(true);
    await click(trailing);
    expect(document.querySelector('.m3e-menu')).toBeNull();
  });
});

/** Canonical DOM of a `.m3e-split-button`, with generated ids and React Aria markers normalized. */
function contract(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    el.removeAttribute('data-react-aria-pressable');
    el.removeAttribute('style');
    if (el.hasAttribute('id')) el.setAttribute('id', 'id');
  }
  return canonical(clone);
}

describe('<SplitButton> ⇔ <m3e-split-button> DOM parity', () => {
  it('render the same contract (closed)', async () => {
    const react = await renderReact(<Example />);
    const host = await renderElement(`
      <m3e-split-button variant="tonal" size="m" icon="save" label="Save" menu-label="More save options">
        <m3e-menu><m3e-menu-item value="draft">Save as draft</m3e-menu-item></m3e-menu>
      </m3e-split-button>`);
    await act(async () => {
      await Promise.resolve();
    });
    const reactRoot = react.querySelector('.m3e-split-button')!;
    const elementRoot = host.querySelector(':scope > .m3e-split-button')!;
    expect(contract(elementRoot)).toBe(contract(reactRoot));
  });

  it('render the same contract (disabled, extra large, custom trailing icon)', async () => {
    const react = await renderReact(
      <SplitButton
        size="xl"
        variant="outlined"
        isDisabled
        menuLabel="More"
        trailingIcon={<Icon name="expand_more" />}
        menu={
          <Menu>
            <MenuItem id="a">A</MenuItem>
          </Menu>
        }
      >
        Send
      </SplitButton>,
    );
    const host = await renderElement(`
      <m3e-split-button size="xl" variant="outlined" disabled label="Send" menu-label="More" trailing-icon="expand_more">
        <m3e-menu><m3e-menu-item>A</m3e-menu-item></m3e-menu>
      </m3e-split-button>`);
    await act(async () => {
      await Promise.resolve();
    });
    expect(contract(host.querySelector(':scope > .m3e-split-button')!)).toBe(
      contract(react.querySelector('.m3e-split-button')!),
    );
  });
});
