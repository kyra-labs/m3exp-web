import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import m3e from './tools/lint/eslint-plugin-m3e.js';

const TEST_FILES = ['**/*.test.{ts,tsx,js}', 'apps/visual/**'];

export default defineConfig(
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/.astro/',
    '**/coverage/',
    '**/.dts/',
    'packages/m3e-tokens/src/generated/',
    // Vendored upstream sources (Material Web's dialog animations are JavaScript), read only.
    'packages/m3e-codegen/vendor/',
    'apps/visual/test-results/',
    'apps/visual/playwright-report/',
    'apps/site/src/generated/',
    'apps/site/test-results/',
    'apps/site/playwright-report/',
    'apps/site/lighthouse/',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'apps/site/src/**/*.{ts,tsx,js}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      'packages/m3e-codegen/**',
      'packages/m3e-icons/**',
      '**/*.config.ts',
      '*.ts',
      'tools/**',
    ],
    languageOptions: { globals: globals.node },
  },
  // Build-time parsers and tests index regex capture groups the match guarantees.
  {
    files: ['packages/m3e-codegen/src/**/*.ts', 'packages/m3e-icons/src/**/*.ts', ...TEST_FILES],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  // m3e-shapes ports Kotlin line for line (D9); its array indexing keeps upstream's shape and is
  // bounds-checked by construction, as Kotlin's IndexOutOfBounds would be.
  {
    files: ['packages/m3e-shapes/src/**/*.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  // CLAUDE.md "Tokens only". Codegen emits literal values from pinned sources, so it is exempt;
  // m3e-shapes carries pinned unit-space geometry (MaterialShapes.kt), not design values.
  {
    files: ['packages/*/src/**/*.{ts,tsx}', 'apps/site/src/**/*.{ts,tsx}'],
    ignores: [...TEST_FILES, 'packages/m3e-codegen/**', 'packages/m3e-shapes/**'],
    plugins: { m3e },
    rules: { 'm3e/no-literal-values': 'error' },
  },
  // The site's examples of deprecated components (D4) use them on purpose.
  {
    files: ['apps/site/src/examples/segmented-button/**', 'apps/site/src/examples/*/legacy-*.tsx'],
    rules: { '@typescript-eslint/no-deprecated': 'off' },
  },
  // D7: m3e-elements has zero runtime dependencies. Only internal math packages may be imported
  // (they are bundled into the elements build, never listed as dependencies).
  {
    files: ['packages/m3e-elements/src/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?!\\.|@kyralabs/m3e-(motion|shapes)$)',
              message: 'm3e-elements has zero runtime dependencies (D7).',
            },
          ],
        },
      ],
      // `static properties = { ...Parent.properties, … }` reads a member while the class is
      // defined, so bundlers keep every element class a page imports, used or not.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'PropertyDefinition[static=true][key.name="properties"] > ObjectExpression > SpreadElement',
          message:
            'Build static properties in a pure IIFE: `/* @__PURE__ */ (() => ({ ...Parent.properties, … }))()` (run `node tools/pure-statics.js`).',
        },
      ],
    },
  },
  // M1 (M11 API review): each element merges typed addEventListener / removeEventListener
  // overloads into its class with a same-named interface (type-only, no runtime code); HTMLElement
  // implements them, so the merge is safe here.
  {
    files: ['packages/m3e-elements/src/**/*.ts'],
    rules: { '@typescript-eslint/no-unsafe-declaration-merging': 'off' },
  },
  // Downward-only layering: lower layers never import higher ones (REQUIREMENTS §5).
  {
    files: ['packages/{m3e-tokens,m3e-css,m3e-motion,m3e-shapes}/src/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@kyralabs/(m3e-(css|elements|react)|m3exp-web)',
              message: 'Dependencies point downward only (REQUIREMENTS §5).',
            },
          ],
        },
      ],
    },
  },
);
