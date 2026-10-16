import { M3ePaneScaffoldElement } from '../pane-scaffold-layout/pane-scaffold-element.js';

/**
 * `<m3e-list-detail-layout>` (COMPONENT_SPEC §16a; Compose ListDetailPaneScaffold with
 * rememberListDetailPaneScaffoldNavigator): children with `slot="list"`, `slot="detail"` (also
 * every child without a slot) and `slot="extra"` become the list, detail and extra panes. One pane
 * below 840px of the layout's own width (the list until something navigates to the detail), list
 * and detail from 840px, all three from 1200px (`pane-rule="recommended"`: from 1600px).
 *
 * - Attributes: `list-label`, `detail-label`, `extra-label` (the panes' region names; default
 *   Compose's "Secondary pane" / "Primary pane" / "Tertiary pane"), `pane-rule` (`compose` |
 *   `recommended`), `drag-handle` (a pane expansion handle between two panes).
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
  static override properties = {
    ...M3ePaneScaffoldElement.properties,
    listLabel: {},
    detailLabel: {},
    extraLabel: {},
  };

  declare listLabel: string | null | undefined;
  declare detailLabel: string | null | undefined;
  declare extraLabel: string | null | undefined;

  protected readonly variant = 'list-detail';
}

M3eListDetailLayout.define('m3e-list-detail-layout');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-list-detail-layout': M3eListDetailLayout;
  }
}
