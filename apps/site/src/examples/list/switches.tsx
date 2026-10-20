import { Icon, List, ListItem } from '@kyralabs/m3exp-web/react';

export default function Switches() {
  return (
    <List aria-label="Connections" selectionMode="multiple" defaultSelectedKeys={['wifi']}>
      <ListItem id="wifi" leadingContent={<Icon name="wifi" />} selectionControl="switch">
        Wi-Fi
      </ListItem>
      <ListItem id="bluetooth" leadingContent={<Icon name="bluetooth" />} selectionControl="switch">
        Bluetooth
      </ListItem>
      <ListItem
        id="hotspot"
        leadingContent={<Icon name="wifi_tethering" />}
        selectionControl="switch"
        supportingContent="Share this phone's connection"
      >
        Hotspot
      </ListItem>
    </List>
  );
}
