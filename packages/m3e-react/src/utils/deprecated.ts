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
