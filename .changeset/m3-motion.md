---
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-tokens': minor
---

Spring motion. `@kyralabs/m3e-motion` ports Compose `SpringSimulation` and `estimateAnimationDurationMillis` (bit-exact with the JVM in float32) and adds `springValue`/`springVelocity`/`springDurationMillis` (Compose `FloatSpringSpec` semantics), damping-ratio ↔ coefficient conversion and `springToLinear()` (CSS `linear()` with ≤ 40 stops). `@kyralabs/m3e-tokens` now emits `-easing`/`-duration` (`linear()`) and the official m3.material.io `-bezier`/`-bezier-duration` stand-ins for every motion-scheme spring, active-scheme aliases, and a `prefers-reduced-motion` block; `createTheme({ motionScheme })` switches all of them.
