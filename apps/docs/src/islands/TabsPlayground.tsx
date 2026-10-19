import { Button, type TabItem, TabPanel, Tabs } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const ITEMS: TabItem[] = [
  { key: 'videos', label: 'Videos', icon: 'videocam' },
  { key: 'photos', label: 'Photos', icon: 'photo' },
  { key: 'audio', label: 'Audio', icon: 'music_note' },
  { key: 'starred', label: 'Starred', icon: 'star' },
];

/** Badges on the labels (the dot, a count, 999+) and on an icon-only tab. */
const BADGED: TabItem[] = [
  { key: 'inbox', label: 'Inbox', badge: 1200, badgeLabel: '1200 unread' },
  { key: 'chat', label: 'Chat', badge: true },
  { key: 'mail', label: 'Mail', badge: 8 },
  { key: 'starred', label: 'Starred', icon: 'star', isLabelHidden: true, badge: 3 },
];

type Variant = 'primary' | 'secondary';

/** React tabs with badges (`badge`, `badgeLabel` on the items). */
function BadgedTabs() {
  const [selected, setSelected] = useState('inbox');
  return (
    <div className="docs-tabs-frame" data-testid="react-badges-frame">
      <Tabs
        aria-label="React badges example"
        data-testid="react-badges-tabs"
        items={BADGED}
        selectedKey={selected}
        onSelectionChange={setSelected}
      />
    </div>
  );
}

/** React tabs: switch the variant, scrolling and icon position; panels follow the selection. */
export default function TabsPlayground({ badges = false }: { badges?: boolean }) {
  if (badges) return <BadgedTabs />;
  return <TabsControls />;
}

function TabsControls() {
  const [variant, setVariant] = useState<Variant>('primary');
  const [scrollable, setScrollable] = useState(false);
  const [leading, setLeading] = useState(false);
  const [selected, setSelected] = useState('videos');
  const toggle = (label: string, pressed: boolean, onPress: () => void, testId: string) => (
    <Button
      variant={pressed ? 'filled' : 'outlined'}
      aria-pressed={pressed}
      data-testid={testId}
      onPress={onPress}
    >
      {label}
    </Button>
  );
  return (
    <>
      <div className="docs-drawer-controls" role="group" aria-label="Options">
        {toggle(
          'secondary',
          variant === 'secondary',
          () => {
            setVariant((v) => (v === 'primary' ? 'secondary' : 'primary'));
          },
          'react-variant',
        )}
        {toggle(
          'scrollable',
          scrollable,
          () => {
            setScrollable((s) => !s);
          },
          'react-scrollable',
        )}
        {toggle(
          'leading icons',
          leading,
          () => {
            setLeading((l) => !l);
          },
          'react-leading',
        )}
      </div>
      <div className="docs-tabs-frame" data-testid="react-frame">
        <Tabs
          aria-label="React example"
          data-testid="react-tabs"
          variant={variant}
          scrollable={scrollable}
          iconPosition={leading ? 'leading' : 'top'}
          items={ITEMS}
          selectedKey={selected}
          onSelectionChange={setSelected}
        >
          {ITEMS.map((item) => (
            <TabPanel key={item.key} id={item.key} className="docs-tabs-panel">
              Selected: {item.key}
            </TabPanel>
          ))}
        </Tabs>
      </div>
    </>
  );
}
