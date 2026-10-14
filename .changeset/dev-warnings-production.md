---
'@kyralabs/m3e-react': patch
---

Dev-only console warnings no longer fire in production builds: the D4 deprecation warnings (NavigationBar, NavigationRail) and the missing-label warning (IconButton, IconToggleButton). The library build had baked `process.env.NODE_ENV` in as "development", and the guard also stayed on in browser bundles that define `process.env.NODE_ENV` but not `process` (Vite, webpack 5). `process.env.NODE_ENV` is now left for the consumer's bundler; unbundled ESM still warns.
