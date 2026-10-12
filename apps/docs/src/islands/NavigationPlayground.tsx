import {
  Icon,
  IconButton,
  type NavigationDestination,
  ShortNavigationBar,
  WideNavigationRail,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'favorite', icon: 'favorite', label: 'Favorites' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

/** React navigation bar / rail with live selection (React Aria; CSS springs on the indicator). */
export default function NavigationPlayground({ kind }: { kind: 'bar' | 'rail' }) {
  const [selected, setSelected] = useState('home');
  const [expanded, setExpanded] = useState(false);
  if (kind === 'bar') {
    return (
      <div className="docs-nav-frame">
        <ShortNavigationBar
          aria-label="React example"
          data-testid="react-bar"
          items={ITEMS}
          selectedKey={selected}
          onSelectionChange={setSelected}
        />
      </div>
    );
  }
  return (
    <div className="docs-rail-frames">
      <WideNavigationRail
        aria-label="React example"
        data-testid="react-rail"
        items={ITEMS}
        selectedKey={selected}
        onSelectionChange={setSelected}
        isExpanded={expanded}
        header={
          <IconButton
            className="docs-rail-menu"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
            onPress={() => {
              setExpanded((value) => !value);
            }}
          >
            <Icon name="menu" />
          </IconButton>
        }
      />
    </div>
  );
}
