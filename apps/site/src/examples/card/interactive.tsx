import { Button, Card, CardAction } from '@kyralabs/m3exp-web/react';

export default function Interactive() {
  return (
    <Card variant="outlined" as="article" style={{ padding: 'var(--m3e-sys-space-200)' }}>
      <h4>
        <CardAction href="/components/card/">Glacier hike</CardAction>
      </h4>
      <p>The whole card is the link. Other controls stay clickable above it.</p>
      <Button variant="tonal" size="xs">
        Save
      </Button>
    </Card>
  );
}
