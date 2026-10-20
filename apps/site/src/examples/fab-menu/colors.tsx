import { FabMenu, Icon } from '@kyralabs/m3exp-web/react';

const items = [
  { key: 'mail', icon: <Icon name="mail" />, label: 'Email' },
  { key: 'link', icon: <Icon name="link" />, label: 'Copy link' },
];

export default function Colors() {
  return (
    <>
      <FabMenu aria-label="Share" icon={<Icon name="share" />} color="secondary" items={items} />
      <FabMenu
        aria-label="Share"
        icon={<Icon name="share" />}
        color="tertiary"
        size="medium"
        items={items}
      />
    </>
  );
}
