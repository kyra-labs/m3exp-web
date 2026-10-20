import { BottomSheet } from '@kyralabs/m3exp-web/react';

export default function Standard() {
  return (
    <div
      style={{
        position: 'relative',
        inlineSize: '100%',
        blockSize: 'var(--m3e-sys-window-height-medium)',
        overflow: 'hidden',
      }}
    >
      <p>Drag the handle, or focus it and press the arrow keys.</p>
      <BottomSheet
        aria-label="Details"
        defaultValue="partially-expanded"
        peekHeight
        skipHiddenState
      >
        <p style={{ paddingInline: 'var(--m3e-sys-space-300)' }}>
          A standard sheet stays in the layout: the page behind it is still usable.
        </p>
      </BottomSheet>
    </div>
  );
}
