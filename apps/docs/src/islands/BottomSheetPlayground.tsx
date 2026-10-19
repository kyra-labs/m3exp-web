import { BottomSheet, Button, ModalBottomSheet } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

type Value = 'hidden' | 'partially-expanded' | 'expanded';

const items = Array.from({ length: 12 }, (_, i) => (
  <li className="m3e-list-item" key={i}>
    <span className="m3e-list-item__leading">
      <span className="m3e-icon" aria-hidden="true">
        favorite
      </span>
    </span>
    <span className="m3e-list-item__content">
      <span className="m3e-list-item__headline">Item {i}</span>
    </span>
  </li>
));

/**
 * React bottom sheets: a controlled `<ModalBottomSheet>` (the ModalBottomSheetSample with its
 * skipPartiallyExpanded toggle) and a controlled standard `<BottomSheet>`; the values are shown.
 */
export default function BottomSheetPlayground() {
  const [open, setOpen] = useState(false);
  const [skip, setSkip] = useState(false);
  const [modalValue, setModalValue] = useState<Value>('hidden');
  const [value, setValue] = useState<Value>('partially-expanded');
  return (
    <div data-testid="react-sheets">
      <div className="docs-button-row">
        <label className="docs-sheet-option">
          <input
            type="checkbox"
            checked={skip}
            onChange={(e) => {
              setSkip(e.target.checked);
            }}
            data-testid="react-skip"
          />
          Skip partially expanded State
        </label>
        <Button
          onPress={() => {
            setModalValue(skip ? 'expanded' : 'partially-expanded');
            setOpen(true);
          }}
          data-testid="react-open-modal"
        >
          Show Bottom Sheet
        </Button>
      </div>
      <p>
        Modal: <output data-testid="react-modal-value">{open ? modalValue : 'hidden'}</output>
      </p>
      <ModalBottomSheet
        isOpen={open}
        onOpenChange={setOpen}
        onValueChange={setModalValue}
        skipPartiallyExpanded={skip}
        data-testid="react-modal"
      >
        <div className="docs-sheet-row">
          <Button
            onPress={() => {
              setOpen(false);
            }}
          >
            Hide Bottom Sheet
          </Button>
        </div>
        <ul className="m3e-list docs-sheet-list">{items}</ul>
      </ModalBottomSheet>

      <div className="docs-sheet-frame" data-testid="react-standard-frame">
        <div className="docs-sheet-frame__content">
          <p>
            Standard: <output data-testid="react-standard-value">{value}</output>
          </p>
          <Button
            variant="tonal"
            onPress={() => {
              setValue(value === 'expanded' ? 'partially-expanded' : 'expanded');
            }}
          >
            Toggle expanded
          </Button>
        </div>
        <BottomSheet
          value={value}
          onValueChange={setValue}
          aria-label="React standard sheet"
          data-testid="react-standard"
        >
          <ul className="m3e-list docs-sheet-list">{items}</ul>
        </BottomSheet>
      </div>
    </div>
  );
}
