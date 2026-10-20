# m3exp-web

Material 3 Expressive for the web: `@kyralabs/m3exp-web`. Fidelity target: Jetpack Compose
Material3 1.5.0-beta01 (see `SOURCES.md` and `/SOURCE_PIN`).

Read `DECISIONS.md`, `REQUIREMENTS.md` and `ROADMAP.md` first. `CLAUDE.md` lists the standing
rules for contributors.

## Packages

| Package | What it is |
| --- | --- |
| `@kyralabs/m3exp-web` | Umbrella: re-exports every layer (`/tokens`, `/elements`, `/react`, `/css/index.css`) |
| `@kyralabs/m3e-tokens` | Generated CSS custom properties + JS token objects, self-hosted fonts |
| `@kyralabs/m3e-css` | Framework-free component classes. No JavaScript |
| `@kyralabs/m3e-elements` | Zero-dependency custom elements on the `M3eElement` base (D7) |
| `@kyralabs/m3e-react` | React components (React Aria + Motion), client-side only (D6) |
| `@kyralabs/m3e-motion`, `@kyralabs/m3e-shapes` | Shared spring and shape math |
| `@kyralabs/m3e-icons` | Material Symbols subsetting CLI |
| `@kyralabs/m3e-codegen` | Private build-time token generator |

`apps/site` is the official site with guides and component docs, published at
<https://m3e.kyralabs.dev> (DECISIONS D27). `apps/docs` is the Astro docs/playground, published at
<https://m3epg.kyralabs.dev>; both deploy from `main` (`.github/workflows/docs.yml`, Cloudflare
Pages). `apps/visual` holds the Playwright + axe suites.

## Quick start

Install the umbrella package. Add `@kyralabs/m3e-tokens` too if you use icons: its
`material-symbols.css` is imported by path, which strict package managers (pnpm) only resolve
for direct dependencies.

```sh
npm install @kyralabs/m3exp-web @kyralabs/m3e-tokens
```

Load the CSS once, at the root of the app:

```css
@import '@kyralabs/m3exp-web/css/index.css'; /* fonts, tokens, baseline theme, every class */
@import '@kyralabs/m3e-tokens/material-symbols.css'; /* icons (not in index.css) */
```

Then pick a layer. All three render the same DOM, so they mix on one page.

**CSS only.** Write the `m3e-css` classes; no JavaScript.

```html
<button type="button" class="m3e-button m3e-button--filled m3e-button--size-m">Save</button>
<button type="button" class="m3e-icon-button m3e-icon-button--filled" aria-label="Search">
  <span class="m3e-icon" aria-hidden="true">search</span>
</button>
```

**Custom elements.** For the behavior CSS can't do (menus, sheets, pickers, springs).
`@kyralabs/m3exp-web/elements` registers every element; `@kyralabs/m3e-elements/<element>.js`
(installed directly) registers one (see the `m3e-elements` README).

```html
<script type="module">
  import '@kyralabs/m3exp-web/elements';
</script>
<m3e-loading-indicator aria-label="Loading"></m3e-loading-indicator>
<m3e-icon name="favorite" fill></m3e-icon>
```

**React.** React Aria for behavior and accessibility, Motion for springs. `react` and
`react-dom` 18.3+ or 19 are peer dependencies.

```tsx
import '@kyralabs/m3exp-web/css/index.css';
import '@kyralabs/m3e-tokens/material-symbols.css';
import { Button, Icon } from '@kyralabs/m3exp-web/react';

export function Save() {
  return (
    <Button variant="filled" icon={<Icon name="save" />} onPress={() => console.log('saved')}>
      Save
    </Button>
  );
}
```

The docs site, <https://m3epg.kyralabs.dev>, has a page per component with its variants in each
layer it has. The per-layer READMEs list the APIs: [`m3e-css`](packages/m3e-css/README.md)
(component classes), [`m3e-elements`](packages/m3e-elements/README.md) (elements, attributes,
events) and [`m3e-react`](packages/m3e-react/README.md) (components and hooks).

### Client-side rendering only (D6)

Version 1 renders in the browser only; server rendering and React Server Components are not
supported. Importing an element entry on the server is safe, since registration is skipped where
there is no `window`, but the elements only render in the browser. The React components carry no
`'use client'` directive: in Astro, mount them with `client:only="react"`; in a framework that
server-renders, render them from your own client-only module.

## Fonts and icons

`css/index.css` includes the default Google Sans Flex profile (`fonts.css`: wght and opsz
variable). `@kyralabs/m3e-tokens` also ships `fonts-rond.css` (adds roundness) and
`fonts-full.css` (every axis); to use one, import it with the m3e-tokens `tokens.css` and
`theme.css` and `@kyralabs/m3e-css/index.css` in place of `css/index.css`, and import only one
profile. The font files and their licenses are in `packages/m3e-tokens/fonts/`.

Icons are Material Symbols ligatures (D5): `<span class="m3e-icon">search</span>`,
`<m3e-icon name="search">` or `<Icon name="search" />`. Without a Material Symbols stylesheet they
render as the plain text "search". Import `@kyralabs/m3e-tokens/material-symbols.css` (Rounded,
D12; `material-symbols-outlined.css` and `material-symbols-sharp.css` for the other styles), or
ship only the glyphs you use with the [`m3e-icons`](packages/m3e-icons/README.md) subsetting CLI:

```sh
npx m3e-icons subset --names home,search,menu --out public/icons.woff2 --css public/icons.css
```

## Theming

The baseline theme (Material's baseline purple) is light, dark under `prefers-color-scheme: dark`,
and forced with `data-theme="light"` or `data-theme="dark"` on the root element. To generate a
theme from a seed color (Material Color Utilities' dynamic schemes), use `createTheme` and load
its `cssText` after `css/index.css`:

```ts
import { createTheme } from '@kyralabs/m3exp-web/theme';

const { cssText } = createTheme({ seed: '#6750A4', variant: 'expressive' });
```

or generate a stylesheet at build time with the `m3e-theme` CLI from `@kyralabs/m3e-tokens`:

```sh
npx m3e-theme --seed "#6750A4" --variant expressive > theme.css
```

Every component reads `--m3e-sys-*` and `--m3e-comp-*` custom properties, so a theme is plain CSS.
The m3e-tokens README covers the options (core colors, contrast, spec version) and the window size
classes.

## Versioning (D16)

See `DECISIONS.md` D16. Every `@kyralabs/*` package follows semver from 1.0.0 and shares one version (Changesets `fixed`).
Within 1.x:

- new components, tokens, package entries and options are **minor**;
- bug fixes and fidelity fixes (moving closer to the pinned androidx source or m3.material.io)
  are **patch**, or minor when they add API;
- anything that breaks a consumer waits for **2.0**: removing or renaming an export, package
  entry, CSS class, part or modifier, custom property, attribute or event; changing a
  component's DOM contract; raising a peer-dependency floor.

A renamed API keeps its old name until 2.0: it is marked `@deprecated` and warns once in
development. Changelogs are in each package's `CHANGELOG.md`.

## Deprecations / 2.0

These components exist for migrating existing apps (D4). They are marked `@deprecated`, warn once
in development, get no new features and are **removed in 2.0**:

| Deprecated | Use instead |
| --- | --- |
| `BottomAppBar`, `.m3e-bottom-app-bar` | `DockedToolbar`, `<m3e-docked-toolbar>`, `.m3e-docked-toolbar` |
| Legacy `NavigationBar`, `.m3e-navigation-bar` | `ShortNavigationBar`, `<m3e-short-navigation-bar>` |
| Legacy `NavigationRail`, `.m3e-navigation-rail` | `WideNavigationRail`, `<m3e-wide-navigation-rail>` |
| Small FAB: `Fab size="small"`, `.m3e-fab--size-small` | The baseline FAB (`size="baseline"`, 56dp) |
| Non-expressive list item: `ListItem headlineContent`, `.m3e-list-item--baseline` | `ListItem` with the headline as its children |
| Segmented button: `SingleChoiceSegmentedButtonRow`, `MultiChoiceSegmentedButtonRow`, `SegmentedButton`, `.m3e-segmented-button` | A connected `ButtonGroup` (`variant="connected"`), `<m3e-button-group>` |

Props and attributes renamed in 1.8 (for example `expanded` → `isExpanded`) are listed in the
package READMEs and changelogs. The removal plan for 2.0 is in
[`docs/2.0-removal-plan.md`](docs/2.0-removal-plan.md).

## Develop

Requires Node 22.12+ (CI uses `.nvmrc`) and pnpm via Corepack.

```sh
pnpm install
pnpm build          # ESM + d.ts for every package (tsup; m3e-elements' JS: rolldown), then the docs site
pnpm lint           # ESLint + stylelint (tokens-only rules) + Prettier
pnpm typecheck
pnpm test           # Vitest
pnpm size           # size-limit budgets (REQUIREMENTS §8)
node tools/unbundled-closure.js  # per m3e-elements entry: what a no-bundler page downloads (D24)
pnpm test:visual    # Playwright: Chromium/Firefox/WebKit × light/dark + axe (needs `pnpm build`)
pnpm changeset      # add a changeset to every PR that changes a package
pnpm codegen        # regenerate m3e-tokens from the vendored androidx token files
pnpm codegen:fetch  # pin bumps only: re-download token files for the commit in SOURCE_PIN
pnpm reference:motion  # JVM reference fixture for m3e-motion (needs a JDK; CI re-runs it)
```

Tokens are generated, never hand-edited. `packages/m3e-tokens/src/generated/PARITY.md` maps every
androidx token (file:line) to the CSS variable it becomes; CI fails if the generated files are stale.

Visual baselines are Linux-only and come from the pinned Playwright image used in CI. To
regenerate them after an intentional visual change (from a fresh clone, since it installs Linux
`node_modules` into the working tree):

```sh
docker run --rm -it -v "$PWD":/work -w /work --ipc=host mcr.microsoft.com/playwright:v1.64.0-noble \
  bash -c "npm i -g pnpm@12.11.2 && pnpm install && pnpm build && pnpm --filter @kyralabs/visual test:update"
```

## License

Apache 2.0. See `LICENSE` and `NOTICE` (D9).
