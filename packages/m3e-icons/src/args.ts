import type { AxisSetting } from './subset.js';

/** `400` → 400; `300..500` → { min: 300, max: 500 }. */
export function parseAxis(value: string): AxisSetting {
  const range = /^(-?\d+(?:\.\d+)?)\.\.(-?\d+(?:\.\d+)?)$/.exec(value);
  if (range) return { min: Number(range[1]), max: Number(range[2]) };
  const n = Number(value);
  if (value.trim() === '' || Number.isNaN(n)) throw new Error(`invalid axis value "${value}"`);
  return n;
}

export function parseNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/#.*$/, ''))
    .flatMap((line) => line.split(','))
    .map((n) => n.trim())
    .filter(Boolean);
}
