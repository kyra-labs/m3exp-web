import { M3eElement } from '../base/M3eElement.js';
import {
  SNACKBAR_DISMISS_LABEL,
  type ShowSnackbarOptions,
  type SnackbarData,
  SnackbarHostController,
  SnackbarHostState,
  type RecommendedTimeout,
  type SnackbarResult,
} from '../snackbar-layout/snackbar-layout.js';
import { TooltipController, tooltipRepeatsName } from '../tooltip-popup/tooltip-popup.js';

const HOST = 'm3e-snackbar-host';
const SNACKBAR = 'm3e-snackbar';

let nextId = 0;
const uid = () => `${SNACKBAR}-${String(++nextId)}`;

const el = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className: string,
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
};

interface Rendered {
  item: HTMLDivElement;
  tooltip: TooltipController | null;
  leaving: boolean;
}

/**
 * `<m3e-snackbar-host>` (COMPONENT_SPEC §32; Compose SnackbarHost + SnackbarHostState). Renders
 * the m3e-css `.m3e-snackbar-host` contract inside itself (the host is `display: contents`): a
 * polite live region (`role="status"`) fixed to the bottom center of the window, raised by
 * `--m3e-comp-snackbar-host-bottom-offset` (set it above a FAB; owner decision M9 #21), that shows
 * one snackbar at a time.
 *
 * - `showSnackbar(message | { message, actionLabel, withDismissAction, duration, signal })`
 *   queues a snackbar (first in, first out) and resolves with `'action-performed'` or
 *   `'dismissed'` (Compose SnackbarResult). `duration`: `short` (4s, the default without an
 *   action), `long` (10s), `indefinite` (the default with an action). The timer pauses while the
 *   pointer is over the snackbar or focus is in it; Escape in it dismisses it (owner decision
 *   M9 #20).
 * - The action is a text button; the dismiss action an icon button "Dismiss" (`dismiss-label`)
 *   with the plain tooltip Compose builds in (owner decision M9 #30; `<m3e-tooltip>`'s
 *   TooltipController).
 * - `action-on-new-line`: the action goes under the text (Compose `actionOnNewLine`).
 * - `focus()` moves focus to the current snackbar's action (no shortcut is bound: give users one,
 *   m3.material.io); `currentSnackbarData`; `hostState` (a SnackbarHostState: share one between
 *   hosts, or drive a host from code that has no element reference); `recommendedTimeout`.
 */
export class M3eSnackbarHost extends M3eElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3eElement.properties,
    dismissLabel: {},
    actionOnNewLine: { type: Boolean },
  }))();

  declare dismissLabel: string | null | undefined;
  declare actionOnNewLine: boolean | undefined;

  #state = new SnackbarHostState();
  #root: HTMLDivElement | undefined;
  #controller: SnackbarHostController | undefined;
  #unsubscribe: (() => void) | null = null;
  #rendered = new Map<SnackbarData, Rendered>();
  #recommendedTimeout: RecommendedTimeout | undefined;

  /** The queue this host shows. */
  get hostState(): SnackbarHostState {
    return this.#state;
  }

  set hostState(state: SnackbarHostState) {
    if (state === this.#state) return;
    this.#teardown();
    this.#state = state;
    if (this.isConnected) this.requestUpdate();
  }

  /** Android's calculateRecommendedTimeoutMillis stand-in (see snackbar-layout). */
  get recommendedTimeout(): RecommendedTimeout | undefined {
    return this.#recommendedTimeout;
  }

  set recommendedTimeout(fn: RecommendedTimeout | undefined) {
    this.#recommendedTimeout = fn;
    if (this.#controller) this.#controller.recommendedTimeout = fn;
  }

  /** The snackbar being shown, or null. */
  get currentSnackbarData(): SnackbarData | null {
    return this.#state.currentSnackbarData;
  }

  /** The rendered `.m3e-snackbar-host`. */
  get hostElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** SnackbarHostState.showSnackbar. */
  showSnackbar(visuals: string | ShowSnackbarOptions): Promise<SnackbarResult> {
    return this.#state.showSnackbar(visuals);
  }

  /** Moves focus to the current snackbar's first control (nothing when none is shown). */
  override focus(options?: FocusOptions): void {
    this.#controller?.focus(options);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#teardown();
  }

  #teardown(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#controller?.destroy();
    this.#controller = undefined;
    for (const { item, tooltip } of this.#rendered.values()) {
      tooltip?.destroy();
      item.remove();
    }
    this.#rendered.clear();
  }

  protected override update(changed: ReadonlySet<string>): void {
    const doc = this.ownerDocument;
    const root = (this.#root ??= el(doc, 'div', HOST));
    root.setAttribute('role', 'status');
    if (root.parentNode !== this) this.append(root);
    if (!this.#controller) {
      this.#controller = new SnackbarHostController(root, {
        state: this.#state,
        recommendedTimeout: this.#recommendedTimeout,
      });
      this.#unsubscribe = this.#state.subscribe(() => {
        this.#sync();
      });
    }
    if (changed.has('dismissLabel') || changed.has('actionOnNewLine')) {
      // Re-render the current snackbar (the leaving one keeps its look).
      const current = this.#state.currentSnackbarData;
      const rendered = current ? this.#rendered.get(current) : undefined;
      if (current && rendered) {
        const next = this.#build(current);
        rendered.tooltip?.destroy();
        rendered.item.replaceChildren(...next.item.childNodes);
        rendered.tooltip = next.tooltip;
        this.#bindTooltip(rendered);
      }
    }
    this.#sync();
  }

  /** FadeInFadeOutWithScale: the current snackbar in, the others out. */
  #sync(): void {
    const root = this.#root;
    const controller = this.#controller;
    if (!root || !controller) return;
    const current = this.#state.currentSnackbarData;
    for (const [data, rendered] of this.#rendered) {
      if (data === current || rendered.leaving) continue;
      rendered.leaving = true;
      controller.exit(rendered.item, () => {
        rendered.tooltip?.destroy();
        rendered.item.remove();
        this.#rendered.delete(data);
      });
    }
    if (!current) return;
    let rendered = this.#rendered.get(current);
    if (!rendered) {
      rendered = this.#build(current);
      this.#rendered.set(current, rendered);
      root.append(rendered.item);
      this.#bindTooltip(rendered);
    }
    controller.enter(rendered.item, current);
  }

  /** Snackbar(snackbarData): the text, the action TextButton, the dismiss IconButton + tooltip. */
  #build(data: SnackbarData): Rendered {
    const doc = this.ownerDocument;
    const { message, actionLabel, withDismissAction } = data.visuals;
    const item = el(doc, 'div', `${HOST}__item`);
    const newLine = Boolean(this.actionOnNewLine) && actionLabel !== null;
    const snackbar = el(
      doc,
      'div',
      newLine ? `${SNACKBAR} ${SNACKBAR}--action-on-new-line` : SNACKBAR,
    );
    const text = el(doc, 'div', `${SNACKBAR}__text`);
    text.textContent = message;
    snackbar.append(text);
    let tooltip: TooltipController | null = null;
    if (actionLabel !== null || withDismissAction) {
      const actions = el(doc, 'div', `${SNACKBAR}__actions`);
      if (actionLabel !== null) {
        const action = el(doc, 'button', `m3e-button m3e-button--text ${SNACKBAR}__action`);
        action.type = 'button';
        action.textContent = actionLabel;
        action.addEventListener('click', () => {
          data.performAction();
        });
        actions.append(action);
      }
      if (withDismissAction) {
        const label = this.dismissLabel ?? SNACKBAR_DISMISS_LABEL;
        const dismiss = el(doc, 'button', `m3e-icon-button ${SNACKBAR}__dismiss`);
        dismiss.type = 'button';
        dismiss.id = uid();
        dismiss.setAttribute('aria-label', label);
        const icon = el(doc, 'span', 'm3e-icon');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = 'close';
        dismiss.append(icon);
        dismiss.addEventListener('click', () => {
          data.dismiss();
        });
        // TooltipBox(Above) { IconButton } with PlainTooltip(contentDescription).
        const tip = el(doc, 'div', 'm3e-tooltip');
        tip.id = uid();
        tip.setAttribute('role', 'tooltip');
        tip.setAttribute('popover', 'manual');
        tip.textContent = label;
        actions.append(dismiss, tip);
        tooltip = new TooltipController({
          tooltip: tip,
          onVisibleChange: (visible) => {
            tooltip?.render(visible);
          },
        });
      }
      snackbar.append(actions);
    }
    item.append(snackbar);
    return { item, tooltip, leaving: false };
  }

  /** Binds the dismiss button's tooltip once it is in the document (the name check reads it). */
  #bindTooltip(rendered: Rendered): void {
    const tooltip = rendered.tooltip;
    if (!tooltip) return;
    const anchor = rendered.item.querySelector<HTMLElement>(`.${SNACKBAR}__dismiss`);
    tooltip.setAnchor(anchor);
    if (!anchor) return;
    // Owner decision M9 #2: the text repeats the button's name, so it is not a description.
    if (tooltipRepeatsName(anchor, tooltip.tooltip)) {
      tooltip.tooltip.setAttribute('aria-hidden', 'true');
    } else {
      tooltip.tooltip.removeAttribute('aria-hidden');
      anchor.setAttribute('aria-describedby', tooltip.tooltip.id);
    }
  }
}
