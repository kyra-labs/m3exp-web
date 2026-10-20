// Canonical layout behavior (registers no element), shared by <m3e-list-detail-layout>,
// <m3e-supporting-pane-layout> and m3e-react's ListDetailPaneScaffold / SupportingPaneScaffold:
// the destination history, the pane value per size, navigation motion, focus and the drag handle
// (pass the pane-motion.js and pane-expansion.js entries as options.motion / options.expansion).
// Re-exports the m3e-motion three-pane scaffold port it runs on (m3e-react re-exports a few of these
// as the same symbols, M12).
export {
  type AttachPaneExpansion,
  PANE_EXPANSION_DRAG_HANDLE_LABEL,
  PANE_SCAFFOLD_PANE_NAMES,
  PANE_SCAFFOLD_PANE_TITLES,
  type PaneMotionModule,
  type PaneScaffoldLayoutOptions,
  type PaneScaffoldNavigatorOptions,
  type PaneScaffoldVariant,
  PaneScaffoldLayout,
  createPaneScaffoldNavigator,
  paneScaffoldOrder,
  paneScaffoldRole,
} from './pane-scaffold-layout.js';
export {
  type AdaptStrategy,
  type BackNavigationBehavior,
  LIST_DETAIL_ADAPT_STRATEGIES,
  LIST_DETAIL_INITIAL_HISTORY,
  LIST_DETAIL_PANE_ORDER,
  ListDetailPaneScaffoldRole,
  PANE_EXPANSION_SAMPLE_ANCHORS,
  type PaneAdaptedValue,
  type PaneExpansionAnchor,
  type PaneMotion,
  type PaneRect,
  type PaneRule,
  RECOMMENDED_MAX_PANES,
  SUPPORTING_PANE_ADAPT_STRATEGIES,
  SUPPORTING_PANE_INITIAL_HISTORY,
  SUPPORTING_PANE_ORDER,
  SupportingPaneScaffoldRole,
  THREE_PANE_SCAFFOLD_ROLES,
  type ThreePaneScaffoldAdaptStrategies,
  type ThreePaneScaffoldDestinationItem,
  ThreePaneScaffoldNavigator,
  type ThreePaneScaffoldNavigatorOptions,
  type ThreePaneScaffoldRole,
  type ThreePaneScaffoldValue,
  calculatePaneMotion,
  calculateThreePaneScaffoldValue,
  threePaneScaffoldDirective,
  threePaneScaffoldLayout,
} from '@kyralabs/m3e-motion';
// The pane scaffold elements' event (M1).
export type {
  M3ePaneScaffoldElementEventMap,
  ScaffoldValueChangeDetail,
} from './pane-scaffold-element.js';
