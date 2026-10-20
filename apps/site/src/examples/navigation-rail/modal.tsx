import { useState } from 'react';
import {
  Icon,
  IconButton,
  ModalWideNavigationRail,
  type NavigationDestination,
} from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'mail', icon: 'mail', label: 'Mail' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

/** Collapsed it is a rail; the menu button opens it as a modal window over the page. */
export default function Modal() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ display: 'flex', blockSize: 'var(--m3e-sys-window-height-medium)' }}>
      <ModalWideNavigationRail
        aria-label="Main, modal"
        items={ITEMS}
        defaultSelectedKey="home"
        isExpanded={expanded}
        onExpandedChange={setExpanded}
        header={
          <IconButton
            aria-label={expanded ? 'Close navigation' : 'Open navigation'}
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
