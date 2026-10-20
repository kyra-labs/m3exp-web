import { Tab, TabPanel, Tabs } from '@kyralabs/m3exp-web/react';

export default function Secondary() {
  return (
    <div style={{ inlineSize: '100%' }}>
      <Tabs aria-label="Trip details" variant="secondary" defaultSelectedKey="overview">
        <Tab id="overview">Overview</Tab>
        <Tab id="itinerary">Itinerary</Tab>
        <Tab id="tickets" isDisabled>
          Tickets
        </Tab>
        <TabPanel id="overview">Five days in the mountains.</TabPanel>
        <TabPanel id="itinerary">Day 1: arrive and settle in.</TabPanel>
        <TabPanel id="tickets">Tickets go on sale soon.</TabPanel>
      </Tabs>
    </div>
  );
}
