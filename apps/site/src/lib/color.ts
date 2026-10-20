// Hue ↔ seed color for the home page hero's hue slider. The seed only picks the hue: Material
// Color Utilities (createTheme) derives every tone and chroma from it.

const SATURATION = 0.55;
const LIGHTNESS = 0.45;
const HUE_SECTOR = 60;
const FULL_TURN = 360;
const BYTE = 255;

const byteHex = (unit: number) =>
  Math.round(unit * BYTE)
    .toString(16)
    .padStart(2, '0');

/** HSL (fixed saturation and lightness) → `#rrggbb`. */
export function hueToHex(hue: number): string {
  const c = (1 - Math.abs(2 * LIGHTNESS - 1)) * SATURATION;
  const h = (((hue % FULL_TURN) + FULL_TURN) % FULL_TURN) / HUE_SECTOR;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const [r, g, b] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  const m = LIGHTNESS - c / 2;
  return `#${byteHex(r + m)}${byteHex(g + m)}${byteHex(b + m)}`;
}

/** `#rrggbb` → its HSL hue in degrees. */
export function hexToHue(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & BYTE) / BYTE;
  const g = ((n >> 8) & BYTE) / BYTE;
  const b = (n & BYTE) / BYTE;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const sector = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (sector * HUE_SECTOR + FULL_TURN) % FULL_TURN;
}
