# @kyralabs/m3e-css

Framework-free Material 3 Expressive component classes. No JavaScript. The styles reference the
`--m3e-*` custom properties from `@kyralabs/m3e-tokens`.

```sh
npm install @kyralabs/m3e-css @kyralabs/m3e-tokens
```

## Usage

```css
@import '@kyralabs/m3e-tokens/fonts.css';
@import '@kyralabs/m3e-tokens/tokens.css';
@import '@kyralabs/m3e-tokens/theme.css';
@import '@kyralabs/m3e-tokens/material-symbols.css';
@import '@kyralabs/m3e-css/index.css';
```

```html
<button type="button" class="m3e-button m3e-button--filled m3e-button--size-m">Save</button>

<button type="button" class="m3e-icon-button m3e-icon-button--filled" aria-label="Search">
  <span class="m3e-icon" aria-hidden="true">search</span>
</button>
```

Import a single component with `@kyralabs/m3e-css/<component>.css` (for example `button.css`).
Classes follow `.m3e-<component>`, `__<part>` and `--<modifier>`.

Apache-2.0; see `LICENSE` and `NOTICE`.
