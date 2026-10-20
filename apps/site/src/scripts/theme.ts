// The reader's theme choices, shared by the theme menu (chrome.ts) and the home page hero:
// the color mode and a generated seed theme. theme-init.js applies both before first paint.

export type Mode = 'system' | 'light' | 'dark';

const MODE_KEY = 'm3e-site:mode';
const CSS_KEY = 'm3e-site:theme-css';
const SEED_KEY = 'm3e-site:theme-seed';
const STYLE_ID = 'site-theme';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

export function getMode(): Mode {
  const mode = read(MODE_KEY);
  return mode === 'light' || mode === 'dark' ? mode : 'system';
}

export function setMode(mode: Mode): void {
  const root = document.documentElement;
  if (mode === 'system') delete root.dataset.theme;
  else root.dataset.theme = mode;
  write(MODE_KEY, mode === 'system' ? null : mode);
  document.dispatchEvent(new CustomEvent('site-theme-change'));
}

/** The resolved scheme: the forced mode, else the system preference. */
export function isDark(): boolean {
  const mode = getMode();
  if (mode !== 'system') return mode === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

export interface SeedTheme {
  seed: string;
  variant: string;
}

export function getSeedTheme(): SeedTheme | null {
  const raw = read(SEED_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SeedTheme>;
    return typeof value.seed === 'string' && typeof value.variant === 'string'
      ? { seed: value.seed, variant: value.variant }
      : null;
  } catch {
    return null;
  }
}

/** Applies a generated theme's CSS to every page (or removes it with `null`). */
export function setSeedTheme(theme: SeedTheme | null, cssText: string | null): void {
  let style = document.getElementById(STYLE_ID);
  if (cssText === null) {
    style?.remove();
  } else {
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ID;
      document.head.append(style);
    }
    style.textContent = cssText;
  }
  write(CSS_KEY, cssText);
  write(SEED_KEY, theme ? JSON.stringify(theme) : null);
  document.dispatchEvent(new CustomEvent('site-theme-change'));
}
