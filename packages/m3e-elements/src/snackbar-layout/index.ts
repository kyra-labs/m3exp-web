// Snackbar host behavior (registers no element), shared by <m3e-snackbar-host> and m3e-react's
// <SnackbarHost>: the SnackbarHostState queue, the durations, the fade / scale springs, the
// hover / focus pause, Escape and focus().
export {
  type RecommendedTimeout,
  type ShowSnackbarOptions,
  type SnackbarData,
  type SnackbarDuration,
  type SnackbarHostControllerOptions,
  type SnackbarResult,
  type SnackbarTimeoutContent,
  type SnackbarVisuals,
  SNACKBAR_DISMISS_LABEL,
  SnackbarHostController,
  SnackbarHostState,
  snackbarDurationMillis,
} from './snackbar-layout.js';
