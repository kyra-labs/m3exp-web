import { describe, expect, it } from 'vitest';
import {
  BADGE_DOT_LABEL,
  BADGE_MAX_COUNT,
  badgeLabelText,
  badgeText,
  badgeValueText,
} from './badge.js';

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

describe('badgeValueText / badgeLabelText (badges built into destinations and tabs)', () => {
  it('reads the dot, counts and text', () => {
    expect(badgeValueText(true)).toBeNull();
    expect(badgeValueText('')).toBeNull();
    expect(badgeValueText(8)).toBe('8');
    expect(badgeValueText(1000)).toBe('999+');
    expect(badgeValueText('1000')).toBe('999+');
    expect(badgeValueText(' 42 ')).toBe('42');
    expect(badgeValueText('12', 9)).toBe('9+');
    expect(badgeValueText('New')).toBe('New');
    expect(badgeValueText('-3')).toBe('-3');
  });

  it('labels the dot "New notification" and a count with its text, unless told otherwise', () => {
    expect(badgeLabelText(null)).toBe(BADGE_DOT_LABEL);
    expect(badgeLabelText('999+')).toBe('999+');
    expect(badgeLabelText('8', '8 unread')).toBe('8 unread');
    expect(badgeLabelText(null, '')).toBe('');
    expect(badgeLabelText('8', null)).toBe('8');
  });
});
