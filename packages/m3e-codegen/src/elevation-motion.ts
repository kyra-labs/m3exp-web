// How Compose animates elevation changes on interaction (buttons, cards, chips…): tweens from
// material3 internal/Elevation.kt (ElevationDefaults), not motion-scheme springs. Entering a
// state uses DefaultIncomingSpec; leaving uses DefaultOutgoingSpec (HoveredOutgoingSpec when
// leaving hover). Easings resolve through animation-core Easing.kt.

export interface ElevationMotionToken {
  name: string;
  value: string;
  member: string;
  file: string;
  line: number;
}

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

function easing(
  elevationKt: string,
  easingKt: string,
  name: string,
): { value: string; member: string; file: string; line: number } {
  const local = new RegExp(`val ${name}: Easing = CubicBezierEasing\\(([^)]*)\\)`).exec(
    elevationKt,
  );
  const shared = new RegExp(`public val ${name}: Easing = CubicBezierEasing\\(([^)]*)\\)`).exec(
    easingKt,
  );
  const match = local ?? shared;
  if (!match) throw new Error(`Easing ${name} not found in Elevation.kt or Easing.kt`);
  const points = match[1]!.split(',').map((p) => Number.parseFloat(p.trim().replace(/f$/, '')));
  if (points.length !== 4 || points.some((p) => Number.isNaN(p))) {
    throw new Error(`Easing ${name}: unexpected CubicBezierEasing(${match[1]!})`);
  }
  return {
    value: `cubic-bezier(${points.map(String).join(', ')})`,
    member: name,
    file: local ? 'internal/Elevation.kt' : 'Easing.kt',
    line: lineOf(local ? elevationKt : easingKt, match.index),
  };
}

export function extractElevationMotion(
  elevationKtRaw: string,
  easingKtRaw: string,
): ElevationMotionToken[] {
  const elevationKt = elevationKtRaw.replace(/\r\n/g, '\n');
  const easingKt = easingKtRaw.replace(/\r\n/g, '\n');
  const spec = (name: string) => {
    const match = new RegExp(
      `private val ${name} = TweenSpec<Dp>\\(durationMillis = (\\d+), easing = (\\w+)\\)`,
    ).exec(elevationKt);
    if (!match) throw new Error(`internal/Elevation.kt: ${name} not found`);
    return {
      duration: Number(match[1]),
      easing: match[2]!,
      line: lineOf(elevationKt, match.index),
    };
  };
  const incoming = spec('DefaultIncomingSpec');
  const outgoing = spec('DefaultOutgoingSpec');
  const hoveredOutgoing = spec('HoveredOutgoingSpec');
  if (hoveredOutgoing.easing !== outgoing.easing) {
    throw new Error('internal/Elevation.kt: hovered and default outgoing easings differ');
  }
  const ms = (name: string, member: string, s: { duration: number; line: number }) => ({
    name,
    value: `${String(s.duration)}ms`,
    member,
    file: 'internal/Elevation.kt',
    line: s.line,
  });
  return [
    ms('--m3e-comp-elevation-incoming-duration', 'DefaultIncomingSpec', incoming),
    {
      name: '--m3e-comp-elevation-incoming-easing',
      ...easing(elevationKt, easingKt, incoming.easing),
    },
    ms('--m3e-comp-elevation-outgoing-duration', 'DefaultOutgoingSpec', outgoing),
    ms('--m3e-comp-elevation-outgoing-duration-hovered', 'HoveredOutgoingSpec', hoveredOutgoing),
    {
      name: '--m3e-comp-elevation-outgoing-easing',
      ...easing(elevationKt, easingKt, outgoing.easing),
    },
  ];
}
