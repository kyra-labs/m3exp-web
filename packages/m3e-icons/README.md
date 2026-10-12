# @kyralabs/m3e-icons

Subset the Material Symbols variable font so an app only ships the icons it uses. The full fonts
come from `@kyralabs/m3e-tokens` (Rounded by default; Outlined and Sharp too).

```sh
npm install --save-dev @kyralabs/m3e-icons
```

## Usage

```sh
npx m3e-icons subset --names home,search,menu --out public/icons.woff2 --css public/icons.css
```

The CSS is a drop-in `@font-face` for `.m3e-icon`. Options: `--names-file`,
`--style rounded|outlined|sharp`, `--fill`, `--wght`, `--grad`, `--opsz` (pin a value or narrow a
range), `--family` and `--font`; run `npx m3e-icons` for the full usage. Build scripts can call
the exported `subsetIcons()` instead.

Apache-2.0; see `LICENSE` and `NOTICE`. Material Symbols is Apache-2.0 (Google).
