import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { afterAll, describe, it } from 'vitest';
import plugin from './eslint-plugin-m3e.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('m3e/no-literal-values', plugin.rules['no-literal-values'], {
  valid: [
    "const c = 'var(--m3e-sys-color-primary)';",
    'const style = { opacity: tokens.state.hoverOpacity, margin: 0 };',
    "const el = <div style={{ borderRadius: 'var(--m3e-sys-shape-corner-full)' }} />;",
    'const spring = { stiffness: motion.spatial.fast.stiffness };',
    "const label = 'Save 2 items';",
    "const cls = 'm3e-button--size-xl';",
    'const total = items.length + 4;',
    "const tag = 'm3e-loading-indicator';",
  ],
  invalid: [
    { code: "const c = '#6750A4';", errors: [{ messageId: 'literal' }] },
    { code: "const c = 'rgb(0 0 0 / 0.5)';", errors: [{ messageId: 'literal' }] },
    { code: "const e = 'cubic-bezier(0.2, 0, 0, 1)';", errors: [{ messageId: 'literal' }] },
    { code: "const w = '48px';", errors: [{ messageId: 'literal' }] },
    { code: 'const w = `calc(100% - ${x}12px)`;', errors: [{ messageId: 'literal' }] },
    { code: "const t = 'opacity 200ms';", errors: [{ messageId: 'literal' }] },
    { code: "const t = 'transform 0.3s';", errors: [{ messageId: 'literal' }] },
    { code: "const f = \"'FILL' 1, 'wght' 400\";", errors: [{ messageId: 'literal' }] },
    { code: 'const style = { opacity: 0.38 };', errors: [{ messageId: 'literal' }] },
    { code: 'const spring = { stiffness: 1400, dampingRatio: 0.9 };', errors: 2 },
    {
      code: 'const el = <div style={{ borderRadius: 12 }} />;',
      errors: [{ messageId: 'literal' }],
    },
    { code: 'const a = { duration: 150 };', errors: [{ messageId: 'literal' }] },
    { code: 'const m = { marginInlineStart: -4 };', errors: [{ messageId: 'literal' }] },
  ],
});
