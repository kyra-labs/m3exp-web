# @kyralabs/m3e-shapes

## 1.9.0

### Patch Changes

- ec5f344: Point npm homepage links to the official site, m3e.kyralabs.dev. Every published package's
  `homepage` is now https://m3e.kyralabs.dev/ (it was the package's folder on GitHub), and the
  umbrella README links the docs there; the m3e-react README's docs link goes to the site's component pages. No code changes.

## 1.8.0

### Patch Changes

- 08b128b: Bundle and d.ts build (M11 hardening; no API or behavior change). m3e-elements emits its
  declarations with one `tsc` pass and bundles the `.d.ts` files per entry, so its build no longer
  needs a 4 GB heap (it fits 512 MB) and every public type path and exported type stays the same.
  m3e-react bundles the m3e-elements code it uses from source, so m3e-motion and m3e-shapes are
  imported once instead of also being inlined a second time (m3e-react (all) −1.9 kB, dist
  778 → 540 KB). Element classes declare `static properties` in a pure form, so bundlers drop
  element classes a page imports without registering them; module-level constants in m3e-motion
  (`app-bar-scroll`, `menu-position`) and m3e-shapes (`TwoPi`) no longer leave code behind in every
  import.

## 1.7.0

No changes in this release.

## 1.6.1

No changes in this release.

## 1.6.0

No changes in this release.

## 1.5.0

No changes in this release.

## 1.4.0

### Minor Changes

- fb3fa26: Progress indicators (COMPONENT_SPEC §8): linear and circular, flat and wavy, determinate and indeterminate, default (4dp) and thick (8dp). m3e-css `linear-progress.css` / `circular-progress.css`: flat indicators in CSS only (the value is `--m3e-comp-progress-indicator-value`, 0–1; indeterminate lines and arcs run Compose's keyframes), modifiers `--wavy`, `--thick`. m3e-elements: `<m3e-linear-progress>` / `<m3e-circular-progress>` (`value`, `shape`, `thickness`, `amplitude`, `wavelength`, `wave-speed`, `label`) and the shared `@kyralabs/m3e-elements/progress-indicator.js` drivers: values spring on `ProgressIndicatorDefaults.ProgressAnimationSpec` with their velocity kept, wavy indicators draw Compose's wave (linear quadratic wave, circular star morphed from a circle) every frame, travelling one wavelength per second, with the determinate amplitude ramp. m3e-react: `<LinearProgress>` / `<CircularProgress>` with the same props. m3e-tokens: `components/progress-indicator-defaults.css` (the ProgressIndicator / WavyProgressIndicator values Compose renders that are not in the token files, and the indeterminate keyframes). m3e-motion: `cubicBezier`, the progress timelines and `AmplitudeAnimation`. m3e-shapes: `PathMeasure`, `LinearWavyPathCache`, `CircularWavyPathCache` and `Q` path commands.

## 1.3.0

No changes in this release.

## 1.2.0

No changes in this release.

## 1.1.0

No changes in this release.

## 1.0.1

### Patch Changes

- c7b731c: Single-component imports now tree-shake (REQUIREMENTS §8). Top-level `forwardRef`/`createContext`
  calls in m3e-react and m3e-shapes' module constants carry `/* @__PURE__ */`, so
  `import { Icon } from '@kyralabs/m3e-react'` drops the other components, react-aria, motion and
  m3e-shapes (26.7 kB → 0.3 kB min+brotli). No API or behavior change.

## 1.0.0

### Major Changes

- cefe6f4: publish initial version
