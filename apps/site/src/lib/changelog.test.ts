import { describe, expect, it } from 'vitest';
import { mergeChangelogs, parseChangelog } from './changelog';

const CSS = `# @kyralabs/m3e-css

## 1.1.0

### Minor Changes

- abc1234: Menus: \`menu.css\`
  with groups.
  - \`--vibrant\`
  - \`--baseline\`

### Patch Changes

- def5678: A fix.
- Updated dependencies [abc1234]
  - @kyralabs/m3e-tokens@1.1.0

## 1.0.0

### Major Changes

- 0000001: publish initial version
`;

const REACT = `# @kyralabs/m3e-react

## 1.1.0

### Minor Changes

- abc1234: Menus: \`menu.css\`
  with groups.
  - \`--vibrant\`
  - \`--baseline\`

## 1.0.0

### Major Changes

- 0000001: publish initial version
`;

describe('parseChangelog', () => {
  it('reads versions, kinds and multi-line entries, without dependency updates', () => {
    const releases = parseChangelog(CSS, 'm3e-css');
    expect(releases.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
    expect(releases[0]?.changes).toEqual([
      {
        hash: 'abc1234',
        kind: 'Minor',
        text: 'Menus: `menu.css`\nwith groups.\n- `--vibrant`\n- `--baseline`',
        packages: ['m3e-css'],
      },
      { hash: 'def5678', kind: 'Patch', text: 'A fix.', packages: ['m3e-css'] },
    ]);
  });
});

describe('mergeChangelogs', () => {
  it('lists each change once with every package that has it', () => {
    const merged = mergeChangelogs([
      parseChangelog(REACT, 'm3e-react'),
      parseChangelog(CSS, 'm3e-css'),
    ]);
    expect(merged.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);
    expect(merged[0]?.changes.map((c) => [c.hash, c.packages])).toEqual([
      ['abc1234', ['m3e-css', 'm3e-react']],
      ['def5678', ['m3e-css']],
    ]);
    expect(merged[1]?.changes[0]?.kind).toBe('Major');
  });
});
