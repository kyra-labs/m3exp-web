// stylelint plugin enforcing CLAUDE.md "Tokens only" for component CSS.
//
// Core stylelint rules already reject hex colors, named colors, color/easing functions and
// literal length/time units (see stylelint.config.js). This rule covers what they cannot:
//   - var() must reference an m3e token (`--m3e-…`) or a component-private property (`--_…`);
//   - font-family / font-variation-settings / font-feature-settings take tokens only;
//   - unitless numbers other than 0 and ±1 (opacities, weights, scales, line heights…);
//   - keyword easings (ease, linear, …) in transition/animation shorthands and timing functions;
//   - percentages inside color-mix(), which are literal opacities.
import stylelint from 'stylelint';
import valueParser from 'postcss-value-parser';

const {
  createPlugin,
  utils: { report, ruleMessages, validateOptions },
} = stylelint;

export const ruleName = 'm3e/no-literal-values';

export const messages = ruleMessages(ruleName, {
  rejected: (literal, prop) =>
    `Literal "${literal}" in "${prop}". Reference a var(--m3e-…) token instead (CLAUDE.md "Tokens only").`,
  foreignVar: (name) =>
    `"${name}" is not an m3e token. Use --m3e-… or a component-private --_… property.`,
});

const CSS_WIDE = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'normal',
  'none',
]);
const TOKEN_ONLY_PROPS = new Set([
  'font-family',
  'font-variation-settings',
  'font-feature-settings',
]);
const EASING_PROPS = /^(transition|animation)(-timing-function)?$/;
const EASING_KEYWORDS = new Set([
  'ease',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'linear',
  'step-start',
  'step-end',
]);
// Properties whose unitless numbers are counts/ordering, not design values.
const NUMBER_OK_PROPS =
  /^(z-index|order|flex|flex-grow|flex-shrink|grid(-.*)?|column-count|counter-(reset|increment|set)|tab-size|orphans|widows|animation-iteration-count|aspect-ratio)$/;
const UNITLESS = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

/** @type {import('stylelint').Rule} */
const rule = (primary) => (root, result) => {
  if (!validateOptions(result, ruleName, { actual: primary, possible: [true] })) return;

  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    const isCustomProp = prop.startsWith('--');
    const reject = (literal) =>
      report({
        ruleName,
        result,
        node: decl,
        message: messages.rejected(literal, decl.prop),
        word: literal,
      });

    /** @param {import('postcss-value-parser').Node[]} nodes @param {string | null} fn */
    const walk = (nodes, fn) => {
      let prev = null;
      for (const node of nodes) {
        const before = prev;
        if (node.type !== 'space') prev = node;
        if (node.type === 'function') {
          const name = node.value.toLowerCase();
          if (name === 'var') {
            const [first, ...rest] = node.nodes;
            const ref = first?.value ?? '';
            if (!ref.startsWith('--m3e-') && !ref.startsWith('--_')) {
              report({
                ruleName,
                result,
                node: decl,
                message: messages.foreignVar(ref),
                word: ref,
              });
            }
            walk(rest, 'var');
          } else if (name !== 'url') {
            walk(node.nodes, name);
          }
          continue;
        }
        if (node.type === 'string') {
          if (TOKEN_ONLY_PROPS.has(prop)) reject(node.value);
          continue;
        }
        if (node.type !== 'word') continue;
        const word = node.value;
        const lower = word.toLowerCase();

        if (TOKEN_ONLY_PROPS.has(prop) && !CSS_WIDE.has(lower)) {
          reject(word);
          continue;
        }
        if (EASING_PROPS.test(prop) && EASING_KEYWORDS.has(lower)) {
          reject(word);
          continue;
        }
        const dim = valueParser.unit(word);
        if (!dim) continue;
        if (fn === 'color-mix' && dim.unit === '%') {
          reject(word);
          continue;
        }
        if (dim.unit === '' && UNITLESS.test(word)) {
          const n = Number(dim.number);
          if (n === 0 || Math.abs(n) === 1) continue;
          // Halving (`calc(x / 2)`: centering, half of a token height) is geometry, not a value.
          if (n === 2 && fn === 'calc' && before?.type === 'word' && before.value === '/') continue;
          if (!isCustomProp && NUMBER_OK_PROPS.test(prop)) continue;
          reject(word);
        }
      }
    };

    walk(valueParser(decl.value).nodes, null);
  });
};

rule.ruleName = ruleName;
rule.messages = messages;

export default createPlugin(ruleName, rule);
