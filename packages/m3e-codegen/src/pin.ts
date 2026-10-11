import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type SourcePin = Readonly<Record<string, string>>;

/** Parses `/SOURCE_PIN` (`key=value` lines, `#` comments). */
export function parsePin(text: string): SourcePin {
  const pin: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z0-9_]+)=(.*)$/.exec(line.trim());
    if (m) pin[m[1]!] = m[2]!;
  }
  return pin;
}

/** Walks up from `from` to the repository root (the directory holding SOURCE_PIN). */
export function findRepoRoot(from: string): string {
  let dir = from;
  while (!existsSync(join(dir, 'SOURCE_PIN'))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error('SOURCE_PIN not found; run from inside the repository');
    dir = parent;
  }
  return dir;
}

export function readPin(root: string): SourcePin {
  return parsePin(readFileSync(join(root, 'SOURCE_PIN'), 'utf8'));
}

export function requirePin(pin: SourcePin, key: string): string {
  const value = pin[key];
  if (!value || value.startsWith('TODO')) throw new Error(`SOURCE_PIN: ${key} is not pinned`);
  return value;
}
