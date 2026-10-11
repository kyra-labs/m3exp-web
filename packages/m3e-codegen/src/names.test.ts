import { describe, expect, it } from 'vitest';
import { compVar, componentName, reorderStates, words } from './names.js';

describe('words', () => {
  it.each([
    ['XSmallIconButton', ['X', 'Small', 'Icon', 'Button']],
    ['Level1', ['Level1']],
    ['DurationShort4', ['Duration', 'Short4']],
    ['SelectedFocusedIconColor', ['Selected', 'Focused', 'Icon', 'Color']],
  ])('%s', (name, expected) => {
    expect(words(name)).toEqual(expected);
  });
});

describe('component variable names (CLAUDE.md: <part>-<property>[-<state>])', () => {
  it.each([
    [
      'FilledButtonTokens',
      'SelectedFocusedIconColor',
      '--m3e-comp-filled-button-icon-color-selected-focused',
    ],
    [
      'FilledButtonTokens',
      'DisabledContainerOpacity',
      '--m3e-comp-filled-button-container-opacity-disabled',
    ],
    [
      'FilledButtonTokens',
      'LabelTextSelectedColor',
      '--m3e-comp-filled-button-label-text-color-selected',
    ],
    ['ChipsTokens', 'HoverStateLayerOpacity', '--m3e-comp-chips-state-layer-opacity-hover'],
    [
      'NavigationBarTokens',
      'ActiveIndicatorHeight',
      '--m3e-comp-navigation-bar-active-indicator-height',
    ],
    [
      'NavigationBarTokens',
      'ActiveFocusIconColor',
      '--m3e-comp-navigation-bar-active-icon-color-focus',
    ],
    ['CheckboxTokens', 'FocusIndicatorColor', '--m3e-comp-checkbox-focus-indicator-color'],
    ['ChipsTokens', 'FocusedIndicatorColor', '--m3e-comp-chips-focused-indicator-color'],
    ['ButtonXSmallTokens', 'ContainerHeight', '--m3e-comp-button-x-small-container-height'],
  ])('%s.%s', (object, member, expected) => {
    expect(compVar(object, member)).toBe(expected);
  });

  it('places sub-property words before states', () => {
    expect(compVar('FilterChipTokens', 'SelectedLabelText', ['Line', 'Height'])).toBe(
      '--m3e-comp-filter-chip-label-text-line-height-selected',
    );
  });

  it('can keep upstream order', () => {
    expect(compVar('StandardMenuTokens', 'DisabledButtonIconIconColor', [], false)).toBe(
      '--m3e-comp-standard-menu-disabled-button-icon-icon-color',
    );
  });

  it('keeps the relative order of multiple states', () => {
    expect(reorderStates(['Selected', 'Error', 'Hover', 'Icon', 'Color'])).toEqual([
      'Icon',
      'Color',
      'Selected',
      'Error',
      'Hover',
    ]);
  });

  it('derives component names from token objects', () => {
    expect(componentName('SplitButtonXLargeTokens')).toBe('split-button-x-large');
  });
});
