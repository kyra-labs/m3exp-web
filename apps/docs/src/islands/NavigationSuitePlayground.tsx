import {
  Button,
  Fab,
  Icon,
  NavigationSuiteScaffold,
  type NavigationSuiteDestination,
} from '@kyralabs/m3exp-web/react';
import type { NavigationSuiteType } from '@kyralabs/m3exp-web/elements';
import { useState } from 'react';

const ITEMS: NavigationSuiteDestination[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search', badge: true },
  { key: 'mail', icon: 'mail', label: 'Mail', badge: 3 },
  { key: 'settings', icon: 'settings', label: 'Settings' },
];

const TYPES: (NavigationSuiteType | 'adaptive')[] = [
  'adaptive',
  'short-navigation-bar-compact',
  'short-navigation-bar-medium',
  'wide-navigation-rail-collapsed',
  'wide-navigation-rail-expanded',
  'navigation-drawer',
  'none',
];

/** React navigation suite: adaptive or a fixed type, drawer at large, hide / show, selection. */
export default function NavigationSuitePlayground() {
  const [type, setType] = useState<NavigationSuiteType | 'adaptive'>('adaptive');
  const [drawer, setDrawer] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [selected, setSelected] = useState('home');
  return (
    <>
      <div className="docs-suite-controls">
        <label>
          Type{' '}
          <select
            data-testid="react-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as NavigationSuiteType | 'adaptive');
            }}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            data-testid="react-drawer"
            checked={drawer}
            onChange={(e) => {
              setDrawer(e.target.checked);
            }}
          />{' '}
          Drawer at large widths
        </label>
        <Button
          variant="tonal"
          aria-pressed={hidden}
          data-testid="react-toggle"
          onPress={() => {
            setHidden((value) => !value);
          }}
        >
          Hide navigation
        </Button>
      </div>
      <div className="docs-suite-frame" data-testid="react-frame">
        <NavigationSuiteScaffold
          aria-label="React example"
          data-testid="react-suite"
          items={ITEMS}
          selectedKey={selected}
          onSelectionChange={setSelected}
          layoutType={type === 'adaptive' ? undefined : type}
          expandedType={drawer ? 'navigation-drawer' : 'wide-navigation-rail-expanded'}
          isNavigationHidden={hidden}
          primaryAction={
            <Fab aria-label="Compose" data-testid="react-fab" icon={<Icon name="edit" />} />
          }
        >
          <div className="docs-suite-content">
            <p>
              Selected: <output data-testid="react-selected">{selected}</output>
            </p>
          </div>
        </NavigationSuiteScaffold>
      </div>
    </>
  );
}
