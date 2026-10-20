import { type NavigationDestination, NavigationBar } from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

/** Deprecated (D4): use ShortNavigationBar. */
export default function LegacyNavigationBar() {
  return (
    <NavigationBar
      aria-label="Main, legacy"
      items={ITEMS}
      defaultSelectedKey="home"
      style={{ inlineSize: '100%' }}
    />
  );
}
