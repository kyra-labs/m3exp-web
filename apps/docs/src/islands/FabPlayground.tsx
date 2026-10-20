import {
  Button,
  ExtendedFab,
  type ExtendedFabSize,
  Fab,
  type FabSize,
  Icon,
  useExtendedFabScroll,
} from '@kyralabs/m3exp-web/react';
import { useRef, useState } from 'react';

const SIZES: FabSize[] = ['baseline', 'medium', 'large'];
const EXTENDED_SIZES: ExtendedFabSize[] = ['small', 'medium', 'large'];

/** React FABs: press, the interruptible extended FAB width spring and scroll-driven collapse. */
export default function FabPlayground() {
  const [presses, setPresses] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const scrollExpanded = useExtendedFabScroll({ target: scroller, expandOnScrollUp: true });
  return (
    <div>
      <div className="docs-button-row" data-testid="react-fabs">
        {SIZES.map((size) => (
          <Fab
            key={size}
            size={size}
            aria-label={`Create (${size})`}
            icon={<Icon name="add" />}
            onPress={() => {
              setPresses((n) => n + 1);
            }}
          />
        ))}
      </div>
      <p aria-live="polite">Pressed {presses} times.</p>
      <div className="docs-button-row">
        <Button
          variant="outlined"
          data-testid="react-extended-toggle"
          onPress={() => {
            setExpanded((value) => !value);
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
      <div className="docs-button-row" data-testid="react-extended">
        {EXTENDED_SIZES.map((size) => (
          <ExtendedFab
            key={size}
            size={size}
            icon={<Icon name="add" />}
            label="Create"
            isExpanded={expanded}
            data-size={size}
          />
        ))}
      </div>
      <div className="docs-fab-frame">
        <div
          ref={scroller}
          className="docs-scroll"
          data-testid="scroll-demo"
          tabIndex={0}
          role="region"
          aria-label="Scrolling list"
        >
          <ul className="docs-scroll-list">
            {Array.from({ length: 30 }, (_, i) => (
              <li key={i}>List item {i + 1}</li>
            ))}
          </ul>
        </div>
        <ExtendedFab
          icon={<Icon name="add" />}
          label="Compose"
          className="docs-fab-anchor"
          color="tertiary-container"
          isExpanded={scrollExpanded}
          data-testid="scroll-fab"
        />
      </div>
    </div>
  );
}
