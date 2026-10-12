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

Apache-2.0; see `LICENSE` and `NOTICE`.
