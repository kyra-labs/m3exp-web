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

Apache-2.0; see `LICENSE` and `NOTICE`.
