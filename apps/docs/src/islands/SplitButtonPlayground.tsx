import { Icon, Menu, MenuItem, SplitButton } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/** React split buttons: uncontrolled with actions, and one with a controlled open state. */
export default function SplitButtonPlayground() {
  const [last, setLast] = useState('none');
  const [open, setOpen] = useState(false);
  return (
    <div className="docs-menu-demos" data-testid="react-split">
      <SplitButton
        icon={<Icon name="mail" />}
        menuLabel="More send options (React)"
        data-testid="react-split-filled"
        onPress={() => {
          setLast('send');
        }}
        menu={
          <Menu
            onAction={(key) => {
              setLast(String(key));
            }}
          >
            <MenuItem id="copy" icon="content_copy">
              Send a copy
            </MenuItem>
            <MenuItem id="share" icon="share">
              Share link
            </MenuItem>
            <MenuItem id="delete" icon="delete">
              Discard
            </MenuItem>
          </Menu>
        }
      >
        Send
      </SplitButton>
      <SplitButton
        variant="elevated"
        size="l"
        icon={<Icon name="edit" />}
        menuLabel="More edit options (React)"
        data-testid="react-split-controlled"
        isOpen={open}
        onOpenChange={setOpen}
        onPress={() => {
          setLast('edit');
        }}
        menu={
          <Menu
            onAction={(key) => {
              setLast(String(key));
            }}
          >
            <MenuItem id="cut" icon="content_cut">
              Cut
            </MenuItem>
            <MenuItem id="paste" icon="content_paste">
              Paste
            </MenuItem>
          </Menu>
        }
      >
        Edit
      </SplitButton>
      <p className="docs-menu-log">
        Last: <output data-testid="react-split-log">{last}</output>; menu {open ? 'open' : 'closed'}
        .
      </p>
    </div>
  );
}
