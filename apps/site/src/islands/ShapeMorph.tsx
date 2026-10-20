// The shape page's morph demo: two Material shapes, a Morph between them (m3e-shapes, ported
// from androidx graphics-shapes 1.0.1) and its progress, dragged with the slider or animated on
// the expressive default spatial spring (m3e-motion SpringAnimatable). Reduced motion jumps.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Icon, Menu, MenuItem, MenuTrigger, Slider } from '@kyralabs/m3exp-web/react';
import {
  type MaterialShapeName,
  Morph,
  materialShape,
  materialShapeNames,
  morphToPath,
  toSvgPathData,
} from '@kyralabs/m3e-shapes';
import { SpringAnimatable } from '@kyralabs/m3e-motion';
import { motion } from '@kyralabs/m3e-tokens';

const SPRING = motion.springs.expressive.defaultSpatial;
/** Words in a shape name: `Cookie9Sided` → `Cookie 9 sided`. */
const label = (name: string) =>
  name.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/ ([A-Z])/g, (m) => m.toLowerCase());

function ShapePicker(props: {
  title: string;
  value: MaterialShapeName;
  onChange: (name: MaterialShapeName) => void;
}) {
  return (
    <MenuTrigger>
      <Button variant="outlined">{`${props.title}: ${label(props.value)}`}</Button>
      <Menu
        aria-label={`${props.title} shape`}
        selectionMode="single"
        selectedKeys={[props.value]}
        onSelectionChange={(keys) => {
          const [key] = keys === 'all' ? [] : [...keys];
          if (key !== undefined) props.onChange(String(key) as MaterialShapeName);
        }}
      >
        {materialShapeNames.map((name) => (
          <MenuItem key={name} id={name}>
            {label(name)}
          </MenuItem>
        ))}
      </Menu>
    </MenuTrigger>
  );
}

export default function ShapeMorph() {
  const [from, setFrom] = useState<MaterialShapeName>('Circle');
  const [to, setTo] = useState<MaterialShapeName>('Cookie9Sided');
  const [progress, setProgress] = useState(0);
  const spring = useRef(new SpringAnimatable(0));
  const frame = useRef(0);
  const morph = useMemo(() => new Morph(materialShape(from), materialShape(to)), [from, to]);
  const path = useMemo(() => toSvgPathData(morphToPath(morph, progress)), [morph, progress]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const animateTo = (target: number) => {
    cancelAnimationFrame(frame.current);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    spring.current.snapTo(progress);
    spring.current.animateTo(target, reduce ? null : SPRING, performance.now());
    const step = (now: number) => {
      setProgress(spring.current.sample(now));
      if (spring.current.isRunning) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  };

  return (
    <div className="site-morph">
      <svg
        className="site-morph__shape"
        viewBox="0 0 1 1"
        role="img"
        aria-label={`${label(from)} morphing into ${label(to)}`}
      >
        <path d={path} />
      </svg>
      <div className="site-morph__controls">
        <ShapePicker title="From" value={from} onChange={setFrom} />
        <ShapePicker title="To" value={to} onChange={setTo} />
        <Slider
          aria-label="Morph progress"
          minValue={0}
          maxValue={1}
          value={Math.min(1, Math.max(0, progress))}
          onChange={(value) => {
            cancelAnimationFrame(frame.current);
            setProgress(value);
          }}
        />
        <Button
          variant="filled"
          icon={<Icon name="play_arrow" />}
          onPress={() => {
            animateTo(progress < 0.5 ? 1 : 0);
          }}
        >
          Morph
        </Button>
      </div>
    </div>
  );
}
