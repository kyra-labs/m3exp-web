---
'@kyralabs/m3e-tokens': minor
---

`createTheme` accepts optional core colors, like Material Theme Builder: `coreColors: { secondary, tertiary, neutral, neutralVariant, error }`. Each one replaces the palette the variant would derive from the seed with `TonalPalette.fromInt(color)`, so a red seed can keep grey surfaces (`coreColors: { neutral: '#808080', neutralVariant: '#808080' }`). The `m3e-theme` CLI takes the same colors as `--secondary`, `--tertiary`, `--neutral`, `--neutral-variant` and `--error`, and `tokens.coreColors` reports them. Themes without core colors are unchanged.
