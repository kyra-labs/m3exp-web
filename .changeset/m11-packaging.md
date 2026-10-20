---
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-elements': patch
---

M11 packaging (D22, D24). m3e-react now lists `@kyralabs/m3e-elements` in `dependencies`: its
published d.ts imports the shared layout types from it, so a project that installs only
m3e-react type-checks without `skipLibCheck` (the types were `any` with it). The m3e-elements
code the components use stays bundled into m3e-react, so nothing loads twice.

m3e-elements' JavaScript is built with rolldown instead of esbuild: same entries, exports,
registration and d.ts (byte-identical). Shared code is split per source module, so a page that
loads an entry without a bundler (a CDN `<script type="module">`) downloads only the shared
chunks that entry uses, no longer one chunk with all of m3e-motion: the median element entry falls
from 44 kB to 9.8 kB brotli, the common-page set from 72.9 kB to 34.4 kB. Bundled sizes are
unchanged or slightly smaller. Chunk file names in `dist/` changed; they are not part of the
public API (`exports` maps only the entries).
