import { Card, CardAction, type CardVariant } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const VARIANTS: CardVariant[] = ['filled', 'elevated', 'outlined'];

/** React cards with a primary action (React Aria; ripple from the press point on the card). */
export default function CardPlayground() {
  const [opened, setOpened] = useState<string>('none');
  return (
    <div>
      <ul className="docs-cards" data-testid="react-cards">
        {VARIANTS.map((variant) => (
          <Card key={variant} as="li" variant={variant}>
            <div className="docs-card-body">
              <h3 className="docs-card-title">
                <CardAction
                  onPress={() => {
                    setOpened(variant);
                  }}
                >
                  {variant} card
                </CardAction>
              </h3>
              <p>Press anywhere on the card.</p>
            </div>
          </Card>
        ))}
      </ul>
      <p aria-live="polite">Opened: {opened}</p>
    </div>
  );
}
