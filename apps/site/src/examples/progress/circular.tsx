import { CircularProgress } from '@kyralabs/m3exp-web/react';

export default function Circular() {
  return (
    <>
      <CircularProgress value={0.4} aria-label="Uploading" />
      <CircularProgress aria-label="Loading" />
      <CircularProgress shape="wavy" value={0.7} aria-label="Downloading" />
      <CircularProgress shape="wavy" thickness="thick" aria-label="Syncing" />
    </>
  );
}
