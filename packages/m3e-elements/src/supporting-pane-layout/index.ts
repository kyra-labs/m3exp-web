import {
  M3ePaneScaffoldElement,
  type M3ePaneScaffoldElementEventMap,
} from '../pane-scaffold-layout/pane-scaffold-element.js';

/**
 * `<m3e-supporting-pane-layout>` (COMPONENT_SPEC §16a; Compose SupportingPaneScaffold with
 * rememberSupportingPaneScaffoldNavigator): children with `slot="main"` (also every child without
 * a slot), `slot="supporting"` and `slot="extra"` become the main, supporting and extra panes.
 * One pane below 840px of the layout's own width (the main pane; the supporting pane reflows
 * under it when the layout is at least 900px tall), main and supporting from 840px, all three
 * from 1600px (m3.material.io; `pane-rule="compose"`: from 1200px, Compose's
 * calculatePaneScaffoldDirective).
 *
 * Attributes `main-label`, `supporting-label`, `extra-label`, `pane-rule`, `drag-handle`; the
 * properties, methods (`navigateTo('supporting')`, …), declarative `data-pane-navigate` controls
 * and the `scaffold-value-change` event are those of `<m3e-list-detail-layout>`.
 */
export class M3eSupportingPaneLayout extends M3ePaneScaffoldElement {
  static override properties = /* @__PURE__ */ (() => ({
    ...M3ePaneScaffoldElement.properties,
    mainLabel: {},
    supportingLabel: {},
    extraLabel: {},
  }))();

  declare mainLabel: string | null | undefined;
  declare supportingLabel: string | null | undefined;
  declare extraLabel: string | null | undefined;

  protected readonly variant = 'supporting-pane';
}

/** Events of `<m3e-supporting-pane-layout>` (M1). */
export type M3eSupportingPaneLayoutEventMap = M3ePaneScaffoldElementEventMap;

// Typed listeners merged into the class: type-only, no runtime code.
export interface M3eSupportingPaneLayout {
  addEventListener<K extends keyof M3eSupportingPaneLayoutEventMap>(
    type: K,
    listener: (this: M3eSupportingPaneLayout, ev: M3eSupportingPaneLayoutEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof M3eSupportingPaneLayoutEventMap>(
    type: K,
    listener: (this: M3eSupportingPaneLayout, ev: M3eSupportingPaneLayoutEventMap[K]) => unknown,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}

M3eSupportingPaneLayout.define('m3e-supporting-pane-layout');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-supporting-pane-layout': M3eSupportingPaneLayout;
  }
}
