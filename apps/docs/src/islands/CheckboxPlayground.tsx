import { Checkbox } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/** React checkboxes: Compose's tri-state sample, plus disabled / error switches for a fourth one. */
export default function CheckboxPlayground() {
  const [daily, setDaily] = useState(true);
  const [weekly, setWeekly] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [terms, setTerms] = useState(false);
  const all = daily && weekly;
  const some = daily !== weekly;
  return (
    <>
      <div className="docs-checkbox-tree" data-testid="react-tree">
        <Checkbox
          isSelected={all}
          isIndeterminate={some}
          onChange={() => {
            setDaily(!all);
            setWeekly(!all);
          }}
        >
          Receive emails
        </Checkbox>
        <div className="docs-checkbox-children">
          <Checkbox isSelected={daily} onChange={setDaily}>
            Daily
          </Checkbox>
          <Checkbox isSelected={weekly} onChange={setWeekly}>
            Weekly
          </Checkbox>
        </div>
      </div>
      <div className="docs-checkbox-row" data-testid="react-row">
        <Checkbox isSelected={disabled} onChange={setDisabled}>
          Disable
        </Checkbox>
        <Checkbox isSelected={invalid} onChange={setInvalid}>
          Show error
        </Checkbox>
        <Checkbox
          isSelected={terms}
          onChange={setTerms}
          isDisabled={disabled}
          isInvalid={invalid}
          isRequired
          name="terms"
        >
          I accept the terms
        </Checkbox>
      </div>
    </>
  );
}
