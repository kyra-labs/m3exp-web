import { SupportingPaneScaffold } from '@kyralabs/m3exp-web/react';

/** The main pane alone below 840px; the supporting pane beside it above. */
export default function SupportingPane() {
  return (
    <div
      style={{
        inlineSize: '100%',
        blockSize: 'var(--m3e-sys-window-height-medium)',
        overflow: 'hidden',
      }}
    >
      <SupportingPaneScaffold
        paneLabels={{ main: 'Article', supporting: 'Related' }}
        mainPane={
          <article style={{ padding: 'var(--m3e-sys-space-200)' }}>
            <h4>Five days in the mountains</h4>
            <p>The main pane holds the content people came for.</p>
          </article>
        }
        supportingPane={
          <aside style={{ padding: 'var(--m3e-sys-space-200)' }}>
            <h4>Related</h4>
            <p>Supporting content that adds to it.</p>
          </aside>
        }
      />
    </div>
  );
}
