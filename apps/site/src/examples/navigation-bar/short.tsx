import { type NavigationDestination, ShortNavigationBar } from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'mail', icon: 'mail', label: 'Mail', badge: 3 },
  { key: 'settings', icon: 'settings', label: 'Settings', badge: true },
];

export default function Short() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-200)', inlineSize: '100%' }}>
      <ShortNavigationBar aria-label="Main" items={ITEMS} defaultSelectedKey="home" />
      <ShortNavigationBar
        aria-label="Main, horizontal"
        layout="horizontal"
        items={ITEMS}
        defaultSelectedKey="mail"
      />
    </div>
  );
}
