export * from './base/index.js';
export * from './icon/index.js';
export * from './top-app-bar/index.js';
export * from './loading-indicator/index.js';
export * from './fab-menu/index.js';
// Not `export *` from './ripple/index.js': that entry enables the ripple document-wide on import.
export { attachAutoRipple } from './ripple/ripple.js';
