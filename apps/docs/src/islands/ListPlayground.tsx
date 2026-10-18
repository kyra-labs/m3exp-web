import { Icon, List, ListItem, SegmentedListItem, Switch } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/**
 * React lists: Compose's SingleSelectionListItemSample (leading radio, trailing icon),
 * MultiSelectionSegmentedListItemSample (leading checkbox, surface container), a static list with
 * a live trailing switch and an action list.
 */
export default function ListPlayground() {
  const [opened, setOpened] = useState('');
  const [dark, setDark] = useState(false);
  return (
    <div className="docs-list-grid" data-testid="react-lists">
      <List aria-label="React single selection" selectionMode="single" defaultSelectedKeys={['2']}>
        {['1', '2', '3'].map((id) => (
          <ListItem
            key={id}
            id={id}
            selectionControl="radio"
            trailingContent={<Icon name="favorite" />}
            supportingContent="Additional info"
          >
            {`Item ${id}`}
          </ListItem>
        ))}
      </List>
      <List
        aria-label="React multiple selection"
        selectionMode="multiple"
        className="docs-list-surface-container"
      >
        {['1', '2', '3', '4'].map((id) => (
          <SegmentedListItem
            key={id}
            id={id}
            selectionControl="checkbox"
            trailingContent={<Icon name="favorite" />}
            supportingContent="Additional info"
          >
            {`Item ${id}`}
          </SegmentedListItem>
        ))}
      </List>
      <List aria-label="React static list">
        <ListItem
          leadingContent={<Icon name="brightness_6" />}
          trailingContent={<Switch aria-label="Dark theme" isSelected={dark} onChange={setDark} />}
          supportingContent="A live control in a static item"
        >
          Dark theme
        </ListItem>
      </List>
      <List
        aria-label="React actions"
        onAction={(key) => {
          setOpened(String(key));
        }}
      >
        <ListItem id="inbox" leadingContent={<Icon name="inbox" />} trailingContent="24">
          Inbox
        </ListItem>
        <ListItem id="drafts" leadingContent={<Icon name="drafts" />} trailingContent="3">
          Drafts
        </ListItem>
      </List>
      <p aria-live="polite">{opened ? `Opened: ${opened}` : ''}</p>
    </div>
  );
}
