---
'@kyralabs/m3e-shapes': minor
---

TypeScript port of AndroidX graphics-shapes 1.0.1 (`RoundedPolygon`, `CornerRounding`, `Cubic`, `Morph`, `circle`/`rectangle`/`star`/`pill`/`pillStar`) and Compose Material3's 35 `MaterialShapes` (`materialShape(name)`, `materialShapeNames`), float32-faithful: preset and morph cubics are bit-identical to the JVM, including how corner matching resolves near-ties between symmetric shapes. Adds path output: `toShapeOutline` (Compose `toShape().createOutline`), `polygonToPath`/`morphToPath` (ShapeUtil, with `startAngle`) and `toSvgPathData`.
