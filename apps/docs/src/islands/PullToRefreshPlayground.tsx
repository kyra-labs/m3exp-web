import {
  Icon,
  IconButton,
  PullToRefresh,
  type PullToRefreshIndicator,
} from '@kyralabs/m3exp-web/react';
import { useEffect, useRef, useState } from 'react';

/** React pull to refresh: PullToRefreshSample with an indicator switch. */
export default function PullToRefreshPlayground() {
  const [indicator, setIndicator] = useState<PullToRefreshIndicator>('default');
  const [count, setCount] = useState(15);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef(0);
  // The samples wait 5 s (`?delay=` in ms for tests).
  const delay = Number(new URLSearchParams(window.location.search).get('delay')) || 5000;
  const onRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    timer.current = window.setTimeout(() => {
      setCount((c) => c + 5);
      setRefreshing(false);
    }, delay);
  };
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );
  return (
    <div data-testid="react-ptr">
      <div className="docs-button-row">
        <label>
          Indicator{' '}
          <select
            value={indicator}
            onChange={(e) => {
              setIndicator(e.target.value as PullToRefreshIndicator);
            }}
            data-testid="react-indicator"
          >
            <option value="default">default</option>
            <option value="loading-indicator">loading-indicator</option>
          </select>
        </label>
      </div>
      <div className="docs-ptr-frame">
        <header className="m3e-top-app-bar">
          <div className="m3e-top-app-bar__headline">
            <p className="m3e-top-app-bar__title">Title</p>
          </div>
          <div className="m3e-top-app-bar__actions">
            <IconButton
              aria-label="Trigger Refresh"
              onPress={onRefresh}
              data-testid="refresh-react"
            >
              <Icon name="refresh" />
            </IconButton>
          </div>
        </header>
        <PullToRefresh
          isRefreshing={refreshing}
          onRefresh={onRefresh}
          indicator={indicator}
          data-testid="react-root"
        >
          <ul className="m3e-list" aria-label="Items">
            {Array.from({ length: count }, (_, i) => (
              <li key={count - i} className="m3e-list-item">
                <span className="m3e-list-item__content">
                  <span className="m3e-list-item__headline">Item {count - i}</span>
                </span>
              </li>
            ))}
          </ul>
        </PullToRefresh>
      </div>
    </div>
  );
}
