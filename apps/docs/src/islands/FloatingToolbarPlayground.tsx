import { Fab, FloatingToolbar, Icon, IconButton } from '@kyralabs/m3exp-web/react';
import { useRef, useState } from 'react';

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${String(i + 1)}`);

const actions = (names: readonly [string, string][]) =>
  names.map(([icon, label]) => (
    <IconButton key={icon} aria-label={label}>
      <Icon name={icon} />
    </IconButton>
  ));

/** React floating toolbars: FAB toggling `expanded`, vertical, and both scroll behaviors. */
export default function FloatingToolbarPlayground() {
  const [expanded, setExpanded] = useState(true);
  const exitScroller = useRef<HTMLDivElement>(null);
  const collapseScroller = useRef<HTMLDivElement>(null);
  const [collapseExpanded, setCollapseExpanded] = useState(true);
  return (
    <div>
      <div className="docs-floating-toolbar-row">
        <FloatingToolbar
          aria-label="React actions"
          colorStyle="vibrant"
          expanded={expanded}
          data-testid="react-fab-toolbar"
          fab={
            <Fab
              icon={<Icon name={expanded ? 'close' : 'add'} />}
              aria-label={expanded ? 'Collapse toolbar' : 'Expand toolbar'}
              onPress={() => {
                setExpanded((e) => !e);
              }}
            />
          }
        >
          {actions([
            ['search', 'Search'],
            ['edit', 'Edit'],
            ['share', 'Share'],
          ])}
        </FloatingToolbar>
        <FloatingToolbar
          aria-label="React vertical"
          orientation="vertical"
          data-testid="react-vertical-toolbar"
          leading={actions([['check', 'Done']])}
          trailing={actions([['favorite', 'Favorite']])}
        >
          {actions([
            ['format_bold', 'Bold'],
            ['format_italic', 'Italic'],
          ])}
        </FloatingToolbar>
      </div>
      <div className="docs-floating-toolbar-row">
        <div className="docs-floating-toolbar-scroll-frame">
          <div
            ref={exitScroller}
            className="docs-floating-toolbar-scroll"
            data-testid="exit-scroller"
            tabIndex={0}
            role="region"
            aria-label="exitAlways demo"
          >
            <ul className="docs-scroll-list">
              {ROWS.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </div>
          <FloatingToolbar
            aria-label="exitAlways toolbar"
            className="docs-floating-toolbar-anchored"
            scrollBehavior="exitAlways"
            scrollTarget={exitScroller}
            data-testid="react-exit-toolbar"
          >
            {actions([
              ['format_bold', 'Bold'],
              ['format_italic', 'Italic'],
              ['format_underlined', 'Underline'],
            ])}
          </FloatingToolbar>
        </div>
        <div className="docs-floating-toolbar-scroll-frame">
          <div
            ref={collapseScroller}
            className="docs-floating-toolbar-scroll"
            data-testid="collapse-scroller"
            tabIndex={0}
            role="region"
            aria-label="collapse demo"
          >
            <ul className="docs-scroll-list">
              {ROWS.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </div>
          <FloatingToolbar
            aria-label="collapse toolbar"
            className="docs-floating-toolbar-anchored"
            scrollBehavior="collapse"
            scrollTarget={collapseScroller}
            expanded={collapseExpanded}
            onExpandedChange={setCollapseExpanded}
            leading={actions([['check', 'Done']])}
            trailing={actions([['favorite', 'Favorite']])}
            data-testid="react-collapse-toolbar"
          >
            {actions([['edit', 'Edit']])}
          </FloatingToolbar>
        </div>
      </div>
    </div>
  );
}
