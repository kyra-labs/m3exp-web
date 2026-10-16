import {
  Button,
  Icon,
  IconButton,
  NavigationDrawer,
  type NavigationDrawerEntry,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const ITEMS: NavigationDrawerEntry[] = [
  { key: 'mail', type: 'headline', label: 'Mail' },
  { key: 'inbox', icon: 'inbox', label: 'Inbox', badge: '24' },
  { key: 'outbox', icon: 'send', label: 'Outbox' },
  { key: 'drafts', icon: 'drafts', label: 'Drafts' },
  { key: 'divider', type: 'divider' },
  { key: 'trash', icon: 'delete', label: 'Trash' },
];

type Variant = 'permanent' | 'dismissible' | 'modal';

/** React navigation drawer: switch the variant, open / close it, select (the shared layout). */
export default function DrawerPlayground() {
  const [variant, setVariant] = useState<Variant>('dismissible');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('inbox');
  return (
    <>
      <div className="docs-drawer-controls" role="group" aria-label="Variant">
        {(['permanent', 'dismissible', 'modal'] as const).map((v) => (
          <Button
            key={v}
            variant={v === variant ? 'filled' : 'outlined'}
            aria-pressed={v === variant}
            data-testid={`react-variant-${v}`}
            onPress={() => {
              setVariant(v);
              setOpen(false);
            }}
          >
            {v}
          </Button>
        ))}
      </div>
      <div className="docs-drawer-frame" data-testid="react-frame">
        <NavigationDrawer
          variant={variant}
          aria-label="React example"
          data-testid="react-drawer"
          items={ITEMS}
          selectedKey={selected}
          onSelectionChange={(key) => {
            setSelected(key);
            if (variant === 'modal') setOpen(false);
          }}
          isOpen={open}
          onOpenChange={setOpen}
        />
        <div className="docs-drawer-content">
          {variant === 'permanent' ? null : (
            <IconButton
              aria-label="Open navigation menu"
              aria-expanded={open}
              data-testid="react-drawer-toggle"
              onPress={() => {
                setOpen((value) => !value);
              }}
            >
              <Icon name="menu" />
            </IconButton>
          )}
          <p>Selected: {selected}</p>
        </div>
      </div>
    </>
  );
}
