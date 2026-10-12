// Layout literals Compose's single-row TopAppBar renders that are not in AppBar*Tokens: private
// constants at the end of AppBar.kt. TopAppBarHorizontalPadding pads the navigation icon (start),
// the title (both sides) and the actions (end); TopAppBarTitleInset is the minimum title start
// space when there is no navigation icon (16.dp - TopAppBarHorizontalPadding).

import type { ExtractedDefault } from './button-defaults.js';

const FILE = 'AppBar.kt';

export function extractAppBarDefaults(
  sources: Readonly<Record<string, string>>,
): ExtractedDefault[] {
  const text = sources[FILE]?.replace(/\r\n/g, '\n');
  if (text === undefined) throw new Error(`${FILE} is not vendored`);
  const find = (member: string, pattern: RegExp) => {
    const match = pattern.exec(text);
    if (!match) throw new Error(`${FILE}: ${member} not found (pattern changed upstream?)`);
    return { match, line: text.slice(0, match.index).split('\n').length };
  };
  const padding = find(
    'TopAppBarHorizontalPadding',
    /private val TopAppBarHorizontalPadding\s+get\(\) = (\d+)\.dp/,
  );
  const inset = find(
    'TopAppBarTitleInset',
    /private val TopAppBarTitleInset = (\d+)\.dp - TopAppBarHorizontalPadding/,
  );
  const paddingDp = Number(padding.match[1]);
  return [
    {
      name: '--m3e-comp-top-app-bar-horizontal-padding',
      dp: paddingDp,
      owner: FILE,
      member: 'TopAppBarHorizontalPadding',
      file: FILE,
      line: padding.line,
    },
    {
      name: '--m3e-comp-top-app-bar-title-inset',
      dp: Number(inset.match[1]) - paddingDp,
      owner: FILE,
      member: 'TopAppBarTitleInset',
      file: FILE,
      line: inset.line,
      note: `${inset.match[1]!}.dp - TopAppBarHorizontalPadding`,
    },
  ];
}
