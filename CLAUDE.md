# CLAUDE.md — m3exp-web

Standing rules for every Claude Code session in `kyralabs/m3exp-web`. Read `DECISIONS.md` first; it overrides anything here.

## Source of truth
- Compose Material3 **1.5.0-beta01** at the commit in `SOURCES.md` (pin file: `/SOURCE_PIN`). graphics-shapes **1.0.1** (the version Material3 1.5.0-beta01 depends on). `@material/material-color-utilities` **0.4.0**. Material Web **2.5.0** (secondary only). Side sheets: m3.material.io only (D8).
- Priority: androidx code > m3.material.io > official Google blogs. Never use third-party blogs for values.
- If a value cannot be verified, write `TODO(verify): <what, which file>` and add it to the register in `SOURCES.md`. Never guess.

## Packages and layers
- Umbrella `@kyralabs/m3exp-web` re-exports the four layers.
- `packages/m3e-tokens`: generated only. Do not hand-edit `dist/` or `generated/`. Ships Google Sans Flex and Material Symbols woff2 + `fonts.css`.
- `packages/m3e-css`: no JS. One file per component: `src/<component>.css`.
- `packages/m3e-elements`: only behavior CSS can't do. **Zero runtime dependencies** (D7). Every element extends `M3eElement`. Registration is guarded by `typeof window !== 'undefined'`. Each element renders the m3e-css DOM contract.
- `packages/m3e-react`: React Aria for behavior/a11y, Motion for springs, same classes as css. Client-side only (D6); no SSR-specific code, no `use client` directives required.
- `packages/m3e-motion`, `packages/m3e-shapes`: shared math. Never duplicate it.
- `packages/m3e-codegen`, `packages/m3e-icons`: build-time tools.

## Hard rules
- **Tokens only:** never hard-code colors, radii, sizes, durations, easings, springs, opacities, elevations, font families or font-variation values. Reference `var(--m3e-…)` or imported token objects. A lint rule enforces this.
- Spatial springs for geometry; effects springs for color/opacity.
- Every interactive element has a ≥48px target, visible `:focus-visible`, and ARIA per COMPONENT_SPEC.
- Respect `prefers-reduced-motion` and `forced-colors`.
- Icons go through the `Icon` primitive (Material Symbols). Never inline SVG icons for system glyphs.
- Deprecated components (D4) carry `@deprecated` JSDoc, a one-time dev console warning, and a docs banner. Do not add features to them.
- **Licensing (D9):** ported Google code keeps its original Apache-2.0 header plus `// Ported to TypeScript by Kyra Labs from <path>@<commit>`, and the project is listed in `NOTICE`. Never strip headers. Bundled fonts keep their license files beside them.

## Naming
- CSS vars: `--m3e-ref-…` (palettes, typefaces), `--m3e-sys-{color|typescale|shape|elevation|motion|state|space|window}-…`, `--m3e-comp-<component>-<part>-<property>[-<state>]`.
- Classes: `.m3e-<component>`, `__<part>`, `--<modifier>`.
- Elements: `<m3e-<component>>`; events are kebab-case `CustomEvent`s with `detail`.
- React: PascalCase components, `on<Event>` props, `is<State>` booleans (React Aria convention).
- Deprecated exports keep their original names; replacements get the expressive name (e.g. `DockedToolbar` replaces `BottomAppBar`).

## File structure
```
packages/<pkg>/src/<component>/{index.ts, <component>.css|tsx, <component>.test.ts}
packages/m3e-elements/src/base/M3eElement.ts
packages/m3e-tokens/fonts/{google-sans-flex.woff2, material-symbols-*.woff2, LICENSE-*.txt}
apps/docs/src/pages/components/<component>.astro
apps/visual/tests/<component>.spec.ts
apps/site/src/pages/…  (the official site, D27)
DECISIONS.md  SOURCES.md  REQUIREMENTS.md  FOUNDATIONS_SPEC.md  COMPONENT_SPEC.md  ROADMAP.md
```

## Done means
1. Unit tests pass (Vitest), including reference comparisons for math.
2. Playwright visual baselines exist for light/dark × all states × 3 browsers.
3. axe has 0 violations.
4. size-limit passes (budgets in REQUIREMENTS §8).
5. Every acceptance-criteria checkbox for the component is ticked in the PR description.
6. A changeset is added.
7. No new `TODO(verify)` without a register entry.
8. Element and React versions produce identical DOM (snapshot test).

## apps/site (D27)
- The official site, m3e.kyralabs.dev: Astro static pages, React islands mounted in the browser only (D6), built with our own components. `apps/docs` stays the playground and the page set `apps/visual` opens; never restyle or move it for the site.
- **Apply:** tokens only (stylelint and ESLint `m3e/no-literal-values` cover `apps/site/src`; site classes are `.site-…`), the accessibility rules above (≥48px targets, visible `:focus-visible`, ARIA, `prefers-reduced-motion`, `forced-colors`), icons through `.m3e-icon` / `Icon`, licensing (D9).
- **Do not apply:** one component per PR, the Compose-fidelity review and its catalog screenshots, and the package "Done means" items (visual baselines, size-limit, DOM snapshots, changesets). Site-only PRs add no changeset (`apps/site` is private) and skip the visual suite.
- CI's `site` job builds the site and runs the link check, the SEO check (titles ≤ 60 characters, descriptions 50–160, unique; canonical URLs, social card, sitemap), axe, the no-JavaScript and 360px checks and Lighthouse (performance ≥ 90, accessibility and SEO 100) on every PR.
- **Name and brand:** the site is "M3 Expressive Web" by Kyra Labs (`SITE_NAME`, `src/data/brand.ts`); `m3exp-web` is only the npm and repository name.
- **Privacy policy (`/privacy/`):** it states facts about the site (no cookies, analytics or third-party requests; the theme keys in local storage; local search). A change that makes one of them untrue updates the page in the same PR.
- Content comes from source: API tables are generated at build time from the `.d.ts`, READMEs and COMPONENT_SPEC, never written by hand. Pages import the m3e-css files of the components they show, not `css/index.css`.
- A library bug found while building the site gets an issue and a fix in the library; the site does not work around it.

## Review workflow
- One component (all layers) per PR.
- PR description includes: sources read (file@commit, line refs), acceptance checklist, screenshots next to Compose catalog captures (or m3.material.io for side sheets), and known fidelity gaps.
- The owner reviews against the Compose catalog/m3.material.io, then approves or requests changes. Claude never merges.
- Bumping the source pin, font version or icon version is its own PR with a regenerated token/font diff.
- A decision that needs changing is proposed as a new row in `DECISIONS.md` in its own PR, never silently in code.
