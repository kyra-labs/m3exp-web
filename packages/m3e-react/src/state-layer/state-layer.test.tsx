import { rippleStyle as elementRippleStyle } from '@kyralabs/m3e-elements';
import { act } from 'react';
import { mergeProps, usePress } from 'react-aria';
import { afterEach, describe, expect, it } from 'vitest';
import { renderReact } from '../test/parity.js';
import { rippleStyle, useStateLayer } from './useStateLayer.js';

afterEach(() => {
  document.body.innerHTML = '';
});

function Pressable() {
  const { stateLayerProps, onPressStart, onPressEnd } = useStateLayer();
  const { pressProps } = usePress({ onPressStart, onPressEnd });
  return (
    <button type="button" className="m3e-state-layer" {...mergeProps(pressProps, stateLayerProps)}>
      Press
    </button>
  );
}

describe('useStateLayer', () => {
  it('matches the element ripple geometry', () => {
    for (const point of [null, { x: 0, y: 0 }, { x: 12.345, y: 30 }]) {
      expect(rippleStyle(120, 40, point)).toEqual(elementRippleStyle(120, 40, point));
    }
  });

  it('writes data-ripple, then data-pressed and the ripple origin while pressed', async () => {
    const button = (await renderReact(<Pressable />)).querySelector('button')!;
    expect(button.hasAttribute('data-ripple')).toBe(true);
    expect(button.hasAttribute('data-pressed')).toBe(false);
    await act(async () => {
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 5,
          clientY: 7,
        }),
      );
      await Promise.resolve();
    });
    expect(button.hasAttribute('data-pressed')).toBe(true);
    expect(button.style.getPropertyValue('--_m3e-ripple-x')).toBe('5px');
    await act(async () => {
      button.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
          clientX: 5,
          clientY: 7,
        }),
      );
      // React Aria ends a pointer press on the click that follows pointerup.
      button.click();
      await Promise.resolve();
    });
    expect(button.hasAttribute('data-pressed')).toBe(false);
  });
});
