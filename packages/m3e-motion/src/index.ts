// Spring math for m3exp-web (ROADMAP M3): Compose's SpringSimulation and duration estimate
// (bit-exact ports), FloatSpringSpec helpers, damping conversion, the CSS linear() sampler, and the
// top app bar scroll state (TopAppBarState) and the dropdown menu placement
// (DropdownMenuPositionProvider) shared by m3e-elements and m3e-react.
export { type LinearEasing, type LinearEasingOptions, springToLinear } from './linear.js';
export { SpringAnimatable } from './animatable.js';
export { animatedInt, fabMenuItemVisible } from './fab-menu.js';
export { menuNavigationTarget } from './menu-navigation.js';
export { type Easing, cubicBezier, parseCubicBezier } from './cubic-bezier.js';
export {
  AmplitudeAnimation,
  type AmplitudeTween,
  type CircularIndeterminateFrame,
  type CircularIndeterminateTiming,
  type LinearIndeterminateTiming,
  circularIndeterminateFrame,
  indicatorAmplitude,
  linearIndeterminateFractions,
  waveOffset,
  waveTravelMillis,
} from './progress-indicator.js';
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
export {
  type ButtonGroupItemSize,
  buttonGroupVisibleCount,
  buttonGroupWidths,
} from './button-group.js';
