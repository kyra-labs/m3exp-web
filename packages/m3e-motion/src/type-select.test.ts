import { describe, expect, it } from 'vitest';
import { typeSelectTarget } from './type-select.js';

describe('typeSelectTarget (React Aria ListKeyboardDelegate.getKeyForSearch)', () => {
  const texts = ['Apple', 'banana', 'Avocado', '', 'Ápricot'];

  it('searches from the focused item to the end, then from the start', () => {
    expect(typeSelectTarget(texts, -1, 'a')).toBe(0);
    expect(typeSelectTarget(texts, 1, 'a')).toBe(2);
    expect(typeSelectTarget(texts, 0, 'a')).toBe(0);
    expect(typeSelectTarget(texts, 3, 'b')).toBe(1);
  });

  it('ignores case and accents; empty texts never match; −1 when nothing does', () => {
    expect(typeSelectTarget(texts, 3, 'ap')).toBe(4);
    expect(typeSelectTarget(texts, 0, 'BAN')).toBe(1);
    expect(typeSelectTarget(texts, 0, 'z')).toBe(-1);
    expect(typeSelectTarget([], -1, 'a')).toBe(-1);
  });
});
