import { Button, Icon } from '@kyralabs/m3exp-web/react';

export default function Sizes() {
  return (
    <>
      <Button size="xs" icon={<Icon name="add" />}>
        Extra small
      </Button>
      <Button size="s" icon={<Icon name="add" />}>
        Small
      </Button>
      <Button size="m" icon={<Icon name="add" />}>
        Medium
      </Button>
      <Button size="l" icon={<Icon name="add" />}>
        Large
      </Button>
      <Button size="xl" icon={<Icon name="add" />}>
        Extra large
      </Button>
    </>
  );
}
