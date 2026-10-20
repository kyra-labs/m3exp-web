// The package CHANGELOGs (changesets, one fixed version for every @kyralabs package) merged into
// one release list: each change once, with the packages that list it. "Updated dependencies"
// entries are left out: every package has them at every version.

export type ChangeKind = 'Major' | 'Minor' | 'Patch';

export interface Change {
  /** The changeset's commit, e.g. `324ebea`. */
  hash: string;
  kind: ChangeKind;
  /** Markdown: a paragraph, sometimes followed by a list. */
  text: string;
  packages: string[];
}

export interface Release {
  version: string;
  changes: Change[];
}

const KINDS: ChangeKind[] = ['Major', 'Minor', 'Patch'];

/** One CHANGELOG.md as releases, newest first, in file order. */
export function parseChangelog(markdown: string, pkg: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  let kind: ChangeKind = 'Patch';
  let change: Change | undefined;
  let skipping = false;
  for (const line of markdown.split('\n')) {
    const version = /^## (\S+)/.exec(line);
    const section = /^### (Major|Minor|Patch) Changes/.exec(line);
    const entry = /^- (?:([0-9a-f]{7,40}): )?(.*)$/.exec(line);
    if (version) {
      release = { version: version[1] ?? '', changes: [] };
      releases.push(release);
      change = undefined;
    } else if (section) {
      kind = section[1] as ChangeKind;
      change = undefined;
    } else if (entry && release) {
      skipping = (entry[2] ?? '').startsWith('Updated dependencies');
      change = skipping
        ? undefined
        : { hash: entry[1] ?? '', kind, text: entry[2] ?? '', packages: [pkg] };
      if (change) release.changes.push(change);
    } else if (change && !skipping && (line.startsWith('  ') || line === '')) {
      change.text += `\n${line.slice(2)}`;
    }
  }
  for (const r of releases) for (const c of r.changes) c.text = c.text.trim();
  return releases;
}

/** Releases of several packages merged by version (newest first) and change (by commit). */
export function mergeChangelogs(changelogs: Release[][]): Release[] {
  const byVersion = new Map<string, Release>();
  for (const releases of changelogs) {
    for (const release of releases) {
      const merged = byVersion.get(release.version) ?? { version: release.version, changes: [] };
      byVersion.set(release.version, merged);
      for (const change of release.changes) {
        const same = merged.changes.find((c) =>
          change.hash ? c.hash === change.hash : c.text === change.text,
        );
        if (same) same.packages.push(...change.packages.filter((p) => !same.packages.includes(p)));
        else merged.changes.push({ ...change, packages: [...change.packages] });
      }
    }
  }
  const releases = [...byVersion.values()];
  for (const r of releases) {
    r.changes.sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind));
    for (const c of r.changes) c.packages.sort();
  }
  return releases.sort((a, b) => compareVersions(b.version, a.version));
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).map(Number);
  const pb = b.split(/[.-]/).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
