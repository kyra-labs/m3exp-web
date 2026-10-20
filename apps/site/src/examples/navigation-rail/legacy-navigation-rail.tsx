import { type NavigationDestination, NavigationRail } from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

/** Deprecated (D4): use WideNavigationRail. */
export default function LegacyNavigationRail() {
  return (
    <div style={{ display: 'flex', blockSize: 'var(--m3e-sys-window-height-medium)' }}>
      <NavigationRail aria-label="Main, legacy" items={ITEMS} defaultSelectedKey="home" />
    </div>
  );
}
