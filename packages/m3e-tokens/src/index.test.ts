import { describe, expect, it } from 'vitest';
import { filledButtonTokens, switchTokens } from './components.js';
import { elevation, motion, shape, space, state, typescale } from './index.js';

describe('@kyralabs/m3e-tokens', () => {
  it('exports system tokens as plain values', () => {
    expect(motion.defaultScheme).toBe('expressive');
    expect(motion.springs.expressive.fastSpatial).toEqual({ dampingRatio: 0.6, stiffness: 800 });
    expect(motion.springs.standard.defaultEffects).toEqual({ dampingRatio: 1, stiffness: 1600 });
    expect(elevation.level5).toBe(12);
    expect(shape.cornerFull).toBe(Number.POSITIVE_INFINITY);
    expect(shape.cornerLargeTop).toEqual({ startStart: 16, startEnd: 16, endEnd: 0, endStart: 0 });
    expect(state.hoverStateLayerOpacity).toBe(0.08);
    expect(state.focusIndicator).toEqual({ thickness: 3, outerOffset: 2, innerOffset: -3 });
    expect(space.space100).toBe(8);
    expect(typescale.labelLargeEmphasized).toEqual({
      font: 'plain',
      lineHeight: 20,
      size: 14,
      tracking: 0.1,
      weight: 700,
    });
  });

  it('exports component tokens with states last and references as var() strings', () => {
    expect(filledButtonTokens.containerColor).toBe('var(--m3e-sys-color-primary)');
    expect(filledButtonTokens.containerOpacityDisabled).toBe(0.1);
    expect(Object.keys(switchTokens).length).toBeGreaterThan(0);
  });
});
