import { useRef } from 'react';
import { Icon, IconButton, TopAppBar } from '@kyralabs/m3exp-web/react';

const ITEMS = Array.from({ length: 20 }, (_, i) => `Message ${String(i + 1)}`);

export default function Scroll() {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={scroller}
      tabIndex={0}
      role="region"
      aria-label="Inbox, scrollable"
      style={{
        overflow: 'auto',
        inlineSize: '100%',
        maxInlineSize: 'var(--m3e-sys-window-width-medium)',
        blockSize: 'var(--m3e-sys-window-height-medium)',
      }}
    >
      <TopAppBar
        headingLevel={4}
        variant="large-flexible"
        title="Inbox"
        subtitle="20 messages"
        scrollBehavior="exit-until-collapsed"
        scrollTarget={scroller}
        navigationIcon={
          <IconButton aria-label="Back">
            <Icon name="arrow_back" />
          </IconButton>
        }
        actions={
          <IconButton aria-label="Search">
            <Icon name="search" />
          </IconButton>
        }
        style={{ position: 'sticky', insetBlockStart: 0, zIndex: 1 }}
      />
      <ul style={{ margin: 0, padding: 'var(--m3e-sys-space-200)' }}>
        {ITEMS.map((item) => (
          <li key={item} style={{ paddingBlock: 'var(--m3e-sys-space-150)' }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
