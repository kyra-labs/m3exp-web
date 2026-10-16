// Spring math for m3exp-web (ROADMAP M3): Compose's SpringSimulation and duration estimate
// (bit-exact ports), FloatSpringSpec helpers, damping conversion, the CSS linear() sampler, and the
// top app bar scroll state (TopAppBarState) and the dropdown menu placement
// (DropdownMenuPositionProvider) shared by m3e-elements and m3e-react, and the window size
// classes (androidx window-core WindowSizeClass, material3-adaptive).
export { type LinearEasing, type LinearEasingOptions, springToLinear } from './linear.js';
export { SpringAnimatable } from './animatable.js';
export { animatedInt, fabMenuItemVisible } from './fab-menu.js';
export { menuNavigationTarget } from './menu-navigation.js';
export { type ToolbarOrientation, toolbarNavigationTarget } from './toolbar-navigation.js';
export {
  type FloatingToolbarExitDirection,
  type FloatingToolbarScrollState,
  type ToolbarExpansionScroll,
  floatingToolbarScrollState,
  scrollFloatingToolbar,
  scrollToolbarExpansion,
  toolbarCollapsedFraction,
  toolbarExpansionScroll,
  toolbarSettleTarget,
  withToolbarOffset,
  withToolbarOffsetLimit,
} from './floating-toolbar-scroll.js';
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
  type TwoRowsFrame,
  FAST_OUT_LINEAR_IN_EASING,
  TOP_TITLE_ALPHA_EASING,
  appBarScrollState,
  collapsedFraction,
  isScrolledUnder,
  overlappedFraction,
  scrollAppBar,
  settleTarget,
  twoRowsFrame,
  withHeight,
  withHeightOffset,
} from './app-bar-scroll.js';
export {
  SEARCH_BAR_EXPANDED_THRESHOLD,
  SEARCH_DROPDOWN_VISIBLE_PROGRESS,
  type SearchBarSample,
  type SearchBarSpecs,
  type SearchRect,
  type SearchViewFrame,
  type SearchViewInput,
  type SearchViewMetrics,
  type SearchViewVariant,
  type TweenSpec,
  SearchBarAnimation,
  TweenAnimatable,
  searchNavigationTarget,
  searchViewFrame,
} from './search-bar.js';
export {
  type ButtonGroupItemSize,
  buttonGroupVisibleCount,
  buttonGroupWidths,
} from './button-group.js';
export {
  NAVIGATION_SUITE_EXPANDED_FROM,
  NAVIGATION_SUITE_TYPES,
  type NavigationSuiteType,
  type NavigationSuiteTypeOptions,
  type PaneScaffoldDirective,
  WINDOW_HEIGHT_BREAKPOINTS,
  WINDOW_WIDTH_BREAKPOINTS,
  type WindowHeightSizeClass,
  type WindowPostureOptions,
  type WindowSizeClass,
  type WindowSizeClassOptions,
  type WindowWidthSizeClass,
  isAtLeastBreakpoint,
  isHeightAtLeastBreakpoint,
  isNavigationBarType,
  isWidthAtLeastBreakpoint,
  navigationSuiteType,
  paneScaffoldDirective,
  sameWindowSizeClass,
  windowHeightSizeClass,
  windowSizeClass,
  windowWidthSizeClass,
} from './window-size-class.js';
export {
  type NavigationSuiteSample,
  NavigationSuiteScaffoldAnimation,
  navigationSuiteOffset,
} from './navigation-suite.js';
export {
  MODAL_RAIL_EXPANDED_PROGRESS,
  type WideNavigationRailAnimationOptions,
  type WideNavigationRailMetrics,
  type WideNavigationRailSample,
  type WideNavigationRailSpecs,
  type WideNavigationRailWidthInput,
  WideNavigationRailAnimation,
  wideNavigationRailItemWidth,
  wideNavigationRailWidth,
} from './wide-navigation-rail.js';
export {
  DRAWER_POSITIONAL_THRESHOLD,
  DRAWER_SETTLE_MILLIS,
  DRAWER_VELOCITY_THRESHOLD,
  type DrawerSample,
  type DrawerSpecs,
  DrawerAnimation,
  drawerSettlesOpen,
  exponentialDecayTarget,
} from './navigation-drawer.js';
export {
  TAB_INDICATOR_MIN_WIDTH,
  type TabIndicatorSample,
  type TabMeasure,
  type TabPosition,
  type TabRowVariant,
  TabIndicatorAnimation,
  TabScrollAnimation,
  scrollableTabOffset,
  tabIndicatorShift,
  tabIndicatorTarget,
  tabPositions,
} from './tabs.js';
