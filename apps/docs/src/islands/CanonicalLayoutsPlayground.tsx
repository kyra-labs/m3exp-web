import {
  Button,
  Icon,
  IconButton,
  ListDetailPaneScaffold,
  useListDetailPaneScaffoldNavigator,
} from '@kyralabs/m3exp-web/react';

const ITEMS = [
  { key: 1, from: 'Ali Connors', subject: 'Brunch this weekend?' },
  { key: 2, from: 'Sandra Adams', subject: 'Summer BBQ' },
  { key: 3, from: 'Trevor Hansen', subject: 'Oui oui' },
];

/** Compose's ListDetailPaneScaffoldSample with an extra pane, in React. */
export default function CanonicalLayoutsPlayground() {
  const navigator = useListDetailPaneScaffoldNavigator<number>();
  const selected = [...navigator.destinationHistory]
    .reverse()
    .find((d) => d.contentKey !== undefined)?.contentKey;
  const item = ITEMS.find((i) => i.key === selected);
  return (
    <ListDetailPaneScaffold
      data-testid="react-layout"
      navigator={navigator}
      paneLabels={{ list: 'React inbox', detail: 'React message', extra: 'React notes' }}
      listPane={
        <div className="docs-layout-list">
          {ITEMS.map((i) => (
            <button
              key={i.key}
              type="button"
              className="docs-layout-item"
              aria-current={
                i.key === selected && navigator.isExpanded('detail') && navigator.isExpanded('list')
                  ? 'true'
                  : undefined
              }
              onClick={() => {
                navigator.navigateTo('detail', i.key);
              }}
            >
              <span className="docs-layout-item__title">{i.from}</span>
              <span>{i.subject}</span>
            </button>
          ))}
        </div>
      }
      detailPane={
        <div className="docs-layout-screen">
          <div className="docs-layout-bar">
            {navigator.isExpanded('list') ? null : (
              <IconButton
                aria-label="Back"
                data-testid="react-back"
                onPress={() => {
                  navigator.navigateBack();
                }}
              >
                <Icon name="arrow_back" />
              </IconButton>
            )}
            <h3>{item ? item.subject : 'No item selected'}</h3>
          </div>
          <div className="docs-layout-card">
            <p>
              {item
                ? `This is a description about ${item.subject}.`
                : 'Select an item from the list.'}
            </p>
            {item ? (
              <Button
                variant="tonal"
                onPress={() => {
                  navigator.navigateTo('extra', item.key);
                }}
              >
                Show notes
              </Button>
            ) : null}
          </div>
        </div>
      }
      extraPane={
        <div className="docs-layout-screen">
          <div className="docs-layout-bar">
            {navigator.canNavigateBack() ? (
              <IconButton
                aria-label="Back from notes"
                onPress={() => {
                  navigator.navigateBack();
                }}
              >
                <Icon name="arrow_back" />
              </IconButton>
            ) : null}
            <h3>Notes</h3>
          </div>
          <div className="docs-layout-card docs-layout-card--extra">
            <p>{item ? `This is extra content about ${item.subject}.` : 'Nothing to show.'}</p>
          </div>
        </div>
      }
    />
  );
}
