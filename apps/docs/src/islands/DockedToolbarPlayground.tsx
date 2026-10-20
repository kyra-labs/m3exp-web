/* eslint-disable @typescript-eslint/no-deprecated -- D4: the docs show the legacy BottomAppBar too */
import {
  BottomAppBar,
  DockedToolbar,
  type DockedToolbarArrangement,
  Fab,
  Icon,
  IconButton,
} from '@kyralabs/m3exp-web/react';
import { type RefObject, useId, useRef, useState } from 'react';

const ROWS = Array.from({ length: 30 }, (_, i) => `Row ${String(i + 1)}`);
const ARRANGEMENTS: readonly DockedToolbarArrangement[] = [
  'spread',
  'center',
  'space-around',
  'space-evenly',
];

/** The items of Compose's ExitAlwaysBottomAppBar* samples (the third is a filled icon button). */
const items = () =>
  (
    [
      ['arrow_back', 'Back'],
      ['arrow_forward', 'Forward'],
      ['add', 'Add'],
      ['check', 'Check'],
      ['edit', 'Edit'],
    ] as const
  ).map(([icon, label], i) => (
    <IconButton
      key={icon}
      aria-label={label}
      {...(i === 2 ? { variant: 'filled' as const, width: 'wide' as const } : {})}
    >
      <Icon name={icon} />
    </IconButton>
  ));

function Scroller({
  scrollerRef,
  testId,
  label,
}: {
  scrollerRef: RefObject<HTMLDivElement | null>;
  testId: string;
  label: string;
}) {
  return (
    <div
      ref={scrollerRef}
      className="docs-docked-toolbar-scroll"
      data-testid={testId}
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <ul className="docs-scroll-list">
        {ROWS.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </div>
  );
}

/** React docked toolbar (arrangement switch) or the deprecated bottom app bar, exit-always. */
export default function DockedToolbarPlayground({ kind }: { kind: 'docked' | 'legacy' }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [arrangement, setArrangement] = useState<DockedToolbarArrangement>('spread');
  const selectId = useId();
  if (kind === 'legacy') {
    return (
      <div className="docs-docked-toolbar-scroll-frame">
        <Scroller scrollerRef={scroller} testId="legacy-scroller" label="BottomAppBar demo" />
        <BottomAppBar
          aria-label="React legacy actions"
          scrollBehavior="exit-always"
          scrollTarget={scroller}
          className="docs-docked-toolbar-docked"
          data-testid="legacy-react"
          actions={
            <>
              <IconButton aria-label="Check">
                <Icon name="check" />
              </IconButton>
              <IconButton aria-label="Edit">
                <Icon name="edit" />
              </IconButton>
            </>
          }
          floatingActionButton={<Fab icon={<Icon name="add" />} aria-label="Add" />}
        />
      </div>
    );
  }
  return (
    <div>
      <p className="docs-docked-toolbar-controls">
        <label htmlFor={selectId}>Arrangement </label>
        <select
          id={selectId}
          value={arrangement}
          data-testid="react-arrangement"
          onChange={(e) => {
            setArrangement(e.target.value as DockedToolbarArrangement);
          }}
        >
          {ARRANGEMENTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </p>
      <div className="docs-docked-toolbar-scroll-frame">
        <Scroller scrollerRef={scroller} testId="react-scroller" label="DockedToolbar demo" />
        <DockedToolbar
          aria-label="React actions"
          arrangement={arrangement}
          scrollBehavior="exit-always"
          scrollTarget={scroller}
          className="docs-docked-toolbar-docked"
          data-testid="react-toolbar"
        >
          {items()}
        </DockedToolbar>
      </div>
    </div>
  );
}
