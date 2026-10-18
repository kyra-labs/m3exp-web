---
'@kyralabs/m3e-tokens': patch
'@kyralabs/m3e-css': patch
'@kyralabs/m3e-elements': patch
'@kyralabs/m3e-react': patch
'@kyralabs/m3exp-web': patch
---

Chip set: the arrow keys now wrap from the last chip to the first and back (mirrored in RTL), in `<m3e-chip-set>` and m3e-react's `<ChipSet>` (both run `ChipSetLayout`), matching `<InputChipGroup>` (React Aria TagGroup). Previously they stopped at the ends. Home / End and the single tab stop are unchanged.
