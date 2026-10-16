---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Search (M6, COMPONENT_SPEC §12; Compose `SearchBar`, `SearchBarDefaults.InputField`, `AppBarWithSearch` and the four expanded views): the collapsed search bar, the full-screen, full-screen contained, docked and docked-with-gap expanded views (expand / collapse on Compose's SearchBarState springs and fades, interruptible), the ARIA combobox (virtual focus over a results listbox), light dismiss and the full-screen focus trap, and AppBarWithSearch with its enter-always scroll behavior and scrolled colors. New `components/search-defaults.css` tokens (the SearchBarDefaults / SearchBar.kt values Compose renders), m3e-css `search.css`, m3e-motion `SearchBarAnimation`, `searchViewFrame` and `searchNavigationTarget`, m3e-elements `<m3e-search>` / `<m3e-search-result>` plus the `search-layout.js` (SearchLayout) entry, and m3e-react `<SearchBar>`, `<SearchResult>` and `<AppBarWithSearch>`.
