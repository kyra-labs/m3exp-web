// Pane navigation motion (registers no element; COMPONENT_SPEC §16a): the m3e-motion ports of
// Compose's calculatePaneMotion, default enter / exit transitions and pane bounds springs.
// PaneScaffoldLayout runs it when given as `options.motion`: the elements import this entry lazily
// as soon as a layout starts (until it loads, and under reduced motion, navigation jumps); m3e-react
// imports it statically. Separate so the element entries stay within their size budget (D17).
export {
  ThreePaneScaffoldAnimation,
  calculatePaneMotion,
  paneTransitions,
} from '@kyralabs/m3e-motion';
