import { Button, Menu, MenuItem, MenuSection, MenuTrigger } from '@kyralabs/m3exp-web/react';

export default function MenuExample() {
  return (
    <MenuTrigger>
      <Button variant="tonal">Edit</Button>
      <Menu
        aria-label="Edit"
        onAction={(key) => {
          console.log(key);
        }}
      >
        <MenuSection id="clipboard" aria-label="Clipboard">
          <MenuItem id="cut" icon="content_cut" trailingText="Ctrl+X">
            Cut
          </MenuItem>
          <MenuItem id="copy" icon="content_copy" trailingText="Ctrl+C">
            Copy
          </MenuItem>
          <MenuItem id="paste" icon="content_paste" trailingText="Ctrl+V" isDisabled>
            Paste
          </MenuItem>
        </MenuSection>
        <MenuSection id="more" title="More" divider>
          <MenuItem id="rename" icon="edit" supportingText="Change the file name">
            Rename
          </MenuItem>
          <MenuItem id="delete" icon="delete">
            Delete
          </MenuItem>
        </MenuSection>
      </Menu>
    </MenuTrigger>
  );
}
