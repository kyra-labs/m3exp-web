import { TabPanel, Tabs, type TabItem } from '@kyralabs/m3exp-web/react';

const ITEMS: TabItem[] = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'photos', label: 'Photos', icon: 'photo' },
  { key: 'videos', label: 'Videos', icon: 'movie' },
  { key: 'music', label: 'Music', icon: 'music_note' },
  { key: 'books', label: 'Books', icon: 'menu_book' },
  { key: 'podcasts', label: 'Podcasts', icon: 'podcasts' },
  { key: 'documents', label: 'Documents', icon: 'description' },
];

export default function Scrollable() {
  return (
    <div style={{ inlineSize: '100%', maxInlineSize: 'var(--m3e-sys-window-width-medium)' }}>
      <Tabs
        aria-label="Library"
        scrollable
        iconPosition="leading"
        items={ITEMS}
        defaultSelectedKey="photos"
      >
        {ITEMS.map((item) => (
          <TabPanel key={item.key} id={item.key}>
            {item.label} in your library.
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
