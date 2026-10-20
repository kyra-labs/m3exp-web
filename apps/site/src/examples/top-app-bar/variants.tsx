import { Icon, IconButton, TopAppBar } from '@kyralabs/m3exp-web/react';

const menu = (
  <IconButton aria-label="Menu">
    <Icon name="menu" />
  </IconButton>
);
const actions = (
  <>
    <IconButton aria-label="Search">
      <Icon name="search" />
    </IconButton>
    <IconButton aria-label="More options">
      <Icon name="more_vert" />
    </IconButton>
  </>
);

export default function Variants() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-200)', inlineSize: '100%' }}>
      <TopAppBar headingLevel={4} title="Small" navigationIcon={menu} actions={actions} />
      <TopAppBar
        headingLevel={4}
        variant="center-aligned"
        title="Center-aligned"
        navigationIcon={menu}
        actions={actions}
      />
      <TopAppBar
        headingLevel={4}
        variant="medium-flexible"
        title="Medium flexible"
        subtitle="With a subtitle"
        navigationIcon={menu}
        actions={actions}
      />
      <TopAppBar
        headingLevel={4}
        variant="large-flexible"
        title="Large flexible"
        navigationIcon={menu}
        actions={actions}
      />
    </div>
  );
}
