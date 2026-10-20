import {
  M3ePaneScaffoldElement,
  type M3ePaneScaffoldElementEventMap,
} from '../pane-scaffold-layout/pane-scaffold-element.js';

/**
 * `<m3e-list-detail-layout>` (COMPONENT_SPEC §16a; Compose ListDetailPaneScaffold with
 * rememberListDetailPaneScaffoldNavigator): children with `slot="list"`, `slot="detail"` (also
 * every child without a slot) and `slot="extra"` become the list, detail and extra panes. One pane
 * below 840px of the layout's own width (the list until something navigates to the detail), list
 * and detail from 840px, all three from 1600px (m3.material.io; `pane-rule="compose"`: from
 * 1200px, Compose's calculatePaneScaffoldDirective).
 *
 * - Attributes: `list-label`, `detail-label`, `extra-label` (the panes' region names; default
 *   Compose's "Secondary pane" / "Primary pane" / "Tertiary pane"), `pane-rule` (`recommended`,
 *   the default, | `compose`), `drag-handle` (a pane expansion handle between two panes).
 * - Properties: `navigator` (m3e-motion ThreePaneScaffoldNavigator; created on first use),
 *   `anchors` (drag handle anchors), `preferredWidths` (px per role), read-only `scaffoldValue`,
 *   `currentDestination`.
 * - Methods: `navigateTo(pane, contentKey?)` (`list` | `detail` | `extra` or a role),
 *   `navigateBack(behavior?)`, `canNavigateBack(behavior?)`.
 * - Declarative: a click on an element with `data-pane-navigate="detail"` (and an optional
 *   `data-content-key`) navigates there; `data-pane-navigate="back"` navigates back and hides
 *   while there is nothing to go back to.
 * - Event: `scaffold-value-change` (`detail: { value, destination }`) after every navigation or
 *   size change.
 */
export class M3eListDetailLayout extends M3ePaneScaffoldElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3ePaneScaffoldElement.properties,
    listLabel: {},
    detailLabel: {},
    extraLabel: {},
  }))();

  declare listLabel: string | null | undefined;
  declare detailLabel: string | null | undefined;
  declare extraLabel: string | null | undefined;

  protected readonly variant = 'list-detail';
}

/** Events of `<m3e-list-detail-layout>` (M1). */
export type M3eListDetailLayoutEventMap = M3ePaneScaffoldElementEventMap;

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eListDetailLayout {
  addEventListener<K extends keyof M3eListDetailLayoutEventMap>(
    type: K,
    listener: (this: M3eListDetailLayout, ev: M3eListDetailLayoutEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eListDetailLayoutEventMap>(
    type: K,
    listener: (this: M3eListDetailLayout, ev: M3eListDetailLayoutEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

M3eListDetailLayout.define('m3e-list-detail-layout');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-list-detail-layout': M3eListDetailLayout;
  }
}
