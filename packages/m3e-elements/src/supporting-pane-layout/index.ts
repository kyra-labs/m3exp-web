import { M3ePaneScaffoldElement } from '../pane-scaffold-layout/pane-scaffold-element.js';

/**
 * `<m3e-supporting-pane-layout>` (COMPONENT_SPEC §16a; Compose SupportingPaneScaffold with
 * rememberSupportingPaneScaffoldNavigator): children with `slot="main"` (also every child without
 * a slot), `slot="supporting"` and `slot="extra"` become the main, supporting and extra panes.
 * One pane below 840px of the layout's own width (the main pane; the supporting pane reflows
 * under it when the layout is at least 900px tall), main and supporting from 840px, all three
 * from 1200px (`pane-rule="recommended"`: from 1600px).
 *
 * Attributes `main-label`, `supporting-label`, `extra-label`, `pane-rule`, `drag-handle`; the
 * properties, methods (`navigateTo('supporting')`, …), declarative `data-pane-navigate` controls
 * and the `scaffold-value-change` event are those of `<m3e-list-detail-layout>`.
 */
export class M3eSupportingPaneLayout extends M3ePaneScaffoldElement {
  static override properties = {
    ...M3ePaneScaffoldElement.properties,
    mainLabel: {},
    supportingLabel: {},
    extraLabel: {},
  };

  declare mainLabel: string | null | undefined;
  declare supportingLabel: string | null | undefined;
  declare extraLabel: string | null | undefined;

  protected readonly variant = 'supporting-pane';
}

M3eSupportingPaneLayout.define('m3e-supporting-pane-layout');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-supporting-pane-layout': M3eSupportingPaneLayout;
  }
}
