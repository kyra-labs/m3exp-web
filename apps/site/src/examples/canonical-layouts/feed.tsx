import { Card, FeedLayout } from '@kyralabs/m3exp-web/react';

const POSTS = ['Mountains', 'Forest', 'Beach', 'Sailing', 'Hiking', 'Kayaking'];

/** One column below 600px of its own width, then as many as fit. */
export default function Feed() {
  return (
    <div style={{ inlineSize: '100%' }}>
      <FeedLayout>
        {POSTS.map((post) => (
          <Card
            key={post}
            variant="filled"
            as="article"
            style={{ padding: 'var(--m3e-sys-space-200)' }}
          >
            <h4>{post}</h4>
            <p>A post in the feed.</p>
          </Card>
        ))}
      </FeedLayout>
    </div>
  );
}
