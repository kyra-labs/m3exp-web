---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3e-shapes': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3exp-web': minor
---

Loading indicator (M4).

- Tokens: `components/loading-indicator-motion.css` — the indeterminate choreography literals of Compose's `LoadingIndicator.kt` (morph interval, global rotation duration, morph spring ζ / k / visibility threshold), generated from the vendored source.
- Shapes: `loadingIndicatorShapes`, `LoadingIndicatorShapes`, `morphSequence`, `calculateScaleFactor`, `processPath`, `determinateFrame` and the default polygon lists — a float32-faithful port of the LoadingIndicator geometry, bit-exact against a JVM reference export (`pnpm reference:loading-indicator`).
- Motion: `indeterminateFrame` / `initialIndeterminateFrame` — the indeterminate timeline (spring every interval, +90° per morph, linear global rotation) as a pure function of time.
- CSS: `loading-indicator.css` — uncontained and contained, square drawing area at the token ratio, CSS-only fallback rotation, reduced motion and forced colors.
- Elements: `<m3e-loading-indicator contained progress aria-label>`.
- React: `<LoadingIndicator contained progress polygons aria-label>`; `@kyralabs/m3e-shapes` and `@kyralabs/m3e-motion` are now runtime dependencies of m3e-react so custom `polygons` share one graphics-shapes copy.
