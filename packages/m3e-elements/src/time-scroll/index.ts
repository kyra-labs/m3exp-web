import { M3eTimeScroll } from './time-scroll.js';

// Only the class (m3e-react exports the TimeScroll component). Registers <m3e-time-scroll>.
export { M3eTimeScroll } from './time-scroll.js';

M3eTimeScroll.define('m3e-time-scroll');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-time-scroll': M3eTimeScroll;
  }
}
