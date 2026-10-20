import { useState } from 'react';
import { LoadingIndicator, Slider } from '@kyralabs/m3exp-web/react';

export default function Determinate() {
  const [progress, setProgress] = useState(0.4);
  return (
    <>
      <LoadingIndicator progress={progress} aria-label="Uploading" />
      <LoadingIndicator contained progress={progress} aria-label="Uploading" />
      <Slider
        aria-label="Progress"
        minValue={0}
        maxValue={1}
        value={progress}
        onChange={setProgress}
      />
    </>
  );
}
