import { Icon, List, ListItem } from '@kyralabs/m3exp-web/react';

export default function Static() {
  return (
    <List aria-label="Contacts">
      <ListItem leadingContent={<Icon name="person" />} supportingContent="Product designer">
        Ali Connors
      </ListItem>
      <ListItem
        leadingContent={<Icon name="person" />}
        overlineContent="Team lead"
        supportingContent="Engineering"
        trailingContent="12"
      >
        Sandra Adams
      </ListItem>
      <ListItem
        leadingContent={<Icon name="group" />}
        trailingContent={<Icon name="chevron_right" />}
      >
        All contacts
      </ListItem>
    </List>
  );
}
