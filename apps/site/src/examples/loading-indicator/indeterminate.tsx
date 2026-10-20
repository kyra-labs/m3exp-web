import { LoadingIndicator } from '@kyralabs/m3exp-web/react';

export default function Indeterminate() {
  return (
    <>
      <LoadingIndicator aria-label="Loading" />
      <LoadingIndicator contained aria-label="Loading" />
    </>
  );
}
