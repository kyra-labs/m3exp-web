import { PULL_TO_REFRESH_SPINNER_SIZE } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import { PullToRefreshLayout } from '../pull-to-refresh-layout/pull-to-refresh-layout.js';
import { PULL_TO_REFRESH_INDICATOR_LABEL } from '../pull-to-refresh-layout/strings.js';

const ROOT = 'm3e-pull-to-refresh';
const SVG = 'http://www.w3.org/2000/svg';
const CP = 'm3e-circular-progress';

/** The pull indicator: `default` (Compose's arrow) or `loading-indicator` (owner decision M9 #27). */
export type PullToRefreshIndicator = 'default' | 'loading-indicator';

/** The root's class for an indicator (pull-to-refresh.css). */
export function pullToRefreshClass(indicator: PullToRefreshIndicator): string {
  return indicator === 'loading-indicator' ? `${ROOT} ${ROOT}--loading-indicator` : ROOT;
}

const el = (doc: Document, tag: string, className: string): HTMLElement => {
  const node = doc.createElement(tag);
  node.className = className;
  return node;
};

const svg = (doc: Document, tag: string, className: string): SVGElement => {
  const node = doc.createElementNS(SVG, tag);
  node.setAttribute('class', className);
  return node;
};

const setAttr = (node: Element, name: string, value: string | null): void => {
  if (value === null) node.removeAttribute(name);
  else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
};

/** Replaces `parent`'s children with `children` unless they are already those, in order. */
const ensureChildren = (parent: Element, children: readonly Node[]): void => {
  const current = [...parent.childNodes];
  if (current.length !== children.length || children.some((c, i) => current[i] !== c)) {
    parent.replaceChildren(...children);
  }
};

/** The flat indeterminate `.m3e-circular-progress` contract (m3e-css: no script needed). */
function spinner(doc: Document): HTMLElement {
  const root = el(doc, 'div', CP);
  root.setAttribute('role', 'progressbar');
  const art = svg(doc, 'svg', `${CP}__svg`);
  art.setAttribute('aria-hidden', 'true');
  art.setAttribute('focusable', 'false');
  art.append(svg(doc, 'circle', `${CP}__track`), svg(doc, 'circle', `${CP}__indicator`));
  root.append(art);
  return root;
}

/** CircularArrowProgressIndicator's canvas: the arc and the head (paths from the layout). */
function arrow(doc: Document): SVGElement {
  const art = svg(doc, 'svg', `${ROOT}__arrow`);
  const size = String(PULL_TO_REFRESH_SPINNER_SIZE);
  art.setAttribute('viewBox', `0 0 ${size} ${size}`);
  art.setAttribute('aria-hidden', 'true');
  art.setAttribute('focusable', 'false');
  art.append(svg(doc, 'path', `${ROOT}__arc`), svg(doc, 'path', `${ROOT}__head`));
  return art;
}

/**
 * `<m3e-pull-to-refresh refreshing>…scrolling content…</m3e-pull-to-refresh>` (COMPONENT_SPEC
 * §38; Compose PullToRefreshBox). Renders the m3e-css `.m3e-pull-to-refresh` contract inside itself
 * (the host is `display: contents`; the root fills its container's height): its child nodes move
 * into `__content`, the scroll container (overscroll contained), under the indicator. Runs
 * {@link PullToRefreshLayout} (shared with m3e-react): a touch or pen pull down at the top of the
 * content brings the indicator down; a release past the threshold fires `refresh`.
 *
 * - `refreshing` (reflected; Compose `isRefreshing`): the app's state. Set it from `refresh` and
 *   clear it when done: the indicator rests at the threshold meanwhile, spinning.
 * - `indicator`: `default` (Compose's PullToRefreshDefaults.Indicator: the arrow, then a circular
 *   progress) or `loading-indicator` (PullToRefreshDefaults.LoadingIndicator; owner decision M9
 *   #27): the element drives `<m3e-loading-indicator contained>` children, whose entry it imports
 *   on first use instead of bundling it (D17; owner decision M9 #28).
 * - `disabled` (Compose `enabled = false`), `threshold` (px; default PositionalThreshold, 80dp),
 *   `indicator-label` (the indicator's accessible name, default "Refresh").
 * - Event `refresh` (Compose `onRefresh`). Method `refresh()` fires it too: what the visible
 *   Refresh button, the keyboard path (owner decision M9 #28), calls. `distanceFraction`.
 */
export class M3ePullToRefresh extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    refreshing: { type: Boolean, reflect: true },
    disabled: { type: Boolean },
    indicator: {},
    threshold: { type: Number },
    indicatorLabel: {},
  };

  declare refreshing: boolean | undefined;
  declare disabled: boolean | undefined;
  declare indicator: string | null | undefined;
  declare threshold: number | null | undefined;
  declare indicatorLabel: string | null | undefined;

  #root: HTMLDivElement | undefined;
  #content: HTMLElement | undefined;
  #indicator: HTMLElement | undefined;
  #box: HTMLElement | undefined;
  #pull: HTMLElement | undefined;
  #busy: HTMLElement | undefined;
  #parts: { kind: PullToRefreshIndicator; pull: Element; busy: Element } | undefined;
  #layout: PullToRefreshLayout | undefined;
  #observer: MutationObserver | undefined;

  /** The rendered `.m3e-pull-to-refresh` root. */
  get rootElement(): HTMLDivElement | undefined {
    return this.#root;
  }

  /** Compose PullToRefreshState.distanceFraction. */
  get distanceFraction(): number {
    return this.#layout?.distanceFraction ?? (this.refreshing ? 1 : 0);
  }

  /** Fires `refresh`, as a pull released past the threshold does (the Refresh button's action). */
  refresh(): void {
    this.emit('refresh', null);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.style.display = 'contents';
    // New child nodes move into the content on the next update.
    this.#observer = new MutationObserver((records) => {
      if (records.some((r) => r.target === this)) this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  #kind(): PullToRefreshIndicator {
    return this.indicator === 'loading-indicator' ? 'loading-indicator' : 'default';
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const kind = this.#kind();
    const label = this.indicatorLabel ?? PULL_TO_REFRESH_INDICATOR_LABEL;
    const refreshing = Boolean(this.refreshing);
    const root = (this.#root ??= el(doc, 'div', ROOT) as HTMLDivElement);
    const content = (this.#content ??= el(doc, 'div', `${ROOT}__content`));
    const indicator = (this.#indicator ??= el(doc, 'div', `${ROOT}__indicator`));
    const box = (this.#box ??= el(doc, 'div', `${ROOT}__box`));
    const pull = (this.#pull ??= el(doc, 'div', `${ROOT}__pull`));
    const busy = (this.#busy ??= el(doc, 'div', `${ROOT}__refreshing`));
    root.className = pullToRefreshClass(kind);
    root.toggleAttribute('data-refreshing', refreshing);
    const threshold = this.threshold;
    if (threshold != null && Number.isFinite(threshold) && threshold > 0) {
      root.style.setProperty(
        '--m3e-comp-pull-to-refresh-positional-threshold',
        `${String(threshold)}px`,
      );
    } else {
      root.style.removeProperty('--m3e-comp-pull-to-refresh-positional-threshold');
    }
    if (root.getAttribute('style') === '') root.removeAttribute('style');

    // The host's own child nodes are the content.
    content.append(...[...this.childNodes].filter((n) => n !== root));
    if (root.parentNode !== this) this.append(root);

    if (this.#parts?.kind !== kind) {
      this.#parts =
        kind === 'loading-indicator'
          ? {
              kind,
              pull: doc.createElement('m3e-loading-indicator'),
              busy: doc.createElement('m3e-loading-indicator'),
            }
          : { kind, pull: arrow(doc), busy: spinner(doc) };
      if (kind === 'loading-indicator') {
        // Its own entry (it bundles m3e-shapes): loaded on first use, not bundled (D17, #28).
        void import('@kyralabs/m3e-elements/loading-indicator.js');
      }
    }
    const { pull: pullPart, busy: busyPart } = this.#parts;
    if (kind === 'loading-indicator') {
      for (const part of [pullPart, busyPart]) {
        part.toggleAttribute('contained', true);
        setAttr(part, 'label', label);
      }
      setAttr(pullPart, 'progress', String(Math.min(this.distanceFraction, 1)));
      for (const name of ['role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow'])
        pull.removeAttribute(name);
    } else {
      setAttr(pull, 'role', 'progressbar');
      setAttr(pull, 'aria-label', label);
      setAttr(pull, 'aria-valuemin', '0');
      setAttr(pull, 'aria-valuemax', '100');
      setAttr(busyPart, 'aria-label', label);
    }
    ensureChildren(pull, [pullPart]);
    ensureChildren(busy, [busyPart]);
    ensureChildren(box, [pull, busy]);
    ensureChildren(indicator, [box]);
    ensureChildren(root, [content, indicator]);

    if (!this.#layout) {
      this.#layout = new PullToRefreshLayout(root, {
        refreshing,
        enabled: !this.disabled,
        onRefresh: () => {
          this.refresh();
        },
        onFraction: (fraction) => {
          const part = this.#parts?.kind === 'loading-indicator' ? this.#parts.pull : null;
          if (part) setAttr(part, 'progress', String(Math.min(fraction, 1)));
        },
      });
    } else {
      this.#layout.update();
      this.#layout.setEnabled(!this.disabled);
      this.#layout.setRefreshing(refreshing);
    }
  }
}
