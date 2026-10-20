// Literal-value bans for component CSS (CLAUDE.md "Tokens only"). Generated token CSS is exempt.
const LENGTH_AND_TIME_UNITS = [
  'px',
  'rem',
  'em',
  'ex',
  'ch',
  'cap',
  'ic',
  'lh',
  'rlh',
  'pt',
  'pc',
  'cm',
  'mm',
  'q',
  'in',
  's',
  'ms',
];
const MEDIA_SIZE_FEATURES = [
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
];

/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard'],
  plugins: ['./tools/lint/stylelint-plugin-m3e.js'],
  ignoreFiles: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.astro/**',
    'packages/m3e-tokens/src/generated/**',
    'packages/m3e-tokens/fonts/**',
    'packages/m3e-codegen/vendor/**',
    'apps/visual/playwright-report/**',
    'apps/site/src/generated/**',
  ],
  rules: {
    'import-notation': 'string',
    // BEM: .m3e-<component>__<part>--<modifier> for the library; docs shell uses .docs-…
    'selector-class-pattern': [
      '^m3e-[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Use .m3e-<component>[__<part>][--<modifier>] (CLAUDE.md Naming).' },
    ],
    'custom-property-pattern': [
      '^(m3e-(ref|sys|comp)-[a-z0-9-]+|_[a-z0-9-]+)$',
      {
        message:
          'Custom properties are --m3e-{ref|sys|comp}-… tokens or private --_… (CLAUDE.md Naming).',
      },
    ],
  },
  overrides: [
    {
      // Docs-only classes must not look like library API (.m3e-*).
      files: ['apps/docs/**/*.css'],
      rules: {
        'selector-class-pattern': [
          '^docs-[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
          { message: 'Docs shell classes are .docs-<block>[__<part>][--<modifier>].' },
        ],
      },
    },
    {
      // The site (DECISIONS D27): .site-* shell classes; the tokens-only rules below apply too.
      files: ['apps/site/**/*.css'],
      rules: {
        'selector-class-pattern': [
          '^(m3e|site)-[a-z0-9]+(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
          {
            message: 'Site classes are .site-<block>[__<part>][--<modifier>] (or m3e-css classes).',
          },
        ],
      },
    },
    {
      files: ['packages/*/src/**/*.css', 'apps/site/src/**/*.css'],
      rules: {
        'color-no-hex': true,
        'color-named': 'never',
        'function-disallowed-list': [
          [
            'rgb',
            'rgba',
            'hsl',
            'hsla',
            'hwb',
            'lab',
            'lch',
            'oklab',
            'oklch',
            'color',
            'cubic-bezier',
            'steps',
            'linear',
          ],
          { message: 'Colors and easings come from m3e tokens (CLAUDE.md "Tokens only").' },
        ],
        'unit-disallowed-list': [
          LENGTH_AND_TIME_UNITS,
          {
            ignoreMediaFeatureNames: Object.fromEntries(
              LENGTH_AND_TIME_UNITS.map((unit) => [unit, MEDIA_SIZE_FEATURES]),
            ),
            message: 'Sizes and durations come from m3e tokens (CLAUDE.md "Tokens only").',
          },
        ],
        'm3e/no-literal-values': true,
      },
    },
  ],
};
