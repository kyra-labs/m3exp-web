// Press ripple for plain-HTML m3e-css components, document-wide (registers no element).
// Side effect: importing this entry enables it; `attachAutoRipple` (also exported from the
// package root, without the side effect) scopes it to a root and stops it with a signal.
import { attachAutoRipple } from './ripple.js';

export { attachAutoRipple } from './ripple.js';

if (typeof window !== 'undefined') attachAutoRipple(document, new AbortController().signal);
