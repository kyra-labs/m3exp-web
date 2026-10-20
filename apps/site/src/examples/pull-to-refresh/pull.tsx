import { useState } from 'react';
import { Icon, IconButton, PullToRefresh } from '@kyralabs/m3exp-web/react';

const ROWS = Array.from({ length: 20 }, (_, i) => `Item ${String(i + 1)}`);

/** Pull down with touch or a pen; the Refresh button is the keyboard and mouse path. */
export default function Pull() {
  const [refreshing, setRefreshing] = useState(false);
  const [count, setCount] = useState(0);
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setCount((c) => c + 1);
      setRefreshing(false);
    }, 1500);
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        inlineSize: '100%',
        maxInlineSize: 'var(--m3e-sys-window-width-medium)',
        blockSize: 'var(--m3e-sys-window-height-medium)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ paddingInline: 'var(--m3e-sys-space-200)' }}>Refreshed {count} times.</p>
        <IconButton aria-label="Refresh" isDisabled={refreshing} onPress={refresh}>
          <Icon name="refresh" />
        </IconButton>
      </div>
      <PullToRefresh isRefreshing={refreshing} onRefresh={refresh}>
        <ul style={{ margin: 0, padding: 'var(--m3e-sys-space-200)' }}>
          {ROWS.map((row) => (
            <li key={row} style={{ paddingBlock: 'var(--m3e-sys-space-150)' }}>
              {row}
            </li>
          ))}
        </ul>
      </PullToRefresh>
    </div>
  );
}
