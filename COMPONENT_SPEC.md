# COMPONENT_SPEC.md — m3exp-web

## 0. Shared conventions (apply to every component)
- **Class pattern:** `.m3e-<component>`, modifiers `--<variant>`, `--size-{xs|s|m|l|xl}`, `--<shape>`. States come from native pseudo-classes plus `[data-selected]`, `[data-pressed]`, `[data-dragged]` and `[aria-disabled]`.
- **State layer and opacities:** FOUNDATIONS §6.
- **Focus:** `:focus-visible` ring. Never on mouse click.
- **Touch target:** ≥ 48×48 via `::after` when the visual is smaller.
- **RTL:** logical properties only.
- **Icons:** every icon slot accepts `<Icon>` / `<m3e-icon>` / `.m3e-icon` (Material Symbols, D5). Selected states set `FILL` 1.
- **Elements:** all custom elements extend the zero-dependency `M3eElement` base (D7). No Lit, no framework imports.
- **Deprecated components (D4):** marked `@deprecated` in TS and `[data-deprecated]` in docs; shipped until 2.0.
- **Token rule:** every value below not marked verified is `TODO(verify)` in the named `*Tokens.kt` file. Claude Code must generate it from source, not copy it from here.
- **Common acceptance criteria (CAC)**, inherited by every component:
  - [ ] axe: 0 violations in all states.
  - [ ] Playwright screenshots light/dark × states match approved baselines (Chromium/Firefox/WebKit).
  - [ ] No literal color/radius/size/duration in component CSS (lint rule passes).
  - [ ] Works under `forced-colors: active` with visible boundaries.
  - [ ] With `prefers-reduced-motion`, spatial animation duration = 0.
  - [ ] Keyboard-only operation completes every action.
  - [ ] Renders without error when imported in a non-DOM (Node) environment only if the module is imported, not executed — custom element registration is guarded by `typeof window !== 'undefined'`.

## 1. Button (incl. toggle button)
- **Purpose:** prominent actions. Use text/outlined for low emphasis. Not for navigation (links styled as buttons only for in-page CTAs).
- **Variants/sizes:** default and toggle; color configurations elevated, filled, tonal, outlined, text; sizes XS, S (default), M, L, XL; shapes round, square. Small padding 16dp recommended (m3.material.io Buttons overview, "M3 Expressive update May 2025").
- **Anatomy:** container, label, leading/trailing icon, state layer, focus ring.
- **Tokens (verified, generated):** `Button{XSmall,Small,Medium,Large,XLarge}Tokens.kt@19991f2c` plus the `ButtonDefaults` values Compose renders (`components/button-defaults.css`; SOURCES register #18–19).

  | | XS | S | M | L | XL |
  |---|---|---|---|---|---|
  | height | 32 | 40 | 56 | 96 | 136 |
  | square resting radius | 12 | 12 | 16 | 28 | 28 |
  | pressed radius | 8 | 8 | 12 | 16 | 16 |
  | icon | 20 | 20 | 24 | 32 | 40 |
  | horizontal padding | 12 (ButtonDefaults) | 16 | 24 | 48 | 64 |
  | icon–label space | 4 (ButtonDefaults) | 8 | 8 | 12 | 16 |
  | label | labelLarge | labelLarge | titleMedium | headlineSmall | headlineLarge |
  | outline | 1 | 1 | 1 | 2 | 3 |

  - Round = CircleShape (half the container height). Small toggle buttons press to 6dp (`ToggleButtonDefaults.pressedShape`).
  - Colors: filled = primary/on-primary; tonal = secondary-container/on-secondary-container (FilledTonalButtonTokens; toggles use TonalButtonTokens); elevated = surface-container-low/primary, Level1; outlined = outline-variant border, on-surface-variant label; text = primary label (ButtonDefaults override).
  - Toggle: unselected filled = surface-container / on-surface-variant, selected = primary / on-primary; tonal selected = secondary / on-secondary; elevated selected = primary / on-primary; outlined selected = inverse-surface / inverse-on-surface without border. No text toggle (Compose has none).
- **Motion:** press morph on the **default effects** spring (`Button.kt` L212–215: chosen upstream to prevent bounce; supersedes the earlier fastSpatial note). Toggle shape changes (press and selection) on fastSpatial (`ToggleButton.kt` L176). Color on fastEffects.
- **Behavior:** press morph on pointerdown, release on pointerup/cancel. Toggle flips `aria-pressed`. Disabled buttons not focusable unless `focusableWhenDisabled`.
- **Keyboard/ARIA:** `<button>`; Enter/Space activate. Toggle uses `aria-pressed`. Icon-only requires `aria-label`.
- **Layers:** css (visuals; press radius via `:active` with linear() spring) + react (interruptible spring, React Aria `useButton`/`useToggleButton`). No element.
- **API:** CSS `.m3e-button.m3e-button--filled.m3e-button--size-m.m3e-button--round`. React `<Button variant?: 'filled'|'tonal'|'elevated'|'outlined'|'text' size?: 'xs'|'s'|'m'|'l'|'xl' shape?: 'round'|'square' icon?: ReactNode trailingIcon?: ReactNode isDisabled?: boolean onPress?: (e)=>void href?: string />`; `<ToggleButton isSelected defaultSelected onChange(selected:boolean) …/>`.
- **Acceptance:**
  - [ ] Each of the 5 sizes renders the generated height ±0.5px.
  - [ ] Pressed radius equals the size's pressed token after settle.
  - [ ] Square/round swap animates on selection.
  - [ ] XS/S hit area ≥ 48×48.
  - [ ] `aria-pressed` toggles.
  - [ ] Plus CAC.
- **Fidelity:** ripple approximated; no haptics.
- **Sources:** m3.material.io/components/buttons/overview; Button*Tokens.kt; ButtonDefaults.

## 2. Icon button
- **Purpose:** compact actions with a clear system icon; tooltip on hover (m3.material.io Icon buttons).
- **Variants:** default/toggle; standard, filled, tonal, outlined; sizes XS–XL; widths narrow/default/wide; shapes round/square.
- **Anatomy:** container, icon, state layer.
- **Tokens:**

  | | XS | S | M | L | XL |
  |---|---|---|---|---|---|
  | height | 32 | 40 | 56 | 96 | 136 |
  | icon | 20 | 24 | 24 | 32 | 40 |
  | narrow width | 28 | 32 | 48 | 64 | 104 |
  | default width | 32 | 40 | 56 | 96 | 136 |
  | wide width | 40 | 52 | 72 | 128 | 184 |

  Verified (generated): `{XSmall…XLarge}IconButtonTokens.kt@19991f2c`; width = icon + leading + trailing space (`IconButtonDefaults.*ContainerSize`). Selected: round → SelectedContainerShapeRound, square → SelectedContainerShapeSquare (CornerFull). Colors: standard and outlined inherit the content color (Compose `LocalContentColor`); `--vibrant` uses StandardIconButtonTokens / OutlinedIconButtonTokens; filled = FilledIconButtonTokens; tonal = FilledTonalIconButtonTokens; selected outlined toggles drop the border.
- **Motion:** press and select morph on the **default effects** spring (`IconButton.kt` `shapeForInteraction`, "to prevent any bounce"), unlike ToggleButton.
- **Behavior:** toggle shows FILL 0 unselected, FILL 1 selected.
- **Keyboard/ARIA:** `<button aria-label>`; toggle `aria-pressed`.
- **Layers:** css + react.
- **API:** `.m3e-icon-button--{standard|filled|tonal|outlined}--size-s--width-wide`; React `<IconButton variant size width:'narrow'|'default'|'wide' shape aria-label isSelected? />`.
- **Acceptance:**
  - [ ] All 15 size×width boxes match tokens.
  - [ ] Tooltip appears on hover/focus after delay.
  - [ ] Missing `aria-label` throws a dev warning.
  - [ ] Plus CAC.
- **Sources:** m3.material.io/components/icon-buttons/overview; *IconButtonTokens.kt.

## 3. Button group (standard, connected)
- **Purpose:** organize buttons with shape/width interaction. Connected groups replace segmented selection patterns.
- **Variants:** standard, connected; sizes XS–XL; round/square; single/multi-select; overflow menu.
- **Anatomy:** group container, items, overflow indicator.
- **Tokens:** Standard XS height 32, between-space 18 (m3.material.io button-group specs). S height 40, between 12 (ButtonGroupSmallTokens; `TODO(verify)`). Connected inner padding 2 at every size, outer shape full, inner corners square (m3.material.io). XS/S connected min width 48. ExpandedRatio 0.15 (`ButtonGroupDefaults`; `TODO(verify)`). Other sizes `TODO(verify)`.
- **Motion:** pressed item expands width by ExpandedRatio while neighbors compress, on fastSpatial. Selection morphs inner corners.
- **Behavior:** overflow collapses trailing items into a menu.
- **Keyboard/ARIA:** standard `role="group"`; connected select `role="radiogroup"` (single) or `aria-pressed` buttons (multi). Arrow keys move focus (roving tabindex).
- **Layers:** css (static, connected corners); elements + react (width redistribution, overflow measurement).
- **API:** `.m3e-button-group--connected`; React `<ButtonGroup variant:'standard'|'connected' size selectionMode?:'none'|'single'|'multiple' selectedKeys onSelectionChange overflow?: boolean>`; element `<m3e-button-group variant selection-mode>` emits `change`.
- **Acceptance:**
  - [ ] XS between-space = 18px.
  - [ ] Pressed item grows 15% and neighbors shrink; total width constant.
  - [ ] Arrow keys move focus.
  - [ ] Overflow menu appears below available width.
  - [ ] Plus CAC.
- **Sources:** m3.material.io/components/button-groups/specs; ButtonGroup.kt; ButtonGroup*Tokens.kt.

## 4. Split button
- **Purpose:** primary action plus a menu of related actions. Sizes XS–XL.
- **Variants:** elevated, filled, tonal, outlined.
- **Anatomy:** leading button, trailing menu button, gap, menu.
- **Tokens:** `TODO(verify)` SplitButton*Tokens.kt: inner gap, inner corner radius per size, trailing icon rotation.
- **Motion:** trailing icon rotates 180° and inner corners morph to full on fastSpatial (m3.material.io: trailing button "spins and changes shape when activated").
- **Behavior:** trailing button toggles the menu and reflects open state.
- **Keyboard/ARIA:** two buttons; trailing `aria-haspopup="menu" aria-expanded aria-label`; Down arrow opens.
- **Layers:** css + elements (menu) + react.
- **API:** `<SplitButton variant size onPress menu={<Menu>…</Menu>} menuLabel />`; `.m3e-split-button`.
- **Acceptance:**
  - [ ] Trailing icon rotates when open.
  - [ ] `aria-expanded` syncs.
  - [ ] Esc closes and returns focus to the trailing button.
  - [ ] Plus CAC.
- **Sources:** m3.material.io/components/split-button/overview; SplitButtonLayout; Material Web labs split button (2.5.0).

## 5. FAB and extended FAB
- **Variants:** FAB baseline 56, medium 80, large 96; small 40 **@deprecated (D4)**. Extended FAB small/medium/large. Six color styles (m3.material.io FAB › Specs › Color styles): primary container (default), secondary container, tertiary container, primary, secondary, tertiary. Primary/secondary container read `FabPrimaryContainerTokens` / `FabSecondaryContainerTokens`; the pin has no tertiary or "vibrant" FAB token objects, so the others pair each role with its on-role as Compose's `contentColorFor` does (`ColorScheme.kt` L1096–1105). Surface FABs are no longer recommended (m3.material.io) and not shipped.
- **Tokens (verified, generated):** `Fab{Small,Baseline,Medium,Large}Tokens.kt`, `ExtendedFab{Small,Medium,Large,Primary}Tokens.kt`, `FabPrimaryContainerTokens.kt`@19991f2c plus the `FloatingActionButtonDefaults` / extended FAB values Compose renders (`components/fab-defaults.css`; SOURCES register #23).

  | | small (deprecated) | baseline | medium | large |
  |---|---|---|---|---|
  | container | 40 | 56 | 80 | 96 |
  | icon | 24 | 24 | 28 | 36 (`LargeIconSize`; upstream: `FabLargeTokens.IconSize` 32 "is incorrect") |
  | radius | 12 | 16 | 20 (`mediumShape` = ShapeDefaults.LargeIncreased) | 28 |

  | extended | small | medium | large |
  |---|---|---|---|
  | height = minimum width | 56 | 80 | 96 |
  | radius | 16 | 20 (LargeIncreased) | 28 |
  | icon | 24 | 28 | 36 (`LargeIconSize`, as the samples) |
  | leading = trailing space | 16 | 26 | 28 |
  | icon–label space | 8 | 12 (literal; token 16) | 16 (literal; token 20) |
  | label | titleMedium | titleLarge | headlineSmall |

  Elevation (`FloatingActionButtonDefaults.elevation()`): Level3, hovered Level4, focused and pressed Level3. No disabled state (Compose FABs have none).
- **Motion:** expressive extended FAB width = lerp(container height, full row width, progress) with progress on **fastSpatial** and the label alpha on fastEffects (`FloatingActionButton.kt` L961–998; supersedes the earlier defaultSpatial note, which is the non-expressive `ExtendedFloatingActionButton`'s collapse, L1485–1493). Elevation with the ElevationDefaults tweens (`internal/Elevation.kt`), as buttons and cards.
- **Keyboard/ARIA:** `<button aria-label>`; extended FAB label is its name (also when collapsed).
- **Layers:** css + react (scroll-collapse: `useExtendedFabScroll`). No element.
- **API:** CSS `.m3e-fab.m3e-fab--size-{medium|large|small}.m3e-fab--<color>`, `.m3e-extended-fab.m3e-extended-fab--size-{medium|large}.m3e-extended-fab--collapsed` with `__label`. React `<Fab size:'baseline'|'medium'|'large'|'small' color icon aria-label />` (`'small'` deprecated), `<ExtendedFab size icon label expanded />`, `useExtendedFabScroll({ target, threshold, expandOnScrollUp })`.
- **Acceptance:**
  - [ ] Sizes and radii match generated tokens.
  - [ ] Extended FAB collapses to icon-only when `expanded=false` with width spring.
  - [ ] `size="small"` logs a deprecation warning in dev.
  - [ ] Plus CAC.
- **Sources:** FloatingActionButton.kt, Fab*Tokens.kt, ExtendedFab*Tokens.kt, Shapes.kt (ShapeDefaults), FloatingActionButtonSamples.kt; m3.material.io FAB and Extended FAB pages (color styles, scroll behavior).

## 6. FAB menu
- **Purpose:** a FAB that opens 2–6 closely related actions (verified, m3.material.io FAB menu › Guidelines, content JSON `2026-10-13_06-10-19/f00af5db-…json`: "FAB menus can contain 2–6 items"; don't use one with a single item, with an extended FAB, or next to a floating toolbar / navigation rail). React warns in development outside 2–6.
- **Anatomy:** toggle FAB that becomes the 56dp close button, menu items (pill: icon + label), the menu column. Color sets (m3.material.io › Color): primary (default), secondary, tertiary; the close button takes the role / on-role, the items the container role / on-container role (Compose's default is the primary set).
- **Tokens (verified, generated):** `FabMenuBaselineTokens.kt@19991f2c` plus the `FloatingActionButtonMenu.kt` literals Compose renders (`components/fab-menu-defaults.css`; SOURCES register #24).

  | | value | source |
  |---|---|---|
  | close button | 56 × 56, corner full | CloseButtonContainerHeight/Width (`FabFinalSize`); radius `FabFinalSize.div(2)` = 28 (L732) |
  | close icon | 20 | CloseButtonIconSize |
  | toggle at rest | FAB size: 56 / 80 / 96, radius 16 / 20 / 28 (literals L716, L722, L728), icon 24 / 28 / 36 (L729, upstream TODO over FabLargeTokens.IconSize) | `ToggleFloatingActionButtonDefaults.containerSize*/containerCornerRadius*/iconSize*` |
  | item | height 56, min width 56, leading = trailing 24, icon 24, icon–label 8, label titleMedium (L408), corner full | ListItem* tokens |
  | spacing | items 4 apart; close button 8 below the items; 16 under the close button (L742); 16 horizontal padding (L738) | ListItemBetweenSpace, CloseButtonBetweenSpace |
  | elevation | close button: FabPrimaryContainerTokens.ContainerElevation (Level3, constant); items: none (Compose's Surface has shadowElevation 0; the token file's ListItemContainerElevation Level3 is not applied) | L735–736, L350 |

  Placement (m3.material.io › Specs): the close button keeps the FAB's top end corner, so opened from a medium / large FAB it sits 40 / 56dp above the bottom; Compose aligns the shrinking container `Alignment.TopEnd` in a FAB-sized box (L517–518).
- **Motion (verified; supersedes the earlier "rotates/crossfades … defaultSpatial" note):** checked progress on **fastSpatial** (L456–461) drives container size `lerp(FAB size, 56, p)`, corner radius `lerp(16/20/28, 28, p)`, container color `lerp(primaryContainer, primary, p)` and icon color `lerp(onPrimaryContainer, onPrimary, p)` (Color lerp mixes in Oklab and clamps p, ui-graphics `Color.kt@19991f2c` L546–569; Dp lerps follow the overshoot) and icon size `lerp(FAB icon, 20, p)`. The icon does not rotate: the sample swaps Add for Close at p > 0.5 (`FloatingActionButtonMenuSamples.kt` L171–180). Items: an Int stagger 0 ↔ item count on **slowEffects** with visibility threshold 1 (L202–262); item i (top = 0) shows while i ≥ count − value, so items appear bottom-up and leave top-first; each item then springs its width (`full width × p`, anchored at the alignment edge and clipped; **fastSpatial**, L342) and alpha (**fastEffects**, L343). Every spring is an Animatable retargeted from its current value and velocity: interruptible.
- **Behavior (owner's choice, 2026-10-15: the Compose / m3.material.io behavior):** opening leaves focus on the toggle, now the close button (m3.material.io FAB menu › Accessibility › Initial focus: "initial focus remains on the close button"; Compose moves focus into the items only on a key, `FloatingActionButtonMenu.kt@19991f2c` L138–152). Escape, a press outside, or activating an item closes the menu and restores focus to the toggle; while open, focus stays in the menu (Tab / Shift+Tab cycle between the items and the close button).
- **Keyboard/ARIA:** toggle `aria-expanded aria-controls aria-haspopup="menu"` and an `aria-label` describing the menu; the item column is `role="menu"` labelled by the toggle with `menuitem`s (tabindex −1, focus managed); among the items ArrowUp/Down (wrapping, APG menu) and Home/End; from the toggle ArrowDown/Tab → top item (Compose L138–152: Tab, DirectionDown, NumPadDirectionDown request focus on the item column, whose first child is the top item) and ArrowUp/Shift+Tab → bottom item (the toggle's key handler ignores Up, so Compose's default 2D focus search applies; the nearest focusable above the close button is the bottom item). The Compose sample also sends ArrowUp/Shift+Tab from the top item back to the close button (`FloatingActionButtonMenuSamples.kt` L207–221); here Shift+Tab does, and ArrowUp wraps within the menu as APG `role="menu"` expects. DOM order is toggle then items (m3.material.io › Initial focus: close button, then top item down).
- **Layers:** css static (open/closed states; without JS the toggle morphs on the fast-spatial `linear()` curve and items fade together); elements + react (springs, stagger, focus, light dismiss).
- **API:** CSS `.m3e-fab-menu(--open|--size-medium|--size-large|--secondary|--tertiary|--align-start|--align-center)` > `.m3e-fab.m3e-fab-menu__toggle` (closed icon, close icon) + `.m3e-fab-menu__items[role=menu]` > `.m3e-fab-menu__item[role=menuitem]` (`.m3e-icon`, `.m3e-fab-menu__label`). React `<FabMenu items={[{ key?, icon, label, onPress }]} open defaultOpen onOpenChange icon closeIcon size color align aria-label />`, `fabMenuClassName()`. Element `<m3e-fab-menu open label icon close-icon size color align>` with `<m3e-fab-menu-item icon value>Label</m3e-fab-menu-item>` children; events `open-change` (`detail.open`) and `action` on the item (`detail.value`).
- **Acceptance:**
  - [ ] Opening reverses mid-flight without a jump (velocity preserved).
  - [ ] Focus trapped among items while open.
  - [ ] Esc restores focus to toggle.
  - [ ] Plus CAC.
- **Sources:** FloatingActionButtonMenu.kt (vendored), FabMenuBaselineTokens.kt, FloatingActionButtonMenuSamples.kt, ui-graphics Color.kt (lerp); m3.material.io FAB menu (overview, specs, guidelines, accessibility). The 1.5.0 release notes add nothing beyond the API.

## 7. Loading indicator
- **Purpose:** short waits (under 5 s); replaces most indeterminate circular progress uses.
- **Variants:** uncontained, contained; indeterminate, determinate.
- **Anatomy:** active indicator (morphing shape), optional container.
- **Tokens (verified, generated):** `LoadingIndicatorTokens.kt@19991f2c`: container 48 × 48, active size 38, container shape full; uncontained primary; contained primary-container / on-primary-container. Scalable 24–240 keeping ratio (resize the root; the shape is drawn in a square viewBox at `ActiveSize / min(ContainerWidth, ContainerHeight)`).
- **Motion (verified, `LoadingIndicator.kt@19991f2c`):** indeterminate polygons in order SoftBurst, Cookie9Sided, Pentagon, Pill, Sunny, Cookie4Sided, Oval (`IndeterminateIndicatorPolygons` L541–550); a morph spring (ζ 0.6, k 200, visibility threshold 0.1, L401) starts every 650ms (`MorphIntervalMillis` L681), each finished morph adds +90° (L415–416), plus a linear global rotation of 4666ms per turn (`GlobalRotationDurationMillis` L680). Generated as `components/loading-indicator-motion.css`. Determinate: Circle rotated 360°/20 → SoftBurst (`DeterminateIndicatorPolygons` L560–566), rotating −180° over the range (L330).
- **Behavior:** shapes scaled uniformly by `calculateScaleFactor` (max-bounds, so no rotation clips) × 38/48. Reduced motion: the indeterminate indicator holds its first frame and the CSS fallback stops rotating (FOUNDATIONS_SPEC reduced-motion policy: spatial motion snaps; m3.material.io Transitions: "disable decorative effects like … shape morphing"). Compose has no reduced-motion branch at the pin.
- **Keyboard/ARIA:** `role="progressbar" aria-label`; determinate `aria-valuenow/min/max`. Not focusable.
- **Layers:** elements (SVG path morph via m3e-shapes, rAF) + react. CSS fallback: rotating static SoftBurst.
- **API:** `<LoadingIndicator contained? progress?: number polygons?: RoundedPolygon[] aria-label />`; `<m3e-loading-indicator contained progress="0.4" aria-label="…">` (also `label`; no custom polygons: the element bundles m3e-shapes, D7).
- **Acceptance:**
  - [ ] Morph sequence order matches Compose.
  - [ ] Path `d` at t=0 of each segment equals TS-ported `MaterialShapes` output (snapshot vs Compose reference export).
  - [ ] 48/38 ratio holds at 24 and 240.
  - [ ] Plus CAC.
- **Sources:** LoadingIndicator.kt, LoadingIndicatorTokens.kt, MaterialShapes.kt.

## 8. Progress indicators (linear, circular; flat, wavy)
- **Variants:** linear/circular × flat/wavy × determinate/indeterminate; thick track.
- **Tokens:** track thickness 4, gap 4 (MDC-Android). Wavy: `WavyProgressIndicatorDefaults` values `TODO(verify)` in WavyProgressIndicator.kt. Circular sizes flat 40/44, wavy 48/52 (`TODO(verify)`). Colors indicator primary, track secondary-container (`TODO(verify)`).
- **Motion:** wave speed one wavelength per second (Compose `waveSpeed = wavelength`). Progress animates (`TODO(verify)` ProgressAnimationSpec). Amplitude ramps to 0 near 0% and 100%.
- **Keyboard/ARIA:** `role="progressbar"` with value attributes.
- **Layers:** css (flat) + elements/react (wavy path generation).
- **API:** `<LinearProgress value? shape:'flat'|'wavy' thickness? />`, `<CircularProgress …/>`; `.m3e-linear-progress--wavy`.
- **Acceptance:**
  - [ ] Gap = min(progress length, 4px).
  - [ ] Wave scrolls at one wavelength per second.
  - [ ] RTL mirrors direction.
  - [ ] Plus CAC.
- **Sources:** ProgressIndicator.kt, WavyProgressIndicator.kt.

## 9. Floating toolbar (horizontal, vertical)
- **Variants:** horizontal/vertical; standard/vibrant; with FAB; exit-on-scroll.
- **Tokens:** container 64, shape full, padding 8, item gap 4, screen offset 16, Level1 with FAB (`TODO(verify)` FloatingToolbarTokens.kt). Items on 48 slots.
- **Motion:** expand/collapse on `FloatingToolbarDefaults.animationSpec()` (`TODO(verify)`); scroll exit on defaultSpatial.
- **Keyboard/ARIA:** `role="toolbar" aria-orientation`; one tab stop; arrows; Home/End.
- **Layers:** css + elements/react.
- **API:** `<FloatingToolbar orientation expanded colorStyle:'standard'|'vibrant' fab? scrollBehavior?:'exitAlways' />`.
- **Acceptance:**
  - [ ] Height 64 with 48 item slots.
  - [ ] Roving tabindex works.
  - [ ] Hides on scroll down, shows on scroll up.
  - [ ] Plus CAC.
- **Sources:** FloatingToolbar.kt.

## 10. Docked toolbar (FlexibleBottomAppBar) — and BottomAppBar (@deprecated, D4)
- **Tokens:** height 64, no radius, no elevation, 16 end padding, item spacing max 32 / min 4 (`TODO(verify)` DockedToolbarTokens.kt). Legacy BottomAppBar tokens `TODO(verify)` BottomAppBarTokens.kt.
- **Behavior:** arrangements spread/centered; hide on scroll.
- **ARIA:** `role="toolbar"`. **Layers:** css + react.
- **API:** `<DockedToolbar arrangement:'spread'|'center' />`; `<BottomAppBar />` (deprecated).
- **Acceptance:**
  - [ ] Centered items spaced 32px.
  - [ ] Spread keeps 16px ends.
  - [ ] Plus CAC.
- **Sources:** AppBar.kt.

## 11. Top app bars (small, center-aligned, medium/large flexible, two-rows)
- **Tokens:** small (verified, generated): `AppBarSmallTokens.kt` / `AppBarTokens.kt@19991f2c` — height 64, title title-large on-surface, subtitle label-medium on-surface-variant, container surface → on-scroll surface-container, leading icon on-surface, trailing on-surface-variant; layout literals `TopAppBarHorizontalPadding` 4dp and `TopAppBarTitleInset` 16dp − 4dp from `AppBar.kt` (`components/top-app-bar-defaults.css`). Other variants: `TODO(verify)` heights, padding, title type.
- **Motion:** collapse tied to scroll offset (`TopAppBarState`, ported in m3e-motion `app-bar-scroll.ts`); the scrolled container color animates on the default effects spring; a partly hidden bar snaps on `TopAppBarDefaults.snapAnimationSpec`, which is the **default effects** spring in Compose (`AppBar.kt` L1540), not defaultSpatial.
- **ARIA:** `<header>`; heading level by consumer.
- **Layers:** css + react/elements (scroll behaviors).
- **API:** `<TopAppBar variant title subtitle navigationIcon actions scrollBehavior />` (+ `scrollTarget`, `headingLevel`). Scroll behaviors: `pinned`, `enter-always` (elements: `attachTopAppBarScroll(bar, { behavior, target, signal })`).
- **Classes:** `.m3e-top-app-bar`, `__navigation`, `__headline`, `__title`, `__subtitle`, `__actions`; state `[data-scrolled]`.
- **Acceptance:**
  - [ ] Collapsed and expanded heights match tokens.
  - [ ] Container color changes when scrolled.
  - [ ] Plus CAC.

## 12. Search
- **Anatomy:** input, leading icon, trailing icons, results view (docked/full-screen).
- **Tokens:** `TODO(verify)` SearchBar*Tokens.kt, AppBarWithSearch scrolled colors.
- **ARIA:** `role="search"` + combobox pattern.
- **Layers:** css + react (`useComboBox`) + element.
- **Acceptance:**
  - [ ] Arrow keys move through results.
  - [ ] Esc collapses expanded view.
  - [ ] Plus CAC.

## 13. Navigation bar (ShortNavigationBar; legacy NavigationBar @deprecated)
- **Variants:** vertical items; horizontal items at medium widths.
- **Tokens (verified, generated):** ShortNavigationBar reads `NavigationBarTokens`, `NavigationBarVerticalItemTokens` and `NavigationBarHorizontalItemTokens` (there is no ShortNavigationBar*Tokens.kt at `19991f2c`); layout literals (`TopIconIndicatorToLabelPadding`, the Centered arrangement padding) generated into `components/navigation-defaults.css` from `ShortNavigationBar.kt`. Container surface-container, 64dp; indicator secondary-container 56×32 (horizontal: 40dp tall, hugging icon + label).
- **Motion:** indicator width and alpha on **defaultSpatial** (`NavigationItem.kt` animateIndicatorProgressAsState; androidx overrides the earlier fastSpatial note); icon FILL 0→1 on defaultEffects. Legacy NavigationBar: width fastSpatial, alpha + colors defaultEffects.
- **ARIA:** `<nav aria-label>`; links with `aria-current="page"`.
- **Layers:** css + react. No element in M4: the indicator animation is CSS (registered custom properties + spring `linear()` easings), so any script that moves `aria-current` animates it.
- **Classes:** `.m3e-short-navigation-bar` (`--horizontal`), legacy `.m3e-navigation-bar`; items `.m3e-navigation-item` with `__content`, `__indicator`, `__state` (state layer + focus ring on the pill), `__icon`, `__label`.
- **API:** `<ShortNavigationBar items=[{key,icon,label,href,isDisabled,isLabelHidden}] selectedKey defaultSelectedKey onSelectionChange layout />`; legacy `<NavigationBar>` (same props, @deprecated). Badges wait for the Badge component (§34).
- **Acceptance:**
  - [ ] Only one item has `aria-current`.
  - [ ] Indicator animates between items.
  - [ ] Plus CAC.

## 14. Navigation rail (WideNavigationRail, Modal; legacy NavigationRail @deprecated)
- **Tokens (verified, generated):** `NavigationRail{Collapsed,Expanded,Color,BaselineItem,VerticalItem,HorizontalItem}Tokens.kt@19991f2c`: collapsed 96dp, expanded 220–360dp, top space 44dp, header → items 40dp, collapsed item min height 64dp spaced 4dp; pill 56×32 collapsed, 56dp tall expanded starting `WNRItemHorizontalPadding` (20dp, generated from `WideNavigationRail.kt`) from the start edge. Header/FAB placement: header slot at the top start (`WideNavigationRailLayout`). Legacy NavigationRail: 80dp, items 56dp, literals from `NavigationRail.kt` (generated).
- **Motion:** width on defaultSpatial; label color on defaultEffects (`StyledLabel` animateColor), not fastEffects; indicator on defaultSpatial.
- **ARIA:** `<nav>`; modal is `dialog` with focus trap.
- **Layers:** css + elements + react. M4 ships the static rail (css + react, `isExpanded` re-lays out without animating); the animated expand/collapse, the modal rail and the element land in M7 (ROADMAP).
- **Classes / API:** `.m3e-wide-navigation-rail` (`--expanded`, `__header`), legacy `.m3e-navigation-rail` (`__header`); `<WideNavigationRail items selectedKey isExpanded header />`, legacy `<NavigationRail header />` (@deprecated).
- **Acceptance:**
  - [ ] Expanding animates width without reflow more than once per frame.
  - [ ] Modal traps focus; Esc closes.
  - [ ] Plus CAC.

## 15. Navigation drawer (standard, modal)
- **Tokens:** `TODO(verify)` NavigationDrawerTokens.kt.
- **ARIA:** modal uses `<dialog>`.
- **Layers:** css + elements + react.
- **Acceptance:**
  - [ ] Scrim 0.32.
  - [ ] Focus returns to opener.
  - [ ] Plus CAC.

## 16. Navigation suite scaffold (adaptive)
- **Layers:** react + `<m3e-navigation-suite>`; container queries in css.
- **Acceptance:**
  - [ ] Bar < 600, rail 600–1199, expanded rail/drawer ≥ 1200 (configurable).
  - [ ] Plus CAC.

## 17. Tabs (primary, secondary)
- **Tokens:** `TODO(verify)` Primary/SecondaryNavigationTabTokens.
- **Motion:** indicator slides on defaultSpatial.
- **ARIA:** APG tabs.
- **Layers:** css + react + element.
- **Acceptance:**
  - [ ] Indicator equals selected tab bounds after settle.
  - [ ] Arrow/Home/End work.
  - [ ] Plus CAC.

## 18. Chips (assist, filter, input, suggestion)
- **Tokens:** assist chip verified (generated): `AssistChipTokens.kt@19991f2c` + `AssistChipDefaults` literals (`Chip.kt` L1962 content padding 8dp; spacing 8dp via `DefaultHorizontalArrangement` = `SuggestionChipDefaults.HorizontalSpacing`, L2918/L4306): height 32, shape small, label-large on-surface, icon 18dp primary; flat = transparent + 1dp outline-variant border, Level0 except dragged Level4; elevated = surface-container-low, Level1 (hover Level2), no border. Filter/input/suggestion: `TODO(verify)` *ChipTokens.
- **Classes (assist):** `.m3e-assist-chip`, `--elevated`, `__label`; icons are `.m3e-icon` before/after the label.
- **Motion:** assist chips have no shape motion (fixed `shape`; elevation uses the `ElevationDefaults` tweens). Selectable chips: expressive selection morphs (`TODO(verify)` properties; `ChipsTokens` Unselected/Selected/PressedShape via `shapeByInteraction`, `Chip.kt` L3288–3346).
- **ARIA:** filter `aria-pressed`/checkbox; input chip remove button "Remove X".
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Filter chip shows leading check when selected.
  - [ ] Backspace/Delete removes focused input chip.
  - [ ] Plus CAC.

## 19. Cards (elevated, filled, outlined)
- **Tokens (verified, generated):** `{Filled,Elevated,Outlined}CardTokens.kt@19991f2c` via `CardDefaults`: shape medium; filled surface-container-highest; elevated surface-container-low, Level1 (hover Level2); outlined surface + 1dp outline-variant, no hover elevation (`outlinedCardElevation`); content on-surface. Elevation animates with the `ElevationDefaults` tweens (incoming 120ms FastOutSlowIn, outgoing 150/120ms).
- **ARIA:** non-interactive by default; interactive cards have one primary action (`.m3e-card__action`, React `<CardAction>`) whose hit area stretches over the card; the card shows the state layer and focus ring; secondary controls stay clickable above it. Disabled = the action is `aria-disabled`.
- **Layers:** css (+ react wrapper).
- **Acceptance:**
  - [ ] Hover state layer only when interactive.
  - [ ] Plus CAC.

## 20. Lists (ListItem, SegmentedListItem; legacy non-expressive ListItem @deprecated)
- **Tokens:** `TODO(verify)` list / segmented list tokens.
- **Motion:** selection/press corner morph on fastSpatial (`TODO(verify)`).
- **ARIA:** static `ul/li`; interactive `listbox`/`option` or `grid`.
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Segmented first/last items get outer radii.
  - [ ] Arrow keys move focus in interactive lists.
  - [ ] Plus CAC.

## 21. Menus (standard, vibrant, segmented; selectable/checkable items)
- **Tokens (verified, generated):** `{Menu,StandardMenu,VibrantMenu,SegmentedMenu}Tokens.kt@19991f2c` plus the `Menu.kt` / `MenuDefaults.kt` literals Compose renders (`components/menu-defaults.css`; SOURCES register #38). Expressive item: 44dp min height (SegmentedMenuTokens.Item), 12dp padding, 8dp icon–label space, 4dp outside the item surface, 112–280dp wide, 20dp icons; leading/middle/trailing item shapes medium+extra-small / extra-small, selected medium; groups: standalone large, leading/trailing large+small, middle small, inactive (hovered, then left) small; 2dp group gap; standard = StandardMenuTokens (selected tertiary-container), vibrant = VibrantMenuTokens (selected tertiary). Baseline (`DropdownMenu`): MenuTokens surface, 8dp vertical padding, 48dp items.
- **Motion:** open scale (from ClosedScaleTarget 0.8) on fastSpatial and alpha on fastEffects around the transform origin facing the anchor, interruptible (`Menu.kt` DropdownMenuPopupContent); item selection: container color on fastEffects, shape on fastSpatial; group hover shape on fastSpatial; checked-only leading icon expands/fades.
- **Placement:** Compose `DropdownMenuPositionProvider`: below the anchor, then above, then centered on its top, then against the nearer window edge, 48dp from the window top/bottom and 8dp (baseline 0) from its sides; submenus at the anchor item's end.
- **ARIA:** APG menu; typeahead; submenus. Checkable items `menuitemcheckbox`, selectable `menuitemradio` (Compose Role.Checkbox / Role.RadioButton), `aria-checked`.
- **Layers:** elements (positioning, focus, light dismiss via popover) + react (`useMenu`) + css.
- **API:** CSS `.m3e-menu[--vibrant|--baseline]` > (`.m3e-menu__group` > `.m3e-menu__label`, `.m3e-menu__divider`) `.m3e-menu__item` (`__item-leading[--toggle]`, `__item-text` > `__item-label` / `__item-supporting`, `__item-trailing`). Element `<m3e-menu anchor variant position label open>` with `<m3e-menu-item value type checked disabled icon checked-icon supporting-text trailing-icon trailing-text submenu>` and `<m3e-menu-group label divider>`; events `action`, `open-change`. React `<MenuTrigger isOpen defaultOpen onOpenChange position>` + `<Menu variant selectionMode selectedKeys onSelectionChange onAction disabledKeys position>` + `<MenuItem id icon checkedIcon supportingText trailingIcon trailingText isDisabled submenu>` + `<MenuSection title divider>`.
- **Acceptance:**
  - [ ] Typeahead selects matching items.
  - [ ] Checkable items toggle `aria-checked`.
  - [ ] Menu flips when no room below.
  - [ ] Plus CAC.

## 22. Checkbox
- **Tokens:** `TODO(verify)` CheckboxTokens.
- **ARIA:** native checkbox, indeterminate supported.
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Check mark draws with path animation.
  - [ ] Indeterminate renders a dash.
  - [ ] Plus CAC.

## 23. Radio button
- **Tokens:** `TODO(verify)` RadioButtonTokens.
- **ARIA:** native radios in `radiogroup`.
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Arrow keys move selection.
  - [ ] Plus CAC.

## 24. Switch
- **Tokens:** `TODO(verify)` SwitchTokens.
- **Motion:** handle on fastSpatial.
- **ARIA:** `role="switch" aria-checked`.
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Handle grows on press.
  - [ ] Space toggles.
  - [ ] Plus CAC.

## 25. Slider (and range; vertical; sizes XS–XL; inset icon)
- **Tokens:** `TODO(verify)` Slider*Tokens.
- **Motion:** handle width shrinks on press (fastSpatial).
- **ARIA:** `role="slider"`; arrows, PageUp/Down, Home/End.
- **Layers:** css + react (`useSlider`) + element.
- **Acceptance:**
  - [ ] Keyboard steps equal `step`.
  - [ ] Vertical works.
  - [ ] Range thumbs cannot cross.
  - [ ] Plus CAC.

## 26. Text fields (filled, outlined)
- **Tokens:** `TODO(verify)` Filled/OutlinedTextFieldTokens.
- **Motion:** label floats on fastSpatial.
- **ARIA:** native inputs with `<label>`, `aria-describedby`, `aria-invalid`.
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Label floats when focused or filled with zero JS.
  - [ ] Error role color applied when `aria-invalid`.
  - [ ] Plus CAC.

## 27. Date picker (docked, modal, input; range)
- **Tokens:** `TODO(verify)` DatePickerModalTokens.
- **ARIA:** APG grid date picker; dialog for modal.
- **Layers:** react (`useCalendar`, `useDatePicker`) + element.
- **Acceptance:**
  - [ ] Arrow/PageUp/PageDown navigation.
  - [ ] Locale-aware first day of week.
  - [ ] Plus CAC.

## 28. Time picker (dial, input, scroll)
- **Tokens:** `TODO(verify)` TimePicker tokens.
- **ARIA:** spinbutton per segment; dial with keyboard parity.
- **Layers:** react + element.
- **Acceptance:**
  - [ ] Up/Down change hour and minute.
  - [ ] 12/24h follows locale.
  - [ ] Plus CAC.

## 29. Dialogs (basic, full-screen)
- **Tokens:** shape extra-large (`TODO(verify)` DialogTokens); container surface-container-high; scrim 0.32.
- **ARIA:** native `<dialog>`; focus trap; Esc.
- **Layers:** css + elements + react.
- **Acceptance:**
  - [ ] Focus returns to trigger.
  - [ ] Background inert.
  - [ ] Plus CAC.

## 30. Bottom sheets (standard, modal)
- **Tokens:** `TODO(verify)` SheetBottomTokens.
- **Motion:** drag with velocity on release (defaultSpatial).
- **ARIA:** modal is dialog; drag handle is a button cycling detents.
- **Layers:** elements + react.
- **Acceptance:**
  - [ ] Fling down past threshold dismisses.
  - [ ] Keyboard expands/collapses via handle.
  - [ ] Plus CAC.

## 31. Side sheets (standard, modal) — built (D8)
- **Purpose:** supplementary content anchored to the trailing edge; standard at expanded+ widths, modal below.
- **Fidelity reference:** m3.material.io/components/side-sheets only; no Compose Material3 component exists, so there are no `*Tokens.kt` sources. All values `TODO(verify)` against m3.material.io side-sheet specs (width, padding, divider, container color, modal scrim 0.32).
- **Anatomy:** container, header (title, close/back), content, optional divider, scrim (modal).
- **Motion:** slide in/out on defaultSpatial; scrim on fastEffects.
- **ARIA:** modal is `<dialog>` with focus trap; standard is `<aside aria-label>`.
- **Layers:** css + elements + react.
- **API:** `<SideSheet variant:'standard'|'modal' open onOpenChange title />`; `<m3e-side-sheet variant open>`.
- **Acceptance:**
  - [ ] Modal traps focus and restores on close.
  - [ ] Standard sheet pushes content (does not overlay) at ≥ 840px.
  - [ ] Plus CAC.

## 32. Snackbar
- **Tokens:** container inverse-surface; action inverse-primary; icon inverse-on-surface (`TODO(verify)` SnackbarTokens).
- **ARIA:** `role="status"`/`alert`; no auto-dismiss while hovered or focused.
- **Layers:** css + elements (queue) + react.
- **Acceptance:**
  - [ ] One snackbar visible at a time.
  - [ ] Action reachable by keyboard.
  - [ ] Plus CAC.

## 33. Tooltips (plain, rich)
- **Tokens:** `TODO(verify)` Plain/RichTooltipTokens.
- **ARIA:** `role="tooltip"`, `aria-describedby`; hover/focus; Esc hides.
- **Layers:** elements + react.
- **Acceptance:**
  - [ ] Stays open while hovered.
  - [ ] Plus CAC.

## 34. Badge
- **Tokens:** `TODO(verify)` BadgeTokens; error/on-error.
- **ARIA:** count exposed in parent's accessible name.
- **Layers:** css.
- **Acceptance:**
  - [ ] "999+" overflow.
  - [ ] Plus CAC.

## 35. Divider
- **Tokens (verified, generated):** `DividerTokens.kt@19991f2c` via `DividerDefaults` (`Divider.kt` L111–118): thickness 1dp, color outline-variant. `HorizontalDivider` fills the width, `VerticalDivider` the height (L49–89); no built-in insets (margins on the element).
- **Classes:** `.m3e-divider`, `.m3e-divider--vertical`.
- **ARIA:** `<hr>`/`role="separator"`; vertical adds `aria-orientation="vertical"`.
- **Layers:** css.
- **Acceptance:**
  - [ ] Renders at 1 device-independent px.
  - [ ] Plus CAC.

## 36. Carousel
- **Tokens:** `TODO(verify)` CarouselTokens.
- **Motion:** scroll-linked masking.
- **ARIA:** APG carousel.
- **Layers:** css (scroll-snap) + elements (masking) + react.
- **Acceptance:**
  - [ ] Keyboard scrolls item by item.
  - [ ] Plus CAC.

## 37. Segmented button — @deprecated (D4)
- **Status:** shipped for migration; docs point to connected button groups. `TODO(verify)` m3.material.io guidance.
- **ARIA:** radiogroup/checkbox group.
- **Layers:** css + react.
- **Acceptance:**
  - [ ] Dev warning on use.
  - [ ] Plus CAC.

## 38. Pull to refresh
- **Behavior:** pull past threshold shows LoadingIndicator (`TODO(verify)` PullToRefreshBox). Enabled only inside custom scroll containers with `overscroll-behavior: contain`.
- **ARIA:** visible "Refresh" button as keyboard alternative.
- **Layers:** elements + react.
- **Acceptance:**
  - [ ] Keyboard alternative refreshes.
  - [ ] Plus CAC.

## 39. Primitives (Surface, Icon, Scaffold, StateLayer, FocusRing)
- `.m3e-surface--container-{lowest…highest}`.
- **Icon (D5):** `<Icon name fill weight grade opticalSize />`, `<m3e-icon>`, `.m3e-icon`. Renders the Material Symbols ligature; sets `font-variation-settings` from props/data attributes. `aria-hidden` by default; `label` prop makes it `role="img"`.
- `<Scaffold>` slots: top bar, bottom bar, FAB, snackbar host.
- **Acceptance:**
  - [ ] Every component uses these primitives.
  - [ ] No component re-implements its state layer.
  - [ ] `<Icon fill>` renders FILL=1; subset font produced by `m3e-icons subset` renders the same glyphs.

**Inventory check:** every component the 1.5.0 release notes reference as expressive or graduated is covered: buttons, FAB/FAB menu, floating toolbar, flexible app bars, FlexibleBottomAppBar, WideNavigationRail, ShortNavigationBar, NavigationItem, menus, list items, WavyProgressIndicator, LoadingIndicator, MaterialShapes, MaterialExpressiveTheme, Slider, TimePicker, search/AppBarWithSearch. Deprecated set shipped per D4: BottomAppBar, small FAB, legacy NavigationBar/Rail, non-expressive ListItem, Segmented button. Side sheets added per D8. `TODO(verify): diff against the androidx.compose.material3 package-summary at 1.5.0-beta01`.
