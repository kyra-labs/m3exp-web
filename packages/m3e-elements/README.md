# @kyralabs/m3e-elements

Zero-dependency Material 3 Expressive custom elements, for the behavior CSS alone can't provide.
Each element renders the `@kyralabs/m3e-css` DOM contract, so load that CSS too.

```sh
npm install @kyralabs/m3e-elements @kyralabs/m3e-css @kyralabs/m3e-tokens
```

## Usage

```js
// Plus the m3e-tokens stylesheets listed in the @kyralabs/m3e-css README.
import '@kyralabs/m3e-css/index.css';
import '@kyralabs/m3e-elements/icon.js';
import '@kyralabs/m3e-elements/loading-indicator.js';
```

```html
<m3e-icon name="favorite" fill></m3e-icon>
<m3e-loading-indicator contained aria-label="Loading"></m3e-loading-indicator>
```

Each `@kyralabs/m3e-elements/<element>.js` entry registers one element; `.` registers all of
them, and `./base.js` exports the `M3eElement` base class without registering anything.
Registration is skipped outside the browser.

## FAB menu

`import '@kyralabs/m3e-elements/fab-menu.js'` registers `<m3e-fab-menu>` (and its data child
`<m3e-fab-menu-item>`): a toggle FAB that opens a menu of 2–6 actions with Compose's springs,
focus handling and light dismiss. It fires `open-change` (`detail.open`) and, on the item,
`action` (`detail.value`).

```html
<m3e-fab-menu label="Share" icon="share">
  <m3e-fab-menu-item icon="mail" value="email">Email</m3e-fab-menu-item>
  <m3e-fab-menu-item icon="link" value="link">Copy link</m3e-fab-menu-item>
</m3e-fab-menu>
```

## Ripple for plain HTML

m3e-css draws hover, focus and pressed overlays without JS; the press ripple needs a little.
One import adds it to every plain-HTML button, icon button, assist chip, FAB, extended FAB, FAB menu item, `.m3e-state-layer`,
interactive card (pressed through `.m3e-card__action`, drawn on the card) and navigation item
(drawn on `.m3e-navigation-item__state`) in the document, including ones added later:

```js
import '@kyralabs/m3e-elements/ripple.js';
```

It uses one set of delegated pointer and keyboard listeners on `document` and writes the same
contract as `attachRipple`: the first press on a host sets `data-ripple`, which stays, and each
press toggles `data-pressed` and writes `--_m3e-ripple-x/-y/-radius`. Hosts carrying a
`data-ripple` it did not set (m3e-react components and `attachRipple` hosts) are skipped, as are
disabled ones. Enter and Space press from the center (links: Enter only). To scope it or stop it,
call `attachAutoRipple(root, signal)` from the package root instead; that import has no side
effect, and aborting the signal removes the attributes and variables it wrote.

Apache-2.0; see `LICENSE` and `NOTICE`.
