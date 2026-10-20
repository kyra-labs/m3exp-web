import { Icon, IconButton } from '@kyralabs/m3exp-web/react';

export default function Toggle() {
  return (
    <>
      <IconButton variant="standard" size="m" aria-label="Favorite" defaultSelected>
        <Icon name="favorite" />
      </IconButton>
      <IconButton variant="filled" size="m" aria-label="Favorite" defaultSelected={false}>
        <Icon name="favorite" />
      </IconButton>
      <IconButton variant="tonal" size="m" aria-label="Bookmark" defaultSelected>
        <Icon name="bookmark" />
      </IconButton>
      <IconButton
        variant="outlined"
        size="m"
        shape="square"
        aria-label="Bookmark"
        defaultSelected={false}
      >
        <Icon name="bookmark" />
      </IconButton>
    </>
  );
}
