# @kyralabs/m3e-react

Material 3 Expressive React components built on React Aria (behavior, accessibility) and Motion
(springs). They render the same classes as `@kyralabs/m3e-css`. Client-side rendering only.

```sh
npm install @kyralabs/m3e-react @kyralabs/m3e-css @kyralabs/m3e-tokens react react-dom
```

## Usage

```tsx
import '@kyralabs/m3e-tokens/fonts.css';
import '@kyralabs/m3e-tokens/tokens.css';
import '@kyralabs/m3e-tokens/theme.css';
import '@kyralabs/m3e-css/index.css';
import { Button } from '@kyralabs/m3e-react';

export function Save() {
  return (
    <Button variant="tonal" size="m" onPress={() => console.log('saved')}>
      Save
    </Button>
  );
}
```

Peer dependencies: `react` and `react-dom` 18.3+ or 19.

## Window size classes

```tsx
import { paneScaffoldDirective } from '@kyralabs/m3e-motion'; // or the umbrella / m3e-elements
import { useWindowSizeClass } from '@kyralabs/m3e-react';

export function Inbox() {
  const sizeClass = useWindowSizeClass(); // the viewport, like @media
  const panes = paneScaffoldDirective(sizeClass).maxHorizontalPartitions;
  return panes > 1 ? <ListDetail /> : <List />;
}
```

`useWindowSizeClass({ target?, largeAndExtraLargeWidth?, initial? })` returns `{ widthClass,
heightClass, minWidth, minHeight }` and re-renders only when a class changes. Without `target`
the first render already reads the viewport; with a `target` ref it classifies that element's
content box (like `@container`) and returns `initial` (default compact × compact) until the
element is measured. The classification helpers (`windowSizeClass`, `isWidthAtLeastBreakpoint`,
`paneScaffoldDirective`, `navigationSuiteType`, …) come from `@kyralabs/m3e-motion`, a dependency
of this package, and are re-exported by `@kyralabs/m3e-elements` and `@kyralabs/m3exp-web`.

## Navigation suite scaffold

```tsx
import { NavigationSuiteScaffold } from '@kyralabs/m3e-react';

<NavigationSuiteScaffold
  aria-label="Main"
  items={[
    { key: 'home', icon: 'home', label: 'Home', href: '/' },
    { key: 'search', icon: 'search', label: 'Search', href: '/search' },
  ]}
  selectedKey={route}
  onSelectionChange={navigate}
  style={{ blockSize: '100dvh' }}
>
  <main>…</main>
</NavigationSuiteScaffold>;
```

The navigation follows the viewport's window size class: a short navigation bar below 600px
(horizontal items under 480px tall), a collapsed wide navigation rail from 600px, the expanded
rail from 1200px (`expandedFrom`, default `'large'`; `null` keeps Compose's rule; `expandedType:
'navigation-drawer'` for a drawer). `layoutType` fixes the type; `navigationSuiteType` replaces the
rule with a function of the size class. `isNavigationHidden` runs Compose's show / hide spring;
`primaryAction` (e.g. a `<Fab>`) floats above the bar or heads the rail / drawer. The selection,
the item elements (bar ↔ rail) and keyboard focus survive a switch.

Apache-2.0; see `LICENSE` and `NOTICE`.
