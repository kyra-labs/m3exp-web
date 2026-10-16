// Window size classes (FOUNDATIONS §9; registers no element): the viewport / container observer
// and the m3e-motion classification it uses (androidx window-core + material3-adaptive ports).
export {
  type ObserveWindowSizeClassOptions,
  type WindowSizeClassTargetOptions,
  currentWindowSizeClass,
  observeWindowSizeClass,
} from './window-size-class.js';
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
} from '@kyralabs/m3e-motion';
