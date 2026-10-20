import { List, ListItem } from '@kyralabs/m3exp-web/react';

export default function Multiple() {
  return (
    <List
      aria-label="Toppings"
      selectionMode="multiple"
      defaultSelectedKeys={['basil', 'olives']}
      disabledKeys={['anchovies']}
    >
      <ListItem id="basil" selectionControl="checkbox" supportingContent="Fresh">
        Basil
      </ListItem>
      <ListItem id="mushrooms" selectionControl="checkbox">
        Mushrooms
      </ListItem>
      <ListItem id="olives" selectionControl="checkbox">
        Olives
      </ListItem>
      <ListItem id="anchovies" selectionControl="checkbox" supportingContent="Sold out">
        Anchovies
      </ListItem>
    </List>
  );
}
