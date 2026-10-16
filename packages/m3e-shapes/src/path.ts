// Minimal path model standing in for Compose's `Path` in the ShapeUtil/MaterialShapes ports: an
// ordered command list (absolute coordinates) that serializes to an SVG `d` attribute.
import type { Matrix } from './matrix.js';

export type PathCommand =
  | readonly ['M', number, number]
  | readonly ['L', number, number]
  | readonly ['Q', number, number, number, number]
  | readonly ['C', number, number, number, number, number, number]
  | readonly ['Z'];

const mapPoints = (
  command: PathCommand,
  f: (x: number, y: number) => readonly [number, number],
): PathCommand => {
  switch (command[0]) {
    case 'M':
    case 'L':
      return [command[0], ...f(command[1], command[2])];
    case 'Q':
      return ['Q', ...f(command[1], command[2]), ...f(command[3], command[4])];
    case 'C':
      return [
        'C',
        ...f(command[1], command[2]),
        ...f(command[3], command[4]),
        ...f(command[5], command[6]),
      ];
    case 'Z':
      return command;
  }
};

/** Compose `Path.transform(matrix)`: maps every point. */
export const transformPath = (path: readonly PathCommand[], matrix: Matrix): PathCommand[] =>
  path.map((command) => mapPoints(command, (x, y) => matrix.map(x, y)));

/** Compose `Path.translate(offset)`. */
export const translatePath = (
  path: readonly PathCommand[],
  dx: number,
  dy: number,
): PathCommand[] => path.map((command) => mapPoints(command, (x, y) => [x + dx, y + dy]));

/**
 * Compose `Path.getBounds()`: `[left, top, right, bottom]` over every point, control points
 * included (Skia's `SkPath::getBounds`). Empty paths give `[0, 0, 0, 0]`.
 */
export function pathBounds(path: readonly PathCommand[]): [number, number, number, number] {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const command of path) {
    for (let i = 1; i + 1 < command.length; i += 2) {
      const x = command[i] as number;
      const y = command[i + 1] as number;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return left === Infinity ? [0, 0, 0, 0] : [left, top, right, bottom];
}

const formatNumber = (value: number, fractionDigits: number): string => {
  const fixed = value.toFixed(fractionDigits);
  const text = fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed;
  return text === '-0' ? '0' : text;
};

/**
 * Serializes a path to an SVG `d` attribute with absolute commands. [fractionDigits] bounds the
 * decimals per number (trailing zeros dropped).
 */
export function toSvgPathData(path: readonly PathCommand[], fractionDigits = 4): string {
  return path
    .map(([verb, ...values]) =>
      values.length === 0
        ? verb
        : `${verb}${values.map((v) => formatNumber(v, fractionDigits)).join(' ')}`,
    )
    .join('');
}
