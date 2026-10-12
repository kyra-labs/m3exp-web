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
- **Variants:** FAB baseline 56, medium 80, large 96; small 40 **@deprecated (D4)**. Extended FAB small/medium/large. Colors primary/secondary/tertiary-container plus vibrant sets (`TODO(verify)` FabPrimary*Tokens).
- **Tokens:**

  | | small (deprecated) | baseline | medium | large |
  |---|---|---|---|---|
  | container | 40 | 56 | 80 | 96 |
  | icon | 24 | 24 | 28 | 32 |
  | radius | 12 | 16 | 20 | 28 |

  `TODO(verify)` FabSmall/Baseline/Medium/LargeTokens.kt. Elevation Level3, hover Level4 (`TODO(verify)`). Extended heights 56/80/96 (`TODO(verify)` ExtendedFab*Tokens).
- **Motion:** extend/collapse width on defaultSpatial; elevation on fastEffects.
- **Keyboard/ARIA:** `<button aria-label>`; extended FAB label is its name.
- **Layers:** css + react (scroll-collapse).
- **API:** `<Fab size:'baseline'|'medium'|'large'|'small' color icon aria-label />` (`'small'` deprecated), `<ExtendedFab size icon label expanded />`.
- **Acceptance:**
  - [ ] Sizes and radii match generated tokens.
  - [ ] Extended FAB collapses to icon-only when `expanded=false` with width spring.
  - [ ] `size="small"` logs a deprecation warning in dev.
  - [ ] Plus CAC.
- **Sources:** FloatingActionButton.kt, Fab*Tokens.kt.

## 6. FAB menu
- **Purpose:** a FAB that opens related actions (`TODO(verify)` item-count guidance on m3.material.io).
- **Anatomy:** toggle FAB (morphs to close), menu items (pill buttons icon + label), container.
- **Tokens:** `TODO(verify)` FabMenuBaselineTokens.kt: item height, spacing, toggle container sizes.
- **Motion:** toggle container shrinks and corners morph to circle, icon rotates/crossfades to close (fastSpatial). Items stagger in on defaultSpatial. Interruptible.
- **Behavior:** Esc and outside click close; focus moves to first item.
- **Keyboard/ARIA:** toggle `aria-expanded aria-controls`; `role="menu"` with `menuitem`s; arrow keys.
- **Layers:** elements + react (springs); css static.
- **API:** `<FabMenu open onOpenChange icon items=[{icon,label,onPress}] />`; `<m3e-fab-menu open>` event `open-change`.
- **Acceptance:**
  - [ ] Opening reverses mid-flight without a jump (velocity preserved).
  - [ ] Focus trapped among items while open.
  - [ ] Esc restores focus to toggle.
  - [ ] Plus CAC.
- **Sources:** FloatingActionButtonMenu.kt; 1.5.0 release notes.

## 7. Loading indicator
- **Purpose:** short waits (under 5 s); replaces most indeterminate circular progress uses.
- **Variants:** uncontained, contained; indeterminate, determinate.
- **Anatomy:** active indicator (morphing shape), optional container.
- **Tokens:** container 48, indicator 38 (MDC-Android LoadingIndicator.md). Container shape full. Uncontained color primary. Contained: primary-container / on-primary-container (`TODO(verify)` LoadingIndicatorTokens). Scalable 24–240 keeping ratio.
- **Motion:** indeterminate polygons in order SoftBurst, Cookie9Sided, Pentagon, Pill, Sunny, Cookie4Sided, Oval (m3.material.io). `TODO(verify)` LoadingIndicator.kt: morph interval (~650ms), rotation period (~4666ms), +90° per morph, morph ζ (~0.6), determinate polygon list.
- **Behavior:** shapes scaled uniformly so the widest fits 38. Reduced motion slows (`TODO(verify)`).
- **Keyboard/ARIA:** `role="progressbar" aria-label`; determinate `aria-valuenow/min/max`. Not focusable.
- **Layers:** elements (SVG path morph via m3e-shapes, rAF) + react. CSS fallback: rotating static SoftBurst.
- **API:** `<LoadingIndicator contained? progress?: number polygons?: Shape[] aria-label />`; `<m3e-loading-indicator contained progress="0.4">`.
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
- **Tokens:** `TODO(verify)` heights, padding, title type per variant. Container surface; scrolled surface-container.
- **Motion:** collapse tied to scroll offset; snap settle on defaultSpatial.
- **ARIA:** `<header>`; heading level by consumer.
- **Layers:** css + react/elements (scroll behaviors).
- **API:** `<TopAppBar variant title subtitle navigationIcon actions scrollBehavior />`.
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
- **Tokens:** `TODO(verify)` ShortNavigationBar*Tokens.kt. Indicator secondary-container.
- **Motion:** indicator width on fastSpatial; icon FILL 0→1.
- **ARIA:** `<nav aria-label>`; links with `aria-current="page"`.
- **Layers:** css + react; element for indicator animation.
- **API:** `<NavigationBar items=[{key,icon,label,href,badge}] selectedKey />`.
- **Acceptance:**
  - [ ] Only one item has `aria-current`.
  - [ ] Indicator animates between items.
  - [ ] Plus CAC.

## 14. Navigation rail (WideNavigationRail, Modal; legacy NavigationRail @deprecated)
- **Tokens:** `TODO(verify)` widths, item heights, header/FAB placement.
- **Motion:** width on defaultSpatial; labels on fastEffects.
- **ARIA:** `<nav>`; modal is `dialog` with focus trap.
- **Layers:** css + elements + react.
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
- **Tokens:** `TODO(verify)` menu tokens.
- **Motion:** open scale+fade on fastSpatial/fastEffects.
- **ARIA:** APG menu; typeahead; submenus.
- **Layers:** elements (positioning, focus, light dismiss via popover) + react (`useMenu`) + css.
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
