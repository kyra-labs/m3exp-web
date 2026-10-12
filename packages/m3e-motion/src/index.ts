// Spring math for m3exp-web (ROADMAP M3): Compose's SpringSimulation and duration estimate
// (bit-exact ports), FloatSpringSpec helpers, damping conversion and the CSS linear() sampler.
export { type LinearEasing, type LinearEasingOptions, springToLinear } from './linear.js';
export {
  type IndeterminateFrame,
  type LoadingIndicatorTiming,
  indeterminateFrame,
  initialIndeterminateFrame,
  morphSpringDurationMillis,
} from './loading-indicator.js';
export {
  DEFAULT_DISPLACEMENT_THRESHOLD,
  type SpringSpec,
  dampingCoefficient,
  dampingRatioFromCoefficient,
  springDurationMillis,
  springValue,
  springVelocity,
} from './spring.js';
export {
  estimateAnimationDurationMillis,
  estimateAnimationDurationMillisDouble,
} from './spring-estimation.js';
export { type Motion, SpringSimulation } from './spring-simulation.js';
