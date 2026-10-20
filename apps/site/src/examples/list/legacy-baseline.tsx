import { Icon, List, ListItem } from '@kyralabs/m3exp-web/react';

/** Deprecated (D4): use <ListItem> with the headline as its children. */
export default function LegacyBaseline() {
  return (
    <List aria-label="Folders (baseline)">
      <ListItem headlineContent="Inbox" leadingContent={<Icon name="inbox" />} />
      <ListItem
        headlineContent="Archive"
        supportingContent="Older than a year"
        leadingContent={<Icon name="archive" />}
      />
    </List>
  );
}
