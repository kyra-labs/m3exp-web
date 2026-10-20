import { useState } from 'react';
import {
  Icon,
  IconButton,
  type NavigationDestination,
  WideNavigationRail,
} from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'mail', icon: 'mail', label: 'Mail', badge: 3 },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

export default function Wide() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ display: 'flex', blockSize: 'var(--m3e-sys-window-height-medium)' }}>
      <WideNavigationRail
        aria-label="Main, wide"
        isExpanded={expanded}
        items={ITEMS}
        defaultSelectedKey="home"
        header={
          <IconButton
            aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
            aria-expanded={expanded}
            onPress={() => {
              setExpanded((e) => !e);
            }}
          >
            <Icon name={expanded ? 'menu_open' : 'menu'} />
          </IconButton>
        }
      />
    </div>
  );
}
