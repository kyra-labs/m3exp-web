import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { renderReact } from '../test/parity.js';
import { AssistChip } from './AssistChip.js';

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

describe('<AssistChip>', () => {
  it('renders the m3e-css contract (default flat, label wrapper)', async () => {
    const chip = (await renderReact(<AssistChip>Add to calendar</AssistChip>)).querySelector(
      'button',
    )!;
    expect(chip.className).toBe('m3e-assist-chip');
    expect(chip.getAttribute('type')).toBe('button');
    expect(chip.hasAttribute('data-ripple')).toBe(true);
    expect(chip.innerHTML).toBe('<span class="m3e-assist-chip__label">Add to calendar</span>');
  });

  it('elevated variant and icons around the label', async () => {
    const chip = (
      await renderReact(
        <AssistChip
          variant="elevated"
          leadingIcon={<Icon name="event" />}
          trailingIcon={<Icon name="arrow_drop_down" />}
        >
          Schedule
        </AssistChip>,
      )
    ).querySelector('button')!;
    expect(chip.className).toBe('m3e-assist-chip m3e-assist-chip--elevated');
    expect([...chip.children].map((c) => c.className)).toEqual([
      'm3e-icon',
      'm3e-assist-chip__label',
      'm3e-icon',
    ]);
  });

  it('calls onPress and shows the pressed state while held', async () => {
    const onPress = vi.fn();
    const chip = (await renderReact(<AssistChip onPress={onPress}>Go</AssistChip>)).querySelector(
      'button',
    )!;
    await act(async () => {
      chip.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
      await Promise.resolve();
    });
    expect(chip.hasAttribute('data-pressed')).toBe(true);
    await press(chip);
    expect(onPress).toHaveBeenCalled();
  });

  it('renders a link with href', async () => {
    const a = (await renderReact(<AssistChip href="/maps">Directions</AssistChip>)).querySelector(
      'a',
    )!;
    expect(a.getAttribute('href')).toBe('/maps');
    expect(a.className).toBe('m3e-assist-chip');
  });

  it('disables natively, or keeps focus with focusableWhenDisabled', async () => {
    const onPress = vi.fn();
    const container = await renderReact(
      <>
        <AssistChip isDisabled onPress={onPress}>
          A
        </AssistChip>
        <AssistChip isDisabled focusableWhenDisabled onPress={onPress}>
          B
        </AssistChip>
      </>,
    );
    const [native, soft] = [...container.querySelectorAll('button')];
    expect(native!.disabled).toBe(true);
    expect(soft!.disabled).toBe(false);
    expect(soft!.getAttribute('aria-disabled')).toBe('true');
    await press(soft!);
    expect(onPress).not.toHaveBeenCalled();
  });
});
