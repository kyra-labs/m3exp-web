// Reports bundled font sizes (REQUIREMENTS §8: fonts are budgeted separately, reported, not failed).
import { appendFileSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync(new URL('../packages/m3e-tokens/fonts/manifest.json', import.meta.url), 'utf8'),
);
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const lines = [
  `### ${manifest.family} ${manifest.version}`,
  '',
  '| Profile | Chunk | Code points | Size |',
  '|---|---|---|---|',
];
for (const [profile, chunks] of Object.entries(manifest.chunks)) {
  const sorted = Object.entries(chunks).sort(([, a], [, b]) => b.bytes - a.bytes);
  for (const [subset, chunk] of sorted) {
    lines.push(`| ${profile} | ${subset} | ${String(chunk.codepoints)} | ${kb(chunk.bytes)} |`);
  }
  const total = sorted.reduce((n, [, c]) => n + c.bytes, 0);
  lines.push(`| ${profile} | **all chunks** | | **${kb(total)}** |`);
}
const report = `${lines.join('\n')}\n`;
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
