// Spring math for m3exp-web (ROADMAP M3): Compose's SpringSimulation and duration estimate
// (bit-exact ports), FloatSpringSpec helpers, damping conversion, the CSS linear() sampler, and the
// top app bar scroll state (TopAppBarState) shared by m3e-elements and m3e-react.
export { type LinearEasing, type LinearEasingOptions, springToLinear } from './linear.js';
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
export {
  type AppBarScrollBehavior,
  type AppBarScrollState,
  appBarScrollState,
  collapsedFraction,
  isScrolledUnder,
  overlappedFraction,
  scrollAppBar,
  settleTarget,
  withHeight,
  withHeightOffset,
} from './app-bar-scroll.js';
