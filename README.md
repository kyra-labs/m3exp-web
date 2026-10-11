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

`apps/docs` is the Astro docs/playground, and `apps/visual` holds the Playwright + axe suites.

## Develop

Requires Node 22.12+ (CI uses `.nvmrc`) and pnpm via Corepack.

```sh
pnpm install
pnpm build          # tsup ESM + d.ts for every package, then the docs site
pnpm lint           # ESLint + stylelint (tokens-only rules) + Prettier
pnpm typecheck
pnpm test           # Vitest
pnpm size           # size-limit budgets (REQUIREMENTS §8)
pnpm test:visual    # Playwright: Chromium/Firefox/WebKit × light/dark + axe (needs `pnpm build`)
pnpm changeset      # add a changeset to every PR that changes a package
pnpm codegen        # regenerate m3e-tokens from the vendored androidx token files
pnpm codegen:fetch  # pin bumps only: re-download token files for the commit in SOURCE_PIN
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
