import type {
  BackNavigationBehavior,
  PaneExpansionAnchor,
  PaneRule,
  ThreePaneScaffoldDestinationItem,
  ThreePaneScaffoldNavigator,
  ThreePaneScaffoldRole,
  ThreePaneScaffoldValue,
} from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import {
  type AttachPaneExpansion,
  PANE_EXPANSION_DRAG_HANDLE_LABEL,
  PANE_SCAFFOLD_PANE_NAMES,
  PANE_SCAFFOLD_PANE_TITLES,
  PaneScaffoldLayout,
  type PaneMotionModule,
  type PaneScaffoldVariant,
  createPaneScaffoldNavigator,
  paneScaffoldOrder,
  paneScaffoldRole,
} from './pane-scaffold-layout.js';

const S = 'm3e-pane-scaffold';

// The navigation motion and the drag handle are entries of their own (D17 budgets): loaded once,
// the motion as soon as a layout starts (so the first navigation has it), the handle on first use.
let motion: Promise<PaneMotionModule> | undefined;
const loadMotion = () => (motion ??= import('@kyralabs/m3e-elements/pane-motion.js'));
const loadExpansion = async (): Promise<AttachPaneExpansion> =>
  (await import('@kyralabs/m3e-elements/pane-expansion.js')).attachPaneExpansion;

/**
 * Shared base of `<m3e-list-detail-layout>` and `<m3e-supporting-pane-layout>` (COMPONENT_SPEC
 * §16a). Renders the m3e-css contract inside itself (the host is `display: contents`):
 * `div.m3e-layout > div.m3e-pane-scaffold--<variant>` with one region per pane, in the variant's
 * order, and moves each child into the pane its `slot` names (a pane name such as `list` or a
 * role; anything else goes to the primary pane). PaneScaffoldLayout (shared with m3e-react) does
 * the rest.
 */
export abstract class M3ePaneScaffoldElement extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    paneRule: {},
    dragHandle: { type: Boolean },
  };

  declare paneRule: string | null | undefined;
  declare dragHandle: boolean | undefined;

  protected abstract readonly variant: PaneScaffoldVariant;

  #navigator: ThreePaneScaffoldNavigator | null = null;
  #anchors: readonly PaneExpansionAnchor[] | undefined;
  #preferredWidths: Partial<Record<ThreePaneScaffoldRole, number>> = {};
  #layoutRoot: HTMLDivElement | undefined;
  #scaffold: HTMLDivElement | undefined;
  #panes = new Map<ThreePaneScaffoldRole, HTMLDivElement>();
  #handle: HTMLDivElement | undefined;
  #layout: PaneScaffoldLayout | undefined;
  #unsubscribe: (() => void) | undefined;

  /** The ThreePaneScaffoldNavigator driving the scaffold (created on first use). */
  get navigator(): ThreePaneScaffoldNavigator {
    this.#navigator ??= createPaneScaffoldNavigator(this.variant, {
      paneRule: this.#paneRule(),
    });
    return this.#navigator;
  }

  set navigator(navigator: ThreePaneScaffoldNavigator) {
    if (navigator === this.#navigator) return;
    this.#navigator = navigator;
    this.#teardown();
    this.requestUpdate();
  }

  /** Drag handle anchors (default: the Compose samples' anchors). */
  get anchors(): readonly PaneExpansionAnchor[] | undefined {
    return this.#anchors;
  }

  set anchors(anchors: readonly PaneExpansionAnchor[] | undefined) {
    this.#anchors = anchors;
    this.requestUpdate();
  }

  /** PaneScaffoldScope.preferredWidth per role (px). */
  get preferredWidths(): Partial<Record<ThreePaneScaffoldRole, number>> {
    return this.#preferredWidths;
  }

  set preferredWidths(widths: Partial<Record<ThreePaneScaffoldRole, number>>) {
    this.#preferredWidths = widths;
    this.requestUpdate();
  }

  get scaffoldValue(): ThreePaneScaffoldValue {
    return this.navigator.scaffoldValue;
  }

  get currentDestination(): ThreePaneScaffoldDestinationItem | null {
    return this.navigator.currentDestination;
  }

  /** The rendered `.m3e-pane-scaffold`. */
  get scaffoldElement(): HTMLDivElement | undefined {
    return this.#scaffold;
  }

  /** navigateTo: `pane` is a pane name (`list`, `detail`, `main`, …) or a role. */
  navigateTo(pane: string, contentKey?: unknown): void {
    const role = paneScaffoldRole(this.variant, pane);
    if (role) this.navigator.navigateTo(role, contentKey);
  }

  navigateBack(behavior?: BackNavigationBehavior): boolean {
    return this.navigator.navigateBack(behavior);
  }

  canNavigateBack(behavior?: BackNavigationBehavior): boolean {
    return this.navigator.canNavigateBack(behavior);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#teardown();
  }

  #teardown(): void {
    this.#layout?.destroy();
    this.#layout = undefined;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #paneRule(): PaneRule {
    return this.paneRule === 'compose' ? 'compose' : 'recommended';
  }

  protected override update(): void {
    const doc = this.ownerDocument;
    const variant = this.variant;
    const rule = this.#paneRule();
    const layoutRoot = (this.#layoutRoot ??= doc.createElement('div'));
    layoutRoot.className = 'm3e-layout';
    const scaffold = (this.#scaffold ??= doc.createElement('div'));
    scaffold.className = [S, `${S}--${variant}`, rule === 'compose' ? `${S}--compose` : '']
      .filter(Boolean)
      .join(' ');
    const names = Object.entries(PANE_SCAFFOLD_PANE_NAMES[variant]);
    const pane = (role: ThreePaneScaffoldRole) => {
      let el = this.#panes.get(role);
      if (!el) {
        el = doc.createElement('div');
        el.className = `${S}__pane ${S}__pane--${role}`;
        el.setAttribute('role', 'region');
        el.tabIndex = -1;
        this.#panes.set(role, el);
      }
      const name = names.find(([, r]) => r === role)?.[0];
      const label = name ? this.getAttribute(`${name}-label`) : null;
      el.setAttribute('aria-label', label?.trim() ? label : PANE_SCAFFOLD_PANE_TITLES[role]);
      const width = this.#preferredWidths[role];
      if (width === undefined)
        el.style.removeProperty('--m3e-comp-pane-scaffold-pane-preferred-width');
      else
        el.style.setProperty('--m3e-comp-pane-scaffold-pane-preferred-width', `${String(width)}px`);
      return el;
    };

    // Move the host's children into their panes (once; later children follow).
    for (const node of [...this.childNodes]) {
      if (node === layoutRoot) continue;
      if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) continue;
      const slot = node instanceof Element ? node.getAttribute('slot') : null;
      pane(paneScaffoldRole(variant, slot) ?? 'primary').append(node);
    }
    // The tertiary (extra) pane exists only when something was put in it.
    const roles = paneScaffoldOrder(variant).filter(
      (r) => r !== 'tertiary' || (this.#panes.get(r)?.childNodes.length ?? 0) > 0,
    );
    const children: HTMLElement[] = roles.map(pane);
    if (this.dragHandle) {
      const handle = (this.#handle ??= this.#createHandle(doc));
      children.push(handle);
    }
    const current = [...scaffold.children];
    if (current.length !== children.length || children.some((c, i) => current[i] !== c)) {
      scaffold.replaceChildren(...children);
    }
    if (scaffold.parentNode !== layoutRoot) layoutRoot.append(scaffold);
    if (layoutRoot.parentNode !== this) this.append(layoutRoot);

    const options = {
      variant,
      paneRule: rule,
      anchors: this.#anchors,
      motion: loadMotion(),
      loadExpansion,
    };
    if (!this.#layout) {
      const navigator = this.navigator;
      this.#layout = new PaneScaffoldLayout(scaffold, options, navigator);
      this.#unsubscribe = navigator.subscribe(() => {
        this.emit('scaffold-value-change', {
          value: navigator.scaffoldValue,
          destination: navigator.currentDestination,
        });
      });
    } else {
      this.#layout.setOptions(options);
      this.#layout.update();
    }
  }

  #createHandle(doc: Document): HTMLDivElement {
    const handle = doc.createElement('div');
    handle.className = `${S}__drag-handle`;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', PANE_EXPANSION_DRAG_HANDLE_LABEL);
    handle.tabIndex = 0;
    const bar = doc.createElement('span');
    bar.className = 'm3e-vertical-drag-handle';
    handle.append(bar);
    return handle;
  }
}
