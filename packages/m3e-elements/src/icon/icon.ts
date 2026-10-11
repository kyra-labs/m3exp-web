import { M3eElement } from '../base/M3eElement.js';

/**
 * `<m3e-icon name="home" fill weight="500" grade="-25" optical-size="20" label="Home">` (D5,
 * COMPONENT_SPEC §39). Renders the m3e-css contract inside itself (the host is
 * `display: contents`):
 *
 * ```html
 * <span class="m3e-icon" aria-hidden="true" data-fill style="--m3e-comp-icon-weight: 500">home</span>
 * ```
 *
 * Decorative by default (`aria-hidden`); `label` makes it `role="img"` with that name. Without a
 * `name`, the element's initial text content is used.
 */
export class M3eIcon extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    name: {},
    fill: { type: Boolean },
    weight: { type: Number },
    grade: { type: Number },
    opticalSize: { type: Number },
    label: {},
  };

  declare name: string | null | undefined;
  declare fill: boolean | undefined;
  declare weight: number | null | undefined;
  declare grade: number | null | undefined;
  declare opticalSize: number | null | undefined;
  declare label: string | null | undefined;

  #span: HTMLSpanElement | undefined;
  #initialText = '';

  protected override update(): void {
    // First render (a microtask after connection, so parsed children exist): keep the text.
    if (!this.#span) this.#initialText = this.textContent.trim();
    const span = (this.#span ??= this.ownerDocument.createElement('span'));
    if (span.parentNode !== this || this.childNodes.length !== 1) this.replaceChildren(span);
    renderIcon(span, {
      name: this.name ?? this.#initialText,
      fill: this.fill ?? false,
      weight: this.weight,
      grade: this.grade,
      opticalSize: this.opticalSize,
      label: this.label,
    });
  }
}

export interface IconContract {
  name: string;
  fill: boolean;
  weight?: number | null | undefined;
  grade?: number | null | undefined;
  opticalSize?: number | null | undefined;
  label?: string | null | undefined;
}

const AXIS_VARS = [
  ['weight', '--m3e-comp-icon-weight'],
  ['grade', '--m3e-comp-icon-grade'],
  ['opticalSize', '--m3e-comp-icon-optical-size'],
] as const;

/** Writes the `.m3e-icon` contract onto `span` (the same DOM m3e-react's `<Icon>` renders). */
export function renderIcon(span: HTMLElement, icon: IconContract): void {
  span.className = 'm3e-icon';
  span.toggleAttribute('data-fill', icon.fill);
  if (icon.label) {
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', icon.label);
    span.removeAttribute('aria-hidden');
  } else {
    span.setAttribute('aria-hidden', 'true');
    span.removeAttribute('role');
    span.removeAttribute('aria-label');
  }
  for (const [key, cssVar] of AXIS_VARS) {
    const value = icon[key];
    if (value == null || Number.isNaN(value)) span.style.removeProperty(cssVar);
    else span.style.setProperty(cssVar, String(value));
  }
  if (span.getAttribute('style') === '') span.removeAttribute('style');
  if (span.textContent !== icon.name) span.textContent = icon.name;
}
