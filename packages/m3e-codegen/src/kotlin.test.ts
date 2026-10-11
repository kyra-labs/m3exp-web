import { describe, expect, it } from 'vitest';
import { parseExpr, parseTokenFile } from './kotlin.js';

describe('parseExpr', () => {
  it.each([
    ['40.0.dp', { kind: 'dp', value: 40 }],
    ['-0.25.sp', { kind: 'sp', value: -0.25 }],
    ['16.sp', { kind: 'sp', value: 16 }],
    ['0.38f', { kind: 'number', value: 0.38 }],
    ['700.0', { kind: 'number', value: 700 }],
    [
      'ColorSchemeKeyTokens.OnPrimary',
      { kind: 'ref', object: 'ColorSchemeKeyTokens', member: 'OnPrimary' },
    ],
    ['ColorToken(25)', { kind: 'key', type: 'ColorToken', id: 25 }],
    ['Color(red = 255, green = 0, blue = 10)', { kind: 'rgb', red: 255, green: 0, blue: 10 }],
    [
      'RoundedCornerShape(2.0.dp)',
      { kind: 'corners', topStart: 2, topEnd: 2, bottomEnd: 2, bottomStart: 2 },
    ],
    [
      'RoundedCornerShape( topStart = 28.0.dp, topEnd = 28.0.dp, bottomEnd = 0.0.dp, bottomStart = 0.0.dp)',
      { kind: 'corners', topStart: 28, topEnd: 28, bottomEnd: 0, bottomStart: 0 },
    ],
    ['CircleShape', { kind: 'circle' }],
    ['RectangleShape', { kind: 'rectangle' }],
    ['CornerSize(4.0.dp)', { kind: 'cornerSize', value: 4 }],
    ['CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)', { kind: 'cubicBezier', points: [0.2, 0, 0, 1] }],
    ['FontFamily.SansSerif', { kind: 'fontFamily', name: 'SansSerif' }],
    ['FontWeight.Medium', { kind: 'fontWeight', name: 'Medium' }],
  ])('%s', (raw, expected) => {
    expect(parseExpr(raw)).toEqual(expected);
  });

  it('parses TextStyle copies into field references', () => {
    expect(
      parseExpr(
        'DefaultTextStyle.copy( fontFamily = fontFamily ?: TypeScaleTokens.BodyLargeFont, fontSize = TypeScaleTokens.BodyLargeSize)',
      ),
    ).toEqual({
      kind: 'textStyle',
      fields: {
        fontFamily: { kind: 'ref', object: 'TypeScaleTokens', member: 'BodyLargeFont' },
        fontSize: { kind: 'ref', object: 'TypeScaleTokens', member: 'BodyLargeSize' },
      },
    });
  });

  it('marks anything else opaque', () => {
    expect(parseExpr('SomethingNew(1)')).toEqual({ kind: 'opaque', text: 'SomethingNew(1)' });
  });
});

const FIXTURE = `/*
 * Copyright 2026 The Android Open Source Project
 */
// VERSION: v0_1
// GENERATED CODE - DO NOT MODIFY BY HAND
package androidx.compose.material3.tokens

internal object ExampleTokens {
    inline val ContainerColor: ColorToken
        get() = ColorSchemeKeyTokens.Primary
    const val DisabledOpacity = 0.38f
    // TODO update with the generated tokens once available
    val ContainerShape =
        RoundedCornerShape(
            topStart = 4.0.dp,
            topEnd = 4.0.dp,
            bottomEnd = 0.0.dp,
            bottomStart = 0.0.dp,
        )
    inline val Height: androidx.compose.ui.unit.Dp
        get() = 40.0.dp // inline note
    val Tint = ContainerColor
    // TODO: Update this file to include the following missing tokens:
    // val Missing = 1.0.dp
}
`;

describe('parseTokenFile', () => {
  const file = parseTokenFile(FIXTURE);

  it('reads the object name and generator version', () => {
    expect(file.object).toBe('ExampleTokens');
    expect(file.version).toBe('v0_1');
  });

  it('parses every member form with source line numbers', () => {
    expect(file.members.map((m) => [m.name, m.line, m.expr.kind])).toEqual([
      ['ContainerColor', 9, 'ref'],
      ['DisabledOpacity', 11, 'number'],
      ['ContainerShape', 13, 'corners'],
      ['Height', 20, 'dp'],
      ['Tint', 22, 'ref'],
    ]);
  });

  it('attaches whole-line comments to the following member and inline ones to their own', () => {
    const byName = Object.fromEntries(file.members.map((m) => [m.name, m.comment]));
    expect(byName['DisabledOpacity']).toBeUndefined();
    expect(byName['ContainerShape']).toBe('TODO update with the generated tokens once available');
    expect(byName['Height']).toBe('inline note');
  });

  it('resolves bare member names to the same object', () => {
    expect(file.members.at(-1)?.expr).toEqual({
      kind: 'ref',
      object: 'ExampleTokens',
      member: 'ContainerColor',
    });
  });

  it('keeps comments after the last member as file notes', () => {
    expect(file.notes).toEqual([
      'TODO: Update this file to include the following missing tokens:',
      'val Missing = 1.0.dp',
    ]);
  });

  it('rejects unknown expressions instead of dropping them', () => {
    expect(() =>
      parseTokenFile('internal object XTokens {\n    val Foo = Mystery(1)\n}\n'),
    ).toThrow('XTokens.Foo: unrecognized expression "Mystery(1)"');
  });
});
