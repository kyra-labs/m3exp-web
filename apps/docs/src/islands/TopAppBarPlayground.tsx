import {
  Icon,
  IconButton,
  TopAppBar,
  type TopAppBarScrollBehavior,
  type TopAppBarVariant,
} from '@kyralabs/m3exp-web/react';
import { useId, useRef, useState } from 'react';

const ITEMS = Array.from({ length: 24 }, (_, i) => `Item ${String(i + 1)}`);
const VARIANTS: readonly TopAppBarVariant[] = [
  'small',
  'center-aligned',
  'medium-flexible',
  'large-flexible',
  'two-rows',
];
const BEHAVIORS: readonly TopAppBarScrollBehavior[] = [
  'pinned',
  'enter-always',
  'exit-until-collapsed',
];

/** A React top app bar: every variant, title alignment and scroll behavior. */
export default function TopAppBarPlayground() {
  const scroller = useRef<HTMLDivElement>(null);
  const id = useId();
  const [variant, setVariant] = useState<TopAppBarVariant>('small');
  const [behavior, setBehavior] = useState<TopAppBarScrollBehavior>('enter-always');
  const [centered, setCentered] = useState(false);
  return (
    <>
      <div className="docs-docked-toolbar-controls">
        <label htmlFor={`${id}-variant`}>Variant</label>
        <select
          id={`${id}-variant`}
          data-testid="react-variant"
          value={variant}
          onChange={(e) => {
            setVariant(e.target.value as TopAppBarVariant);
          }}
        >
          {VARIANTS.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
        <label htmlFor={`${id}-behavior`}>Scroll behavior</label>
        <select
          id={`${id}-behavior`}
          data-testid="react-behavior"
          value={behavior}
          onChange={(e) => {
            setBehavior(e.target.value as TopAppBarScrollBehavior);
          }}
        >
          {BEHAVIORS.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            data-testid="react-centered"
            checked={centered}
            onChange={(e) => {
              setCentered(e.target.checked);
            }}
          />{' '}
          Centered title
        </label>
      </div>
      <div
        ref={scroller}
        className="docs-scroll"
        data-testid="react-scroll"
        tabIndex={0}
        role="region"
        aria-label={`React ${behavior} demo`}
      >
        <TopAppBar
          className="docs-sticky"
          variant={variant}
          titleHorizontalAlignment={centered ? 'center' : 'start'}
          title={
            variant === 'two-rows'
              ? (expanded) => (expanded ? 'React, expanded' : 'React')
              : 'React'
          }
          subtitle={behavior}
          headingLevel={3}
          scrollBehavior={behavior}
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
    </>
  );
}
