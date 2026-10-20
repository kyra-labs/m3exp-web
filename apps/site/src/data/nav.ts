// The site's navigation, in drawer order. Each later PR adds its section (DECISIONS D27).
export interface NavLink {
  href: string;
  label: string;
  /** Material Symbols name. */
  icon: string;
}

export interface NavSection {
  /** Section label in the drawer; omitted for the top group. */
  label?: string;
  links: NavLink[];
}

/** The getting-started guides, in reading order (also their previous / next links). */
export const GUIDES: NavLink[] = [
  { href: '/get-started/', label: 'Overview', icon: 'rocket_launch' },
  { href: '/get-started/react/', label: 'React with Vite', icon: 'deployed_code' },
  { href: '/get-started/astro/', label: 'Astro', icon: 'rocket' },
  { href: '/get-started/html/', label: 'Plain HTML and CDN', icon: 'html' },
  { href: '/get-started/fonts-and-icons/', label: 'Fonts and icons', icon: 'match_case' },
  { href: '/get-started/theming/', label: 'Theming', icon: 'palette' },
  { href: '/get-started/ripple/', label: 'Ripple for plain HTML', icon: 'touch_app' },
  { href: '/get-started/ssr/', label: 'Server rendering', icon: 'dns' },
  { href: '/get-started/versioning/', label: 'Versioning', icon: 'commit' },
];

export const NAV: NavSection[] = [
  {
    links: [{ href: '/', label: 'Home', icon: 'home' }],
  },
  { label: 'Get started', links: GUIDES },
];

/** True when `href` is the current page or one of its children (section highlighting). */
export function isCurrent(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
