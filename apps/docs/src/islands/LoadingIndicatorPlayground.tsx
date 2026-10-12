import { LoadingIndicator } from '@kyralabs/m3exp-web/react';
import { materialShape } from '@kyralabs/m3e-shapes';
import { useState } from 'react';

// A custom sequence (the `polygons` prop); stable across renders.
const HEARTS = [materialShape('Heart'), materialShape('Cookie4Sided')];

/** React loading indicators: indeterminate, determinate with a slider, custom shapes. */
export default function LoadingIndicatorPlayground() {
  const [progress, setProgress] = useState(0.6);
  return (
    <div className="docs-loading-row" data-testid="react">
      <LoadingIndicator aria-label="Loading" />
      <LoadingIndicator contained aria-label="Loading" />
      <LoadingIndicator
        progress={progress}
        aria-label="Determinate"
        data-testid="react-determinate"
      />
      <div className="docs-controls">
        <label>
          Progress
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={progress}
            onChange={(e) => {
              setProgress(Number(e.target.value));
            }}
          />
        </label>
      </div>
      <LoadingIndicator contained polygons={HEARTS} aria-label="Custom shapes" />
    </div>
  );
}
