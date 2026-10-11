import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { renderReact } from '../test/parity.js';
import { Button } from './Button.js';
import { ToggleButton } from './ToggleButton.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const press = async (el: Element) => {
  await act(async () => {
    const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
    (el as HTMLElement).click();
    await Promise.resolve();
  });
};

describe('<Button>', () => {
  it('renders the m3e-css contract (defaults filled / s / round)', async () => {
    const button = (await renderReact(<Button>Save</Button>)).querySelector('button')!;
    expect(button.className).toBe(
      'm3e-button m3e-button--filled m3e-button--size-s m3e-button--round',
    );
    expect(button.getAttribute('type')).toBe('button');
    expect(button.hasAttribute('data-ripple')).toBe(true);
    expect(button.hasAttribute('data-spring')).toBe(true);
    expect(button.textContent).toBe('Save');
  });

  it('places icons around the label', async () => {
    const button = (
      await renderReact(
        <Button
          variant="tonal"
          size="xl"
          shape="square"
          icon={<Icon name="add" />}
          trailingIcon={<Icon name="star" />}
        >
          Add
        </Button>,
      )
    ).querySelector('button')!;
    expect(button.className).toContain('m3e-button--tonal m3e-button--size-xl m3e-button--square');
    expect([...button.childNodes].map((n) => n.textContent)).toEqual(['add', 'Add', 'star']);
  });

  it('calls onPress', async () => {
    const onPress = vi.fn();
    const button = (await renderReact(<Button onPress={onPress}>Go</Button>)).querySelector(
      'button',
    )!;
    await press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a link with href', async () => {
    const a = (
      await renderReact(
        <Button href="/contact" variant="text">
          Contact
        </Button>,
      )
    ).querySelector('a')!;
    expect(a.getAttribute('href')).toBe('/contact');
    expect(a.className).toContain('m3e-button--text');
  });

  it('disables natively, or keeps focus with focusableWhenDisabled', async () => {
    const onPress = vi.fn();
    const container = await renderReact(
      <>
        <Button isDisabled onPress={onPress}>
          A
        </Button>
        <Button isDisabled focusableWhenDisabled onPress={onPress}>
          B
        </Button>
      </>,
    );
    const [hard, soft] = [...container.querySelectorAll('button')];
    expect(hard!.disabled).toBe(true);
    expect(soft!.disabled).toBe(false);
    expect(soft!.getAttribute('aria-disabled')).toBe('true');
    await press(soft!);
    expect(onPress).not.toHaveBeenCalled();
    expect(soft!.hasAttribute('data-pressed')).toBe(false);
  });
});

describe('<ToggleButton>', () => {
  it('toggles aria-pressed and reports changes', async () => {
    const onChange = vi.fn();
    const button = (
      await renderReact(<ToggleButton onChange={onChange}>Bold</ToggleButton>)
    ).querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await press(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(onChange).toHaveBeenLastCalledWith(true);
    await press(button);
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports controlled selection', async () => {
    const button = (
      await renderReact(
        <ToggleButton isSelected variant="outlined">
          Pin
        </ToggleButton>,
      )
    ).querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    await press(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});
