// Values Compose's FloatingActionButton.kt renders that are not (or not yet) in the Fab*Tokens /
// ExtendedFab*Tokens files: FloatingActionButtonDefaults literals and shapes (several carry
// upstream "TODO … is incorrect" / "update to use token" notes), the expressive extended FABs'
// private icon paddings and label type styles, and the motion-scheme springs their expand/collapse
// uses. Each is read with a targeted regex from the vendored file and cited by line.
import { kebabName } from './names.js';

export interface FabDefault {
  /** CSS variable emitted. */
  name: string;
  /** CSS value: px for dp literals, var() references otherwise. */
  value: string;
  /** JS value for components.ts (dp number or the var() string). */
  js: number | string;
  /** Source expression as written upstream. */
  raw: string;
  owner: string;
  member: string;
  file: string;
  line: number;
  note?: string;
}

const FILE = 'FloatingActionButton.kt';
const SHAPES_FILE = 'Shapes.kt';
const PREFIX = '--m3e-comp-fab-defaults';

type Kind = 'dp' | 'shape' | 'typography' | 'motion';

interface Rule {
  kind: Kind;
  /** Variable name without the `--m3e-comp-fab-defaults-` prefix. */
  name: string;
  owner: string;
  member: string;
  /** First capture group: dp literal, ShapeDefaults / TypographyKeyTokens / MotionSchemeKeyTokens member. */
  pattern: RegExp;
  note?: string;
}

const RULES: readonly Rule[] = [
  {
    kind: 'dp',
    name: 'large-icon-size',
    owner: 'FloatingActionButtonDefaults',
    member: 'LargeIconSize',
    pattern: /public val LargeIconSize: Dp = (\d+)\.dp/d,
    note: 'upstream TODO: FabLargeTokens.IconSize (32dp) is incorrect; the samples size large (extended) FAB icons with it',
  },
  {
    kind: 'shape',
    name: 'medium-shape',
    owner: 'FloatingActionButtonDefaults',
    member: 'mediumShape',
    pattern: /public val mediumShape: Shape\n\s*@Composable get\(\) = ShapeDefaults\.(\w+)/d,
    note: 'FabMediumTokens.ContainerShape is commented out upstream (CornerLargeIncreased pending)',
  },
  {
    kind: 'shape',
    name: 'medium-extended-shape',
    owner: 'FloatingActionButtonDefaults',
    member: 'mediumExtendedFabShape',
    pattern:
      /public val mediumExtendedFabShape: Shape\n\s*@Composable get\(\) = ShapeDefaults\.(\w+)/d,
    note: 'ExtendedFabMediumTokens.ContainerShape is commented out upstream (CornerLargeIncreased pending)',
  },
  {
    kind: 'dp',
    name: 'medium-extended-icon-padding',
    owner: FILE,
    member: 'MediumExtendedFabIconPadding',
    pattern: /private val MediumExtendedFabIconPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'upstream TODO: ExtendedFabMediumTokens.IconLabelSpace (16dp) is incorrect',
  },
  {
    kind: 'dp',
    name: 'large-extended-icon-padding',
    owner: FILE,
    member: 'LargeExtendedFabIconPadding',
    pattern: /private val LargeExtendedFabIconPadding\n\s*get\(\) = (\d+)\.dp/d,
    note: 'upstream TODO: ExtendedFabLargeTokens.IconLabelSpace (20dp) is incorrect',
  },
  {
    kind: 'typography',
    name: 'small-extended-label',
    owner: FILE,
    member: 'SmallExtendedFabTextStyle',
    pattern: /private val SmallExtendedFabTextStyle = TypographyKeyTokens\.(\w+)/d,
  },
  {
    kind: 'typography',
    name: 'medium-extended-label',
    owner: FILE,
    member: 'MediumExtendedFabTextStyle',
    pattern: /private val MediumExtendedFabTextStyle = TypographyKeyTokens\.(\w+)/d,
  },
  {
    kind: 'typography',
    name: 'large-extended-label',
    owner: FILE,
    member: 'LargeExtendedFabTextStyle',
    pattern: /private val LargeExtendedFabTextStyle = TypographyKeyTokens\.(\w+)/d,
  },
  {
    kind: 'motion',
    name: 'extended-width',
    owner: 'ExtendedFloatingActionButton (small/medium/large)',
    member: 'sizeAnimationSpec',
    pattern: /val sizeAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
    note: 'expanded width lerps between the container height and the full row width',
  },
  {
    kind: 'motion',
    name: 'extended-label-opacity',
    owner: 'ExtendedFloatingActionButton (small/medium/large)',
    member: 'opacityAnimationSpec',
    pattern: /val opacityAnimationSpec = MotionSchemeKeyTokens\.(\w+)\.value<Float>\(\)/d,
  },
];

const TYPESCALE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

export const FAB_DEFAULTS_SOURCES = [FILE, SHAPES_FILE];

const normalize = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** ShapeDefaults.<member> → the ShapeTokens member it aliases (Shapes.kt). */
function shapeToken(shapes: string, member: string): string {
  const match = new RegExp(`public val ${member}: CornerBasedShape = ShapeTokens\\.(\\w+)\\n`).exec(
    shapes,
  );
  if (!match) throw new Error(`${SHAPES_FILE}: ShapeDefaults.${member} not found`);
  return match[1]!;
}

export function extractFabDefaults(sources: Readonly<Record<string, string>>): FabDefault[] {
  const text = normalize(sources[FILE], FILE);
  const shapes = normalize(sources[SHAPES_FILE], SHAPES_FILE);
  return RULES.flatMap((rule): FabDefault[] => {
    const match = rule.pattern.exec(text);
    const at = match?.indices?.[1]?.[0];
    if (!match || at === undefined)
      throw new Error(
        `${FILE}: ${rule.owner}.${rule.member} not found (pattern changed upstream?)`,
      );
    const line = text.slice(0, at).split('\n').length;
    const captured = match[1]!;
    const base = {
      owner: rule.owner,
      member: rule.member,
      file: FILE,
      line,
      ...(rule.note === undefined ? {} : { note: rule.note }),
    };
    const name = `${PREFIX}-${rule.name}`;
    switch (rule.kind) {
      case 'dp':
        return [
          { ...base, name, value: `${captured}px`, js: Number(captured), raw: `${captured}.dp` },
        ];
      case 'shape': {
        const token = shapeToken(shapes, captured);
        const value = `var(--m3e-sys-shape-${kebabName(token)})`;
        return [
          {
            ...base,
            name,
            value,
            js: value,
            raw: `ShapeDefaults.${captured} = ShapeTokens.${token}`,
          },
        ];
      }
      case 'typography':
        return TYPESCALE_FIELDS.map((field) => {
          const value = `var(--m3e-sys-typescale-${kebabName(captured)}-${field})`;
          return {
            ...base,
            name: `${name}-${field}`,
            value,
            js: value,
            raw: `TypographyKeyTokens.${captured}`,
          };
        });
      case 'motion':
        return (['duration', 'easing'] as const).map((field) => {
          const value = `var(--m3e-sys-motion-spring-${kebabName(captured)}-${field})`;
          return {
            ...base,
            name: `${name}-${field}`,
            value,
            js: value,
            raw: `MotionSchemeKeyTokens.${captured}`,
          };
        });
    }
  });
}
