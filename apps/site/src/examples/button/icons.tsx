import { Button, Icon } from '@kyralabs/m3exp-web/react';

export default function Icons() {
  return (
    <>
      <Button variant="filled" icon={<Icon name="send" />}>
        Send
      </Button>
      <Button variant="outlined" trailingIcon={<Icon name="arrow_forward" />}>
        Next
      </Button>
    </>
  );
}
