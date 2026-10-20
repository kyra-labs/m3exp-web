---
'@kyralabs/m3e-elements': patch
---

README only (M11 docs; no code change): the events section notes that state events bubble in 1.x,
so a listener also hears them from components nested inside its host, and shows the
`if (e.target !== host) return;` guard (DECISIONS D25 proposes non-bubbling state events for 2.0).
