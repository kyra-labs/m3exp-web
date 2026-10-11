// Theme CSS writer. No dependency on material-color-utilities, so codegen (baseline theme.css)
// and the runtime (createTheme) share one implementation.
import { motion } from '../generated/sys.js';

/** Color role (camelCase, e.g. `onPrimaryContainer`) → `#rrggbb`. */
export type ColorRoles = Readonly<Record<string, string>>;
export type ThemeMode = 'light' | 'dark' | 'system';
export type MotionScheme = keyof typeof motion.springs;

export interface ThemeCssOptions {
  light?: ColorRoles | undefined;
  dark?: ColorRoles | undefined;
  /** `system` follows `prefers-color-scheme`; `data-theme="light|dark"` on the element overrides it. */
  mode?: ThemeMode;
  /** A single compound selector. Defaults to `:root`. */
  selector?: string;
  /** Wraps the output in `@layer <name>`. Unlayered output beats every layered default. */
  layer?: string;
  /** Points the active-scheme spring aliases at this scheme. Omitted: aliases untouched. */
  motionScheme?: MotionScheme | undefined;
  /** Lines for a leading comment block. */
  comment?: readonly string[];
}

/** `onPrimaryContainer` → `--m3e-sys-color-on-primary-container`. */
export const colorVar = (role: string): string =>
  `--m3e-sys-color-${role.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

const kebab = (camel: string) => camel.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function motionAliases(scheme: MotionScheme): string[] {
  return Object.keys(motion.springs[scheme]).flatMap((token) =>
    ['damping-ratio', 'stiffness'].map(
      (field) =>
        `--m3e-sys-motion-spring-${kebab(token)}-${field}: var(--m3e-sys-motion-spring-${scheme}-${kebab(token)}-${field});`,
    ),
  );
}

const block = (selector: string, lines: readonly string[]): string[] => [
  `${selector} {`,
  ...lines.map((l) => `  ${l}`),
  '}',
];

export function themeCss(options: ThemeCssOptions): string {
  const {
    light,
    dark,
    mode = 'system',
    selector = ':root',
    layer,
    motionScheme,
    comment,
  } = options;
  if (selector.includes(','))
    throw new Error('themeCss: selector must be a single compound selector');
  const colors = (scheme: 'light' | 'dark') => {
    const roles = scheme === 'light' ? light : dark;
    if (!roles) throw new Error(`themeCss: mode "${mode}" needs ${scheme} colors`);
    return [
      `color-scheme: ${scheme};`,
      ...Object.entries(roles).map(([role, hex]) => `${colorVar(role)}: ${hex};`),
    ];
  };
  const base = [
    ...colors(mode === 'dark' ? 'dark' : 'light'),
    ...(motionScheme ? motionAliases(motionScheme) : []),
  ];

  const css: string[] = [...block(selector, base)];
  if (mode === 'system') {
    css.push(
      '@media (prefers-color-scheme: dark) {',
      ...block(`${selector}:not([data-theme="light"])`, colors('dark')).map((l) => `  ${l}`),
      '}',
      ...block(`${selector}[data-theme="dark"]`, colors('dark')),
    );
  }

  const body = layer ? [`@layer ${layer} {`, ...css.map((l) => `  ${l}`), '}'] : css;
  const head = comment?.length ? ['/*', ...comment.map((l) => ` * ${l}`), ' */'] : [];
  return `${[...head, ...body].join('\n')}\n`;
}
