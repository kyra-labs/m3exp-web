import { List, ListItem } from '@kyralabs/m3exp-web/react';

export default function Selectable() {
  return (
    <List aria-label="Pets" selectionMode="single" defaultSelectedKeys={['dog']}>
      <ListItem id="cat">Cat</ListItem>
      <ListItem id="dog">Dog</ListItem>
      <ListItem id="rabbit">Rabbit</ListItem>
    </List>
  );
}
