---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Lists (M8, COMPONENT_SPEC §20; Compose `ListItem` and `SegmentedListItem`): expressive list items with a headline, overline, supporting text and leading / trailing content in one, two or three lines; segmented items (Surface, 2dp apart, 16dp outer corners on the first and last items); interactive lists as a listbox of options (single and multiple selection, actionable options, checkbox / radio button / switch indicators) with the selected colors and the fast-spatial corner morph (4dp rest, 12dp hovered, 16dp focused / selected / pressed / dragged); the dragged style (ReorderListTokens, style only); and the legacy non-expressive list item, deprecated (D4). Arrow keys wrap (Down / Right next, Up / Left previous), with Home / End and typeahead. New `components/list-defaults.css` tokens (the `ListItem.kt` / `ListItemDefaults.kt` values Compose renders: padding, spacing, minimum heights, slot type styles, motion, state shapes, segmented corners and gap, shadows, content colors and the legacy paddings), m3e-css `list.css`, the m3e-elements `<m3e-list>` and `list-layout` entries, m3e-react `<List>`, `<ListItem>` (its `headlineContent` overload is the deprecated legacy item) and `<SegmentedListItem>` (React Aria `useListBox` / `useOption`). Shared helpers: RovingFocus gains a non-breaking `wrap` option and a `both` orientation (m3e-motion `toolbarNavigationTarget(…, wrap)`, `NavigationOrientation`), the menu's typeahead moves to m3e-motion `typeSelectTarget` (React Aria's search; a miss now resets the typed string), and m3e-react's shape spring can drive the top and bottom corners separately.
