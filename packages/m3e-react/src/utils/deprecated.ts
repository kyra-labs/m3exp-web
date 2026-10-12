const warned = new Set<string>();
// Bundlers replace `process.env.NODE_ENV`; without one it is undefined and the check stays on.
declare const process: { env: { NODE_ENV?: string } } | undefined;
// eslint-disable-next-line @typescript-eslint/prefer-optional-chain -- `process?.env` would not match bundler defines
const isDev = () => typeof process === 'undefined' || process.env.NODE_ENV !== 'production';

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
