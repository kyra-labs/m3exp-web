import { NavigationDrawer, type NavigationDrawerEntry } from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDrawerEntry[] = [
  { key: 'inbox', icon: 'inbox', label: 'Inbox', badge: '24' },
  { key: 'outbox', icon: 'send', label: 'Outbox' },
  { key: 'favorites', icon: 'favorite', label: 'Favorites' },
  { key: 'divider', type: 'divider' },
  { key: 'labels', type: 'headline', label: 'Labels' },
  { key: 'family', icon: 'bookmark', label: 'Family' },
  { key: 'work', icon: 'bookmark', label: 'Work' },
];

export default function Standard() {
  return (
    <div style={{ display: 'flex', blockSize: 'var(--m3e-sys-window-height-medium)' }}>
      <NavigationDrawer aria-label="Mail" items={ITEMS} defaultSelectedKey="inbox" />
    </div>
  );
}
