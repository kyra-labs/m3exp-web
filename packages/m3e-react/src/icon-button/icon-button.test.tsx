import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { renderReact } from '../test/parity.js';
import { IconButton, IconToggleButton } from './IconButton.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
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

describe('<IconButton>', () => {
  it('renders the m3e-css contract (defaults standard / s / default width / round)', async () => {
    const button = (
      await renderReact(
        <IconButton aria-label="Favorite">
          <Icon name="favorite" />
        </IconButton>,
      )
    ).querySelector('button')!;
    expect(button.className).toBe(
      'm3e-icon-button m3e-icon-button--standard m3e-icon-button--size-s m3e-icon-button--width-default m3e-icon-button--round',
    );
    expect(button.getAttribute('aria-label')).toBe('Favorite');
    expect(button.hasAttribute('aria-pressed')).toBe(false);
  });

  it('maps every style prop', async () => {
    const button = (
      await renderReact(
        <IconButton
          aria-label="Edit"
          variant="outlined"
          vibrant
          size="xl"
          width="wide"
          shape="square"
        >
          <Icon name="edit" />
        </IconButton>,
      )
    ).querySelector('button')!;
    expect(button.className).toBe(
      'm3e-icon-button m3e-icon-button--outlined m3e-icon-button--vibrant m3e-icon-button--size-xl m3e-icon-button--width-wide m3e-icon-button--square',
    );
  });

  it('becomes a toggle with isSelected / defaultSelected', async () => {
    const onChange = vi.fn();
    const button = (
      await renderReact(
        <IconButton aria-label="Bookmark" defaultSelected={false} onChange={onChange}>
          <Icon name="bookmark" />
        </IconButton>,
      )
    ).querySelector('button')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await press(button);
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('warns once in development when the icon button has no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await renderReact(
      <>
        <IconToggleButton>
          <Icon name="star" />
        </IconToggleButton>
        <IconToggleButton>
          <Icon name="star" />
        </IconToggleButton>
      </>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('needs an aria-label');
  });
});
