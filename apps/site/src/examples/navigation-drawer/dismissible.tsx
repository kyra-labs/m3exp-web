import { useState } from 'react';
import {
  Icon,
  IconButton,
  NavigationDrawer,
  type NavigationDrawerEntry,
} from '@kyralabs/m3exp-web/react';

const ITEMS: NavigationDrawerEntry[] = [
  { key: 'inbox', icon: 'inbox', label: 'Inbox', badge: '24' },
  { key: 'outbox', icon: 'send', label: 'Outbox' },
  { key: 'favorites', icon: 'favorite', label: 'Favorites' },
];

export default function Dismissible() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('inbox');
  return (
    <div
      style={{
        display: 'flex',
        inlineSize: '100%',
        blockSize: 'var(--m3e-sys-window-height-medium)',
        overflow: 'hidden',
      }}
    >
      <NavigationDrawer
        variant="dismissible"
        aria-label="Mail, dismissible"
        items={ITEMS}
        selectedKey={selected}
        onSelectionChange={(key) => {
          setSelected(key);
        }}
        isOpen={open}
        onOpenChange={setOpen}
      />
      <div style={{ padding: 'var(--m3e-sys-space-200)' }}>
        <IconButton
          aria-label="Navigation menu"
          aria-expanded={open}
          onPress={() => {
            setOpen((o) => !o);
          }}
        >
          <Icon name="menu" />
        </IconButton>
        <p>Selected: {selected}</p>
      </div>
    </div>
  );
}
