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

export const NAV: NavSection[] = [
  {
    links: [{ href: '/', label: 'Home', icon: 'home' }],
  },
];

/** True when `href` is the current page or one of its children (section highlighting). */
export function isCurrent(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
