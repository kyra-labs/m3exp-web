import { useState } from 'react';
import { Button, Checkbox, SideSheet } from '@kyralabs/m3exp-web/react';

export default function Modal() {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          setOpen(true);
        }}
      >
        Filters
      </Button>
      <SideSheet
        variant="modal"
        isOpen={open}
        onOpenChange={setOpen}
        headline="Filters"
        divider
        actions={
          <>
            <Button variant="filled" onPress={close}>
              Apply
            </Button>
            <Button variant="outlined" onPress={close}>
              Cancel
            </Button>
          </>
        }
      >
        <Checkbox defaultSelected>Free shipping</Checkbox>
        <Checkbox>In stock</Checkbox>
      </SideSheet>
    </>
  );
}
