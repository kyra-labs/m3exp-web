// The color page's theme builder: a seed color, a scheme variant, a contrast level, the spec
// version and light or dark, run through createTheme (loaded on first change) into scoped role
// swatches and copyable CSS. "Use on this site" stores it like the home page's hero does. The
// preview shows roles, not components: components do not follow a scoped theme yet (#120).
import { useEffect, useId, useState } from 'react';
import {
  Button,
  ButtonGroup,
  ButtonGroupItem,
  Icon,
  Menu,
  MenuItem,
  MenuTrigger,
  Switch,
  TextField,
} from '@kyralabs/m3exp-web/react';
import { baselineColors } from '@kyralabs/m3e-tokens';
import { setSeedTheme } from '../scripts/theme';

const VARIANTS = [
  ['tonalSpot', 'Tonal spot'],
  ['expressive', 'Expressive'],
  ['vibrant', 'Vibrant'],
  ['neutral', 'Neutral'],
  ['monochrome', 'Monochrome'],
  ['fidelity', 'Fidelity'],
  ['content', 'Content'],
  ['rainbow', 'Rainbow'],
  ['fruitSalad', 'Fruit salad'],
] as const;
type Variant = (typeof VARIANTS)[number][0];

const CONTRASTS = [
  ['standard', 'Standard'],
  ['medium', 'Medium'],
  ['high', 'High'],
] as const;
type Contrast = (typeof CONTRASTS)[number][0];

/** The roles the preview shows as swatches, each over its "on" role. */
const SWATCHES = [
  ['primary', 'on-primary'],
  ['primary-container', 'on-primary-container'],
  ['secondary', 'on-secondary'],
  ['secondary-container', 'on-secondary-container'],
  ['tertiary', 'on-tertiary'],
  ['tertiary-container', 'on-tertiary-container'],
  ['error', 'on-error'],
  ['surface-container', 'on-surface'],
  ['surface-container-highest', 'on-surface-variant'],
  ['inverse-surface', 'inverse-on-surface'],
] as const;

const HEX = /^#(?:[0-9a-f]{3}){1,2}$/i;
const SCOPE = 'site-theme-preview';
/** The baseline primary, the seed of the baseline scheme. */
const DEFAULT_SEED: string = baselineColors.light.primary;

let latest = 0;

export default function ThemeBuilder() {
  const id = useId();
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [draft, setDraft] = useState(DEFAULT_SEED);
  const [variant, setVariant] = useState<Variant>('tonalSpot');
  const [contrast, setContrast] = useState<Contrast>('standard');
  const [spec, setSpec] = useState<'2025' | '2021'>('2025');
  const [dark, setDark] = useState(false);
  const [css, setCss] = useState('');
  const [applied, setApplied] = useState(false);
  // Material Color Utilities is heavy: nothing is computed until the first change, and until
  // then the swatches show the page's own scheme.
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!touched) return;
    const request = ++latest;
    void import('@kyralabs/m3exp-web/theme').then(({ createTheme }) => {
      if (request !== latest) return; // a newer choice is on its way
      const options = { seed, variant, contrast, specVersion: spec } as const;
      setCss(
        createTheme({ ...options, mode: dark ? 'dark' : 'light', selector: `.${SCOPE}` }).cssText,
      );
    });
  }, [touched, seed, variant, contrast, spec, dark]);

  const apply = async () => {
    const { createTheme } = await import('@kyralabs/m3exp-web/theme');
    setSeedTheme(
      { seed, variant },
      createTheme({ seed, variant, contrast, specVersion: spec }).cssText,
    );
    setApplied(true);
  };

  return (
    <div className="site-theme-builder">
      <div className="site-theme-builder__controls">
        <div className="site-theme-builder__seed">
          <input
            type="color"
            className="site-theme-builder__picker"
            aria-label="Seed color picker"
            value={seed.length === 4 ? `#${seed.slice(1).replace(/./g, (c) => c + c)}` : seed}
            onChange={(e) => {
              setSeed(e.target.value);
              setDraft(e.target.value);
              setTouched(true);
            }}
          />
          <TextField
            variant="outlined"
            label="Seed color"
            value={draft}
            isInvalid={!HEX.test(draft)}
            errorMessage={`A hex color, like ${DEFAULT_SEED}`}
            onChange={(value) => {
              setDraft(value);
              if (HEX.test(value)) setSeed(value);
              setTouched(true);
            }}
          />
        </div>
        <MenuTrigger>
          <Button variant="outlined" icon={<Icon name="palette" />}>
            {`Variant: ${VARIANTS.find(([v]) => v === variant)?.[1] ?? variant}`}
          </Button>
          <Menu
            aria-label="Scheme variant"
            selectionMode="single"
            selectedKeys={[variant]}
            onSelectionChange={(keys) => {
              const [key] = keys === 'all' ? [] : [...keys];
              if (key !== undefined) setVariant(String(key) as Variant);
              setTouched(true);
            }}
          >
            {VARIANTS.map(([key, label]) => (
              <MenuItem key={key} id={key}>
                {label}
              </MenuItem>
            ))}
          </Menu>
        </MenuTrigger>
        <div role="group" aria-labelledby={`${id}-contrast`} className="site-theme-builder__group">
          <span id={`${id}-contrast`} className="site-theme-builder__label">
            Contrast
          </span>
          <ButtonGroup
            variant="connected"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[contrast]}
            onSelectionChange={(keys) => {
              const [key] = [...keys];
              if (key !== undefined) setContrast(String(key) as Contrast);
              setTouched(true);
            }}
          >
            {CONTRASTS.map(([key, label]) => (
              <ButtonGroupItem key={key} id={key}>
                {label}
              </ButtonGroupItem>
            ))}
          </ButtonGroup>
        </div>
        <div role="group" aria-labelledby={`${id}-spec`} className="site-theme-builder__group">
          <span id={`${id}-spec`} className="site-theme-builder__label">
            Spec
          </span>
          <ButtonGroup
            variant="connected"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[spec]}
            onSelectionChange={(keys) => {
              const [key] = [...keys];
              if (key !== undefined) setSpec(String(key) as '2025' | '2021');
              setTouched(true);
            }}
          >
            <ButtonGroupItem id="2025">2025</ButtonGroupItem>
            <ButtonGroupItem id="2021">2021</ButtonGroupItem>
          </ButtonGroup>
        </div>
        <Switch
          isSelected={dark}
          onChange={(value) => {
            setDark(value);
            setTouched(true);
          }}
        >
          Dark scheme
        </Switch>
      </div>

      <style>{css}</style>
      <div className={`${SCOPE} site-theme-builder__preview`}>
        <ul className="site-theme-builder__swatches" aria-label="Color roles">
          {SWATCHES.map(([role, on]) => (
            <li
              key={role}
              className="site-theme-builder__swatch"
              style={{
                backgroundColor: `var(--m3e-sys-color-${role})`,
                color: `var(--m3e-sys-color-${on})`,
              }}
            >
              {role}
            </li>
          ))}
        </ul>
      </div>

      <div className="site-theme-builder__actions">
        <Button variant="tonal" icon={<Icon name="format_paint" />} onPress={() => void apply()}>
          Use on this site
        </Button>
        <span role="status" className="site-theme-builder__status">
          {applied ? 'Applied to every page. Reset it from the home page.' : ''}
        </span>
      </div>
      <div className="site-code">
        <pre tabIndex={0} role="region" aria-label="Theme CSS">
          <code>
            {css ||
              '/* createTheme({ seed, variant, contrast, specVersion, mode, selector }).cssText */'}
          </code>
        </pre>
        <button
          type="button"
          className="m3e-icon-button m3e-icon-button--standard m3e-icon-button--size-xs site-code__copy"
          aria-label="Copy the theme CSS"
          data-copy
        >
          <span className="m3e-icon" aria-hidden="true">
            content_copy
          </span>
        </button>
      </div>
    </div>
  );
}
