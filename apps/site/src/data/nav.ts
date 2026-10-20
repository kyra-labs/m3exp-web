// The site's navigation, in drawer order. Each later PR adds its section (DECISIONS D27).
import pendingList from '../../scripts/pending-components.txt?raw';
import { COMPONENTS } from './components';
export interface NavLink {
  href: string;
  label: string;
  /** Material Symbols name; links without one are listed under the section's first link. */
  icon?: string;
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

/** The foundations pages, in reading order (also their previous / next links). */
export const FOUNDATIONS: NavLink[] = [
  { href: '/foundations/', label: 'Overview', icon: 'foundation' },
  { href: '/foundations/color/', label: 'Color', icon: 'palette' },
  { href: '/foundations/typography/', label: 'Typography', icon: 'text_fields' },
  { href: '/foundations/shape/', label: 'Shape', icon: 'interests' },
  { href: '/foundations/motion/', label: 'Motion', icon: 'animation' },
  { href: '/foundations/layout/', label: 'Layout', icon: 'dashboard' },
];

/** Component pages not written yet (scripts/pending-components.txt). */
export const PENDING = new Set(
  pendingList
    .split('\n')
    .map((l) => l.replace(/#.*/, '').trim())
    .filter(Boolean),
);

export const NAV: NavSection[] = [
  {
    links: [{ href: '/', label: 'Home', icon: 'home' }],
  },
  { label: 'Get started', links: GUIDES },
  { label: 'Foundations', links: FOUNDATIONS },
  {
    label: 'Components',
    links: [
      { href: '/components/', label: 'All components', icon: 'widgets' },
      ...COMPONENTS.filter((c) => !PENDING.has(c.slug))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((c) => ({ href: `/components/${c.slug}/`, label: c.title })),
    ],
  },
];

/** True when `href` is the current page or one of its children (section highlighting). */
export function isCurrent(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
