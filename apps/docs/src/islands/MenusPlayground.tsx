import {
  Button,
  Icon,
  IconButton,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

type Selection = 'all' | Set<string | number>;

/** React menus: actions, a segmented menu with checkable items, a vibrant radio menu, a submenu. */
export default function MenusPlayground() {
  const [last, setLast] = useState('none');
  const [style, setStyle] = useState<Selection>(new Set(['bold']));
  const [align, setAlign] = useState<Selection>(new Set(['left']));
  const keys = (s: Selection) => (s === 'all' ? 'all' : [...s].join(', ') || 'none');
  return (
    <div className="docs-menu-demos" data-testid="react-menus">
      <MenuTrigger>
        <IconButton aria-label="More (React)" data-testid="react-trigger">
          <Icon name="more_vert" />
        </IconButton>
        <Menu
          onAction={(key) => {
            setLast(String(key));
          }}
        >
          <MenuItem id="cut" icon="content_cut" trailingText="⌘X">
            Cut
          </MenuItem>
          <MenuItem id="copy" icon="content_copy" trailingText="⌘C">
            Copy
          </MenuItem>
          <MenuItem id="paste" icon="content_paste" trailingText="⌘V" isDisabled>
            Paste
          </MenuItem>
          <MenuItem
            id="align"
            icon="format_align_left"
            trailingIcon="arrow_right"
            submenu={
              <Menu
                aria-label="Align"
                onAction={(key) => {
                  setLast(String(key));
                }}
              >
                <MenuItem id="align-left" icon="format_align_left">
                  Left
                </MenuItem>
                <MenuItem id="align-center" icon="format_align_center">
                  Center
                </MenuItem>
                <MenuItem id="align-right" icon="format_align_right">
                  Right
                </MenuItem>
              </Menu>
            }
          >
            Align
          </MenuItem>
          <MenuItem id="share" icon="share" supportingText="Send a copy">
            Share
          </MenuItem>
        </Menu>
      </MenuTrigger>

      <MenuTrigger>
        <Button variant="tonal" data-testid="react-style-trigger">
          Style
        </Button>
        <Menu selectionMode="multiple" selectedKeys={style} onSelectionChange={setStyle}>
          <MenuSection title="Text" divider>
            <MenuItem id="bold" icon="format_bold" checkedIcon="check">
              Bold
            </MenuItem>
            <MenuItem id="italic" icon="format_italic" checkedIcon="check">
              Italic
            </MenuItem>
            <MenuItem id="underline" icon="format_underlined" checkedIcon="check">
              Underline
            </MenuItem>
          </MenuSection>
          <MenuSection aria-label="Visibility">
            <MenuItem id="hidden" checkedIcon="check" supportingText="Hide from others">
              Hidden
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuTrigger>

      <MenuTrigger>
        <Button variant="outlined" data-testid="react-align-trigger">
          Align
        </Button>
        <Menu
          variant="vibrant"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={align}
          onSelectionChange={setAlign}
        >
          <MenuItem id="left" icon="format_align_left">
            Left
          </MenuItem>
          <MenuItem id="center" icon="format_align_center">
            Center
          </MenuItem>
          <MenuItem id="right" icon="format_align_right">
            Right
          </MenuItem>
        </Menu>
      </MenuTrigger>

      <p className="docs-menu-log" data-testid="react-log">
        Last action: <output>{last}</output> · Style: <output>{keys(style)}</output> · Align:{' '}
        <output>{keys(align)}</output>
      </p>
    </div>
  );
}
