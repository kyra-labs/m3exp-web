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

Optional core colors replace the palettes the variant would derive from the seed, like Material
Theme Builder's: `secondary`, `tertiary`, `neutral`, `neutralVariant` and `error`. Each palette
keeps the given color's hue and chroma (`TonalPalette.fromInt`); the variant still maps the roles
to tones. For example, a red primary on grey surfaces:

```ts
createTheme({
  seed: '#d84848',
  variant: 'fidelity',
  coreColors: { neutral: '#808080', neutralVariant: '#808080' },
});
```

```sh
npx m3e-theme --seed "#d84848" --variant fidelity --neutral "#808080" --neutral-variant "#808080"
```

The CLI flags are `--secondary`, `--tertiary`, `--neutral`, `--neutral-variant` and `--error`.
With spec 2025 (the `tonalSpot`, `neutral`, `vibrant` and `expressive` variants) the outline and
surface-variant roles come from the neutral palette, so `neutralVariant` has no effect there.

Other entries: `./components/<name>.css` (component tokens), `./material-symbols.css` (Rounded;
`-outlined` and `-sharp` too), `./fonts-full.css` (every Google Sans Flex axis), and JS token
objects from `.` and `./components`.

Apache-2.0; see `LICENSE` and `NOTICE`. The bundled fonts carry their own licenses in `fonts/`.
