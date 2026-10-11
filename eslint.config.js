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
    'packages/m3e-tokens/src/generated/',
    'apps/visual/test-results/',
    'apps/visual/playwright-report/',
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
    files: ['packages/*/src/**/*.{ts,tsx}'],
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
  // CLAUDE.md "Tokens only". Codegen emits literal values from pinned sources, so it is exempt.
  {
    files: ['packages/*/src/**/*.{ts,tsx}'],
    ignores: [...TEST_FILES, 'packages/m3e-codegen/**'],
    plugins: { m3e },
    rules: { 'm3e/no-literal-values': 'error' },
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
    },
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
