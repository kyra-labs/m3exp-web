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
- **Variants:** standard, connected; sizes XS–XL; round/square; single/multi-select (and selection required); overflow menu (standard).
- **Anatomy:** group container, items (buttons), overflow indicator (filled icon button, `more_vert`, "More options") and its menu.
- **Tokens (verified, generated):** `ButtonGroupSmallTokens.kt`, `ConnectedButtonGroupSmallTokens.kt`@19991f2c plus `components/button-group-defaults.css` (SOURCES register #21): the `ButtonGroupDefaults` values Compose renders (`ExpandedRatio` 0.15, width spring = fast spatial, release threshold 0.75 / max wait 1000ms from `EnlargeOnPressNode`) and the per-size values Compose lacks from the m3.material.io token DB (`md.comp.button-group.*`; Compose spaces and shapes every size with the small tokens).

  | | XS | S | M | L | XL |
  |---|---|---|---|---|---|
  | height (= button) | 32 | 40 | 56 | 96 | 136 |
  | standard between-space | 18 | 12 | 8 | 8 | 8 |
  | connected between-space | 2 | 2 | 2 | 2 | 2 |
  | connected inner corner | 8 (`TODO(verify)` #63: specs caption says 4) | 8 | 8 | 16 | 20 |
  | connected pressed inner corner | 4 | 4 | 4 | 12 | 16 |

  - Connected outer corners: round (CornerFull); square groups keep the inner corner size outside too (m3.material.io Measurements). Checked = CornerFull (`connectedButtonCheckedShape`); pressed wins over checked (`ToggleButton.kt` shapeByInteraction).
  - Items keep their intrinsic width (standard groups hug them, top-aligned); connected groups span their container with equal-width items, never narrower than the button minimum width (58dp ≥ the 48dp XS/S connected minimum).
- **Motion:** standard groups only: a pressed item's 0→1 value springs on **fast spatial** (`ButtonGroup.kt` L138; token DB `pressed.item.width.motion.spring` = fast spatial at every size) and `ButtonGroupMeasurePolicy` turns it into widths: a middle item grows by `min(ExpandedRatio × width / 2, neighbors' compression limits)` on each side, the first/last by `min(ExpandedRatio × width, neighbor's limit)`; neighbors give up the same width, so the total stays constant. The compression limit is the item's end padding (Compose `contentPadding.calculateEndPadding`). On release the value keeps going until it passes 0.75 (≤ 1s), then springs back; a new press retargets from the current value and velocity. Connected groups never change their neighbors (m3.material.io). Shapes: press morph on default effects for plain buttons (Button.kt), fast spatial for toggles/radios and connected corners (ToggleButton.kt L176), interruptible.
- **Behavior:** overflow (standard groups): when the items and their spacing do not fit, the indicator's width is reserved and leading items are shown while each fits (`ButtonGroupMeasurePolicy` L673–716); the rest are listed in a baseline menu (Compose `DropdownMenu` + `DropdownMenuItem`), re-measured on resize.
- **Keyboard/ARIA:** none → `role="group"` with buttons; single → `role="radiogroup"`, radios with `aria-checked`; multiple → `role="group"`, `aria-pressed` buttons (React Aria `useToggleButtonGroupItem` semantics). One tab stop (last focused, else the checked radio, else the first); ArrowLeft/Right (mirrored in RTL), Home/End move focus without wrapping; Enter/Space activate. Overflow button: `aria-haspopup="true"` (≡ `menu`), `aria-expanded`, `aria-controls` while open.
- **Layers:** css (static layout, connected corners, spacing); elements + react share m3e-elements `ButtonGroupLayout` (width springs, shape springs, roving focus, overflow measurement) and m3e-motion `buttonGroupWidths` / `buttonGroupVisibleCount`.
- **API:** CSS `.m3e-button-group.m3e-button-group--{standard|connected}.m3e-button-group--size-{xs…xl}[.m3e-button-group--overflow]` > `.m3e-button.m3e-button-group__item`, `.m3e-icon-button.m3e-button-group__overflow`. React `<ButtonGroup variant size shape buttonVariant selectionMode selectedKeys defaultSelectedKeys onSelectionChange disallowEmptySelection onAction overflow overflowLabel isDisabled>` with `<ButtonGroupItem id icon variant isDisabled onPress aria-label textValue>`. Element `<m3e-button-group variant size shape button-variant selection-mode selection-required overflow overflow-label label disabled>` with `<m3e-button-group-item value icon selected disabled variant label>`; events `change` (`{ value, selected, values }`) and `action` (`{ value }`).
- **Acceptance:**
  - [x] XS between-space = generated value (18px).
  - [x] Pressed item grows by ExpandedRatio (capped by the neighbors' compression limits) and neighbors shrink; total width constant.
  - [x] Arrow keys move focus.
  - [x] Overflow menu appears below available width.
  - [x] Plus CAC.
- **Fidelity:** widths keep fractions (Compose rounds each growth to whole device px); items use the size's button padding (Compose's clickableItem uses `ButtonDefaults.ContentPadding`, 24dp); the overflow indicator matches the group size (Compose: a default 40dp `FilledIconButton`) and selectable items show a check in the menu (Compose's menu items show no selection); no tooltip on the indicator yet (Tooltip component).
- **Sources:** ButtonGroup.kt, ButtonGroupSamples.kt, ButtonGroup*Tokens.kt, ToggleButton.kt; m3.material.io/components/button-groups (specs, guidelines, accessibility) and its token DB.

## 4. Split button
- **Purpose:** primary action plus a menu of related actions. Sizes XS–XL.
- **Variants:** elevated, filled, tonal, outlined (`SplitButtonDefaults.ElevatedLeadingButton` … `OutlinedTrailingButton`: the Button colors, elevations and outline).
- **Anatomy:** leading button, trailing menu button, gap, menu.
- **Tokens (verified, generated):** `SplitButton{XSmall,Small,Medium,Large,XLarge}Tokens.kt@19991f2c` plus the `SplitButtonDefaults` values Compose renders (`components/split-button-defaults.css`; SOURCES register #22).

  | | XS | S | M | L | XL |
  |---|---|---|---|---|---|
  | height | 32 | 40 | 56 | 96 | 136 |
  | inner corner (rest) | 4 | 4 | 4 | 8 | 12 |
  | inner corner (pressed) | 8 | 12 | 12 | 20 | 20 |
  | leading padding start / end | 12 / 10 | 16 / 12 | 24 / 24 | 48 / 48 | 64 / 64 |
  | trailing padding start / end | 13 / 13 | 13 / 13 | 15 / 15 | 29 / 29 | 43 / 43 |
  | trailing icon | 22 | 22 | 26 | 38 | 50 |
  | trailing width (padding + icon, ≥ 48) | 48 | 48 | 56 | 96 | 136 |

  - Spacing 2dp at every size (`SplitButtonDefaults.Spacing` = the small BetweenSpace). Minimum width 48dp for both buttons (`LeadingButtonMinWidth`). Outer corners full (`OuterCornerSize` = `ShapeDefaults.CornerFull`). Leading icon size, icon–label space and label style follow the button of the same size (`ButtonDefaults.iconSizeFor` / `iconSpacingFor` / `textStyleFor`, as the samples pass them); content padding is horizontal only.
  - Checked (menu open) trailing button: `TrailingCheckedShape = CircleShape` (inner corners full; the tokens' `TrailingInnerSelectedCornerCornerSizePercent` 50) and an outline in the content color at `StateTokens.PressedStateLayerOpacity` (0.1). Pressed wins over checked (`shapeByInteraction`).
  - The trailing content is centered optically: shifted toward the end by `CenterOpticallyCoefficient` (0.11) × (start corners − end corners) (`HorizontalCenterOptically.kt`), 0 when checked.
  - Compose renders no hover morph: the `InnerHoveredCornerCornerSize` tokens are unused, here too.
- **Motion:** inner corners (rest → pressed → checked) on the **default effects** spring (`SplitButton.kt` L697, L777, L889: every `LeadingButton` / `TrailingButton`; supersedes the earlier fastSpatial note). The trailing icon turns 180° when checked on `animateFloatAsState`'s default `spring()` (damping 1, stiffness 1500; `SplitButtonSamples.kt`, the Compose catalog; `AnimateAsState.kt` → `AnimationSpec.kt` → `Spring.StiffnessMedium` / `DampingRatioNoBouncy`). Both interruptible with their velocity kept. Reduced motion: the rotation (spatial) jumps; the corner morph uses the fast effects spring, as buttons do. (m3.material.io: the trailing button "spins and changes shape when activated".)
- **Behavior:** the trailing button toggles the menu and reflects open state (`aria-expanded`, checked shape and icon).
- **Keyboard/ARIA:** two buttons; trailing `aria-haspopup="true"` (equivalent to `"menu"` in WAI-ARIA 1.2; what the APG menu button and React Aria's `useMenuTrigger` use, as Menus §21 does) `aria-expanded aria-label`; Down arrow opens on the first item (Up on the last, Enter/Space on the first); Esc closes and returns focus to the trailing button.
- **Layers:** css + elements (`<m3e-split-button>` anchors an `<m3e-menu>`) + react.
- **API:** CSS `.m3e-split-button` > `.m3e-button.m3e-button--<variant>.m3e-button--size-<size>.m3e-split-button__leading` / `__trailing` (load `button.css` too). Element `<m3e-split-button label icon trailing-icon menu-label variant size disabled menu>` with an `<m3e-menu>` child (or `menu="<id>"`); event `press` (leading). React `<SplitButton variant size icon onPress menu={<Menu>…</Menu>} menuLabel trailingIcon isOpen defaultOpen onOpenChange menuPosition isDisabled />`.
- **Acceptance:**
  - [ ] Trailing icon rotates when open.
  - [ ] `aria-expanded` syncs.
  - [ ] Esc closes and returns focus to the trailing button.
  - [ ] Plus CAC.
- **Fidelity:** the menu is placed from the trailing button (the Compose sample anchors its `DropdownMenu` to the box around the whole layout, so it lines up with the leading button); springs keep their velocity on every retarget (Compose's `AnimatedShapeState` only on a reversal); XS/S reach 48dp with the button's `::after` target instead of reserving layout space (`minimumInteractiveComponentSize`); the samples' trailing tooltip waits for Tooltips (§33).
- **Sources:** SplitButton.kt, SplitButton*Tokens.kt, HorizontalCenterOptically.kt, internal/AnimatedShape.kt, SplitButtonSamples.kt; m3.material.io/components/split-button/overview; Material Web labs split button (2.5.0, secondary).

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
- **Variants:** linear/circular × flat/wavy × determinate/indeterminate; default (4dp) and thick (8dp, "a sample configuration in code": Compose `LinearThickWavyProgressIndicatorSample` / `CircularThickWavyProgressIndicatorSample`; the m3.material.io token DB keeps the thick values as deprecated tokens).
- **Tokens (verified, generated):** `{Linear,Circular}ProgressIndicatorTokens.kt`, `ProgressIndicatorTokens.kt`@19991f2c plus the `ProgressIndicatorDefaults` / `WavyProgressIndicatorDefaults` values Compose renders (`components/progress-indicator-defaults.css`; SOURCES register #26). Corrects the earlier MDC-Android / secondary values:

  | | linear | circular |
  |---|---|---|
  | stroke = track | 4 (thick 8) | 4 (thick 8) |
  | gap | 4 (TrackActiveSpace; the flat gap is measured between the round caps: gap + stroke) | 4 |
  | container | 240 × 4 flat (`LinearIndicatorWidth` literal, height = stroke); 240 × 10 wavy (WaveHeight); thick 8 flat (token DB `linear.thick.height`), 14 wavy (sample) | 40 flat (Size), 48 wavy (WaveSize); thick 52 for both (sample; token DB `circular.thick.size`, not 44) |
  | stop indicator | 4 (StopSize), at min((height − size) / 2, 6dp) from the end (flat); wavy: shrinks away as the progress reaches it | none |
  | wavelength | 40 determinate, 20 indeterminate | 15 (actual: whatever fits a whole number of waves, ≥ 5) |
  | amplitude | (container − stroke) / 2 = ActiveWaveAmplitude 3 | a star (inner radius 0.75, rounding 0.35 / smoothing 0.4, inner 0.5) morphed from the track circle; `ActiveWaveAmplitude` 1.6 is not read by Compose |

  Colors: indicator and stop primary, track secondary-container; the flat indeterminate circular indicator has no track (`circularIndeterminateTrackColor = Transparent`), the wavy one keeps it.
- **Motion (verified):** determinate value changes spring on `ProgressIndicatorDefaults.ProgressAnimationSpec` (damping 1, stiffness 50, visibility threshold 0.001; every sample uses it, wavy ones too; `WavyProgressIndicatorDefaults.ProgressAnimationSpec` is used by none). The wave moves one wavelength per second (`waveSpeed = wavelength`; the offset tween takes wavelength / speed × 1000ms, × the vertex count for one full circular turn, ≥ 50ms); it moves toward the start (the segment is cut further along the wave, then shifted back). Determinate amplitude: 0 at ≤ 10% and ≥ 95% (`indicatorAmplitude`), tweening up on DurationLong2 + EasingStandard and down on DurationLong2 + EasingEmphasizedAccelerate, a running tween never retargeted. Indeterminate linear: per 1750ms cycle, line heads/tails run `0 at delay → 1 at delay + duration` on EmphasizedAccelerate (first head 0 + 1000, first tail 250 + 1000, second head 650 + 850, second tail 900 + 850). Indeterminate circular: per 6000ms, 1080° linear rotation, plus a 90° step every 1500ms moving linearly over 300ms (the EmphasizedDecelerate `using` is attached to the holds), and the sweep 10% → 87% linearly then back on EasingStandard; wavy ones start 90° further.
- **Behavior:** gap = min(progress length, gap). At 0% the flat linear and flat circular indicators draw no indicator (zero sweep); the wavy circular one draws a dot (zero-length segment with round caps), the wavy linear one none. Near 100% the flat circular track's sweep turns negative and, as Skia draws negative sweeps, runs backwards from its start (fills the closing gap; register #64). RTL: linear indicators mirror (wavy ones rotate 180° like Compose); circular ones do not (m3.material.io). Reduced motion (project choice, FOUNDATIONS §4): the decorative wave holds still, value changes and amplitude tweens jump (spatial), indeterminate lines and arcs keep moving: the motion is the only cue that the wait goes on (WCAG 2.2.2 treats such motion as essential), unlike the loading indicator's decorative morph. Forced colors: indicator and stop CanvasText, track GrayText.
- **Keyboard/ARIA:** `role="progressbar"` with an accessible name (`aria-label` / `label`); determinate `aria-valuemin="0" aria-valuemax="100" aria-valuenow` (rounded percent). Not focusable.
- **Layers:** css (flat, determinate and indeterminate; registered properties driven by the generated keyframes) + elements/react (value spring, wavy SVG paths every frame; one shared driver in `@kyralabs/m3e-elements/progress-indicator.js`).
- **API:** CSS `.m3e-linear-progress(--wavy|--thick)` > `__track`, `__indicator`, `__stop` (determinate) or track/indicator/track/indicator/track (indeterminate); wavy `> svg.__wave` > `path.__wave-track`, `path.__wave-indicator`, `circle.__wave-stop`. `.m3e-circular-progress(--wavy|--thick)` > `svg.__svg` > `__track`, `__indicator` (`<circle>` flat, `<path>` wavy). Value `--m3e-comp-progress-indicator-value` (0–1); JS layers set `[data-driven]`. React `<LinearProgress value? shape:'flat'|'wavy' thickness:'default'|'thick' amplitude?: number | (progress) => number wavelength? waveSpeed? aria-label />`, `<CircularProgress …/>`. Elements `<m3e-linear-progress value shape thickness amplitude wavelength wave-speed label>`, `<m3e-circular-progress …>`.
- **Acceptance:**
  - [x] Gap = min(progress length, 4px).
  - [x] Wave scrolls at one wavelength per second.
  - [x] Amplitude ramps to 0 at ≤ 10% and ≥ 95% (tweened).
  - [x] Determinate progress animates on ProgressAnimationSpec (velocity kept in the JS layers).
  - [x] RTL mirrors direction (linear).
  - [x] Plus CAC.
- **Sources:** ProgressIndicator.kt, WavyProgressIndicator.kt, internal/LinearWavyProgressModifiers.kt, internal/CircularWavyProgressModifiers.kt, ProgressIndicatorSamples.kt, *ProgressIndicatorTokens.kt, MotionTokens.kt (vendored); animation-core AnimationSpec.kt (keyframes `using`), VectorizedAnimationSpec.kt (Spring constants); m3.material.io Progress indicators (overview, specs, guidelines, accessibility; token DB thick values).

## 9. Floating toolbar (horizontal, vertical)
- **Variants:** horizontal/vertical; standard/vibrant (`FloatingToolbarDefaults.standardFloatingToolbarColors` / `vibrantFloatingToolbarColors`); with FAB (FAB at the end or the start); expanded/collapsed; scroll behaviors `exitAlways` (`FloatingToolbarDefaults.exitAlwaysScrollBehavior`) and collapse-on-scroll (`floatingToolbarVerticalNestedScroll`).
- **Anatomy:** toolbar (pill) with leading items, items, trailing items (leading/trailing show only while expanded); beside a FAB: the toolbar and an adjacent FAB slot (`FloatingToolbarDefaults.Standard/VibrantFloatingActionButton`).
- **Tokens (verified, generated):** `FloatingToolbarTokens.kt@19991f2c` plus the `FloatingToolbarDefaults` values Compose renders (`components/floating-toolbar-defaults.css`; SOURCES register #27).

  | | value | source |
  |---|---|---|
  | container | ≥ 64 across (height horizontal, width vertical), CornerFull, clipped | `ContainerSize` = ContainerHeight (L635); `heightIn` / `widthIn` (L1507, L1731) |
  | padding | 8 on every side | `ContentPadding` = ContainerLeadingSpace / ContainerTrailingSpace (L677–683) |
  | items | 48 slots (IconButton's `minimumInteractiveComponentSize`), **edge to edge**: `Arrangement.Center`, no spacing (L1510, L1734); `ContainerBetweenSpace` (4) is not rendered (supersedes the earlier "item gap 4") | |
  | screen offset | 16 (the samples' offset from the screen edge) | `ScreenOffset` = ContainerExternalPadding (L689) |
  | elevation | Level0 expanded and collapsed; beside a FAB the toolbar lerps Level0 → **Level1** with the expanded progress (clamped at 1) | L640–666 (upstream "TODO read from token"), L1681–1686 |
  | with FAB | row 80 tall (`FabSizeRange.endInclusive`), width = toolbar + 8 (`ToolbarToFabGap`) + 56; FAB = lerp(80, 56, progress), shape `FloatingActionButtonDefaults.shape` (baseline, 16) at every size, elevation Level2 / hovered Level3 | L1153, L1160, L1620–1694, L839–911 |
  | colors | standard: surfaceContainer / onSurface, FAB primaryContainer / onPrimaryContainer; vibrant: primaryContainer / onPrimaryContainer, FAB tertiaryContainer / onTertiaryContainer (contentColorFor) | L1108–1142 |

  The `VibrantButton*` tokens are not read by Compose at the pin (items inherit `LocalContentColor`).
- **Motion (verified; supersedes "scroll exit on defaultSpatial"):** expand/collapse on `FloatingToolbarDefaults.animationSpec()` = **fast spatial** (L698): without a FAB the leading/trailing items `expandHorizontally` from Start / End and `shrinkHorizontally` towards End / Start (vertical: expand from and shrink towards Bottom for leading, Top for trailing); beside a FAB the toolbar width = max width × progress, its content anchored at the toolbar's leading edge (trailing edge fixed next to the FAB), and the FAB size and toolbar elevation follow the same progress (overshooting with the spring). Interruptible, velocity kept (Compose `updateTransition` / Animatable). Exit on scroll is scroll-linked: the offset moves with every scroll delta between 0 and minus the distance off the container (L547–627); when scrolling stops a partly hidden toolbar snaps to shown (collapsed fraction < 0.5) or hidden on the snap spec = **default effects** (L725, `settleFloatingToolbar` L1383–1437). Reduced motion: the fast spatial spring jumps; the snap (geometry on an effects spring) jumps too (project policy, `--m3e-comp-floating-toolbar-defaults-snap-duration: 0ms`). Collapse-on-scroll: collapses after `ScrollDistanceThreshold` (40) of scrolling down, expands after 40 up (L1013–1106).
- **Behavior:** hidden parts are not focusable (Compose's sample: `focusProperties { canFocus = expanded }`): collapsed leading/trailing parts, or the folded toolbar beside a FAB, are `inert` and focus inside moves to the FAB (or the first remaining item). An offscreen (exit-always) toolbar leaves the tab order (L190–196: `canFocus = false` while the offset is not 0) and comes back when focus moves into it; it does not hide while it holds focus (WCAG 2.4.11; Compose has no such rule).
- **Keyboard/ARIA:** `role="toolbar"` with `aria-orientation` and an `aria-label`; roving tabindex (one tab stop: the last focused item, else the first); ArrowLeft/Right (mirrored in RTL) or ArrowUp/Down when vertical; Home/End; no wrapping (APG toolbar; React Aria `useToolbar` keeps every item tabbable and has no Home/End, so both layers use m3e-elements `RovingFocus`, reusable by the docked toolbar §10).
- **Layers:** css (static layout, color styles, collapsed states; without JS the with-FAB fold transitions on the fast spatial `linear()` curve); elements + react share m3e-elements `FloatingToolbarLayout` (springs, inert, roving focus, scroll behaviors) and m3e-motion `floating-toolbar-scroll.ts` / `toolbarNavigationTarget`.
- **API:** CSS `.m3e-floating-toolbar(--vertical|--vibrant|--collapsed|--with-fab|--fab-start)[role=toolbar]` > `.m3e-floating-toolbar__bar` (> `__leading`, items, `__trailing`) + `.m3e-floating-toolbar__fab` > `.m3e-fab`. Element `<m3e-floating-toolbar expanded orientation color-style label fab-position scroll-behavior="exit-always|collapse" exit-direction scroll-target>` with `slot="leading|trailing|fab"` children; event `expanded-change` (`{ expanded }`). React `<FloatingToolbar orientation expanded defaultExpanded onExpandedChange colorStyle:'standard'|'vibrant' leading trailing fab fabPosition scrollBehavior?:'exitAlways'|'collapse' exitDirection scrollTarget aria-label />`, `floatingToolbarClassName()`.
- **Acceptance:**
  - [x] Height 64 with 48 item slots (generated tokens).
  - [x] Roving tabindex works.
  - [x] Hides on scroll down, shows on scroll up.
  - [x] Plus CAC.
- **Fidelity:** no touch-exploration (TalkBack) detection, so the toolbar does not force itself expanded or drop its scroll behavior for screen readers, and Compose's expand/collapse custom accessibility actions have no web equivalent; the toolbar's Level0 → Level1 shadow fades the Level1 shadow by the progress instead of lerping the elevation; `minimumInteractiveBalancedPadding` (balances asymmetric 48dp alignment lines) is not needed for symmetric 48dp slots and not ported; no horizontal scrolling of an overflowing toolbar (Compose: `horizontalScroll` beside a FAB); the toolbar does not hide while it holds focus (WCAG 2.4.11); exit-on-scroll is measured against the offset parent or the viewport (Compose: the parent layout) and moves the root with `translate`, so position it with insets/margins.
- **Sources:** FloatingToolbar.kt (vendored), FloatingToolbarTokens.kt, FloatingToolbarSamples.kt, FloatingActionButton.kt (`FloatingActionButtonDefaults.shape`), ColorScheme.kt (`contentColorFor`).

## 10. Docked toolbar (FlexibleBottomAppBar) — and BottomAppBar (@deprecated, D4)
- **Variants:** arrangements `spread` (`BottomAppBarDefaults.FlexibleHorizontalArrangement` = SpaceBetween, the default), `center` (`FlexibleFixedHorizontalArrangement` = spacedBy(32dp, CenterHorizontally)), `space-around` / `space-evenly` (the `ExitAlwaysBottomAppBarSpacedAround` / `SpacedEvenly` samples, no horizontal padding); standard / vibrant (the `ExitAlwaysBottomAppBarFixedVibrant` sample: primaryContainer, upstream "TODO tokens"); scroll behavior `exitAlways` (`BottomAppBarDefaults.exitAlwaysScrollBehavior`). Compose has no `FlexibleBottomAppBarDefaults` object: the flexible values live in `BottomAppBarDefaults`.
- **Tokens (verified, generated):** `DockedToolbarTokens.kt` / `BottomAppBarTokens.kt@19991f2c` plus the `BottomAppBarDefaults` values Compose renders (`components/docked-toolbar-defaults.css`, `components/bottom-app-bar-defaults.css`; SOURCES register #28). Supersedes the earlier `TODO(verify)` list: height 64, no radius and no elevation are confirmed; "16 end padding" is 16 at **both** ends; "item spacing max 32 / min 4" is 32 for the center arrangement only, and the min 4 is **not rendered**.

  | | value | source (`AppBar.kt` unless noted) |
  |---|---|---|
  | container | 64 tall (`FlexibleBottomAppBarHeight` = DockedToolbarTokens.ContainerHeight) above the window insets (here the safe-area insets: horizontal + bottom), full width | L2352, BottomAppBarLayout L1318–1389 |
  | padding | 16 start and end (`FlexibleContentPadding` = ContainerLeadingSpace / ContainerTrailingSpace), 0 for space-around / space-evenly (samples) | L2342–2346; AppBarSamples.kt L1820, L1987 |
  | items | 48 slots (IconButton's `minimumInteractiveComponentSize`), centered vertically; spread = space between (first and last slots at the 16 ends), center = 32 between slots (`DockedToolbarTokens.ContainerMaxSpacing`), group centered. `ContainerMinSpacing` (4) is read by no Compose code: spread items can meet | L2355, L2360–2361 |
  | shape / elevation | `BottomAppBarTokens.ContainerShape` CornerNone; `AppBarTokens.ContainerElevation` Level0 (tonal, no shadow) | L1362, L1309 |
  | colors | `BottomAppBarDefaults.containerColor` = BottomAppBarTokens.ContainerColor (surfaceContainer; `DockedToolbarTokens.ContainerColor` is not read) / `contentColorFor` onSurface; vibrant primaryContainer / onPrimaryContainer; items inherit `LocalContentColor` | L2312, L1289; AppBarSamples.kt L2156 |
  | legacy BottomAppBar | 80 tall (BottomAppBarTokens.ContainerHeight) above the insets; padding 4 start, top and end (16 − 12, `BottomAppBarHorizontalPadding` / `VerticalPadding`), none at the bottom; actions from the start (weight 1); FAB slot full height with 8 above and 12 after the FAB (`FABVerticalPadding` 12 − 4 / `FABHorizontalPadding` 16 − 4), FAB top-start in it; container elevation 0 (`BottomAppBarDefaults.ContainerElevation`; the token's Level2 is not rendered); FAB as the `BottomAppBarWithFAB` sample passes it: `bottomAppBarFabColor` secondaryContainer / onSecondaryContainer, `bottomAppBarFabElevation()` 0 in every state | L1077–1112, L1205–1206, L2315, L2339, L2651–2656; FloatingActionButton.kt L1107–1118; AppBarSamples.kt L1668–1669 |

- **Motion (verified):** exit on scroll is scroll-linked: the height offset moves with every scroll delta between 0 and minus the bar's measured height (`BottomAppBarStateImpl` L2513–2539, `ExitAlwaysScrollBehavior.onPostScroll` L2569–2579, heightOffsetLimit = −placeable.height L1365–1375; the same math as the floating toolbar's, reused from m3e-motion `floating-toolbar-scroll.ts`). When scrolling stops a partly hidden bar snaps to shown (collapsed fraction < 0.5) or hidden (`settleAppBarBottom` L2600–2648; nothing within 1 % of either end) on `BottomAppBarDefaults.snapAnimationSpec` = **fast spatial** (L2367–2368; not default effects as for the top app bar and the floating toolbar). The sprung offset goes through the state's coercion like Compose's `heightOffset` setter, so the overshoot of the expressive fast spatial spring rests at the edge. Interruptible: a scroll takes over from a running snap; focus moving into the bar retargets it to shown with its velocity kept. Reduced motion: the fast spatial spring jumps. Compose moves the bar by shrinking its layout height (drawing it from its top); here the bar translates and its layout box stays.
- **Behavior:** the bar stays in the tab order while hidden (Compose has no focus rule for it); focus moving into a hidden bar brings it back, and it does not hide while it holds focus (WCAG 2.4.11).
- **Keyboard/ARIA:** `role="toolbar"` with an `aria-label`; roving tabindex (one tab stop), ArrowLeft/Right (mirrored in RTL), Home/End, no wrapping (m3e-elements `RovingFocus`, as §9). The legacy bar is a toolbar over its actions and FAB.
- **Layers:** css (static layout, arrangements, colors, the offset); elements + react share m3e-elements `DockedToolbarLayout` (RovingFocus + the exit-always `ExitOnScroll`, which the floating toolbar uses too). The deprecated BottomAppBar has css + react only (D4: no new element).
- **API:** CSS `.m3e-docked-toolbar(--center|--space-around|--space-evenly|--vibrant)[role=toolbar]` > items; `.m3e-bottom-app-bar[role=toolbar]` > `__actions` + `__fab` > `.m3e-fab` (deprecated). Element `<m3e-docked-toolbar arrangement color-style label scroll-behavior="exit-always" scroll-target>`. React `<DockedToolbar arrangement:'spread'|'center'|'space-around'|'space-evenly' colorStyle:'standard'|'vibrant' scrollBehavior?:'exitAlways' scrollTarget aria-label />`, `dockedToolbarClassName()`; `<BottomAppBar actions floatingActionButton scrollBehavior scrollTarget aria-label />` (`@deprecated`, warns once in dev).
- **Acceptance:**
  - [x] Centered items spaced 32px (between their 48dp slots; generated `fixed-item-spacing`).
  - [x] Spread keeps 16px ends (generated `content-padding-start` / `-end`).
  - [x] `role="toolbar"` with roving tabindex; hides on scroll down, shows on scroll up.
  - [x] Deprecated BottomAppBar warns once in dev.
  - [x] Plus CAC.
- **Fidelity:** no touch-exploration (TalkBack) detection, so the scroll behavior stays on for screen readers (Compose turns it off); no fling continuation (the browser's own momentum scrolls the content, as §9/§11); no dragging the bar itself (Compose's `appBarDragModifier`); the bar translates instead of shrinking its layout height, so content under a static (non-overlaid) bar does not gain the space; the samples' 56dp-wide FilledIconButton is shown with the wide icon button width (52dp) in the docs.
- **Sources:** AppBar.kt (vendored), DockedToolbarTokens.kt, BottomAppBarTokens.kt, AppBarTokens.kt, AppBarSamples.kt (vendored), FloatingActionButton.kt (`bottomAppBarFabElevation`), ColorScheme.kt (`contentColorFor`).

## 11. Top app bars (small, center-aligned, medium/large flexible, two-rows)
- **Variants:** small (`TopAppBar`), center-aligned (`CenterAlignedTopAppBar`; any bar takes a centered title: `titleHorizontalAlignment = CenterHorizontally`), medium flexible and large flexible (`MediumFlexibleTopAppBar` / `LargeFlexibleTopAppBar`, `@material3expressive`: title + optional subtitle, title alignment), two-rows (`TwoRowsTopAppBar`, `@material3expressive`: the general form behind the flexible bars, with custom collapsed / expanded heights, titles that can differ per row (`title(expanded)`) and no bottom padding under the expanded title). Scroll behaviors `pinned`, `enter-always`, `exit-until-collapsed` (`TopAppBarDefaults.*ScrollBehavior`). The non-flexible `MediumTopAppBar` / `LargeTopAppBar` (headline-small / headline-medium titles, 112 / 152 expanded) are **out of scope**: §11 and ROADMAP M6 name the flexible bars, which M3 Expressive recommends instead (the flexible bars without a subtitle have the same layout); they can be added later as `--medium` / `--large` modifiers on the same two-rows layout.
- **Anatomy:** single row: navigation icon, headline (title, subtitle), actions. Two rows: the same top row (its headline is the collapsed title, in the small styles) over the expanded row (`__expanded`) holding the expanded headline.
- **Tokens (verified, generated):** `AppBarTokens.kt`, `AppBarSmallTokens.kt`, `AppBarMediumFlexibleTokens.kt`, `AppBarLargeFlexibleTokens.kt@19991f2c` plus the `TopAppBarDefaults` values and private `AppBar.kt` literals Compose renders (`components/top-app-bar-defaults.css`; SOURCES register #29). There is no `AppBarCenterAligned*` token object: the center-aligned bar uses `AppBarSmallTokens`. Supersedes the earlier `TODO(verify)` heights, padding and title type.

  | | small / center-aligned | medium flexible | large flexible | two-rows (defaults) | source (`AppBar.kt` unless noted) |
  |---|---|---|---|---|---|
  | collapsed (top row) height | 64 (`TopAppBarExpandedHeight`) | 64 (`MediumAppBarCollapsedHeight`) | 64 (`LargeAppBarCollapsedHeight`) | 64 (`MediumAppBarCollapsedHeight`) | L1987–2004, L959; = AppBarSmallTokens.ContainerHeight |
  | expanded height, no subtitle / subtitle | — | 112 / 136 | 120 / 152 | 112 / 136 (custom allowed) | L1996–2015 (`AppBar*FlexibleTokens.ContainerHeight` / `LargeContainerHeight`), L963–973 |
  | expanded title / subtitle | — | headline-medium / label-large | display-small / title-medium | headline-medium / label-large | `AppBar*FlexibleTokens.TitleFont` / `SubtitleFont`, passed at L639–646, L834–842, L944–952 |
  | top-row (collapsed) title / subtitle | title-large / label-medium | title-large / label-medium | title-large / label-medium | title-large / label-medium | `AppBarSmallTokens` |
  | expanded title bottom padding | — | 24 from the last baseline | 28 from the last baseline | 0 (title box on the bottom edge) | `MediumTitleBottomPadding` L3606, `LargeTitleBottomPadding` L3608, L946 |
  | horizontal layout | navigation padded 4 at the start, title padded 4 each side starting at max(12, navigation width), actions padded 4 at the end; centered titles centered on the whole width, moved aside for the navigation / actions | same top row; expanded title from 12 (+ 4 padding), ending 4 (+ 4) before the end | same | same | `TopAppBarHorizontalPadding` L3610, `TopAppBarTitleInset` L3615, `placeTopAppBar` L3167–3256 |
  | colors | surface → on-scroll surface-container (`AppBarTokens`); title on-surface, subtitle on-surface-variant, navigation on-surface, actions on-surface-variant | same roles | same | same | `defaultTopAppBarColors` L1510–1522 |

  When the expanded headline does not fit above the padding, Compose reduces the padding (`adjustedBottomPadding`, L3227–3242), so with the default heights and title styles every flexible bar renders its expanded title at the top of the expanded row; the padding applies with taller custom heights. Rows grow with a taller headline (max(height, title height)). Snap spring `TopAppBarDefaults.snapAnimationSpec` = **default effects** (L1539–1540, for every variant: the flexible bars use the same scroll behaviors), jumping under reduced motion (project policy); the two-rows easings `TopTitleAlphaEasing` = cubic-bezier(0.8, 0, 0.8, 0.15) (L3604) and `FastOutLinearInEasing` = cubic-bezier(0.4, 0, 1, 1) (animation-core `Easing.kt` L66).
- **Motion (verified):** the height offset is scroll-linked (`TopAppBarState`, m3e-motion `app-bar-scroll.ts`): `enter-always` moves it with every scroll delta (L3400–3455); `exit-until-collapsed` collapses with every downward delta (`onPreScroll`) and expands only with what the content cannot take (`onPostScroll` `available.y`, L3476–3536) — on the web, where the content scrolls by the whole delta, the part of an upward scroll that lies within the collapsed distance of the top, so the bar is fully expanded when the content is back at its start. The collapsible height is the whole bar for a single-row bar and the expanded row for a two-rows bar (`adjustHeightOffsetLimit` on that row, L2898, L2922–2928), so exit-until-collapsed collapses a flexible bar to the 64dp small bar. When scrolling stops, a partly collapsed bar snaps to expanded (collapsed fraction < 0.5) or collapsed on the snap spring, from rest (`settleAppBar` L3542–3589; nothing within 1 % of either end); any new scroll takes over from the snap, except that an upward scroll lets a snap that is opening the bar finish. Single-row bars: the container color switches to the scrolled color once content scrolls under the bar (`overlappedFraction > 0.01`), animated on the default effects spring (L2688–2700). Two-rows bars (L2818–2836), all from the collapsed fraction and not animated: container color = Oklab lerp(container, scrolled, FastOutLinearIn(fraction)) (`TopAppBarColors.containerColor` L2229–2235), collapsed-title alpha = TopTitleAlphaEasing(fraction), expanded-title alpha = 1 − fraction, and the collapsed title's semantics are hidden below 0.5, the expanded title's from 0.5. Reduced motion: the snap jumps; scroll-linked motion follows the scroll.
- **Behavior:** Compose shrinks the bar's layout height (the expanded title moving up with the shrinking row, clipped); here the bar keeps its layout box and is clipped (`clip-path`), the expanded title translated up by the offset (a single-row bar's content by half of it, centered in what is left). Focus moving into a hidden part (a hidden single-row bar, or a focusable inside a collapsed expanded row) snaps the bar open; a two-rows bar's top row never hides.
- **ARIA:** `<header>`; heading level by consumer. Two-rows bars render the title in both rows; the row Compose hides from accessibility carries `aria-hidden="true"` (static markup: the collapsed headline), swapped by the scroll behavior at half collapsed.
- **Layers:** css (static layout of every variant, colors, the clip/offset contract) + elements (`attachTopAppBarScroll`, no element) + react (`<TopAppBar>`, which runs `attachTopAppBarScroll`).
- **API:** CSS `.m3e-top-app-bar(--center-aligned|--medium-flexible|--large-flexible|--two-rows)` > `__navigation`, `__headline` (> `__title`, `__subtitle`), `__actions`, `__expanded` > `__headline`; state `[data-scrolled]`, `[data-scroll-behavior]`; custom two-rows heights via `--_m3e-top-app-bar-collapsed-height` / `--_m3e-top-app-bar-expanded-height`; the scroll behaviors write `--_m3e-top-app-bar-offset` and, on two-rows bars, `--_m3e-top-app-bar-collapsed-title-opacity`, `--_m3e-top-app-bar-expanded-title-opacity`, `--_m3e-top-app-bar-color-fraction`. Elements `attachTopAppBarScroll(bar, { behavior?: 'pinned'|'enter-always'|'exit-until-collapsed', target, signal })`. React `<TopAppBar variant?: 'small'|'center-aligned'|'medium-flexible'|'large-flexible'|'two-rows' title subtitle navigationIcon actions titleHorizontalAlignment?: 'start'|'center' collapsedHeight expandedHeight scrollBehavior scrollTarget headingLevel />` (`title` / `subtitle` may be `(expanded: boolean) => ReactNode`, Compose `TwoRowsTopAppBar`; the two-rows variant is separate because Compose exposes `TwoRowsTopAppBar` publicly with its own defaults: no title bottom padding and per-row titles).
- **Classes:** `.m3e-top-app-bar`, `__navigation`, `__headline`, `__title`, `__subtitle`, `__actions`, `__expanded`; modifiers `--center-aligned`, `--medium-flexible`, `--large-flexible`, `--two-rows`; state `[data-scrolled]`.
- **Acceptance:**
  - [x] Collapsed and expanded heights match tokens (every variant; generated `top-app-bar-defaults.css`).
  - [x] Container color changes when scrolled (single row: overlap; two rows: collapsed fraction).
  - [x] Exit-until-collapsed collapses to the small-bar height and expands at the content start.
  - [x] Title / subtitle styles per variant; titles crossfade with the collapsed fraction.
  - [x] Plus CAC.
- **Fidelity:** the bar keeps its layout box and is clipped instead of shrinking, so content under a non-overlaid bar does not gain the space, and after a snap to collapsed near the top the clipped space stays empty until the content scrolls; no fling continuation (`flingAnimationSpec`: the browser's own momentum scrolls the content) and no dragging the bar itself (`appBarDragModifier`); exit-until-collapsed hands the bar the part of an upward scroll within the collapsed distance of the top instead of the scroll the content could not consume (the web cannot hold back the content's scroll); the expanded title's baseline padding comes from the web font's metrics (Compose uses the platform font's); a title row taller than the default heights (large fonts, wrapping) grows its row, but a two-rows title whose descenders exceed the row by the font's descent is clipped; `titleHorizontalAlignment` takes start and center (Compose accepts any `Alignment.Horizontal`); no `TopAppBarColors` customization API beyond overriding the tokens; no touch-exploration (TalkBack) detection.
- **Sources:** AppBar.kt (vendored), AppBarTokens.kt, AppBarSmallTokens.kt, AppBarMediumFlexibleTokens.kt, AppBarLargeFlexibleTokens.kt, AppBarSamples.kt (vendored), animation-core Easing.kt (vendored).

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
