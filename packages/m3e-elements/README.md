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

## Menus

```js
import '@kyralabs/m3e-elements/menu.js';
```

```html
<button id="more" class="m3e-icon-button m3e-icon-button--standard" aria-label="More">
  <span class="m3e-icon" aria-hidden="true">more_vert</span>
</button>
<m3e-menu anchor="more" variant="vibrant">
  <m3e-menu-item value="edit" icon="edit" trailing-text="⌘E">Edit</m3e-menu-item>
  <m3e-menu-group label="View" divider>
    <m3e-menu-item type="checkbox" value="grid" checked-icon="check" checked>Grid</m3e-menu-item>
  </m3e-menu-group>
</m3e-menu>
```

`<m3e-menu>` renders the `.m3e-menu` popover from its `<m3e-menu-item>` / `<m3e-menu-group>`
children, wires its `anchor` (a click toggles it; Enter, Space and the arrow keys open it), places
it like Compose's `DropdownMenuPositionProvider` and springs it open and closed. It emits `action`
(on the item, `detail: { value, checked }`) and `open-change`. `variant`: `standard` (default),
`vibrant`, `baseline`. Items: `type="checkbox" | "radio"`, `checked`, `disabled`, `icon`,
`checked-icon`, `supporting-text`, `trailing-icon`, `trailing-text`, `submenu="<menu id>"`. The
`menu-popup.js` entry exports `MenuPopup` (placement and springs only) for other components.

## Button group

```js
import '@kyralabs/m3e-elements/button-group.js';
```

```html
<m3e-button-group variant="connected" selection-mode="single" label="View">
  <m3e-button-group-item value="day" selected>Day</m3e-button-group-item>
  <m3e-button-group-item value="week">Week</m3e-button-group-item>
</m3e-button-group>
```

`<m3e-button-group>` renders the `.m3e-button-group` contract from its `<m3e-button-group-item>`
children. Standard groups (default) grow a pressed button by Compose's `ExpandedRatio` while its
neighbors shrink, on an interruptible fast spatial spring; connected groups only morph the pressed
or selected button's corners. Attributes: `variant` (`standard` | `connected`), `size` (`xs`–`xl`),
`shape` (`round` | `square`), `button-variant`, `selection-mode` (`none` | `single` | `multiple`),
`selection-required`, `overflow` (trailing items collapse into a "More options" menu; loads
`<m3e-menu>` on first use), `overflow-label`, `label`, `disabled`. Items: `value`, `icon`,
`selected`, `disabled`, `variant`, `label` (icon-only). Events: `change` on the group
(`detail: { value, selected, values }`) and `action` on the item (`detail: { value }`). Arrow keys,
Home and End move focus (one tab stop). The `button-group-layout.js` entry exports
`ButtonGroupLayout` (springs, overflow measurement and roving focus for a rendered group), which
m3e-react's `<ButtonGroup>` uses too.

## Split button

```js
import '@kyralabs/m3e-elements/menu.js';
import '@kyralabs/m3e-elements/split-button.js';
```

```html
<m3e-split-button label="Send" icon="mail" menu-label="More send options" variant="tonal">
  <m3e-menu>
    <m3e-menu-item value="schedule">Schedule send</m3e-menu-item>
    <m3e-menu-item value="draft">Save draft</m3e-menu-item>
  </m3e-menu>
</m3e-split-button>
```

`<m3e-split-button>` renders the `.m3e-split-button` contract (a leading and a trailing
`.m3e-button`; load m3e-css `button.css` and `split-button.css`) and makes the trailing button the
anchor of its `<m3e-menu>` child (or the menu whose id `menu` names), which then handles the press,
the keys, Escape and `aria-expanded`. While the menu is open the trailing button's inner corners
spring to full and its icon turns 180°. `variant`: `filled` (default), `tonal`, `elevated`,
`outlined`; `size`: `xs`, `s` (default), `m`, `l`, `xl`; `trailing-icon` (default
`keyboard_arrow_down`); `disabled`. It emits `press` when the leading button is activated.

## Progress indicators

```js
import '@kyralabs/m3e-elements/linear-progress.js';
import '@kyralabs/m3e-elements/circular-progress.js';
```

```html
<m3e-linear-progress value="0.4" aria-label="Loading news article"></m3e-linear-progress>
<m3e-linear-progress shape="wavy" aria-label="Loading my episodes"></m3e-linear-progress>
<m3e-circular-progress shape="wavy" thickness="thick" value="0.7" aria-label="Downloading">
</m3e-circular-progress>
```

`<m3e-linear-progress>` and `<m3e-circular-progress>` render the `.m3e-linear-progress` /
`.m3e-circular-progress` contracts (load m3e-css `linear-progress.css` / `circular-progress.css`).
`value` (0–1) makes them determinate (`aria-valuenow` 0–100); without it they are indeterminate.
`shape="wavy"` draws Compose's wave every frame (it holds still with `prefers-reduced-motion`);
`thickness="thick"` is the 8dp sample configuration; `amplitude` (0–1), `wavelength` (px) and
`wave-speed` (px/s) override the wave. Value changes spring on Compose's progress spring. The
host's `aria-label` (or `label`) names the progress bar. Flat indicators also work without JS
(markup in the m3e-css files).

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
