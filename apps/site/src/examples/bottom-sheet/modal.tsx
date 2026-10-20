import { useState } from 'react';
import { Button, Icon, List, ListItem, ModalBottomSheet } from '@kyralabs/m3exp-web/react';

export default function Modal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          setOpen(true);
        }}
      >
        Share
      </Button>
      <ModalBottomSheet isOpen={open} onOpenChange={setOpen} aria-label="Share">
        <List
          aria-label="Share to"
          onAction={() => {
            setOpen(false);
          }}
        >
          <ListItem id="mail" leadingContent={<Icon name="mail" />}>
            Email
          </ListItem>
          <ListItem id="link" leadingContent={<Icon name="link" />}>
            Copy link
          </ListItem>
          <ListItem id="chat" leadingContent={<Icon name="chat" />}>
            Message
          </ListItem>
        </List>
      </ModalBottomSheet>
    </>
  );
}
