// Canonical layouts (COMPONENT_SPEC §16a). The navigator types, roles and the m3e-motion port are
// exported by m3e-elements (`pane-scaffold-layout.js`, and the umbrella); the prop types below are
// re-exported as the same symbols (M12), which the umbrella's TS2308 check allows.
export {
  ListDetailPaneScaffold,
  type ListDetailPane,
  type ListDetailPaneScaffoldNavigator,
  type ListDetailPaneScaffoldProps,
  type PaneScaffoldNavigator,
  type PaneScaffoldNavigatorHookOptions,
  SupportingPaneScaffold,
  type SupportingPane,
  type SupportingPaneScaffoldNavigator,
  type SupportingPaneScaffoldProps,
  useListDetailPaneScaffoldNavigator,
  useSupportingPaneScaffoldNavigator,
} from './PaneScaffold.js';
export { FeedLayout, type FeedLayoutProps } from './FeedLayout.js';
// M12: the same symbols as m3e-elements' pane-scaffold-layout.js (no TS2308 in the umbrella).
export type {
  BackNavigationBehavior,
  PaneExpansionAnchor,
  PaneRule,
  ThreePaneScaffoldNavigator,
  ThreePaneScaffoldRole,
} from '@kyralabs/m3e-elements/pane-scaffold-layout.js';
