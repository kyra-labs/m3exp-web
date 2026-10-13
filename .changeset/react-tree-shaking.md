---
'@kyralabs/m3e-react': patch
'@kyralabs/m3e-shapes': patch
---

Single-component imports now tree-shake (REQUIREMENTS §8). Top-level `forwardRef`/`createContext`
calls in m3e-react and m3e-shapes' module constants carry `/* @__PURE__ */`, so
`import { Icon } from '@kyralabs/m3e-react'` drops the other components, react-aria, motion and
m3e-shapes (26.7 kB → 0.3 kB min+brotli). No API or behavior change.
