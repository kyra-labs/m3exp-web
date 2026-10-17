import { M3eChipSet } from './chip-set.js';

// Only the class and its event detail (m3e-react exports the chip components; one name per
// package in the umbrella). Registers <m3e-chip-set>. ChipSetLayout has its own entry
// (chip-set-layout.js).
export { M3eChipSet, type ChipSetRemoveDetail } from './chip-set.js';

M3eChipSet.define('m3e-chip-set');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-chip-set': M3eChipSet;
  }
}
