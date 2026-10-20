import { useState } from 'react';
import { Button, SideSheet } from '@kyralabs/m3exp-web/react';

export default function Standard() {
  const [open, setOpen] = useState(true);
  return (
    <div
      style={{
        display: 'flex',
        inlineSize: '100%',
        blockSize: 'var(--m3e-sys-window-height-medium)',
      }}
    >
      <div style={{ flex: '1', minInlineSize: '0', padding: 'var(--m3e-sys-space-200)' }}>
        <Button
          variant="outlined"
          onPress={() => {
            setOpen((o) => !o);
          }}
        >
          {open ? 'Close details' : 'Show details'}
        </Button>
      </div>
      <SideSheet isOpen={open} onOpenChange={setOpen} headline="Details" divider>
        <p>The content beside a standard sheet narrows while it is open.</p>
      </SideSheet>
    </div>
  );
}
