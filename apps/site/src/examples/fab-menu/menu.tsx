import { FabMenu, Icon } from '@kyralabs/m3exp-web/react';

export default function Menu() {
  return (
    <FabMenu
      aria-label="Create"
      items={[
        { key: 'doc', icon: <Icon name="description" />, label: 'Document' },
        { key: 'sheet', icon: <Icon name="table_chart" />, label: 'Spreadsheet' },
        { key: 'slides', icon: <Icon name="slideshow" />, label: 'Presentation' },
      ]}
    />
  );
}
