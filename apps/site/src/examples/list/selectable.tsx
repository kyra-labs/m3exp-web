import { List, ListItem } from '@kyralabs/m3exp-web/react';

export default function Selectable() {
  return (
    <List aria-label="Pets" selectionMode="single" defaultSelectedKeys={['dog']}>
      <ListItem id="cat" selectionControl="radio">
        Cat
      </ListItem>
      <ListItem id="dog" selectionControl="radio">
        Dog
      </ListItem>
      <ListItem id="rabbit" selectionControl="radio">
        Rabbit
      </ListItem>
    </List>
  );
}
