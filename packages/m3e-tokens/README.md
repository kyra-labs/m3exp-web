# @kyralabs/m3e-tokens

Material 3 Expressive design tokens generated from the pinned androidx Compose Material3 sources:
CSS custom properties, JS token objects, color theming and self-hosted fonts (Google Sans Flex and
Material Symbols).

```sh
npm install @kyralabs/m3e-tokens
```

## Usage

```css
@import '@kyralabs/m3e-tokens/fonts.css'; /* Google Sans Flex */
@import '@kyralabs/m3e-tokens/tokens.css'; /* --m3e-sys-* typescale, shape, motion, … */
@import '@kyralabs/m3e-tokens/theme.css'; /* baseline color scheme, light + dark */

.headline {
  font: var(--m3e-sys-typescale-headline-medium);
  color: var(--m3e-sys-color-on-surface);
}
```

Generate a theme from a seed color:

```ts
import { createTheme } from '@kyralabs/m3e-tokens/theme';

const { cssText } = createTheme({ seed: '#6750A4', variant: 'expressive' });
```

or from the command line:

```sh
npx m3e-theme --seed "#6750A4" --variant expressive > theme.css
```

Other entries: `./components/<name>.css` (component tokens), `./material-symbols.css` (Rounded;
`-outlined` and `-sharp` too), `./fonts-full.css` (every Google Sans Flex axis), and JS token
objects from `.` and `./components`.

Apache-2.0; see `LICENSE` and `NOTICE`. The bundled fonts carry their own licenses in `fonts/`.
