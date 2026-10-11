import { describe, expect, it } from 'vitest';
import { findRepoRoot, parsePin, readPin } from './pin.js';

describe('SOURCE_PIN parsing', () => {
  it('reads key=value lines, skipping comments and blanks', () => {
    expect(
      parsePin('# comment\n\nandroidx_commit=abc\r\ngraphics_shapes_sources_sha256=f00\n'),
    ).toEqual({
      androidx_commit: 'abc',
      graphics_shapes_sources_sha256: 'f00',
    });
  });

  it('pins graphics-shapes to the version Material3 depends on, by sources jar hash', () => {
    const pin = readPin(findRepoRoot(process.cwd()));
    expect(pin['graphics_shapes']).toBe('1.0.1');
    expect(pin['graphics_shapes_sources_sha256']).toMatch(/^[0-9a-f]{64}$/);
  });
});
