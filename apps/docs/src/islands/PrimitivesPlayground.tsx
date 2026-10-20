import { Icon, Surface, type SurfaceShape } from '@kyralabs/m3exp-web/react';

const icons = ['home', 'search', 'favorite', 'settings', 'star', 'delete'] as const;
const shapes: SurfaceShape[] = [
  'none',
  'extra-small',
  'small',
  'medium',
  'large',
  'extra-large',
  'full',
];

/** React primitives: the same rows as the CSS and element demos above, from <Icon> and <Surface>. */
export default function PrimitivesPlayground() {
  return (
    <div data-testid="react-primitives">
      <div className="docs-icon-rows" data-testid="react-icons">
        <p>
          {icons.map((name) => (
            <Icon key={name} name={name} />
          ))}
        </p>
        <p>
          {icons.map((name) => (
            <Icon key={name} name={name} fill />
          ))}
        </p>
        <p>
          <Icon name="check_circle" label="Done" />
          <Icon name="check_circle" fill />
        </p>
      </div>
      <div className="docs-tiles" data-testid="react-surfaces">
        <Surface className="docs-tile" container="high" shape="medium" elevation={1}>
          <code>container high, level1</code>
        </Surface>
        <Surface className="docs-tile" variant shape="medium">
          <code>variant</code>
        </Surface>
      </div>
      <div className="docs-tiles" data-testid="react-shapes">
        {shapes.map((shape) => (
          <Surface key={shape} className="docs-tile" container="highest" shape={shape}>
            <code>{shape}</code>
          </Surface>
        ))}
      </div>
    </div>
  );
}
