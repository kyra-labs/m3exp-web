import { isDev } from './dev.js';

const warned = new Set<string>();

/**
 * D4: a deprecated component warns once per page load (dev only) and names its replacement.
 * Deprecated components ship until 2.0 and get no new features.
 */
export function warnDeprecated(component: string, replacement: string): void {
  if (!isDev() || warned.has(component)) return;
  warned.add(component);
  console.warn(
    `[m3exp-web] <${component}> is deprecated (DECISIONS D4) and will be removed in 2.0. Use <${replacement}>.`,
  );
}

/**
 * D16: a deprecated prop (or prop value) of a supported component warns once per page load (dev
 * only) and names its replacement. 1.x keeps the old name working; 2.0 removes it.
 * `usage` and `replacement` are JSX fragments such as `FabMenu open` and `FabMenu isOpen`.
 */
export function warnDeprecatedProp(usage: string, replacement: string, since = '1.8'): void {
  if (!isDev() || warned.has(usage)) return;
  warned.add(usage);
  console.warn(
    `[m3exp-web] <${usage}> is deprecated since ${since} and will be removed in 2.0. Use <${replacement}>.`,
  );
}
