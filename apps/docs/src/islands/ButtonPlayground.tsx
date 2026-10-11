import {
  Button,
  type ButtonShape,
  type ButtonSize,
  type ButtonVariant,
  Icon,
  ToggleButton,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

const VARIANTS: ButtonVariant[] = ['filled', 'tonal', 'elevated', 'outlined', 'text'];
const TOGGLE_VARIANTS = ['filled', 'tonal', 'elevated', 'outlined'] as const;
const SIZES: ButtonSize[] = ['xs', 's', 'm', 'l', 'xl'];

/** React buttons: interruptible press-morph and selection springs (React Aria + Motion). */
export default function ButtonPlayground() {
  const [size, setSize] = useState<ButtonSize>('m');
  const [shape, setShape] = useState<ButtonShape>('round');
  const [presses, setPresses] = useState(0);
  return (
    <div className="docs-button-playground">
      <form
        className="docs-controls"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label>
          Size
          <select
            value={size}
            onChange={(e) => {
              setSize(e.target.value as ButtonSize);
            }}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Shape
          <select
            value={shape}
            onChange={(e) => {
              setShape(e.target.value as ButtonShape);
            }}
          >
            <option value="round">round</option>
            <option value="square">square</option>
          </select>
        </label>
      </form>
      <div className="docs-button-row" data-testid="react-buttons">
        {VARIANTS.map((variant) => (
          <Button
            key={variant}
            variant={variant}
            size={size}
            shape={shape}
            icon={<Icon name="add" />}
            onPress={() => {
              setPresses((n) => n + 1);
            }}
          >
            {variant}
          </Button>
        ))}
      </div>
      <p aria-live="polite">Pressed {presses} times.</p>
      <div className="docs-button-row" data-testid="react-toggles">
        {TOGGLE_VARIANTS.map((variant) => (
          <ToggleButton
            key={variant}
            variant={variant}
            size={size}
            shape={shape}
            icon={<Icon name="star" />}
          >
            {variant}
          </ToggleButton>
        ))}
      </div>
    </div>
  );
}
