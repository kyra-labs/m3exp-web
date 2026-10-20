import { Icon, Menu, MenuItem, SplitButton } from '@kyralabs/m3exp-web/react';

export default function Split() {
  return (
    <>
      <SplitButton
        icon={<Icon name="send" />}
        menuLabel="More send options"
        onPress={() => {
          console.log('send');
        }}
        menu={
          <Menu aria-label="Send options">
            <MenuItem id="schedule" icon="schedule">
              Schedule send
            </MenuItem>
            <MenuItem id="draft" icon="draft">
              Save draft
            </MenuItem>
          </Menu>
        }
      >
        Send
      </SplitButton>
      <SplitButton
        variant="tonal"
        size="m"
        menuLabel="More edit options"
        menu={
          <Menu aria-label="Edit options">
            <MenuItem id="rename">Rename</MenuItem>
            <MenuItem id="duplicate">Duplicate</MenuItem>
          </Menu>
        }
      >
        Edit
      </SplitButton>
    </>
  );
}
