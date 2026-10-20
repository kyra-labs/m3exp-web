import { useState } from 'react';
import {
  Fab,
  Icon,
  NavigationSuiteScaffold,
  type NavigationSuiteDestination,
} from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationSuiteDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search', badge: true },
  { key: 'mail', icon: 'mail', label: 'Mail', badge: 3 },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

/** A bar below 600px, a collapsed rail from 600px, the expanded rail from 1200px. */
export default function Adaptive() {
  const [selected, setSelected] = useState('home');
  return (
    <div
      style={{
        inlineSize: '100%',
        blockSize: 'var(--m3e-sys-window-height-medium)',
        overflow: 'hidden',
      }}
    >
      <NavigationSuiteScaffold
        aria-label="Main"
        items={ITEMS}
        selectedKey={selected}
        onSelectionChange={setSelected}
        primaryAction={<Fab icon={<Icon name="edit" />} aria-label="Compose" />}
      >
        <p style={{ padding: 'var(--m3e-sys-space-200)' }}>
          {ITEMS.find((item) => item.key === selected)?.label}: resize the window to switch between
          the bar and the rail.
        </p>
      </NavigationSuiteScaffold>
    </div>
  );
}
