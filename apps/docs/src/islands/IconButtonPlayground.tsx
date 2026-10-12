import { Icon, IconButton, type IconButtonVariant } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const VARIANTS: IconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];

/** React icon buttons and icon toggle buttons (React Aria, spring shape morph). */
export default function IconButtonPlayground() {
  const [presses, setPresses] = useState(0);
  return (
    <div>
      <div className="docs-button-row" data-testid="react-icon-buttons">
        {VARIANTS.map((variant) => (
          <IconButton
            key={variant}
            variant={variant}
            size="m"
            aria-label={`Add (${variant})`}
            onPress={() => {
              setPresses((n) => n + 1);
            }}
          >
            <Icon name="add" />
          </IconButton>
        ))}
      </div>
      <p aria-live="polite">Pressed {presses} times.</p>
      <div className="docs-button-row" data-testid="react-icon-toggles">
        {VARIANTS.map((variant) => (
          <IconButton
            key={variant}
            variant={variant}
            size="m"
            defaultSelected={false}
            aria-label={`Favorite (${variant})`}
          >
            <Icon name="favorite" />
          </IconButton>
        ))}
      </div>
    </div>
  );
}
