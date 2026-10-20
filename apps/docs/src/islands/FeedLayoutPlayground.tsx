import { FeedLayout } from '@kyralabs/m3exp-web/react';

const FEED = ['Mountains', 'Coast', 'Forest', 'Desert', 'City', 'Lakes', 'Islands'];

/** <FeedLayout>: the CSS-only feed above, from React (the first item spans two columns). */
export default function FeedLayoutPlayground() {
  return (
    <FeedLayout data-testid="react-feed">
      {FEED.map((name, i) => (
        <article
          key={name}
          className={`m3e-card m3e-card--filled${i === 0 ? ' m3e-feed__item--wide' : ''}`}
        >
          <div className="docs-layout-card">
            <h3>{name}</h3>
            <p>Feed item {i + 1}</p>
          </div>
        </article>
      ))}
    </FeedLayout>
  );
}
