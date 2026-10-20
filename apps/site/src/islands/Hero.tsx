// The home page's live hero: pick a seed hue and a scheme variant and the whole site re-themes
// (createTheme from the theme entry, loaded on first change), next to a few expressive
// components that react to it. Static fallback: index.astro.
import {
  Button,
  ButtonGroup,
  ButtonGroupItem,
  Card,
  Fab,
  Icon,
  IconButton,
  LinearProgress,
  LoadingIndicator,
  Slider,
  Switch,
} from '@kyralabs/m3exp-web/react';
import { baselineColors } from '@kyralabs/m3e-tokens';
import { useEffect, useState } from 'react';
import { getSeedTheme, isDark, setMode, setSeedTheme } from '../scripts/theme';
import { hexToHue, hueToHex } from '../lib/color';

const VARIANTS = [
  { key: 'tonalSpot', label: 'Tonal' },
  { key: 'expressive', label: 'Expressive' },
  { key: 'vibrant', label: 'Vibrant' },
] as const;
type HeroVariant = (typeof VARIANTS)[number]['key'];

const BASELINE_HUE = Math.round(hexToHue(baselineColors.light.primary));

let latestTheme = 0;

async function applyTheme(hue: number, variant: HeroVariant): Promise<void> {
  const request = ++latestTheme;
  const { createTheme } = await import('@kyralabs/m3exp-web/theme');
  if (request !== latestTheme) return; // a newer choice is on its way
  const seed = hueToHex(hue);
  setSeedTheme({ seed, variant }, createTheme({ seed, variant }).cssText);
}

export default function Hero() {
  const saved = getSeedTheme();
  const [hue, setHue] = useState(saved ? Math.round(hexToHue(saved.seed)) : BASELINE_HUE);
  const [variant, setVariant] = useState<HeroVariant>(
    VARIANTS.find((v) => v.key === saved?.variant)?.key ?? 'expressive',
  );
  const [dark, setDark] = useState(isDark);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0.6);

  useEffect(() => {
    const sync = () => {
      setDark(isDark());
    };
    document.addEventListener('site-theme-change', sync);
    return () => {
      document.removeEventListener('site-theme-change', sync);
    };
  }, []);

  return (
    <div className="site-hero-demo">
      <Card variant="filled" className="site-hero-demo__controls">
        <h2 className="site-hero-demo__title">Theme this site</h2>
        <p className="site-hero-demo__hint">
          A seed color and a scheme variant generate every color role with Material Color Utilities.
        </p>
        <span className="site-hero-demo__label" aria-hidden="true">
          Seed hue {hue}°
        </span>
        <Slider
          aria-label="Seed hue"
          minValue={0}
          maxValue={359}
          value={hue}
          onChange={(value) => {
            setHue(Math.round(value));
          }}
          onChangeEnd={(value) => void applyTheme(Math.round(value), variant)}
        />
        <span className="site-hero-demo__label" id="hero-variant-label">
          Scheme variant
        </span>
        <ButtonGroup
          aria-labelledby="hero-variant-label"
          variant="connected"
          selectionMode="single"
          disallowEmptySelection
          buttonVariant="tonal"
          selectedKeys={[variant]}
          onSelectionChange={(keys) => {
            const next = VARIANTS.find((v) => keys.has(v.key))?.key;
            if (!next) return;
            setVariant(next);
            void applyTheme(hue, next);
          }}
        >
          {VARIANTS.map((v) => (
            <ButtonGroupItem key={v.key} id={v.key}>
              {v.label}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
        <div className="site-hero-demo__row">
          <Switch
            isSelected={dark}
            onChange={(selected) => {
              setMode(selected ? 'dark' : 'light');
            }}
            checkedIcon="dark_mode"
            uncheckedIcon="light_mode"
          >
            Dark theme
          </Switch>
          <Button
            variant="text"
            onPress={() => {
              setHue(BASELINE_HUE);
              setVariant('expressive');
              setSeedTheme(null, null);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>

      <Card variant="outlined" className="site-hero-demo__stage">
        <div className="site-hero-demo__row">
          <LoadingIndicator contained aria-label="Loading example" />
          <IconButton
            variant="tonal"
            size="m"
            aria-label="Like"
            isSelected={liked}
            onChange={setLiked}
          >
            <Icon name="favorite" />
          </IconButton>
          <Button variant="filled" size="m" icon={<Icon name="bolt" />}>
            Expressive
          </Button>
        </div>
        <LinearProgress shape="wavy" value={progress} aria-label="Wavy progress example" />
        <div className="site-hero-demo__row">
          <IconButton
            variant="outlined"
            aria-label="Less progress"
            onPress={() => {
              setProgress((p) => Math.max(0, p - 0.2));
            }}
          >
            <Icon name="remove" />
          </IconButton>
          <IconButton
            variant="outlined"
            aria-label="More progress"
            onPress={() => {
              setProgress((p) => Math.min(1, p + 0.2));
            }}
          >
            <Icon name="add" />
          </IconButton>
          <Fab aria-label="Share" icon={<Icon name="share" />} />
        </div>
      </Card>
    </div>
  );
}
