import { describe, expect, it } from 'vitest';
import { BADGE_DOT_LABEL, BADGE_MAX_COUNT, badgeText } from './badge.js';

// The Compose samples these stand in for (BadgeSamples.kt "8", "999+", "New notification") are
// checked against the vendored file by m3e-codegen's generate.test.ts.
describe('badgeText (owner decision M9 #6)', () => {
  it('writes the count up to max, then <max>+', () => {
    expect(BADGE_MAX_COUNT).toBe(999);
    expect(badgeText(0)).toBe('0');
    expect(badgeText(8)).toBe('8');
    expect(badgeText(999)).toBe('999');
    expect(badgeText(1000)).toBe('999+');
    expect(badgeText(123_456)).toBe('999+');
  });

  it('takes another max; never groups digits; truncates fractions', () => {
    expect(badgeText(10, 9)).toBe('9+');
    expect(badgeText(9, 9)).toBe('9');
    expect(badgeText(1500, 9999)).toBe('1500');
    expect(badgeText(7.9)).toBe('7');
  });
});

describe('BADGE_DOT_LABEL (owner decision M9 #7)', () => {
  it('is the dot description of BadgeSamples.kt NavigationBarItemWithBadge', () => {
    expect(BADGE_DOT_LABEL).toBe('New notification');
  });
});
