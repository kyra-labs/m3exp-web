// The favicon: Material's 9-sided cookie (m3e-shapes MaterialShapes) in the baseline primary
// color, light and dark (tokens, not literals: CLAUDE.md).
import { baselineColors } from '@kyralabs/m3e-tokens';
import { materialShape, polygonToPath, toSvgPathData } from '@kyralabs/m3e-shapes';

export function GET(): Response {
  const path = toSvgPathData(polygonToPath(materialShape('Cookie9Sided')));
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">',
    `<style>path{fill:${baselineColors.light.primary}}`,
    `@media (prefers-color-scheme:dark){path{fill:${baselineColors.dark.primary}}}</style>`,
    `<path d="${path}"/>`,
    '</svg>',
  ].join('');
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
