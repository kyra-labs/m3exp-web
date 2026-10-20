import {
  Icon,
  IconButton,
  type IconButtonSize,
  type IconButtonVariant,
  type IconButtonWidth,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const VARIANTS: IconButtonVariant[] = ['standard', 'filled', 'tonal', 'outlined'];
const SIZES: IconButtonSize[] = ['xs', 's', 'm', 'l', 'xl'];
const WIDTHS: IconButtonWidth[] = ['narrow', 'default', 'wide'];

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
      <div className="docs-button-row" data-testid="react-icon-button-sizes">
        {SIZES.map((size) => (
          <IconButton key={size} variant="filled" size={size} aria-label={`Edit (${size})`}>
            <Icon name="edit" />
          </IconButton>
        ))}
      </div>
      <div className="docs-button-row" data-testid="react-icon-button-widths">
        {WIDTHS.map((width) => (
          <IconButton
            key={width}
            variant="tonal"
            size="s"
            width={width}
            shape="square"
            aria-label={`Settings (${width}, square)`}
          >
            <Icon name="settings" />
          </IconButton>
        ))}
        <IconButton variant="outlined" size="s" isDisabled aria-label="Delete (disabled)">
          <Icon name="delete" />
        </IconButton>
      </div>
    </div>
  );
}
