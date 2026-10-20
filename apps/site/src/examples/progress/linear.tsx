import { LinearProgress } from '@kyralabs/m3exp-web/react';

export default function Linear() {
  return (
    <>
      <LinearProgress value={0.4} aria-label="Loading news article" />
      <LinearProgress aria-label="Loading my episodes" />
      <LinearProgress shape="wavy" value={0.6} aria-label="Downloading" />
      <LinearProgress shape="wavy" aria-label="Syncing" />
    </>
  );
}
