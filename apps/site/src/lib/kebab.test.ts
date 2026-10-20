import { describe, expect, it } from 'vitest';
import { kebab } from './kebab';

describe('kebab', () => {
  it('turns token object keys into custom property names', () => {
    expect(kebab('surfaceContainerHigh')).toBe('surface-container-high');
    expect(kebab('onPrimary')).toBe('on-primary');
    expect(kebab('cornerExtraLargeIncreased')).toBe('corner-extra-large-increased');
    expect(kebab('level0')).toBe('level0');
    expect(kebab('primary')).toBe('primary');
  });
});
