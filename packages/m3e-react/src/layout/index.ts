// Canonical layouts (COMPONENT_SPEC §16a). The navigator types, roles and the m3e-motion port are
// exported by m3e-elements (`pane-scaffold-layout.js`, and the umbrella); one name per package.
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
