import { FabMenu, type FabMenuItem } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/** React FAB menu (controlled), opening from a medium FAB. */
export default function FabMenuPlayground() {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const items: FabMenuItem[] = [
    { icon: 'mail', label: 'Email' },
    { icon: 'chat', label: 'Message' },
    { icon: 'link', label: 'Copy link' },
    { icon: 'edit', label: 'Edit' },
  ].map((item) => ({
    ...item,
    onPress: () => {
      setChosen(item.label);
    },
  }));
  return (
    <div>
      <div className="docs-fab-menu-row">
        <div className="docs-fab-menu-frame docs-fab-menu-frame--tall">
          <FabMenu
            aria-label="Share"
            icon="share"
            size="medium"
            open={open}
            onOpenChange={setOpen}
            items={items}
            data-testid="react-menu"
          />
        </div>
      </div>
      <p aria-live="polite" data-testid="react-chosen">
        {chosen ? `Chose ${chosen}.` : 'Nothing chosen yet.'}
      </p>
    </div>
  );
}
