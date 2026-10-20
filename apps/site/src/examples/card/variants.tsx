import { Card } from '@kyralabs/m3exp-web/react';

const VARIANTS = [
  ['elevated', 'Elevated'],
  ['filled', 'Filled'],
  ['outlined', 'Outlined'],
] as const;

export default function Variants() {
  return (
    <>
      {VARIANTS.map(([variant, title]) => (
        <Card
          key={variant}
          variant={variant}
          as="article"
          style={{ padding: 'var(--m3e-sys-space-200)' }}
        >
          <h4>{title}</h4>
          <p>Content and actions about one subject.</p>
        </Card>
      ))}
    </>
  );
}
