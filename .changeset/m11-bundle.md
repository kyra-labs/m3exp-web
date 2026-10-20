---
'@kyralabs/m3exp-web': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
'@kyralabs/m3e-motion': patch
'@kyralabs/m3e-shapes': patch
---

Bundle and d.ts build (M11 hardening; no API or behavior change). m3e-elements emits its
declarations with one `tsc` pass and bundles the `.d.ts` files per entry, so its build no longer
needs a 4 GB heap (it fits 512 MB) and every public type path and exported type stays the same.
m3e-react bundles the m3e-elements code it uses from source, so m3e-motion and m3e-shapes are
imported once instead of also being inlined a second time (m3e-react (all) −1.9 kB, dist
778 → 540 KB). Element classes declare `static properties` in a pure form, so bundlers drop
element classes a page imports without registering them; module-level constants in m3e-motion
(`app-bar-scroll`, `menu-position`) and m3e-shapes (`TwoPi`) no longer leave code behind in every
import.
