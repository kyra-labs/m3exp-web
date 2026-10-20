import {
  Icon,
  IconButton,
  List,
  ListDetailPaneScaffold,
  ListItem,
  useListDetailPaneScaffoldNavigator,
} from '@kyralabs/m3exp-web/react';

const MESSAGES = [
  { key: 'brunch', from: 'Ali Connors', subject: 'Brunch this weekend?' },
  { key: 'bbq', from: 'Sandra Adams', subject: 'Summer BBQ' },
  { key: 'trip', from: 'Trevor Hansen', subject: 'Trip photos' },
];

/** The list alone below 840px of the layout's own width; list and detail side by side above. */
export default function ListDetail() {
  const navigator = useListDetailPaneScaffoldNavigator<string>();
  const selected = [...navigator.destinationHistory]
    .reverse()
    .find((d) => d.contentKey !== undefined)?.contentKey;
  const message = MESSAGES.find((m) => m.key === selected);
  return (
    <div
      style={{
        inlineSize: '100%',
        blockSize: 'var(--m3e-sys-window-height-medium)',
        overflow: 'hidden',
      }}
    >
      <ListDetailPaneScaffold
        navigator={navigator}
        paneLabels={{ list: 'Inbox', detail: 'Message' }}
        listPane={
          <List
            aria-label="Inbox"
            onAction={(key) => {
              navigator.navigateTo('detail', String(key));
            }}
          >
            {MESSAGES.map((m) => (
              <ListItem key={m.key} id={m.key} supportingContent={m.subject}>
                {m.from}
              </ListItem>
            ))}
          </List>
        }
        detailPane={
          <div style={{ padding: 'var(--m3e-sys-space-200)' }}>
            {navigator.isExpanded('list') ? null : (
              <IconButton
                aria-label="Back"
                onPress={() => {
                  navigator.navigateBack();
                }}
              >
                <Icon name="arrow_back" />
              </IconButton>
            )}
            <p>{message ? `${message.from}: ${message.subject}` : 'Select a message.'}</p>
          </div>
        }
      />
    </div>
  );
}
