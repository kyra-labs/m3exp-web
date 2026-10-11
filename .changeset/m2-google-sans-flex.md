---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3exp-web': minor
---

Self-hosted Google Sans Flex 5.000 (D1, SIL OFL 1.1). `@kyralabs/m3e-tokens/fonts.css` registers per-script woff2 chunks (Google Fonts unicode-range splits) with weight + optical-size variation (latin ≈ 139 KB) and a metric-matched `"Google Sans Flex Fallback"` face; `fonts-full.css` keeps every axis. The typeface tokens now include the fallback face, and `@kyralabs/m3exp-web/css/index.css` includes `fonts.css`.
