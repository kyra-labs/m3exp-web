import { Badge, BadgedBox, Icon } from '@kyralabs/m3exp-web/react';

export default function Badges() {
  return (
    <>
      <BadgedBox badge={<Badge />}>
        <Icon name="mail" label="Mail" />
      </BadgedBox>
      <BadgedBox badge={<Badge count={8} />}>
        <Icon name="notifications" label="Notifications" />
      </BadgedBox>
      <BadgedBox badge={<Badge count={1200} />}>
        <Icon name="inbox" label="Inbox" />
      </BadgedBox>
      <BadgedBox badge={<Badge label="New">New</Badge>}>
        <Icon name="shopping_bag" label="Shop" />
      </BadgedBox>
    </>
  );
}
