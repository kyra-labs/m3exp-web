---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Pull to refresh (M9, COMPONENT_SPEC §38): Compose Material3's `PullToRefreshBox`. A touch or pen pull down at the top of a scroll container (overscroll contained) brings the indicator down, half the drag and slowing past the 80dp threshold; a release past it asks for a refresh, and the indicator rests at the threshold while the app refreshes. m3e-motion ports Compose's pull math and arrow (checked against a JVM reference). The default indicator is Compose's arrow then a circular progress; the loading indicator variant drives contained loading indicators. Mouse drags never pull: a visible Refresh button is the keyboard path. New `components/pull-to-refresh-defaults.css` tokens, m3e-css `pull-to-refresh.css`, the m3e-elements `<m3e-pull-to-refresh>` and `pull-to-refresh-layout` (`PullToRefreshLayout`) entries, and m3e-react `<PullToRefresh>`.
