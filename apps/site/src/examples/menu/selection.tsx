import { IconButton, Icon, Menu, MenuItem, MenuTrigger } from '@kyralabs/m3exp-web/react';

export default function Selection() {
  return (
    <MenuTrigger>
      <IconButton aria-label="Sort">
        <Icon name="sort" />
      </IconButton>
      <Menu
        aria-label="Sort by"
        variant="vibrant"
        selectionMode="single"
        defaultSelectedKeys={['date']}
      >
        <MenuItem id="name" icon="sort_by_alpha">
          Name
        </MenuItem>
        <MenuItem id="date" icon="schedule">
          Date modified
        </MenuItem>
        <MenuItem id="size" icon="straighten">
          Size
        </MenuItem>
      </Menu>
    </MenuTrigger>
  );
}
