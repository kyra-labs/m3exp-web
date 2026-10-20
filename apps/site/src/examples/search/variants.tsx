import { useState } from 'react';
import { SearchBar, type SearchBarVariant, SearchResult } from '@kyralabs/m3exp-web/react';

const FRUITS = ['Apple', 'Apricot', 'Banana', 'Blueberry', 'Cherry', 'Grape', 'Kiwi', 'Mango'];

function FruitSearch({ variant }: { variant: SearchBarVariant }) {
  const [query, setQuery] = useState('');
  const matches = FRUITS.filter((f) => f.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <SearchBar
      variant={variant}
      aria-label={`Search fruit (${variant})`}
      placeholder={`Search fruit (${variant})`}
      value={query}
      onChange={setQuery}
      onSelect={(value) => {
        console.log('selected', value);
      }}
    >
      {matches.map((fruit) => (
        <SearchResult key={fruit} value={fruit.toLowerCase()} icon="history">
          {fruit}
        </SearchResult>
      ))}
    </SearchBar>
  );
}

export default function Variants() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-200)', inlineSize: '100%' }}>
      <FruitSearch variant="full-screen" />
      <FruitSearch variant="full-screen-contained" />
      <FruitSearch variant="docked" />
      <FruitSearch variant="docked-with-gap" />
    </div>
  );
}
