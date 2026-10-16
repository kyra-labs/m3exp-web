---
'@kyralabs/m3e-tokens': minor
'@kyralabs/m3e-css': minor
'@kyralabs/m3e-motion': minor
'@kyralabs/m3e-elements': minor
'@kyralabs/m3e-react': minor
'@kyralabs/m3exp-web': minor
---

Navigation drawer (M7, COMPONENT_SPEC §15; Compose `PermanentNavigationDrawer`, `DismissibleNavigationDrawer`, `ModalNavigationDrawer`, their drawer sheets and `NavigationDrawerItem`): permanent, dismissible and modal drawers. Opening runs on the default spatial spring and closing on the fast effects spring (Compose's `DrawerState`), interruptible with the velocity kept; a drag on the open sheet (or the modal scrim) follows the pointer and settles with Compose's thresholds (50% of the width, 400dp/s) on its decay or 256ms tween; the modal drawer opens over the 32% scrim as a dialog (focus trap, Escape and scrim dismissal, focus return); arrow keys move between items. New `components/navigation-drawer-defaults.css` tokens (item and sheet literals, the inherited body-large label style, the scrim, springs, settle tween and thresholds Compose renders, plus the m3.material.io headline row and divider inset / color), m3e-css `navigation-drawer.css` (`.m3e-navigation-drawer` with `--dismissible`, `--modal`, `--open`, `__sheet`, `__headline`, `__divider`, `__scrim`, and `.m3e-navigation-drawer-item` with `__icon`, `__label`, `__badge`; added to the state-layer / focus-ring lists and the `ripple.js` triggers), m3e-motion `DrawerAnimation`, `drawerSettlesOpen` and `exponentialDecayTarget` (and an optional initial velocity on `SpringAnimatable.animateTo`), m3e-elements `<m3e-navigation-drawer>` plus the `navigation-drawer-layout.js` (NavigationDrawerLayout) entry and a `badge` attribute on `<m3e-navigation-item>`, and m3e-react `<NavigationDrawer variant items selectedKey onSelectionChange isOpen onOpenChange header />`.
