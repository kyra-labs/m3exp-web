// Spring math for m3exp-web (ROADMAP M3): Compose's SpringSimulation and duration estimate
// (bit-exact ports), FloatSpringSpec helpers, damping conversion, the CSS linear() sampler, and the
// top app bar scroll state (TopAppBarState) and the dropdown menu placement
// (DropdownMenuPositionProvider) shared by m3e-elements and m3e-react.
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
export {
  type MenuAnchorPosition,
  type MenuPositionInput,
  type MenuPositionResult,
  type MenuRect,
  menuPosition,
  menuTransformOrigin,
} from './menu-position.js';
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
