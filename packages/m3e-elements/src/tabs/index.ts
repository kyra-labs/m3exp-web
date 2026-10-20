import { M3eTab, M3eTabPanel, M3eTabs } from './tabs.js';

// Only the classes (m3e-react exports the Tabs types; one name per package in the umbrella).
// Registers <m3e-tabs>, <m3e-tab> and <m3e-tab-panel>. TabsLayout has its own entry
// (tabs-layout.js).
export { M3eTab, M3eTabPanel, M3eTabs, type M3eTabsEventMap } from './tabs.js';

M3eTabs.define('m3e-tabs');
M3eTab.define('m3e-tab');
M3eTabPanel.define('m3e-tab-panel');

declare global {
  interface HTMLElementTagNameMap {
    'm3e-tabs': M3eTabs;
    'm3e-tab': M3eTab;
    'm3e-tab-panel': M3eTabPanel;
  }
}
