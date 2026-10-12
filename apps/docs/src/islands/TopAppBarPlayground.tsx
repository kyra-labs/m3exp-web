import { Icon, IconButton, TopAppBar } from '@kyralabs/m3exp-web/react';
import { useRef } from 'react';

const ITEMS = Array.from({ length: 24 }, (_, i) => `Item ${String(i + 1)}`);

/** A React top app bar that hides on scroll down and returns on scroll up. */
export default function TopAppBarPlayground() {
  const scroller = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={scroller}
      className="docs-scroll"
      data-testid="react-scroll"
      tabIndex={0}
      role="region"
      aria-label="React enter-always demo"
    >
      <TopAppBar
        className="docs-sticky"
        title="React"
        subtitle="enter-always"
        headingLevel={3}
        scrollBehavior="enter-always"
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
      />
      <ul className="docs-scroll-list">
        {ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
