import { useRef, useState } from 'react';
import {
  AppBarWithSearch,
  Icon,
  IconButton,
  SearchBar,
  SearchResult,
} from '@kyralabs/m3exp-web/react';

const RECENT = ['Hiking trails', 'Kayak rental', 'Mountain huts'];
const ROWS = Array.from({ length: 20 }, (_, i) => `Trip ${String(i + 1)}`);

export default function AppBar() {
  const scroller = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  return (
    <div
      ref={scroller}
      tabIndex={0}
      role="region"
      aria-label="Trips, scrollable"
      style={{
        overflow: 'auto',
        inlineSize: '100%',
        maxInlineSize: 'var(--m3e-sys-window-width-medium)',
        blockSize: 'var(--m3e-sys-window-height-medium)',
      }}
    >
      <AppBarWithSearch
        scrollBehavior="enter-always"
        scrollTarget={scroller}
        style={{ position: 'sticky', insetBlockStart: 0, zIndex: 1 }}
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
          variant="docked-with-gap"
          aria-label="Search trips"
          placeholder="Search trips"
          value={query}
          onChange={setQuery}
        >
          {RECENT.filter((r) => r.toLowerCase().includes(query.trim().toLowerCase())).map((r) => (
            <SearchResult key={r} value={r} icon="history">
              {r}
            </SearchResult>
          ))}
        </SearchBar>
      </AppBarWithSearch>
      <ul style={{ margin: 0, padding: 'var(--m3e-sys-space-200)' }}>
        {ROWS.map((row) => (
          <li key={row} style={{ paddingBlock: 'var(--m3e-sys-space-150)' }}>
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
}
