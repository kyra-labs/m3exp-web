import { describe, expect, it } from 'vitest';
import { createTheme } from '../theme/create-theme.js';
import { USAGE, parseThemeArgs } from './theme-args.js';

describe('m3e-theme arguments', () => {
  it('maps the core color flags to createTheme coreColors', () => {
    const args = parseThemeArgs([
      '--seed',
      '#d84848',
      '--variant',
      'fidelity',
      '--secondary',
      '#3d5afe',
      '--tertiary',
      '#386a20',
      '--neutral',
      '#808080',
      '--neutral-variant',
      '#7a7f86',
      '--error',
      '#ffb300',
      '--out',
      'theme.css',
    ]);
    expect(args).toEqual({
      help: false,
      out: 'theme.css',
      options: {
        seed: '#d84848',
        variant: 'fidelity',
        coreColors: {
          secondary: '#3d5afe',
          tertiary: '#386a20',
          neutral: '#808080',
          neutralVariant: '#7a7f86',
          error: '#ffb300',
        },
      },
    });
  });

  it('leaves coreColors out when no core color flag is given', () => {
    const args = parseThemeArgs(['--seed', '#6750A4', '--contrast', 'medium', '--spec', '2021']);
    expect(args).toEqual({
      help: false,
      out: undefined,
      options: { seed: '#6750A4', contrast: 'medium', specVersion: '2021' },
    });
  });

  it('emits the same CSS as createTheme', () => {
    const args = parseThemeArgs(['--seed', '#d84848', '--neutral', '#808080']);
    if (args.help) throw new Error('unexpected help');
    expect(createTheme(args.options).cssText).toBe(
      createTheme({ seed: '#d84848', coreColors: { neutral: '#808080' } }).cssText,
    );
  });

  it('documents every core color flag', () => {
    for (const flag of ['--secondary', '--tertiary', '--neutral', '--neutral-variant', '--error']) {
      expect(USAGE).toContain(`${flag} `);
    }
  });

  it('asks for help without a seed', () => {
    expect(parseThemeArgs([])).toEqual({ help: true, exitCode: 2 });
    expect(parseThemeArgs(['-h'])).toEqual({ help: true, exitCode: 0 });
  });

  it('passes invalid hex through to createTheme, which rejects it', () => {
    const args = parseThemeArgs(['--seed', '#d84848', '--neutral-variant', 'grey']);
    if (args.help) throw new Error('unexpected help');
    expect(() => createTheme(args.options)).toThrow(
      'core color neutralVariant must be #rgb or #rrggbb',
    );
  });
});
