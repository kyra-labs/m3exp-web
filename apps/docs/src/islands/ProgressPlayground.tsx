import { CircularProgress, LinearProgress } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/** React progress indicators: a slider drives determinate ones; indeterminate ones beside. */
export default function ProgressPlayground() {
  const [value, setValue] = useState(0.4);
  const [wavy, setWavy] = useState(true);
  const shape = wavy ? 'wavy' : 'flat';
  return (
    <div className="docs-progress-column" data-testid="react">
      <LinearProgress value={value} shape={shape} aria-label="React linear" />
      <LinearProgress shape={shape} aria-label="React linear indeterminate" />
      <div className="docs-progress-row">
        <CircularProgress value={value} shape={shape} aria-label="React circular" />
        <CircularProgress shape={shape} aria-label="React circular indeterminate" />
        <CircularProgress
          value={value}
          shape={shape}
          thickness="thick"
          aria-label="React circular thick"
        />
      </div>
      <div className="docs-controls">
        <label>
          Value
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={value}
            onChange={(e) => {
              setValue(Number(e.target.value));
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={wavy}
            onChange={(e) => {
              setWavy(e.target.checked);
            }}
          />
          Wavy
        </label>
      </div>
    </div>
  );
}
