// @kyralabs/m3e-shapes: float32-faithful TypeScript port of AndroidX graphics-shapes 1.0.1 and
// Compose Material3's MaterialShapes (the 35 expressive shapes), with SVG path output.

export { CornerRounding } from './graphics-shapes/corner-rounding.js';
export { Cubic, MutableCubic } from './graphics-shapes/cubic.js';
export { Corner, Edge, Feature } from './graphics-shapes/features.js';
export { Morph } from './graphics-shapes/morph.js';
export type { Point, PointTransformer } from './graphics-shapes/point.js';
export { RoundedPolygon } from './graphics-shapes/rounded-polygon.js';
export { circle, pill, pillStar, rectangle, star } from './graphics-shapes/shapes.js';
export {
  type LoadingIndicatorFrame,
  LoadingIndicatorShapes,
  calculateScaleFactor,
  determinateFrame,
  determinateIndicatorPolygons,
  indeterminateIndicatorPolygons,
  loadingIndicatorShapes,
  morphSequence,
  processPath,
} from './loading-indicator.js';
export {
  type MaterialShapeName,
  materialShape,
  materialShapeNames,
  toShapeOutline,
} from './material-shapes.js';
export { type PathCommand, pathBounds, toSvgPathData, translatePath } from './path.js';
export { PathMeasure } from './path-measure.js';
export {
  type CircularWavyInput,
  type CircularWavyPaths,
  CircularWavyPathCache,
  type LinearWavyInput,
  type LinearWavyPaths,
  LinearWavyPathCache,
  type ProgressStrokes,
  linearWavyStopIndicator,
} from './progress-indicator.js';
export {
  type MorphPathOptions,
  type PathOptions,
  morphToPath,
  polygonToPath,
} from './shape-util.js';
