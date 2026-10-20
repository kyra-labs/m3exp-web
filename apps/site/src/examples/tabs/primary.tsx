import { TabPanel, Tabs, type TabItem } from '@kyralabs/m3exp-web/react';

const ITEMS: TabItem[] = [
  { key: 'flights', label: 'Flights', icon: 'flight' },
  { key: 'trips', label: 'Trips', icon: 'luggage', badge: 3 },
  { key: 'explore', label: 'Explore', icon: 'explore' },
];

export default function Primary() {
  return (
    <div style={{ inlineSize: '100%' }}>
      <Tabs aria-label="Travel" items={ITEMS} defaultSelectedKey="flights">
        <TabPanel id="flights">No upcoming flights.</TabPanel>
        <TabPanel id="trips">Three trips planned.</TabPanel>
        <TabPanel id="explore">Places to go next.</TabPanel>
      </Tabs>
    </div>
  );
}
