// Every package's CHANGELOG.md (changesets), merged: the packages share one version (fixed).
import { mergeChangelogs, parseChangelog, type Release } from './changelog';

const files = import.meta.glob<string>('../../../../packages/*/CHANGELOG.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const RELEASES: Release[] = mergeChangelogs(
  Object.entries(files).map(([path, markdown]) =>
    parseChangelog(markdown, /packages\/([^/]+)\/CHANGELOG\.md$/.exec(path)?.[1] ?? path),
  ),
);
if (RELEASES.length === 0) throw new Error('changelog: no package CHANGELOG.md found');

/** Anchor and URL segment of a version: `1.8.0` → `v1-8-0`. */
export const releaseId = (version: string) => `v${version.replace(/\./g, '-')}`;
