// ESLint plugin enforcing CLAUDE.md "Tokens only" in TS/TSX source.
//
// Flags, outside tests and build-time tools:
//   - string/template literals containing CSS literal values: hex colors, color/easing functions,
//     absolute or font-relative lengths, durations, font-variation axis values;
//   - non-zero numeric literals assigned to design-value keys (duration, stiffness, opacity,
//     radius, width, …) in object literals, e.g. `style={{ opacity: 0.38 }}` or `{ stiffness: 700 }`.
// Values must come from `var(--m3e-…)` strings or imported token objects.

const PATTERNS = [
  [/#[0-9a-f]{3,8}\b/i, 'hex color'],
  [/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|cubic-bezier|steps)\(/i, 'color/easing function'],
  [
    /(^|[^\w.-])-?(\d+\.?\d*|\.\d+)(px|rem|em|ex|ch|lh|pt|pc|cm|mm|in|dp|sp|ms)\b/,
    'length/duration',
  ],
  [/(^|[^\w.-])-?(\d+\.?\d*|\.\d+)s\b/, 'duration'],
  [/["']?\b(FILL|wght|GRAD|opsz|wdth|ROND|slnt)["']?\s+-?\d/, 'font-variation value'],
];

const DESIGN_KEYS =
  /^(duration|delay|stiffness|damping|dampingRatio|mass|visibilityThreshold|opacity|radius|borderRadius|border\w*Radius|elevation|fontSize|fontWeight|lineHeight|letterSpacing|width|height|minWidth|minHeight|maxWidth|maxHeight|blockSize|inlineSize|size|gap|rowGap|columnGap|padding\w*|margin\w*|inset\w*|top|left|right|bottom|outlineWidth|outlineOffset|borderWidth|strokeWidth)$/;

const MESSAGE =
  'Literal {{kind}} "{{value}}". Reference a var(--m3e-…) token or an imported token object (CLAUDE.md "Tokens only").';

/** @type {import('eslint').Rule.RuleModule} */
const noLiteralValues = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow hard-coded design values; use m3e tokens.' },
    messages: { literal: MESSAGE },
    schema: [],
  },
  create(context) {
    /** @param {import('estree').Node} node @param {string} text */
    const checkText = (node, text) => {
      for (const [re, kind] of PATTERNS) {
        const match = re.exec(text);
        if (match) {
          context.report({ node, messageId: 'literal', data: { kind, value: match[0].trim() } });
          return;
        }
      }
    };
    /** @param {import('estree').Node} node */
    const keyName = (node) =>
      node.type === 'Identifier' ? node.name : node.type === 'Literal' ? String(node.value) : null;
    /** @param {import('estree').Node} node */
    const numericValue = (node) => {
      if (node.type === 'Literal' && typeof node.value === 'number') return node.value;
      if (
        node.type === 'UnaryExpression' &&
        node.operator === '-' &&
        node.argument.type === 'Literal'
      )
        return -Number(node.argument.value);
      return null;
    };

    return {
      Literal(node) {
        if (typeof node.value === 'string') checkText(node, node.value);
      },
      TemplateElement(node) {
        checkText(node, node.value.cooked ?? node.value.raw);
      },
      Property(node) {
        const key = node.computed ? null : keyName(node.key);
        if (!key || !DESIGN_KEYS.test(key)) return;
        const value = numericValue(node.value);
        if (value !== null && value !== 0) {
          context.report({
            node: node.value,
            messageId: 'literal',
            data: { kind: `"${key}" value`, value: String(value) },
          });
        }
      },
    };
  },
};

export default {
  meta: { name: 'eslint-plugin-m3e' },
  rules: { 'no-literal-values': noLiteralValues },
};
