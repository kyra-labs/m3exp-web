import { describe, expect, it } from 'vitest';
import { hexToHue, hueToHex } from './color';

describe('hero seed colors', () => {
  it.each([0, 45, 120, 200, 256, 300, 359])('round-trips hue %i', (hue) => {
    expect(hueToHex(hue)).toMatch(/^#[0-9a-f]{6}$/);
    expect(Math.round(hexToHue(hueToHex(hue)))).toBe(hue);
  });

  it('wraps out-of-range hues', () => {
    expect(hueToHex(360)).toBe(hueToHex(0));
    expect(hueToHex(-90)).toBe(hueToHex(270));
  });

  it('reads the hue of a grey as 0', () => {
    expect(hexToHue('#808080')).toBe(0);
  });
});
