import { useRef } from 'react';
import { FloatingToolbar, Icon, IconButton } from '@kyralabs/m3exp-web/react';

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${String(i + 1)}`);

export default function Scroll() {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        inlineSize: '100%',
        maxInlineSize: 'var(--m3e-sys-window-width-medium)',
        blockSize: 'var(--m3e-sys-window-height-medium)',
      }}
    >
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Rows, scrollable"
        style={{ overflow: 'auto', blockSize: '100%' }}
      >
        <ul style={{ margin: 0, padding: 'var(--m3e-sys-space-200)' }}>
          {ROWS.map((row) => (
            <li key={row} style={{ paddingBlock: 'var(--m3e-sys-space-150)' }}>
              {row}
            </li>
          ))}
        </ul>
      </div>
      <FloatingToolbar
        aria-label="Formatting"
        scrollBehavior="exit-always"
        scrollTarget={scroller}
        style={{
          position: 'absolute',
          insetBlockEnd: 'var(--m3e-comp-floating-toolbar-defaults-screen-offset)',
          insetInline: 0,
          inlineSize: 'fit-content',
          marginInline: 'auto',
        }}
      >
        <IconButton aria-label="Bold">
          <Icon name="format_bold" />
        </IconButton>
        <IconButton aria-label="Italic">
          <Icon name="format_italic" />
        </IconButton>
        <IconButton aria-label="Underline">
          <Icon name="format_underlined" />
        </IconButton>
      </FloatingToolbar>
    </div>
  );
}
