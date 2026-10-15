---
'@kyralabs/m3e-tokens': minor
---

New opt-in Google Sans Flex profile `@kyralabs/m3e-tokens/fonts-rond.css` (D15): wght + opsz + ROND variable, with wdth and slnt fixed at their defaults (latin chunk 205.2 KiB, all chunks 468.1 KiB). Import it instead of `fonts.css`, not beside it: it registers the same `"Google Sans Flex"` family and renders identically until you set `font-variation-settings: "ROND" <0–100>`. `fonts.css` stays the default, `fonts-full.css` is unchanged and the typescale tokens do not use ROND.
