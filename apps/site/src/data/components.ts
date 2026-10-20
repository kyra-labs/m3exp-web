// One entry per COMPONENT_SPEC section: the page slug and gallery group, and which exports,
// elements and m3e-css files the page documents. The API tables themselves are generated
// (scripts/api.js); scripts/check-components.js fails CI when a section, a React export, an
// element or a CSS file is not claimed here or has no page.

export type ComponentGroup =
  | 'Actions'
  | 'Communication'
  | 'Containment'
  | 'Navigation'
  | 'Selection'
  | 'Text input'
  | 'Layout'
  | 'Primitives';

export interface ComponentEntry {
  slug: string;
  title: string;
  /** COMPONENT_SPEC section number. */
  spec: string;
  group: ComponentGroup;
  /** m3e-react runtime exports documented on the page. */
  react: string[];
  /** Custom element tags documented on the page. */
  elements: string[];
  /** m3e-css files (without `.css`) the page documents and loads. */
  css: string[];
  /** The page lead and gallery card text: what the component is for, in a sentence or two. */
  summary: string;
  /** The apps/docs playground page, for "open in the playground". */
  playground?: string;
}

export const GROUPS: ComponentGroup[] = [
  'Actions',
  'Communication',
  'Containment',
  'Navigation',
  'Selection',
  'Text input',
  'Layout',
  'Primitives',
];

export const COMPONENTS: ComponentEntry[] = [
  {
    slug: 'button',
    title: 'Button',
    summary:
      'Buttons start the actions people take most: save, send, continue. Five color configurations from high to low emphasis, five sizes, round or square, and toggles.',
    spec: '1',
    group: 'Actions',
    react: ['Button', 'ToggleButton', 'buttonClassName'],
    elements: [],
    css: ['button'],
    playground: 'button',
  },
  {
    slug: 'icon-button',
    title: 'Icon button',
    summary:
      'Compact buttons for actions with a clear icon, in four styles, five sizes and three widths, optionally toggling.',
    spec: '2',
    group: 'Actions',
    react: ['IconButton', 'IconToggleButton', 'iconButtonClassName'],
    elements: [],
    css: ['icon-button'],
    playground: 'icon-button',
  },
  {
    slug: 'button-group',
    title: 'Button group',
    summary:
      'A row of related buttons: in a standard group the pressed button grows and pushes its neighbors; a connected group selects one or several options.',
    spec: '3',
    group: 'Actions',
    react: ['ButtonGroup', 'ButtonGroupItem'],
    elements: ['m3e-button-group', 'm3e-button-group-item'],
    css: ['button-group'],
    playground: 'button-group',
  },
  {
    slug: 'split-button',
    title: 'Split button',
    summary: 'A button for the main action joined to a menu button for related actions.',
    spec: '4',
    group: 'Actions',
    react: ['SplitButton'],
    elements: ['m3e-split-button'],
    css: ['split-button'],
    playground: 'split-button',
  },
  {
    slug: 'fab',
    title: 'FAB and extended FAB',
    summary:
      "The floating action button holds the screen's most important action. Three sizes and six colors; the extended FAB adds a label and collapses on scroll.",
    spec: '5',
    group: 'Actions',
    react: ['Fab', 'ExtendedFab', 'useExtendedFabScroll', 'fabClassName', 'extendedFabClassName'],
    elements: [],
    css: ['fab'],
    playground: 'fab',
  },
  {
    slug: 'fab-menu',
    title: 'FAB menu',
    summary: 'A FAB that opens two to six related actions, springing out above it.',
    spec: '6',
    group: 'Actions',
    react: ['FabMenu', 'fabMenuClassName'],
    elements: ['m3e-fab-menu', 'm3e-fab-menu-item'],
    css: ['fab-menu'],
    playground: 'fab-menu',
  },
  {
    slug: 'segmented-button',
    title: 'Segmented button',
    summary:
      'Deprecated (DECISIONS D4): a row of segments for single or multiple choice. Use a connected button group instead.',
    spec: '37',
    group: 'Actions',
    react: ['SingleChoiceSegmentedButtonRow', 'MultiChoiceSegmentedButtonRow', 'SegmentedButton'],
    elements: [],
    css: ['segmented-button'],
    playground: 'segmented-button',
  },
  {
    slug: 'loading-indicator',
    title: 'Loading indicator',
    summary:
      'A short wait shown as Material shapes morphing into each other, contained or not, indeterminate or determinate.',
    spec: '7',
    group: 'Communication',
    react: ['LoadingIndicator', 'RoundedPolygon'],
    elements: ['m3e-loading-indicator'],
    css: ['loading-indicator'],
    playground: 'loading-indicator',
  },
  {
    slug: 'progress',
    title: 'Progress indicators',
    summary:
      'Linear and circular progress indicators, determinate or indeterminate, flat or with the expressive wave.',
    spec: '8',
    group: 'Communication',
    react: ['LinearProgress', 'CircularProgress'],
    elements: ['m3e-linear-progress', 'm3e-circular-progress'],
    css: ['linear-progress', 'circular-progress'],
    playground: 'progress',
  },
  {
    slug: 'badge',
    title: 'Badge',
    summary: 'A dot or a short count on an icon, telling people something new is there.',
    spec: '34',
    group: 'Communication',
    react: ['Badge', 'BadgedBox'],
    elements: [],
    css: ['badge'],
    playground: 'badge',
  },
  {
    slug: 'snackbar',
    title: 'Snackbar',
    summary:
      'A brief message at the bottom of the window about something the app did, with an optional action.',
    spec: '32',
    group: 'Communication',
    react: ['Snackbar', 'SnackbarHost', 'useSnackbarHostState', 'SnackbarHostState'],
    elements: ['m3e-snackbar-host'],
    css: ['snackbar'],
    playground: 'snackbar',
  },
  {
    slug: 'tooltip',
    title: 'Tooltips',
    summary: 'Plain tooltips name a control; rich tooltips explain it, optionally with an action.',
    spec: '33',
    group: 'Communication',
    react: ['TooltipTrigger', 'PlainTooltip', 'RichTooltip'],
    elements: ['m3e-tooltip'],
    css: ['tooltip'],
    playground: 'tooltip',
  },
  {
    slug: 'card',
    title: 'Cards',
    summary:
      'A surface for content and actions about one subject: elevated, filled or outlined, optionally interactive.',
    spec: '19',
    group: 'Containment',
    react: ['Card', 'CardAction'],
    elements: [],
    css: ['card'],
    playground: 'card',
  },
  {
    slug: 'list',
    title: 'Lists',
    summary:
      'Rows of text and controls: one to three lines, leading and trailing content, selectable, and segmented items.',
    spec: '20',
    group: 'Containment',
    react: ['List', 'ListItem', 'SegmentedListItem'],
    elements: ['m3e-list'],
    css: ['list'],
    playground: 'list',
  },
  {
    slug: 'carousel',
    title: 'Carousel',
    summary:
      'A scrolling row of items that grow and shrink as they move: multi-browse, uncontained, hero and full-screen layouts.',
    spec: '36',
    group: 'Containment',
    react: ['Carousel', 'CarouselItem'],
    elements: ['m3e-carousel', 'm3e-carousel-item'],
    css: ['carousel'],
    playground: 'carousel',
  },
  {
    slug: 'dialog',
    title: 'Dialogs',
    summary:
      'A modal window for an important prompt or a task that needs focus: alert dialogs and full-screen dialogs.',
    spec: '29',
    group: 'Containment',
    react: ['AlertDialog', 'BasicAlertDialog', 'FullScreenDialog'],
    elements: ['m3e-dialog'],
    css: ['dialog'],
    playground: 'dialog',
  },
  {
    slug: 'bottom-sheet',
    title: 'Bottom sheets',
    summary:
      'A surface anchored to the bottom of the window, standard or modal, that people drag between heights.',
    spec: '30',
    group: 'Containment',
    react: ['BottomSheet', 'ModalBottomSheet'],
    elements: ['m3e-bottom-sheet'],
    css: ['bottom-sheet'],
    playground: 'bottom-sheet',
  },
  {
    slug: 'side-sheet',
    title: 'Side sheets',
    summary:
      'A surface at the side of the window for supplementary content, standard beside the page or modal over it.',
    spec: '31',
    group: 'Containment',
    react: ['SideSheet'],
    elements: ['m3e-side-sheet'],
    css: ['side-sheet'],
    playground: 'side-sheet',
  },
  {
    slug: 'divider',
    title: 'Divider',
    summary: 'A thin line that groups content in lists and layouts.',
    spec: '35',
    group: 'Containment',
    react: [],
    elements: [],
    css: ['divider'],
    playground: 'divider',
  },
  {
    slug: 'top-app-bar',
    title: 'Top app bars',
    summary:
      'The bar at the top of a screen with its title and actions: small, center-aligned, medium and large flexible, and two-rows, with scroll behaviors.',
    spec: '11',
    group: 'Navigation',
    react: ['TopAppBar'],
    elements: [],
    css: ['top-app-bar'],
    playground: 'top-app-bar',
  },
  {
    slug: 'floating-toolbar',
    title: 'Floating toolbar',
    summary:
      'A toolbar that floats over the content, horizontal or vertical, with an optional FAB; it can hide on scroll.',
    spec: '9',
    group: 'Navigation',
    react: ['FloatingToolbar', 'floatingToolbarClassName'],
    elements: ['m3e-floating-toolbar'],
    css: ['floating-toolbar'],
    playground: 'floating-toolbar',
  },
  {
    slug: 'docked-toolbar',
    title: 'Docked toolbar',
    summary: 'A toolbar docked to the bottom of the window for actions on the current page.',
    spec: '10',
    group: 'Navigation',
    react: ['DockedToolbar', 'dockedToolbarClassName', 'BottomAppBar'],
    elements: ['m3e-docked-toolbar'],
    css: ['docked-toolbar', 'bottom-app-bar'],
    playground: 'docked-toolbar',
  },
  {
    slug: 'search',
    title: 'Search',
    summary:
      'A search bar that expands into a full-screen or docked view of suggestions and results.',
    spec: '12',
    group: 'Navigation',
    react: ['SearchBar', 'SearchResult', 'AppBarWithSearch'],
    elements: ['m3e-search', 'm3e-search-result'],
    css: ['search'],
    playground: 'search',
  },
  {
    slug: 'navigation-bar',
    title: 'Navigation bar',
    summary:
      'The bar at the bottom of compact windows to switch between three to five destinations.',
    spec: '13',
    group: 'Navigation',
    react: ['ShortNavigationBar', 'NavigationBar'],
    elements: ['m3e-short-navigation-bar', 'm3e-navigation-item'],
    css: ['short-navigation-bar', 'navigation-item', 'navigation-bar'],
    playground: 'navigation-bar',
  },
  {
    slug: 'navigation-rail',
    title: 'Navigation rail',
    summary:
      'Navigation at the side of medium and larger windows: a collapsed rail that expands, or opens as a modal.',
    spec: '14',
    group: 'Navigation',
    react: ['WideNavigationRail', 'ModalWideNavigationRail', 'NavigationRail'],
    elements: ['m3e-wide-navigation-rail', 'm3e-modal-wide-navigation-rail'],
    css: ['wide-navigation-rail', 'navigation-rail'],
    playground: 'navigation-rail',
  },
  {
    slug: 'navigation-drawer',
    title: 'Navigation drawer',
    summary: 'A sheet of destinations at the side of the window: permanent, dismissible or modal.',
    spec: '15',
    group: 'Navigation',
    react: ['NavigationDrawer'],
    elements: ['m3e-navigation-drawer'],
    css: ['navigation-drawer'],
    playground: 'navigation-drawer',
  },
  {
    slug: 'navigation-suite',
    title: 'Navigation suite',
    summary:
      'One set of destinations shown as a navigation bar, a rail or a drawer, chosen by the window size class.',
    spec: '16',
    group: 'Navigation',
    react: ['NavigationSuiteScaffold'],
    elements: ['m3e-navigation-suite'],
    css: ['navigation-suite'],
    playground: 'navigation-suite',
  },
  {
    slug: 'tabs',
    title: 'Tabs',
    summary:
      'Tabs switch between groups of content at the same level: primary or secondary, fixed or scrollable.',
    spec: '17',
    group: 'Navigation',
    react: ['Tabs', 'Tab', 'TabPanel'],
    elements: ['m3e-tabs', 'm3e-tab', 'm3e-tab-panel'],
    css: ['tabs'],
    playground: 'tabs',
  },
  {
    slug: 'chips',
    title: 'Chips',
    summary:
      'Compact elements for input, filters, suggestions and actions: assist, filter, input and suggestion chips.',
    spec: '18',
    group: 'Selection',
    react: [
      'AssistChip',
      'FilterChip',
      'InputChipGroup',
      'InputChip',
      'SuggestionChip',
      'ChipSet',
      'assistChipClassName',
      'filterChipClassName',
      'inputChipClassName',
      'suggestionChipClassName',
    ],
    elements: ['m3e-chip-set'],
    css: ['chip', 'assist-chip', 'filter-chip', 'input-chip', 'suggestion-chip', 'chip-set'],
    playground: 'chips',
  },
  {
    slug: 'menu',
    title: 'Menus',
    summary:
      'A list of choices on a temporary surface: standard and vibrant colors, sections, and selectable items.',
    spec: '21',
    group: 'Selection',
    react: ['Menu', 'MenuItem', 'MenuSection', 'MenuTrigger'],
    elements: ['m3e-menu', 'm3e-menu-item', 'm3e-menu-group'],
    css: ['menu'],
    playground: 'menus',
  },
  {
    slug: 'checkbox',
    title: 'Checkbox',
    summary:
      'Lets people select one or more items from a list, or turn an option on or off, with indeterminate and error states.',
    spec: '22',
    group: 'Selection',
    react: ['Checkbox'],
    elements: ['m3e-checkbox'],
    css: ['checkbox'],
    playground: 'checkbox',
  },
  {
    slug: 'radio-button',
    title: 'Radio button',
    summary: 'Lets people select one option from a set.',
    spec: '23',
    group: 'Selection',
    react: ['RadioGroup', 'Radio'],
    elements: [],
    css: ['radio-button'],
    playground: 'radio-button',
  },
  {
    slug: 'switch',
    title: 'Switch',
    summary: 'Toggles a single setting on or off, optionally with icons in its handle.',
    spec: '24',
    group: 'Selection',
    react: ['Switch'],
    elements: [],
    css: ['switch'],
    playground: 'switch',
  },
  {
    slug: 'slider',
    title: 'Slider',
    summary:
      'Lets people pick a value or a range from a track: five sizes, stops, centered and vertical sliders and an inset icon.',
    spec: '25',
    group: 'Selection',
    react: ['Slider', 'RangeSlider'],
    elements: ['m3e-slider'],
    css: ['slider'],
    playground: 'slider',
  },
  {
    slug: 'date-picker',
    title: 'Date pickers',
    summary:
      'Lets people select a date or a range of dates from a calendar, a year grid or a text field.',
    spec: '27',
    group: 'Selection',
    react: ['DatePicker', 'DateRangePicker', 'DockedDatePicker', 'DatePickerDialog'],
    elements: ['m3e-date-picker', 'm3e-date-range-picker', 'm3e-docked-date-picker'],
    css: ['date-picker'],
    playground: 'date-picker',
  },
  {
    slug: 'time-picker',
    title: 'Time pickers',
    summary: 'Lets people select a time on a clock dial, in text fields or on scroll wheels.',
    spec: '28',
    group: 'Selection',
    react: [
      'TimePicker',
      'TimeInput',
      'TimeScroll',
      'TimePickerDialog',
      'VibrantTimePickerDialog',
      'TimePickerModeToggle',
    ],
    elements: ['m3e-time-picker', 'm3e-time-input', 'm3e-time-scroll'],
    css: ['time-picker'],
    playground: 'time-picker',
  },
  {
    slug: 'text-field',
    title: 'Text fields',
    summary:
      'Lets people enter text: filled and outlined, with labels, icons, prefixes and suffixes, counters and multiple lines.',
    spec: '26',
    group: 'Text input',
    react: ['TextField'],
    elements: ['m3e-text-field'],
    css: ['text-field'],
    playground: 'text-field',
  },
  {
    slug: 'canonical-layouts',
    title: 'Canonical layouts',
    summary:
      'Ready-made adaptive layouts: list-detail, supporting pane and feed, with the window size classes that drive them.',
    spec: '16a',
    group: 'Layout',
    react: [
      'ListDetailPaneScaffold',
      'useListDetailPaneScaffoldNavigator',
      'SupportingPaneScaffold',
      'useSupportingPaneScaffoldNavigator',
      'ThreePaneScaffoldNavigator',
      'FeedLayout',
      'useWindowSizeClass',
    ],
    elements: ['m3e-list-detail-layout', 'm3e-supporting-pane-layout'],
    css: ['layout', 'vertical-drag-handle'],
    playground: 'canonical-layouts',
  },
  {
    slug: 'pull-to-refresh',
    title: 'Pull to refresh',
    summary: 'Pull down at the top of a list to refresh it, with the expressive loading indicator.',
    spec: '38',
    group: 'Layout',
    react: ['PullToRefresh'],
    elements: ['m3e-pull-to-refresh'],
    css: ['pull-to-refresh'],
    playground: 'pull-to-refresh',
  },
  {
    slug: 'primitives',
    title: 'Primitives',
    summary:
      'The building blocks every component uses: surfaces, icons, the state layer and the focus ring.',
    spec: '39',
    group: 'Primitives',
    react: ['Surface', 'Icon', 'useStateLayer'],
    elements: ['m3e-icon', 'm3e-navigation-item'],
    css: ['surface', 'icon', 'state-layer', 'focus-ring', 'navigation-item'],
    playground: 'primitives',
  },
];

export const componentBySlug = (slug: string): ComponentEntry | undefined =>
  COMPONENTS.find((c) => c.slug === slug);
