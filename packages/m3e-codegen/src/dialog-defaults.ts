// Values the dialogs render that are not DialogTokens / ScrimTokens, or that pick one of them:
// - AlertDialog.kt (Compose's AlertDialog / BasicAlertDialog): DialogMinWidth / DialogMaxWidth
//   (280 / 560dp), the 24dp container padding and the 24dp below the text (the touch branch of
//   shouldUsePrecisionPointerComponentSizing, an opt-in flag), IconPadding / TitlePadding (16dp
//   below each), the buttons' FlowRow spacing (8dp on both axes, the cross axis less the buttons'
//   minimum interactive size padding: ButtonDefaults.MinHeight from Button.kt), and
//   AlertDialogDefaults.TonalElevation 0 with no shadow (owner decision M9 #8: DialogTokens'
//   ContainerElevation Level3 is not read);
// - ModalBottomSheet.kt: the scrim fades on DefaultEffects, the only Compose scrim fade for a
//   modal window (owner decision M9 #9; Compose dialogs show the platform's window dim);
// - Material Web (secondary source; owner decision M9 #9, SOURCES register): md-dialog's open /
//   close animations (dialog/internal/animations.js with the EASING table of
//   internal/motion/animation.js) and its window margin (dialog/internal/_dialog.scss), because
//   neither androidx nor m3.material.io specifies dialog motion; except the open easing, which is
//   androidx's emphasized easing (MotionTokens.EasingEmphasizedCubicBezier, the sys token) where
//   Material Web uses its EASING.EMPHASIZED approximation (D20 (6), amends M9 #9);
// - m3.material.io (owner decision M9 #11): the full-screen dialog, which Compose does not have,
//   from the token DB (md.comp.full-screen-dialog) and the Specs table.
// Each value is read with a targeted regex and cited by line; CHECKS throw when the wiring
// dialog.css and the m3e-elements dialog controller assume changes upstream.
import {
  type ComposeLiteral,
  type LiteralCheck,
  type LiteralRule,
  extractLiterals,
} from './compose-literals.js';

export type DialogDefault = ComposeLiteral;

const KT = 'AlertDialog.kt';
const BUTTON = 'Button.kt';
const SHEET = 'ModalBottomSheet.kt';
const SAMPLES = 'AlertDialogSamples.kt';
const ANDROID = 'AndroidAlertDialog.android.kt';

export const DIALOG_DEFAULTS_SOURCES = [KT, BUTTON, SHEET, SAMPLES, ANDROID];

/** Material Web files (vendor/material-web) by their vendored name. */
export const DIALOG_MATERIAL_WEB_SOURCES = ['animations.js', 'animation.js', '_dialog.scss'];

const P = '--m3e-comp-dialog';
/** The vendored `MotionTokens.kt` and its citation path (`<dir>/MotionTokens.kt@<commit>`). */
export interface MotionTokensSource {
  text: string | undefined;
  path: string;
}

/** Vendored Material Web file → its path in the package. */
const WEB_PATHS: Readonly<Record<string, string>> = {
  'animations.js': 'dialog/internal/animations.js',
  'animation.js': 'internal/motion/animation.js',
  '_dialog.scss': 'dialog/internal/_dialog.scss',
};
const FS = '--m3e-comp-full-screen-dialog';

/** `internal|private val <member>\n    get() = <n>.dp`. */
const getter = (member: string) =>
  new RegExp(`(?:internal|private) val ${member}\\n\\s*get\\(\\) = (\\d+)\\.dp`, 'd');

/** The touch branch of `if (shouldUsePrecisionPointerComponentSizing.value) <a>.dp else <b>.dp`. */
const touch = (member: string) =>
  new RegExp(
    `private val ${member}\\n\\s*get\\(\\) = if \\(shouldUsePrecisionPointerComponentSizing\\.value\\) \\d+\\.dp else (\\d+)\\.dp`,
    'd',
  );

const RULES: readonly LiteralRule[] = [
  {
    kind: 'dp',
    name: `${P}-container-min-width`,
    owner: KT,
    member: 'DialogMinWidth',
    file: KT,
    pattern: getter('DialogMinWidth'),
    note: 'BasicAlertDialog: sizeIn(minWidth = DialogMinWidth, …) around the content (AlertDialog and custom content)',
  },
  {
    kind: 'dp',
    name: `${P}-container-max-width`,
    owner: KT,
    member: 'DialogMaxWidth',
    file: KT,
    pattern: getter('DialogMaxWidth'),
    note: 'BasicAlertDialog: sizeIn(…, maxWidth = DialogMaxWidth)',
  },
  {
    kind: 'dp',
    name: `${P}-container-padding`,
    owner: 'AlertDialogDefaults',
    member: 'dialogPaddingValue',
    file: KT,
    pattern: touch('dialogPaddingValue'),
    note: 'AlertDialogContent: Column padding on all sides (shouldUsePrecisionPointerComponentSizing is an opt-in flag: its touch branch)',
  },
  {
    kind: 'dp',
    name: `${P}-supporting-text-padding-bottom`,
    owner: 'AlertDialogDefaults',
    member: 'textPaddingValue',
    file: KT,
    pattern: touch('textPaddingValue'),
    note: 'AlertDialogContent: between the text and the buttons (touch branch)',
  },
  {
    kind: 'dp',
    name: `${P}-icon-padding-bottom`,
    owner: KT,
    member: 'IconPadding',
    file: KT,
    pattern: /private val IconPadding = PaddingValues\(bottom = (\d+)\.dp\)/d,
    note: 'AlertDialogContent: below the icon, which is centered',
  },
  {
    kind: 'dp',
    name: `${P}-headline-padding-bottom`,
    owner: KT,
    member: 'TitlePadding',
    file: KT,
    pattern: /private val TitlePadding = PaddingValues\(bottom = (\d+)\.dp\)/d,
    note: 'AlertDialogContent: below the title (start-aligned, or centered with an icon)',
  },
  {
    kind: 'dp',
    name: `${P}-actions-main-axis-spacing`,
    owner: KT,
    member: 'ButtonsMainAxisSpacing',
    file: KT,
    pattern: getter('ButtonsMainAxisSpacing'),
    note: 'AlertDialogFlowRow horizontalArrangement: between buttons in a row',
  },
  {
    kind: 'dp',
    name: `${P}-actions-cross-axis-spacing`,
    owner: KT,
    member: 'ButtonsCrossAxisSpacing',
    file: KT,
    pattern: getter('ButtonsCrossAxisSpacing'),
    note: 'AlertDialogFlowRow verticalArrangement: (this − (LocalMinimumInteractiveComponentSize − ButtonDefaults.MinHeight)).coerceIn(0, this) between stacked buttons, which keep their minimum interactive size around them',
  },
  {
    kind: 'token',
    name: `${P}-button-min-height`,
    owner: 'ButtonDefaults',
    member: 'MinHeight',
    file: BUTTON,
    pattern:
      /public val MinHeight: Dp\n\s*get\(\) =\n\s*if \(shouldUsePrecisionPointerComponentSizing\.value\) \{\n\s*\d+\.dp\n\s*\} else \{\n\s*(ButtonSmallTokens\.\w+)/d,
    note: 'AlertDialogImpl: subtracted from the minimum interactive size for the stacked buttons spacing (touch branch)',
  },
  {
    kind: 'dp',
    name: `${P}-tonal-elevation`,
    owner: 'AlertDialogDefaults',
    member: 'TonalElevation',
    file: KT,
    pattern: /public val TonalElevation: Dp = (\d+)\.dp/d,
    note: 'AlertDialog(tonalElevation) default; the container Surface has no shadowElevation, so the dialog casts no shadow (owner decision M9 #8: DialogTokens.ContainerElevation Level3 is not read)',
  },
  {
    kind: 'motion',
    name: `${P}-scrim`,
    owner: 'ModalBottomSheet',
    member: 'scrimAlpha',
    file: SHEET,
    pattern:
      /targetValue = if \(isScrimVisible\) 1f else 0f,\n\s*animationSpec = MotionSchemeKeyTokens\.(\w+)\.value\(\),\n\s*label = "ScrimAlphaAnimation"/d,
    note: 'the scrim alpha fades in and out on this spring (owner decision M9 #9: Compose dialogs show the platform window dim, ModalBottomSheet is the Compose modal with a scrim fade)',
  },
];

/** Wiring dialog.css and the dialog controller assume. */
const CHECKS: readonly LiteralCheck[] = [
  [
    KT,
    'BasicAlertDialog: a Dialog window whose content is sized in [DialogMinWidth, DialogMaxWidth] with the paneTitle Strings.Dialog',
    /Dialog\(onDismissRequest = onDismissRequest, properties = properties\) \{\n\s*val dialogPaneDescription = getString\(Strings\.Dialog\)[\s\S]*?\.sizeIn\(minWidth = DialogMinWidth, maxWidth = DialogMaxWidth\)\n\s*\.then\(Modifier\.semantics \{ paneTitle = dialogPaneDescription \}\)/,
  ],
  [
    KT,
    'AlertDialogContent: a Surface (shape, color, tonal elevation; no shadow) around a padded Column',
    /Surface\(\n\s*modifier = modifier,\n\s*shape = shape,\n\s*color = containerColor,\n\s*tonalElevation = tonalElevation,\n\s*\) \{\n\s*Column\(modifier = Modifier\.padding\(AlertDialogDefaults\.dialogPadding\)\)/,
  ],
  [
    KT,
    'AlertDialogDefaults: shape, colors and the icon size are DialogTokens',
    /public val shape: Shape\n\s*@Composable get\(\) = DialogTokens\.ContainerShape\.value[\s\S]*?public val IconSize: Dp = DialogTokens\.IconSize[\s\S]*?public val containerColor: Color\n\s*@Composable get\(\) = DialogTokens\.ContainerColor\.value[\s\S]*?public val iconContentColor: Color\n\s*@Composable get\(\) = DialogTokens\.IconColor\.value[\s\S]*?public val titleContentColor: Color\n\s*@Composable get\(\) = DialogTokens\.HeadlineColor\.value[\s\S]*?public val textContentColor: Color\n\s*@Composable get\(\) = DialogTokens\.SupportingTextColor\.value/,
  ],
  [
    KT,
    'AlertDialogContent: the icon centered; the title start-aligned, centered with an icon; the text start-aligned weight(1, fill = false); the buttons at the end',
    /Box\(Modifier\.padding\(IconPadding\)\.align\(Alignment\.CenterHorizontally\)\)[\s\S]*?DialogTokens\.HeadlineFont\.value[\s\S]*?Modifier\.padding\(TitlePadding\)\n\s*\.align\(\n\s*if \(icon == null\) \{\n\s*Alignment\.Start\n\s*\} else \{\n\s*Alignment\.CenterHorizontally\n\s*\}[\s\S]*?val textStyle = DialogTokens\.SupportingTextFont\.value[\s\S]*?Modifier\.weight\(weight = 1f, fill = false\)\n\s*\.padding\(AlertDialogDefaults\.textPadding\)\n\s*\.align\(Alignment\.Start\)[\s\S]*?Box\(modifier = Modifier\.align\(Alignment\.End\)\) \{\n\s*val textStyle = DialogTokens\.ActionLabelTextFont\.value/,
  ],
  [
    KT,
    'AlertDialogImpl: confirm then dismiss in a FlowRow, cross-axis spacing less the minimum interactive size padding',
    /val buttonPaddingFromMICS =\n\s*LocalMinimumInteractiveComponentSize\.current\.takeOrElse \{ 0\.dp \} -\n\s*ButtonDefaults\.MinHeight\n\s*AlertDialogFlowRow\(\n\s*mainAxisSpacing = ButtonsMainAxisSpacing,\n\s*crossAxisSpacing =\n\s*\(ButtonsCrossAxisSpacing - buttonPaddingFromMICS\)\.coerceIn\(\n\s*0\.dp,\n\s*ButtonsCrossAxisSpacing,\n\s*\),\n\s*\) \{\n\s*confirmButton\(\)\n\s*dismissButton\?\.invoke\(\)/,
  ],
  [
    KT,
    'AlertDialogFlowRow: laid out in the flipped direction (confirm at the end of a row, on top when stacked)',
    /CompositionLocalProvider\(LocalLayoutDirection provides originalLayoutDirection\.flip\(\)\) \{\n\s*FlowRow\(\n\s*horizontalArrangement = Arrangement\.spacedBy\(mainAxisSpacing\),\n\s*verticalArrangement = Arrangement\.spacedBy\(crossAxisSpacing\),/,
  ],
  [
    ANDROID,
    'actual AlertDialog: AlertDialogImpl',
    /public actual fun AlertDialog\([\s\S]*?\): Unit =\n\s*AlertDialogImpl\(/,
  ],
  [
    SHEET,
    'ModalBottomSheet: the scrim is scrimColor at the animated alpha',
    /Scrim\(\n[\s\S]*?alpha = \{ scrimAlpha \},\n\s*color = scrimColor,/,
  ],
  [
    SAMPLES,
    'AlertDialogSample: TextButton confirm / dismiss, a title and a text',
    /title = \{ Text\(text = "Title"\) \},\n\s*text = \{ Text\(text = "Turned on by default"\) \},\n\s*confirmButton = \{\n\s*TextButton\(onClick = \{ openDialog\.value = false \}\) \{ Text\("Confirm"\) \}\n\s*\},\n\s*dismissButton = \{\n\s*TextButton\(onClick = \{ openDialog\.value = false \}\) \{ Text\("Dismiss"\) \}/,
  ],
];

// --- Material Web (secondary source) ---------------------------------------------------------

const normalizeText = (text: string | undefined, file: string) => {
  if (text === undefined) throw new Error(`dialog-defaults: ${file} is not vendored`);
  return text.replace(/\r\n/g, '\n');
};

/** `cubic-bezier(.3,0,0,1)` → `cubic-bezier(0.3, 0, 0, 1)`. */
const bezier = (raw: string): string => {
  const m = /^cubic-bezier\(([^)]*)\)$/.exec(raw.trim());
  if (!m) throw new Error(`dialog-defaults: ${raw} is not a cubic-bezier`);
  return `cubic-bezier(${m[1]!
    .split(',')
    .map((n) => String(Number(n)))
    .join(', ')})`;
};

/** Every capture of `pattern` in `text` (from `from`), with the line of the first capture. */
function find(text: string, pattern: RegExp, what: string, from = 0): RegExpExecArray {
  const re = new RegExp(pattern.source, 'dg');
  re.lastIndex = from;
  const m = re.exec(text);
  if (!m) throw new Error(`dialog-defaults: Material Web ${what} not found (changed upstream?)`);
  return m;
}

const lineAt = (text: string, m: RegExpExecArray, group = 1) =>
  text.slice(0, m.indices?.[group]?.[0] ?? m.index).split('\n').length;

/**
 * md-dialog's open / close animations (owner decision M9 #9). Keyframes that hold opacity 0
 * until `offset` of a linear `duration` are emitted as a delay and the remaining duration.
 */
function materialWebRows(
  sources: Readonly<Record<string, string>>,
  version: string,
  motionTokens: MotionTokensSource,
): DialogDefault[] {
  const js = normalizeText(sources['animations.js'], 'animations.js');
  const easingJs = normalizeText(sources['animation.js'], 'animation.js');
  const scss = normalizeText(sources['_dialog.scss'], '_dialog.scss');
  const close = js.indexOf('DIALOG_DEFAULT_CLOSE_ANIMATION');
  if (!js.includes('DIALOG_DEFAULT_OPEN_ANIMATION') || close < 0)
    throw new Error('dialog-defaults: Material Web dialog animations not found');
  const easing = (key: string): string => {
    const m = find(easingJs, new RegExp(`\\n\\s*${key}: '(cubic-bezier\\([^)]*\\))'`), key);
    return bezier(m[1]!);
  };
  const out: DialogDefault[] = [];
  const row = (
    name: string,
    value: string,
    js_: number | string,
    raw: string,
    member: string,
    file: string,
    line: number,
    note: string,
  ) =>
    out.push({
      name,
      value,
      js: js_,
      raw,
      owner: 'md-dialog',
      member,
      file,
      line,
      cite: `@material/web@${version} ${WEB_PATHS[file] ?? file} L${String(line)}`,
      note,
    });

  // Open: the dialog slides down, the container background grows and fades in, then the parts.
  const slide = find(
    js,
    /\[\{ 'transform': 'translateY\(-(\d+)px\)' \}, \{ 'transform': 'translateY\(0\)' \}\],\n\s*\{ duration: (\d+), easing: EASING\.(\w+) \}/,
    'open slide',
  );
  if (slide.index > close) throw new Error('dialog-defaults: open slide is after the close block');
  const [, distance, enterDuration, enterEasing] = slide as unknown as [
    string,
    string,
    string,
    string,
  ];
  const slideLine = lineAt(js, slide);
  row(
    `${P}-slide-distance`,
    `${distance}px`,
    Number(distance),
    `translateY(-${distance}px)`,
    'DIALOG_DEFAULT_OPEN_ANIMATION.dialog',
    'animations.js',
    slideLine,
    'the dialog slides down from this far above its place on open, and back up on close',
  );
  row(
    `${P}-enter-duration`,
    `${enterDuration}ms`,
    Number(enterDuration),
    `duration: ${enterDuration}`,
    'DIALOG_DEFAULT_OPEN_ANIMATION.dialog',
    'animations.js',
    slideLine,
    'open: the slide and the container growth (TODO(verify) SOURCES register #72: no androidx or m3.material.io dialog motion; owner decision M9 #9)',
  );
  // D20 (6): the open easing is androidx's emphasized easing (the sys token), not Material Web's
  // EASING.EMPHASIZED "approximated with unknown accuracy" (animation.js).
  if (enterEasing !== 'EMPHASIZED')
    throw new Error(`dialog-defaults: Material Web opens on EASING.${enterEasing}, not EMPHASIZED`);
  const motion = normalizeText(motionTokens.text, 'MotionTokens.kt');
  const emphasized = find(
    motion,
    /inline val (EasingEmphasizedCubicBezier): CubicBezierEasing\n\s*get\(\) = CubicBezierEasing\(0\.2f, 0\.0f, 0\.0f, 1\.0f\)/,
    'MotionTokens.EasingEmphasizedCubicBezier',
  );
  const emphasizedLine = lineAt(motion, emphasized);
  out.push({
    name: `${P}-enter-easing`,
    value: 'var(--m3e-sys-motion-easing-emphasized)',
    js: 'var(--m3e-sys-motion-easing-emphasized)',
    raw: 'MotionTokens.EasingEmphasizedCubicBezier = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1.0f)',
    owner: 'MotionTokens',
    member: 'EasingEmphasizedCubicBezier',
    file: 'MotionTokens.kt',
    line: emphasizedLine,
    cite: `${motionTokens.path} L${String(emphasizedLine)}`,
    note: `open: the slide and the container growth. D20 (6), amends M9 #9: androidx's emphasized easing (m3.material.io's CSS fallback, Standard, is the same curve) in place of Material Web's EASING.${enterEasing} ${easing(enterEasing)} (animation.js: "approximated with unknown accuracy"); Material Web's timing is kept`,
  });

  const grow = find(
    js,
    /\[\{ 'height': '(\d+)%' \}, \{ 'height': '100%' \}\],\n\s*\{ duration: (\d+), easing: EASING\.(\w+), pseudoElement: '::before' \}/,
    'open container grow',
  );
  if (grow[2] !== enterDuration || grow[3] !== enterEasing)
    throw new Error('dialog-defaults: the container grows on another timing than the slide');
  row(
    `${P}-container-collapsed-height`,
    `${grow[1]!}%`,
    Number(grow[1]) / 100,
    `height: '${grow[1]!}%'`,
    'DIALOG_DEFAULT_OPEN_ANIMATION.container',
    'animations.js',
    lineAt(js, grow),
    'the container background grows from this share of its height (top-aligned) on open and shrinks to it on close; the content is not clipped',
  );

  const fadeIn = find(
    js,
    /\/\/ Container fade in\n\s*\[\{ 'opacity': 0 \}, \{ 'opacity': 1 \}\],\n\s*\{ duration: (\d+), easing: 'linear', pseudoElement: '::before' \}/,
    'open container fade',
  );
  row(
    `${P}-container-enter-fade-duration`,
    `${fadeIn[1]!}ms`,
    Number(fadeIn[1]),
    `duration: ${fadeIn[1]!}`,
    'DIALOG_DEFAULT_OPEN_ANIMATION.container',
    'animations.js',
    lineAt(js, fadeIn),
    'open: the container background fades in (linear)',
  );

  const partIn = (label: string) =>
    find(
      js,
      new RegExp(
        `// ${label} fade in\\n\\s*\\[\\{ 'opacity': 0 \\}, \\{ 'opacity': 0, offset: ([\\d.]+) \\}, \\{ 'opacity': 1 \\}\\],\\n\\s*\\{ duration: (\\d+), easing: 'linear', fill: 'forwards' \\}`,
      ),
      `${label} fade in`,
    );
  const headline = partIn('Headline');
  const content = partIn('Content');
  if (headline[1] !== content[1] || headline[2] !== content[2])
    throw new Error('dialog-defaults: the headline and the content fade in differently');
  const actions = partIn('Actions');
  for (const [part, m, what] of [
    ['content', content, 'the icon, the headline and the content'],
    ['actions', actions, 'the actions'],
  ] as const) {
    const total = Number(m[2]);
    const delay = Math.round(total * Number(m[1]));
    row(
      `${P}-${part}-enter-delay`,
      `${String(delay)}ms`,
      delay,
      `offset: ${m[1]!} × duration: ${m[2]!}`,
      `DIALOG_DEFAULT_OPEN_ANIMATION.${part === 'content' ? 'headline / content' : 'actions'}`,
      'animations.js',
      lineAt(js, m),
      `open: ${what} stay transparent this long (the keyframe offset of the linear fade)`,
    );
    row(
      `${P}-${part}-enter-duration`,
      `${String(total - delay)}ms`,
      total - delay,
      `(1 − ${m[1]!}) × duration: ${m[2]!}`,
      `DIALOG_DEFAULT_OPEN_ANIMATION.${part === 'content' ? 'headline / content' : 'actions'}`,
      'animations.js',
      lineAt(js, m, 2),
      `open: then ${what} fade in linearly over this`,
    );
  }

  // Close: the dialog slides up, the container shrinks then fades out, the parts fade out.
  const up = find(
    js,
    /\[\{ 'transform': 'translateY\(0\)' \}, \{ 'transform': 'translateY\(-(\d+)px\)' \}\],\n\s*\{ duration: (\d+), easing: EASING\.(\w+) \}/,
    'close slide',
    close,
  );
  if (up[1] !== distance) throw new Error('dialog-defaults: the close slide distance differs');
  const [, , exitDuration, exitEasing] = up as unknown as [string, string, string, string];
  row(
    `${P}-exit-duration`,
    `${exitDuration}ms`,
    Number(exitDuration),
    `duration: ${exitDuration}`,
    'DIALOG_DEFAULT_CLOSE_ANIMATION.dialog',
    'animations.js',
    lineAt(js, up, 2),
    'close: the slide and the container shrink',
  );
  const exitEasingLine = lineAt(
    easingJs,
    find(easingJs, new RegExp(`\\n\\s*(${exitEasing}): '`), exitEasing),
  );
  row(
    `${P}-exit-easing`,
    easing(exitEasing),
    easing(exitEasing),
    `EASING.${exitEasing}`,
    'EASING',
    'animation.js',
    exitEasingLine,
    'close: the slide and the container shrink',
  );
  const shrink = find(
    js,
    /\[\{ 'height': '100%' \}, \{ 'height': '(\d+)%' \}\],\n\s*\{\n\s*duration: (\d+),\n\s*easing: EASING\.(\w+),\n\s*pseudoElement: '::before',/,
    'close container shrink',
    close,
  );
  if (shrink[1] !== grow[1] || shrink[2] !== exitDuration || shrink[3] !== exitEasing)
    throw new Error('dialog-defaults: the container shrinks differently than it grows / slides');
  const fadeOut = find(
    js,
    /\{ delay: (\d+), duration: (\d+), easing: 'linear', pseudoElement: '::before' \}/,
    'close container fade',
    close,
  );
  row(
    `${P}-container-exit-fade-delay`,
    `${fadeOut[1]!}ms`,
    Number(fadeOut[1]),
    `delay: ${fadeOut[1]!}`,
    'DIALOG_DEFAULT_CLOSE_ANIMATION.container',
    'animations.js',
    lineAt(js, fadeOut),
    'close: the container background starts fading out after this',
  );
  row(
    `${P}-container-exit-fade-duration`,
    `${fadeOut[2]!}ms`,
    Number(fadeOut[2]),
    `duration: ${fadeOut[2]!}`,
    'DIALOG_DEFAULT_CLOSE_ANIMATION.container',
    'animations.js',
    lineAt(js, fadeOut, 2),
    'close: the container background fade out (linear)',
  );
  const partOut = (label: string) =>
    find(
      js,
      new RegExp(
        `// ${label} fade out\\n\\s*\\[\\{ 'opacity': 1 \\}, \\{ 'opacity': 0 \\}\\],\\n\\s*\\{ duration: (\\d+), easing: 'linear', fill: 'forwards' \\}`,
      ),
      `${label} fade out`,
      close,
    );
  const outs = ['Headline', 'Content', 'Actions'].map(partOut);
  if (outs.some((m) => m[1] !== outs[0]![1]))
    throw new Error('dialog-defaults: the parts fade out on different durations');
  row(
    `${P}-content-exit-duration`,
    `${outs[0]![1]!}ms`,
    Number(outs[0]![1]),
    `duration: ${outs[0]![1]!}`,
    'DIALOG_DEFAULT_CLOSE_ANIMATION.headline / content / actions',
    'animations.js',
    lineAt(js, outs[0]!),
    'close: the icon, headline, content and actions fade out (linear)',
  );

  // The scrim: Material Web fades it to 32% (the ScrimTokens value; the m3e scrim follows
  // ModalBottomSheet's DefaultEffects fade instead of this linear one, owner decision M9 #9).
  find(js, /\[\{ 'opacity': 0 \}, \{ 'opacity': 0\.32 \}\]/, 'scrim 0.32');

  // The window margin: max-width min(560px, calc(100% - 48px)).
  const margin = find(scss, /max-width: min\((\d+)px, calc\(100% - (\d+)px\)\);/, 'max-width');
  const half = Number(margin[2]) / 2;
  row(
    `${P}-window-margin`,
    `${String(half)}px`,
    half,
    `calc(100% - ${margin[2]!}px) / 2`,
    ':host max-width / max-height',
    '_dialog.scss',
    lineAt(scss, margin, 2),
    'TODO(verify) SOURCES register #73: the dialog keeps this far from each window edge (Compose: the platform dialog window insets, usePlatformDefaultWidth)',
  );
  return out;
}

// --- m3.material.io: the full-screen dialog (owner decision M9 #11) --------------------------

/** m3.material.io token DB the full-screen dialog values come from (read 2026-10-18). */
const FULL_SCREEN_DSDB =
  'm3.material.io token DB "Google Material 3" v38.2.9 rev 7989 (_dsm/data/dsdb-m3/2026-10-13_06-10-19/TOKEN_TABLE.0b1e39a67d5bafdc.json, Dialogs › Tokens & specs: md.comp.full-screen-dialog)';

/** m3.material.io page whose Specs › Full-screen dialog measurements table is cited. */
const FULL_SCREEN_PAGE =
  'm3.material.io Dialogs › Specs › Full-screen dialog measurements (_dsm/content/m3/2026-10-13_06-10-19/79c01ab5-d09a-4f6c-9aca-f76d310583bc.json, updated 2026-07-28)';

const TYPE_FIELDS = ['font', 'weight', 'size', 'line-height', 'tracking'] as const;

function fullScreenRows(): DialogDefault[] {
  const base = { owner: 'm3.material.io', file: 'm3.material.io', line: 0 };
  const color = (name: string, token: string, role: string, note?: string): DialogDefault => ({
    ...base,
    name: `${FS}-${name}`,
    value: `var(--m3e-sys-color-${role})`,
    js: `var(--m3e-sys-color-${role})`,
    raw: `${token} = md.sys.color.${role}`,
    member: token,
    cite: FULL_SCREEN_DSDB,
    ...(note === undefined ? {} : { note }),
  });
  const dp = (name: string, member: string, value: number, cite: string, note?: string) => ({
    ...base,
    name: `${FS}-${name}`,
    value: `${String(value)}px`,
    js: value,
    raw: `${member} = ${String(value)}dp`,
    member,
    cite,
    ...(note === undefined ? {} : { note }),
  });
  const conflict =
    'TODO(verify) SOURCES register #74: the Specs color legend starts with "Surface container high"; the token DB says surface (owner decision M9 #11: the DB)';
  return [
    color('container-color', 'md.comp.full-screen-dialog.container.color', 'surface', conflict),
    {
      ...base,
      name: `${FS}-container-shape`,
      value: 'var(--m3e-sys-shape-corner-none)',
      js: 'var(--m3e-sys-shape-corner-none)',
      raw: 'md.comp.full-screen-dialog.container.shape = md.sys.shape.corner.none',
      member: 'md.comp.full-screen-dialog.container.shape',
      cite: FULL_SCREEN_DSDB,
      note: 'Specs: "Container shape 0dp corner radius"; container elevation level0 (no shadow)',
    },
    color(
      'header-container-color',
      'md.comp.full-screen-dialog.header.container.color',
      'surface',
      conflict,
    ),
    color(
      'header-on-scroll-container-color',
      'md.comp.full-screen-dialog.header.on-scroll.container.color',
      'surface-container',
      'while the content is scrolled (the DB’s on-scroll elevation level2 is not drawn, as the top app bars: color only)',
    ),
    dp(
      'header-container-height',
      'md.comp.full-screen-dialog.header.container.height',
      56,
      FULL_SCREEN_DSDB,
      'Specs: "Header height 56dp"',
    ),
    color(
      'header-headline-color',
      'md.comp.full-screen-dialog.header.headline.color',
      'on-surface',
    ),
    ...TYPE_FIELDS.map((field) => ({
      ...base,
      name: `${FS}-header-headline-${field}`,
      value: `var(--m3e-sys-typescale-title-large-${field})`,
      js: `var(--m3e-sys-typescale-title-large-${field})`,
      raw: `md.comp.full-screen-dialog.header.headline.${field} = md.sys.typescale.title-large.${field}`,
      member: `md.comp.full-screen-dialog.header.headline.${field}`,
      cite: FULL_SCREEN_DSDB,
    })),
    color('header-icon-color', 'md.comp.full-screen-dialog.header.icon.color', 'on-surface'),
    dp(
      'header-icon-size',
      'md.comp.full-screen-dialog.header.icon.size',
      24,
      FULL_SCREEN_DSDB,
      'the close affordance (Specs: "Icon (close affordance) size 24dp")',
    ),
    dp(
      'padding',
      'Top/left/right padding',
      24,
      FULL_SCREEN_PAGE,
      'around the content below the header',
    ),
    dp(
      'header-spacing',
      'Padding between elements',
      8,
      FULL_SCREEN_PAGE,
      'TODO(verify) SOURCES register #74: the header’s inline padding and the gaps between the close button, the headline and the action (the Specs table names no other header measurement)',
    ),
  ];
}

/**
 * `sources`: vendored Material3 files and samples by name (AlertDialog.kt, Button.kt,
 * ModalBottomSheet.kt, AlertDialogSamples.kt, AndroidAlertDialog.android.kt) plus the Material
 * Web files (animations.js, animation.js, _dialog.scss).
 */
export function extractDialogDefaults(
  sources: Readonly<Record<string, string>>,
  materialWebVersion: string,
  motionTokens: MotionTokensSource,
): DialogDefault[] {
  return [
    ...extractLiterals('dialog-defaults', DIALOG_DEFAULTS_SOURCES, RULES, CHECKS, sources),
    ...materialWebRows(sources, materialWebVersion, motionTokens),
    ...fullScreenRows(),
  ];
}
