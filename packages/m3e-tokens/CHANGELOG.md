# @kyralabs/m3e-tokens

## 1.2.0

### Minor Changes

- c4ea9a0: New opt-in Google Sans Flex profile `@kyralabs/m3e-tokens/fonts-rond.css` (D15): wght + opsz + ROND variable, with wdth and slnt fixed at their defaults (latin chunk 205.2 KiB, all chunks 468.1 KiB). Import it instead of `fonts.css`, not beside it: it registers the same `"Google Sans Flex"` family and renders identically until you set `font-variation-settings: "ROND" <0–100>`. `fonts.css` stays the default, `fonts-full.css` is unchanged and the typescale tokens do not use ROND.

## 1.1.0

### Minor Changes

- 1aa96fa: `createTheme` accepts optional core colors, like Material Theme Builder: `coreColors: { secondary, tertiary, neutral, neutralVariant, error }`. Each one replaces the palette the variant would derive from the seed with `TonalPalette.fromInt(color)`, so a red seed can keep grey surfaces (`coreColors: { neutral: '#808080', neutralVariant: '#808080' }`). The `m3e-theme` CLI takes the same colors as `--secondary`, `--tertiary`, `--neutral`, `--neutral-variant` and `--error`, and `tokens.coreColors` reports them. Themes without core colors are unchanged.

## 1.0.1

No changes in this release.

## 1.0.0

### Major Changes

- cefe6f4: publish initial version
