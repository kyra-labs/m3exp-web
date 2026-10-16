// Drivers and DOM contracts of the progress indicators (registers no element).
// `<m3e-linear-progress>`, `<m3e-circular-progress>` and m3e-react's <LinearProgress> /
// <CircularProgress> all use them, so the layers write the same DOM.
export { type ProgressIndicatorOptions, ProgressIndicatorDriver, progressValue } from './driver.js';
export {
  type LinearProgressContract,
  LinearProgressDriver,
  linearProgressClass,
  linearProgressParts,
  renderLinearProgress,
} from './linear.js';
export {
  type CircularProgressContract,
  CircularProgressDriver,
  circularProgressClass,
  renderCircularProgress,
} from './circular.js';
export { M3eProgressElement, type ProgressContract } from './element.js';
