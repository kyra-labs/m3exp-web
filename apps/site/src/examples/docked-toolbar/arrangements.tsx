import { DockedToolbar, Icon, IconButton } from '@kyralabs/m3exp-web/react';

const ACTIONS = [
  ['arrow_back', 'Back'],
  ['bookmark', 'Bookmark'],
  ['share', 'Share'],
  ['more_vert', 'More options'],
] as const;

export default function Arrangements() {
  return (
    <div style={{ display: 'grid', gap: 'var(--m3e-sys-space-200)', inlineSize: '100%' }}>
      {(['spread', 'center', 'space-around', 'space-evenly'] as const).map((arrangement) => (
        <DockedToolbar
          key={arrangement}
          aria-label={`Actions, ${arrangement}`}
          arrangement={arrangement}
          colorStyle={arrangement === 'center' ? 'vibrant' : 'standard'}
        >
          {ACTIONS.map(([icon, label]) => (
            <IconButton key={icon} aria-label={label}>
              <Icon name={icon} />
            </IconButton>
          ))}
        </DockedToolbar>
      ))}
    </div>
  );
}
