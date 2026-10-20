import type { SpringSpec } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import { attachRipple } from '../base/ripple.js';
import { Spring, readSpring } from '../menu-popup/menu-popup.js';
import type { EmptyDetail } from '../base/events.js';

const VARIANTS = new Set(['filled', 'tonal', 'elevated', 'outlined']);
const SIZES = new Set(['xs', 's', 'm', 'l', 'xl']);
/** The trailing icon Compose's samples use (Icons.Filled.KeyboardArrowDown). */
const DEFAULT_TRAILING_ICON = 'keyboard_arrow_down';

let nextId = 0;

/** m3e-css split-button.css: the state-resolved corner (registered length) and its spring write. */
const INNER = '--_m3e-split-button-inner';
const INNER_NOW = '--_m3e-split-button-inner-now';
/** The state-resolved trailing icon rotation (registered angle) and its spring write. */
const ROTATION = '--_m3e-split-button-rotation';
const ROTATION_NOW = '--_m3e-split-button-rotation-now';
const ROTATION_SPRING = '--m3e-comp-split-button-trailing-icon-rotation';

const reducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The corner morph spring (SplitButton.kt `defaultAnimationSpec` = default effects; reduced motion
 * falls back to fast effects, as m3e-react's shape springs do).
 */
const shapeSpring = (style: CSSStyleDeclaration) =>
  readSpring(style, reducedMotion() ? 'fast-effects' : 'default-effects');

/** The samples' icon rotation spring (split-button-defaults.css); null when it jumps. */
function rotationSpring(style: CSSStyleDeclaration): SpringSpec | null {
  const read = (field: string) =>
    Number.parseFloat(style.getPropertyValue(`${ROTATION_SPRING}-${field}`));
  if (read('duration') === 0) return null;
  const dampingRatio = read('damping-ratio');
  const stiffness = read('stiffness');
  return Number.isFinite(dampingRatio) && Number.isFinite(stiffness)
    ? { dampingRatio, stiffness }
    : null;
}

interface Driven {
  el: HTMLElement;
  property: string;
  unit: string;
  spring: Spring | null;
}

/**
 * `<m3e-split-button label="Save" icon="save" menu-label="More save options" variant="tonal" size="m">`
 * (COMPONENT_SPEC §4). Renders the m3e-css `.m3e-split-button` contract inside itself (the host
 * is `display: contents`): a leading `.m3e-button` for the primary action and a trailing menu
 * button, with the same variant and size. Load `button.css` and `split-button.css`.
 *
 * - The trailing button opens the `<m3e-menu>` child (or the one whose id `menu` names): it
 *   becomes that menu's `anchor`, so the menu handles the press, ArrowDown / ArrowUp / Enter /
 *   Space, Escape (focus returns to the trailing button), light dismiss and `aria-haspopup` /
 *   `aria-expanded` / `aria-controls`. Import `@kyralabs/m3e-elements/menu.js` for it.
 * - Open (`aria-expanded="true"`) is the trailing button's checked state: its inner corners
 *   morph to full and its icon turns 180°.
 * - `variant`: `filled` (default) | `tonal` | `elevated` | `outlined`. `size`: `xs` | `s`
 *   (default) | `m` | `l` | `xl`. `icon`: leading Material Symbols name. `trailing-icon`: default
 *   `keyboard_arrow_down`. `menu-label`: the trailing button's accessible name (required).
 *   `disabled` disables both buttons.
 * - Motion: the inner corners (press, open) on the default effects spring and the icon rotation
 *   on the samples' spring, both interruptible with their velocity kept (m3e-motion springs).
 * - Events: `press` (leading button activated, `detail: {}`); menu events bubble from the menu.
 */
export class M3eSplitButton extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    variant: {},
    size: {},
    label: {},
    icon: {},
    trailingIcon: {},
    menuLabel: {},
    menu: {},
    disabled: { type: Boolean },
  };

  declare variant: string | null | undefined;
  declare size: string | null | undefined;
  declare label: string | null | undefined;
  declare icon: string | null | undefined;
  declare trailingIcon: string | null | undefined;
  declare menuLabel: string | null | undefined;
  declare menu: string | null | undefined;
  declare disabled: boolean | undefined;

  #root: HTMLDivElement | undefined;
  #leading: HTMLButtonElement | undefined;
  #trailing: HTMLButtonElement | undefined;
  #trailingIcon: HTMLSpanElement | undefined;
  #observer: MutationObserver | undefined;
  #ripple: AbortController | undefined;
  #driven: Driven[] = [];
  #frame = 0;

  /** The leading (primary action) button. */
  get leadingButton(): HTMLButtonElement | undefined {
    return this.#leading;
  }

  /** The trailing (menu) button. */
  get trailingButton(): HTMLButtonElement | undefined {
    return this.#trailing;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.#root) this.#wire();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#ripple?.abort();
    this.#ripple = undefined;
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    for (const d of this.#driven) {
      d.el.style.removeProperty(d.property);
      d.spring = null;
    }
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const first = !this.#root;
    const root = (this.#root ??= doc.createElement('div'));
    const leading = (this.#leading ??= doc.createElement('button'));
    const trailing = (this.#trailing ??= doc.createElement('button'));
    const trailingIcon = (this.#trailingIcon ??= icon(doc));
    if (root.parentNode !== this) this.prepend(root);
    root.className = 'm3e-split-button';
    if (leading.parentNode !== root || trailing.parentNode !== root) {
      root.replaceChildren(leading, trailing);
    }

    const variant = this.variant && VARIANTS.has(this.variant) ? this.variant : 'filled';
    const size = this.size && SIZES.has(this.size) ? this.size : 's';
    const classes = `m3e-button m3e-button--${variant} m3e-button--size-${size} m3e-button--round`;
    for (const [button, part] of [
      [leading, 'leading'],
      [trailing, 'trailing'],
    ] as const) {
      button.type = 'button';
      button.className = `${classes} m3e-split-button__${part}`;
      button.disabled = Boolean(this.disabled);
      // As React Aria's useButton renders it, so both layers produce the same DOM.
      if (this.disabled) button.removeAttribute('tabindex');
      else button.tabIndex = 0;
      button.setAttribute('data-spring', '');
    }

    const content: Node[] = [];
    if (this.icon) {
      const leadingIcon = icon(doc);
      leadingIcon.textContent = this.icon;
      content.push(leadingIcon);
    }
    if (this.label) content.push(doc.createTextNode(this.label));
    if (!sameContent(leading, content)) leading.replaceChildren(...content);

    trailing.id ||= `m3e-split-button-${String(++nextId)}`;
    if (this.menuLabel) trailing.setAttribute('aria-label', this.menuLabel);
    else trailing.removeAttribute('aria-label');
    trailingIcon.textContent = this.trailingIcon ?? DEFAULT_TRAILING_ICON;
    if (trailingIcon.parentNode !== trailing) trailing.replaceChildren(trailingIcon);

    if (first) this.#wire();
    this.#menuElement()?.setAttribute('anchor', trailing.id);
    this.#retarget(first);
  }

  /** The `<m3e-menu>` the trailing button opens. */
  #menuElement(): Element | null {
    if (this.menu) {
      const root = this.getRootNode() as Document | ShadowRoot;
      return 'getElementById' in root ? root.getElementById(this.menu) : null;
    }
    return this.querySelector(':scope > m3e-menu');
  }

  /** Ripple, the press event and the press / open observer (again after a reconnect). */
  #wire(): void {
    const leading = this.#leading;
    const trailing = this.#trailing;
    const trailingIcon = this.#trailingIcon;
    if (!leading || !trailing || !trailingIcon) return;
    this.#ripple?.abort();
    this.#ripple = new AbortController();
    attachRipple(leading, this.#ripple.signal);
    attachRipple(trailing, this.#ripple.signal);
    this.listen(leading, 'click', () => {
      this.emit('press', {});
    });
    this.#driven = [
      { el: leading, property: INNER_NOW, unit: 'px', spring: null },
      { el: trailing, property: INNER_NOW, unit: 'px', spring: null },
      { el: trailingIcon, property: ROTATION_NOW, unit: 'deg', spring: null },
    ];
    this.#observer?.disconnect();
    // data-pressed (attachRipple) and aria-expanded (the menu) change the shape and rotation.
    this.#observer = new MutationObserver(() => {
      this.#retarget(false);
    });
    for (const button of [leading, trailing]) {
      this.#observer.observe(button, {
        attributes: true,
        attributeFilter: ['data-pressed', 'aria-expanded', 'disabled'],
      });
    }
  }

  /** Springs each corner and the icon to what m3e-css resolves for the current state. */
  #retarget(snap: boolean): void {
    const now = performance.now();
    let moving = false;
    for (const d of this.#driven) {
      const style = getComputedStyle(d.el);
      const resolved = Number.parseFloat(
        style.getPropertyValue(d.property === INNER_NOW ? INNER : ROTATION),
      );
      if (!Number.isFinite(resolved)) continue;
      let target = resolved;
      if (d.property === INNER_NOW) {
        const box = d.el.getBoundingClientRect();
        const half = Math.min(box.width, box.height) / 2;
        if (half > 0) target = Math.min(resolved, half);
      }
      if (!d.spring || snap) {
        d.spring = new Spring(target);
        d.el.style.removeProperty(d.property);
        continue;
      }
      const spec = d.property === INNER_NOW ? shapeSpring(style) : rotationSpring(style);
      d.spring.to(target, spec, now);
      moving = true;
    }
    if (moving) {
      this.#write();
      if (this.#frame === 0) this.#frame = requestAnimationFrame(this.#tick);
    }
  }

  #tick = (now: number): void => {
    this.#frame = 0;
    let moving = false;
    for (const d of this.#driven) if (d.spring?.step(now)) moving = true;
    this.#write(!moving);
    if (moving) this.#frame = requestAnimationFrame(this.#tick);
  };

  /** Writes each spring's value inline; once settled, removes it (m3e-css holds the target). */
  #write(settled = false): void {
    for (const d of this.#driven) {
      if (!d.spring) continue;
      if (settled) d.el.style.removeProperty(d.property);
      else
        d.el.style.setProperty(
          d.property,
          `${String(Math.round(d.spring.value * 100) / 100)}${d.unit}`,
        );
      if (d.el.getAttribute('style') === '') d.el.removeAttribute('style');
    }
  }
}

/** Events of `<m3e-split-button>` (M1): typed `addEventListener` / `removeEventListener`. */
export interface M3eSplitButtonEventMap extends HTMLElementEventMap {
  /** The leading button was pressed. */
  press: CustomEvent<EmptyDetail>;
}

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eSplitButton {
  addEventListener<K extends keyof M3eSplitButtonEventMap>(
    type: K,
    listener: (this: M3eSplitButton, ev: M3eSplitButtonEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eSplitButtonEventMap>(
    type: K,
    listener: (this: M3eSplitButton, ev: M3eSplitButtonEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

/** The `.m3e-icon` contract (decorative), as `<m3e-icon>` and m3e-react's `<Icon>` render it. */
function icon(doc: Document): HTMLSpanElement {
  const span = doc.createElement('span');
  span.className = 'm3e-icon';
  span.setAttribute('aria-hidden', 'true');
  return span;
}

/** Whether `el` already holds `content` (same icon name and text), so focus and ripple stay put. */
function sameContent(el: HTMLElement, content: readonly Node[]): boolean {
  const current = el.childNodes;
  return (
    current.length === content.length &&
    content.every((node, i) => {
      const existing = current.item(i);
      return existing.nodeName === node.nodeName && existing.textContent === node.textContent;
    })
  );
}
