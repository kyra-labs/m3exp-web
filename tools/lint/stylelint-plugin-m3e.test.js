import { fileURLToPath } from 'node:url';
import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
// Rules that implement CLAUDE.md "Tokens only" and Naming; stylistic rules are out of scope here.
const TOKEN_RULES = new Set([
  'color-no-hex',
  'color-named',
  'function-disallowed-list',
  'unit-disallowed-list',
  'm3e/no-literal-values',
  'custom-property-pattern',
  'selector-class-pattern',
]);

/** Lints `code` as if it were a component file in m3e-css. */
const lint = async (code) => {
  const { results } = await stylelint.lint({
    code,
    codeFilename: `${root}packages/m3e-css/src/example.css`,
    configFile: `${root}stylelint.config.js`,
  });
  return results[0].warnings.map((w) => w.rule).filter((r) => TOKEN_RULES.has(r));
};

describe('stylelint: no literal values in component CSS', () => {
  it.each([
    ['.m3e-button { color: var(--m3e-sys-color-primary); }'],
    [
      '.m3e-button { --_radius: var(--m3e-comp-button-container-shape); border-radius: var(--_radius); }',
    ],
    ['.m3e-button { inline-size: 100%; margin: 0; flex: 1; z-index: 1; opacity: 1; }'],
    ['.m3e-button { margin-inline: calc(var(--m3e-sys-spacing-4) * -1); }'],
    ['.m3e-button { font-family: var(--m3e-ref-typeface-brand); }'],
    [
      '.m3e-button { transition: background-color var(--m3e-sys-motion-duration) var(--m3e-sys-motion-easing); }',
    ],
    ['@media (width >= 600px) { .m3e-button { display: block; } }'],
    ['@media (forced-colors: active) { .m3e-button { outline-color: CanvasText; } }'],
    [
      '.m3e-button { background: color-mix(in srgb, var(--m3e-sys-color-primary) calc(var(--m3e-sys-state-hover-state-layer-opacity) * 100%), transparent); }',
    ],
    ['.m3e-button { border-radius: calc(var(--m3e-comp-button-small-container-height) / 2); }'],
  ])('accepts %s', async (code) => {
    expect(await lint(code)).toEqual([]);
  });

  it.each([
    ['.m3e-button { color: #6750a4; }', 'color-no-hex'],
    ['.m3e-button { color: rebeccapurple; }', 'color-named'],
    ['.m3e-button { color: rgb(0 0 0); }', 'function-disallowed-list'],
    [
      '.m3e-button { transition-timing-function: cubic-bezier(0.2, 0, 0, 1); }',
      'function-disallowed-list',
    ],
    ['.m3e-button { border-radius: 12px; }', 'unit-disallowed-list'],
    ['.m3e-button { transition-duration: 200ms; }', 'unit-disallowed-list'],
    ['.m3e-button { padding: 1rem; }', 'unit-disallowed-list'],
    ['.m3e-button { opacity: 0.38; }', 'm3e/no-literal-values'],
    [
      '.m3e-button { padding-inline: calc(var(--m3e-sys-spacing-4) * 2); }',
      'm3e/no-literal-values',
    ],
    ['.m3e-button { font-weight: 500; }', 'm3e/no-literal-values'],
    ['.m3e-button { inline-size: calc(var(--m3e-sys-space-100) / 3); }', 'm3e/no-literal-values'],
    ['.m3e-button { --_half: 2; }', 'm3e/no-literal-values'],
    ['.m3e-button { transform: scale(0.95); }', 'm3e/no-literal-values'],
    ['.m3e-button { --_opacity: 0.12; }', 'm3e/no-literal-values'],
    ['.m3e-button { font-family: "Google Sans Flex", sans-serif; }', 'm3e/no-literal-values'],
    ['.m3e-icon { font-variation-settings: "FILL" 1; }', 'm3e/no-literal-values'],
    [
      '.m3e-button { transition: opacity var(--m3e-sys-motion-duration) ease-in-out; }',
      'm3e/no-literal-values',
    ],
    ['.m3e-button { color: var(--md-sys-color-primary); }', 'm3e/no-literal-values'],
    ['.m3e-button { color: var(--m3e-sys-color-primary, var(--other)); }', 'm3e/no-literal-values'],
    [
      '.m3e-button { background: color-mix(in srgb, var(--m3e-sys-color-primary) 8%, transparent); }',
      'm3e/no-literal-values',
    ],
    ['.m3e-button { color: var(--m3e-sys-color-primary, #fff); }', 'color-no-hex'],
  ])('rejects %s', async (code, rule) => {
    expect(await lint(code)).toContain(rule);
  });

  it('enforces the class naming pattern', async () => {
    expect(await lint('.button { display: block; }')).toContain('selector-class-pattern');
    expect(await lint('.m3e-button__label--selected { display: block; }')).toEqual([]);
  });
});
