import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderReact } from '../test/parity.js';
import { Card, CardAction } from './Card.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('<Card>', () => {
  it('renders the m3e-css contract (default filled, non-interactive)', async () => {
    const card = (await renderReact(<Card as="article">Body</Card>)).firstElementChild!;
    expect(card.tagName).toBe('ARTICLE');
    expect(card.className).toBe('m3e-card m3e-card--filled');
    expect(card.hasAttribute('data-ripple')).toBe(false);
  });

  it('becomes interactive with a CardAction and drives the card state layer', async () => {
    const onPress = vi.fn();
    const container = await renderReact(
      <Card variant="elevated">
        <h3>
          <CardAction onPress={onPress}>Open</CardAction>
        </h3>
      </Card>,
    );
    const card = container.firstElementChild!;
    const action = card.querySelector('button')!;
    expect(card.className).toBe('m3e-card m3e-card--elevated m3e-card--interactive');
    expect(card.hasAttribute('data-ripple')).toBe(true);
    expect(action.className).toBe('m3e-card__action');
    await act(async () => {
      const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };
      action.dispatchEvent(new PointerEvent('pointerdown', init));
      await Promise.resolve();
    });
    expect(card.hasAttribute('data-pressed')).toBe(true);
    await act(async () => {
      const init = { bubbles: true, button: 0, pointerId: 1, pointerType: 'mouse' };
      action.dispatchEvent(new PointerEvent('pointerup', init));
      action.click();
      await Promise.resolve();
    });
    expect(card.hasAttribute('data-pressed')).toBe(false);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders link actions and marks disabled actions', async () => {
    const container = await renderReact(
      <>
        <Card variant="outlined">
          <CardAction href="/place">Place</CardAction>
        </Card>
        <Card>
          <CardAction isDisabled>Unavailable</CardAction>
        </Card>
      </>,
    );
    expect(container.querySelector('a')!.getAttribute('href')).toBe('/place');
    expect(container.querySelector('button')!.getAttribute('aria-disabled')).toBe('true');
  });

  it('requires a Card around CardAction', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderReact(<CardAction>Lost</CardAction>)).rejects.toThrow('inside a <Card>');
    error.mockRestore();
  });
});
