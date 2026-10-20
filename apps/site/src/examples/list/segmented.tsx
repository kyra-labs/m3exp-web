import { Icon, List, SegmentedListItem } from '@kyralabs/m3exp-web/react';

export default function Segmented() {
  return (
    <List
      aria-label="Settings"
      onAction={(key) => {
        console.log(key);
      }}
    >
      <SegmentedListItem
        id="wifi"
        leadingContent={<Icon name="wifi" />}
        supportingContent="Home network"
      >
        Wi-Fi
      </SegmentedListItem>
      <SegmentedListItem
        id="bluetooth"
        leadingContent={<Icon name="bluetooth" />}
        supportingContent="Off"
      >
        Bluetooth
      </SegmentedListItem>
      <SegmentedListItem
        id="battery"
        leadingContent={<Icon name="battery_full" />}
        supportingContent="82%"
      >
        Battery
      </SegmentedListItem>
    </List>
  );
}
