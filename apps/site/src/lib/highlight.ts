// Syntax highlighting theme for every code block: Shiki's css-variables theme with a private
// prefix, so the colors are the --_shiki-* properties site.css maps onto the color scheme
// (CLAUDE.md "Tokens only"; code follows light, dark and seed themes).
import { createCssVariablesTheme } from 'shiki';

export const codeTheme = createCssVariablesTheme({
  name: 'm3e-site',
  variablePrefix: '--_shiki-',
  fontStyle: true,
});
