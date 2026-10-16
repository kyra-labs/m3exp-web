import { M3eSearch, M3eSearchResult } from './search.js';

// Only the classes: m3e-react exports the search types (one name per package in the umbrella).
// SearchLayout has its own entry (search-layout.js).
export { M3eSearch, M3eSearchResult } from './search.js';

M3eSearchResult.define('m3e-search-result');
M3eSearch.define('m3e-search');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-search': M3eSearch;
    'm3e-search-result': M3eSearchResult;
  }
}
