# DECISIONS.md — m3exp-web

Standing decisions. Do not re-litigate in Claude Code sessions; open a new entry if one must change.

| # | Decision | Date | Rationale / notes |
|---|---|---|---|
| D0 | Library name **m3exp-web**. Umbrella npm package `@kyralabs/m3exp-web`; repo `github.com/kyralabs/m3exp-web`. Layer packages keep their names: `@kyralabs/m3e-tokens`, `@kyralabs/m3e-css`, `@kyralabs/m3e-elements`, `@kyralabs/m3e-react`, internal `@kyralabs/m3e-motion`, `@kyralabs/m3e-shapes`, `@kyralabs/m3e-codegen`. | 2026-10-11 | Name chosen by owner. |
| D1 | Default font **Google Sans Flex**, self-hosted (woff2 shipped in `m3e-tokens/fonts`). Typescale maps to its variable axes; emphasized styles use weight plus other axes where useful. Axis list, ranges and license are `TODO(verify)` against google/fonts METADATA.pb before token generation. | 2026-10-11 | Matches the typeface M3 Expressive uses on Android. |
| D2 | Performance budgets as proposed in REQUIREMENTS §8 (tokens ≤12 KB, css ≤45 KB, elements ≤30 KB, shapes ≤14 KB, react ≤60 KB). | 2026-10-11 | Revisit after M4 with real numbers. |
| D3 | Color `specVersion` default = the latest MCU 0.4.0 ships (2025, or 2026 if present in the npm build — `TODO(verify)`). Older versions remain selectable. | 2026-10-11 | |
| D4 | Deprecated components (BottomAppBar, legacy Segmented Button, small FAB, legacy NavigationBar/Rail, non-expressive ListItem) are **included**, marked `@deprecated`, removed in 2.0. | 2026-10-11 | Migration path for existing apps. |
| D5 | **Material Symbols bundled** as the variable font (Apache 2.0), FILL/wght/GRAD/opsz axes exposed on `<Icon>`. A subsetting CLI (`m3e-icons subset`) ships so apps only pay for the glyphs they use. | 2026-10-11 | Full variable file is several MB. |
| D6 | **Client-side rendering only** in v1. No SSR/RSC guarantees. | 2026-10-11 | Astro static + CSR React covers all Kyra Labs consumers. |
| D7 | `m3e-elements` are **zero-dependency custom elements** (no Lit). A ≤1 KB internal base class handles attribute reflection and lifecycle. | 2026-10-11 | Elements layer is small and behavior-only; avoids a runtime dependency on every Astro page. Trade-off: more boilerplate. |
| D8 | **Side sheets are built.** Fidelity reference is m3.material.io only (no Compose Material3 component exists). | 2026-10-11 | |
| D9 | Licensing: Apache 2.0 for the repo. Ported files keep Google's original header plus a line `Ported to TypeScript by Kyra Labs from <path>@<commit>`. A `NOTICE` file lists each ported project (AndroidX Compose Material3 tokens, AndroidX graphics-shapes, material-color-utilities) with "Copyright (C) The Android Open Source Project" and the Apache 2.0 reference. Bundled fonts keep their own license files alongside (Material Symbols: Apache 2.0; Google Sans Flex: `TODO(verify)`). Not legal advice. | 2026-10-11 | Standard Apache 2.0 practice. |
