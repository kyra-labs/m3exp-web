// Behavior for the site shell (Site.astro), built on the library's own layouts:
// - the drawer: m3e-elements NavigationDrawerLayout, permanent from the large window size class,
//   modal (opened by the menu button) below it;
// - the top app bar's scrolled color: attachTopAppBarScroll;
// - the press ripple on plain-HTML components: ripple.js;
// - the theme menu (<m3e-menu>) and the search (<m3e-search> over the Pagefind index), loaded
//   after the page is interactive.
import '@kyralabs/m3e-elements/ripple.js';
import { NavigationDrawerLayout } from '@kyralabs/m3e-elements/navigation-drawer-layout.js';
import { attachTopAppBarScroll } from '@kyralabs/m3e-elements/top-app-bar.js';
import {
  isWidthAtLeastBreakpoint,
  observeWindowSizeClass,
} from '@kyralabs/m3e-elements/window-size-class.js';
import { getMode, setMode } from './theme';

const DRAWER = 'm3e-navigation-drawer';
/** The shell lives as long as the page. */
const { signal } = new AbortController();

function setUpDrawer(): void {
  const root = document.getElementById('site-drawer');
  const button = document.getElementById('site-menu-button');
  if (!root || !button) return;
  let layout: NavigationDrawerLayout | null = null;

  const setModal = (modal: boolean) => {
    if (layout && root.classList.contains(`${DRAWER}--modal`) === modal) return;
    layout?.destroy();
    root.classList.toggle(`${DRAWER}--modal`, modal);
    root.classList.remove(`${DRAWER}--open`);
    layout = new NavigationDrawerLayout(root, {
      open: false,
      onOpenChange: (open) => {
        root.classList.toggle(`${DRAWER}--open`, open);
        return true;
      },
    });
  };

  observeWindowSizeClass(
    (sizeClass) => {
      setModal(!isWidthAtLeastBreakpoint(sizeClass, 'large'));
    },
    { signal },
  );

  button.addEventListener('click', (event) => {
    if (layout?.variant !== 'modal') return;
    event.preventDefault();
    root.classList.add(`${DRAWER}--open`);
    layout.setOpen(true);
  });
}

function setUpTopBar(): void {
  const bar = document.getElementById('site-top-bar');
  if (bar) attachTopAppBarScroll(bar, { behavior: 'pinned', signal });
}

async function setUpThemeMenu(): Promise<void> {
  const menu = document.getElementById('site-theme-menu');
  if (!menu) return;
  await import('@kyralabs/m3e-elements/menu.js');
  const sync = () => {
    const mode = getMode();
    for (const item of menu.querySelectorAll<HTMLElement & { checked?: boolean }>(
      'm3e-menu-item',
    )) {
      item.checked = item.getAttribute('value') === mode;
    }
  };
  sync();
  menu.addEventListener('action', (event) => {
    const value = (event as CustomEvent<{ value: string }>).detail.value;
    if (value === 'system' || value === 'light' || value === 'dark') setMode(value);
    sync();
  });
  document.addEventListener('site-theme-change', sync);
}

async function setUpSearch(): Promise<void> {
  const search = document.getElementById('site-search');
  if (!search) return;
  const { attachSearch } = await import('./search');
  attachSearch(search);
}

setUpDrawer();
setUpTopBar();
void setUpThemeMenu();
void setUpSearch();
