import {
  Button,
  Icon,
  IconButton,
  SupportingPaneScaffold,
  useSupportingPaneScaffoldNavigator,
} from '@kyralabs/m3exp-web/react';

const RELATED = ['Brunch this weekend?', 'Summer BBQ', 'Oui oui'];

/** Compose's SupportingPaneScaffoldSample shape in React: the element demo above, as a component. */
export default function SupportingPanePlayground() {
  const navigator = useSupportingPaneScaffoldNavigator();
  return (
    <SupportingPaneScaffold
      data-testid="react-supporting"
      navigator={navigator}
      paneLabels={{ main: 'React article', supporting: 'React related' }}
      mainPane={
        <div className="docs-layout-screen">
          <div className="docs-layout-bar">
            <h3>My content</h3>
          </div>
          <div className="docs-layout-card">
            <p>
              The main pane holds the primary content; the supporting pane adds related material.
            </p>
            {navigator.isExpanded('supporting') ? null : (
              <Button
                variant="tonal"
                data-testid="react-supporting-open"
                onPress={() => {
                  navigator.navigateTo('supporting');
                }}
              >
                Show related
              </Button>
            )}
          </div>
        </div>
      }
      supportingPane={
        <div className="docs-layout-list">
          <div className="docs-layout-bar">
            {navigator.isExpanded('main') ? null : (
              <IconButton
                aria-label="Back to the React article"
                onPress={() => {
                  navigator.navigateBack();
                }}
              >
                <Icon name="arrow_back" />
              </IconButton>
            )}
            <h3>Related</h3>
          </div>
          {RELATED.map((subject) => (
            <p key={subject} className="docs-layout-item">
              {subject}
            </p>
          ))}
        </div>
      }
    />
  );
}
