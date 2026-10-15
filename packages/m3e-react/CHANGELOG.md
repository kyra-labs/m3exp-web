# @kyralabs/m3e-react

## 1.2.0

### Patch Changes

- @kyralabs/m3e-motion@1.2.0
  - @kyralabs/m3e-shapes@1.2.0

## 1.1.0

### Patch Changes

- @kyralabs/m3e-motion@1.1.0
  - @kyralabs/m3e-shapes@1.1.0

## 1.0.1

### Patch Changes

- 54a6f5b: Dev-only console warnings no longer fire in production builds: the D4 deprecation warnings (NavigationBar, NavigationRail) and the missing-label warning (IconButton, IconToggleButton). The library build had baked `process.env.NODE_ENV` in as "development", and the guard also stayed on in browser bundles that define `process.env.NODE_ENV` but not `process` (Vite, webpack 5). `process.env.NODE_ENV` is now left for the consumer's bundler; unbundled ESM still warns.
- c7b731c: Single-component imports now tree-shake (REQUIREMENTS §8). Top-level `forwardRef`/`createContext`
  calls in m3e-react and m3e-shapes' module constants carry `/* @__PURE__ */`, so
  `import { Icon } from '@kyralabs/m3e-react'` drops the other components, react-aria, motion and
  m3e-shapes (26.7 kB → 0.3 kB min+brotli). No API or behavior change.
- Updated dependencies [c7b731c]
  - @kyralabs/m3e-shapes@1.0.1
  - @kyralabs/m3e-motion@1.0.1

## 1.0.0

### Major Changes

- cefe6f4: publish initial version

### Patch Changes

- Updated dependencies [cefe6f4]
  - @kyralabs/m3e-motion@1.0.0
  - @kyralabs/m3e-shapes@1.0.0
