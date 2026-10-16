import {
  AppBarWithSearch,
  IconButton,
  Icon,
  SearchBar,
  type SearchBarVariant,
  SearchResult,
} from '@kyralabs/m3exp-web/react';
import { useId, useRef, useState } from 'react';

const ITEMS = Array.from({ length: 30 }, (_, i) => `Text ${String(i)}`);
const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Kiwi', 'Mango'];
const VARIANTS: readonly SearchBarVariant[] = [
  'full-screen',
  'full-screen-contained',
  'docked',
  'docked-with-gap',
];

/** A React AppBarWithSearch (enter-always) with a filtering SearchBar in every variant. */
export default function SearchPlayground() {
  const scroller = useRef<HTMLDivElement>(null);
  const id = useId();
  const [variant, setVariant] = useState<SearchBarVariant>('docked-with-gap');
  const [query, setQuery] = useState('');
  const [last, setLast] = useState('none');
  const matches = FRUITS.filter((f) => f.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <>
      <div className="docs-docked-toolbar-controls">
        <label htmlFor={`${id}-variant`}>Variant</label>
        <select
          id={`${id}-variant`}
          data-testid="react-variant"
          value={variant}
          onChange={(e) => {
            setVariant(e.target.value as SearchBarVariant);
          }}
        >
          {VARIANTS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <span>
          Last event: <output data-testid="react-log">{last}</output>
        </span>
      </div>
      <div
        ref={scroller}
        className="docs-scroll docs-search-scroll"
        data-testid="react-scroll"
        tabIndex={0}
        role="region"
        aria-label="React AppBarWithSearch demo"
      >
        <AppBarWithSearch
          className="docs-sticky"
          scrollBehavior="enter-always"
          scrollTarget={scroller}
          navigationIcon={
            <IconButton aria-label="Menu">
              <Icon name="menu" />
            </IconButton>
          }
          actions={
            <IconButton aria-label="Account">
              <Icon name="account_circle" />
            </IconButton>
          }
        >
          <SearchBar
            key={variant}
            variant={variant}
            aria-label="Search fruit"
            placeholder="Search fruit"
            value={query}
            onChange={setQuery}
            onSearch={(q) => {
              setLast(`search: ${q}`);
            }}
            onSelect={(value) => {
              setLast(`select: ${value}`);
            }}
          >
            {matches.map((fruit) => (
              <SearchResult key={fruit} value={fruit.toLowerCase()} icon="history">
                {fruit}
              </SearchResult>
            ))}
          </SearchBar>
        </AppBarWithSearch>
        <ul className="docs-scroll-list">
          {ITEMS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
