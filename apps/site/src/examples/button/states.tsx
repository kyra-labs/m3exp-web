import { Button } from '@kyralabs/m3exp-web/react';

export default function States() {
  return (
    <>
      <Button variant="filled" isDisabled>
        Disabled
      </Button>
      <Button variant="outlined" isDisabled>
        Disabled
      </Button>
      <Button variant="tonal" href="/">
        Link
      </Button>
    </>
  );
}
