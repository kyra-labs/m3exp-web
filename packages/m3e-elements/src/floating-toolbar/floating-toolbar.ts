import type { FloatingToolbarExitDirection } from '@kyralabs/m3e-motion';
import { M3eElement } from '../base/M3eElement.js';
import {
  type FloatingToolbarLayoutScrollBehavior,
  FloatingToolbarLayout,
} from '../floating-toolbar-layout/floating-toolbar-layout.js';

const BLOCK = 'm3e-floating-toolbar';

interface Parts {
  root: HTMLDivElement;
  bar: HTMLDivElement;
  leading: HTMLDivElement;
  trailing: HTMLDivElement;
  fab: HTMLDivElement;
}

const SCROLL_BEHAVIORS: readonly string[] = ['exit-always', 'collapse'];
const EXIT_DIRECTIONS: readonly string[] = ['bottom', 'top', 'start', 'end'];

/**
 * `<m3e-floating-toolbar expanded label="Formatting">` (COMPONENT_SPEC §9; Compose
 * HorizontalFloatingToolbar / VerticalFloatingToolbar). Renders the m3e-css `.m3e-floating-toolbar`
 * contract inside itself (the host is `display: contents`) and moves its children into it: children
 * with `slot="leading"` / `slot="trailing"` show only while expanded, `slot="fab"` (a
 * `<button class="m3e-fab">`) makes the with-FAB toolbar, the rest are the toolbar items
 * (usually `.m3e-icon-button`s).
 *
 * - Attributes: `expanded` (reflected; absent = collapsed), `orientation` (`horizontal` |
 *   `vertical`), `color-style` (`standard` | `vibrant`), `label` (the toolbar's accessible name),
 *   `fab-position` (`end` | `start`), `scroll-behavior` (`exit-always` | `collapse`),
 *   `exit-direction` (`bottom` | `top` | `start` | `end`), `scroll-target` (id of the scrolling
 *   element; default the document).
 * - Behavior (m3e-elements FloatingToolbarLayout, shared with m3e-react): expand/collapse springs
 *   (fast spatial, interruptible, velocity kept), `role="toolbar"` with roving focus (one tab stop,
 *   arrows along the orientation, Home/End), hidden parts `inert`, and the scroll behaviors.
 * - Events: `expanded-change` (`detail: { expanded }`) when the `collapse` scroll behavior expands
 *   or collapses it (the attribute follows).
 */
export class M3eFloatingToolbar extends M3eElement {
  static override properties = {
    ...M3eElement.properties,
    expanded: { type: Boolean, reflect: true },
    orientation: {},
    colorStyle: {},
    label: {},
    fabPosition: {},
    scrollBehavior: {},
    exitDirection: {},
    scrollTarget: {},
  };

  declare expanded: boolean | undefined;
  declare orientation: string | null | undefined;
  declare colorStyle: string | null | undefined;
  declare label: string | null | undefined;
  declare fabPosition: string | null | undefined;
  declare scrollBehavior: string | null | undefined;
  declare exitDirection: string | null | undefined;
  declare scrollTarget: string | null | undefined;

  #parts: Parts | undefined;
  #layout: FloatingToolbarLayout | undefined;
  #observer: MutationObserver | undefined;

  /** The rendered `.m3e-floating-toolbar` root. */
  get toolbarElement(): HTMLDivElement | undefined {
    return this.#parts?.root;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => {
      this.requestUpdate();
    });
    this.#observer.observe(this, { childList: true });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    this.#layout?.destroy();
    this.#layout = undefined;
  }

  protected override update(changed: ReadonlySet<string>): void {
    const parts = this.#render();
    const firstLayout = !this.#layout;
    this.#layout ??= new FloatingToolbarLayout(parts.root, {
      onExpandedChange: (expanded) => {
        this.expanded = expanded;
        this.emit('expanded-change', { expanded });
      },
    });
    this.#layout.update();
    if (
      firstLayout ||
      ['scrollBehavior', 'exitDirection', 'scrollTarget', 'orientation'].some((p) => changed.has(p))
    ) {
      const behavior = SCROLL_BEHAVIORS.includes(this.scrollBehavior ?? '')
        ? (this.scrollBehavior as FloatingToolbarLayoutScrollBehavior)
        : null;
      const direction = EXIT_DIRECTIONS.includes(this.exitDirection ?? '')
        ? (this.exitDirection as FloatingToolbarExitDirection)
        : null;
      const target = this.scrollTarget
        ? this.ownerDocument.getElementById(this.scrollTarget)
        : null;
      this.#layout.setScroll({ behavior, exitDirection: direction, target });
    }
  }

  #render(): Parts {
    const parts = (this.#parts ??= this.#create());
    const { root, bar, leading, trailing, fab } = parts;

    // New light-DOM children go to their part; earlier ones already live inside the contract.
    const content: Element[] = [];
    for (const child of [...this.children]) {
      if (child === root) continue;
      const slot = child.getAttribute('slot');
      if (slot === 'leading') leading.append(child);
      else if (slot === 'trailing') trailing.append(child);
      else if (slot === 'fab') fab.append(child);
      else content.push(child);
    }
    const items = [
      ...[...bar.children].filter((el) => el !== leading && el !== trailing),
      ...content,
    ];
    const barChildren = [
      ...(leading.childElementCount > 0 ? [leading] : []),
      ...items,
      ...(trailing.childElementCount > 0 ? [trailing] : []),
    ];
    if (
      barChildren.length !== bar.children.length ||
      barChildren.some((el, i) => bar.children[i] !== el)
    ) {
      bar.replaceChildren(...barChildren);
    }

    const withFab = fab.childElementCount > 0;
    const fabStart = withFab && this.fabPosition === 'start';
    const rootChildren = withFab ? (fabStart ? [fab, bar] : [bar, fab]) : [bar];
    if (
      rootChildren.length !== root.children.length ||
      rootChildren.some((el, i) => root.children[i] !== el)
    ) {
      root.replaceChildren(...rootChildren);
    }
    if (root.parentNode !== this) this.append(root);

    const vertical = this.orientation === 'vertical';
    root.className = [
      BLOCK,
      vertical && `${BLOCK}--vertical`,
      this.colorStyle === 'vibrant' && `${BLOCK}--vibrant`,
      !this.expanded && `${BLOCK}--collapsed`,
      withFab && `${BLOCK}--with-fab`,
      fabStart && `${BLOCK}--fab-start`,
    ]
      .filter(Boolean)
      .join(' ');
    root.setAttribute('role', 'toolbar');
    root.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
    if (this.label) root.setAttribute('aria-label', this.label);
    else root.removeAttribute('aria-label');
    return parts;
  }

  /** The contract's containers, created once and kept across reconnects. */
  #create(): Parts {
    const doc = this.ownerDocument;
    const div = (part: string) => {
      const el = doc.createElement('div');
      el.className = `${BLOCK}__${part}`;
      return el;
    };
    return {
      root: doc.createElement('div'),
      bar: div('bar'),
      leading: div('leading'),
      trailing: div('trailing'),
      fab: div('fab'),
    };
  }
}
