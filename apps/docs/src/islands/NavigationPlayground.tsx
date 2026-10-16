import {
  Icon,
  IconButton,
  ModalWideNavigationRail,
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

/** The Compose samples' header: a menu button that toggles the rail and announces its state. */
function MenuButton({ expanded, onPress }: { expanded: boolean; onPress: () => void }) {
  return (
    <IconButton
      className="docs-rail-menu"
      aria-label={expanded ? 'Collapse' : 'Expand'}
      aria-expanded={expanded}
      onPress={onPress}
    >
      <Icon name={expanded ? 'menu_open' : 'menu'} />
    </IconButton>
  );
}

/** React navigation bar / rails with live selection (React Aria; the shared rail layout). */
export default function NavigationPlayground({ kind }: { kind: 'bar' | 'rail' }) {
  const [selected, setSelected] = useState('home');
  const [expanded, setExpanded] = useState(false);
  const [modalExpanded, setModalExpanded] = useState(false);
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
          <MenuButton
            expanded={expanded}
            onPress={() => {
              setExpanded((value) => !value);
            }}
          />
        }
      />
      <ModalWideNavigationRail
        aria-label="React modal example"
        data-testid="react-modal-rail"
        items={ITEMS}
        selectedKey={selected}
        onSelectionChange={setSelected}
        isExpanded={modalExpanded}
        onExpandedChange={setModalExpanded}
        header={
          <MenuButton
            expanded={modalExpanded}
            onPress={() => {
              setModalExpanded((value) => !value);
            }}
          />
        }
      />
    </div>
  );
}
