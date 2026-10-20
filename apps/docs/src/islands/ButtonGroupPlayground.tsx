import { ButtonGroup, ButtonGroupItem } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

type Key = string | number;

/** React button groups: standard with press expansion, connected single-select, disabled, overflow. */
export default function ButtonGroupPlayground() {
  const [view, setView] = useState<Set<Key>>(new Set(['week']));
  const [last, setLast] = useState('none');
  return (
    <div className="docs-button-group-demos" data-testid="react-groups">
      <ButtonGroup
        aria-label="Playback (React)"
        buttonVariant="tonal"
        onAction={(key) => {
          setLast(String(key));
        }}
        data-testid="react-standard"
      >
        <ButtonGroupItem id="previous" icon="skip_previous">
          Previous
        </ButtonGroupItem>
        <ButtonGroupItem id="play" icon="play_arrow" variant="filled">
          Play
        </ButtonGroupItem>
        <ButtonGroupItem id="next" icon="skip_next">
          Next
        </ButtonGroupItem>
      </ButtonGroup>

      <div className="docs-button-group-connected">
        <ButtonGroup
          variant="connected"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={view}
          onSelectionChange={setView}
          aria-label="View (React)"
          data-testid="react-connected"
        >
          <ButtonGroupItem id="day">Day</ButtonGroupItem>
          <ButtonGroupItem id="week">Week</ButtonGroupItem>
          <ButtonGroupItem id="month">Month</ButtonGroupItem>
        </ButtonGroup>
      </div>

      <ButtonGroup
        aria-label="Playback (React, disabled)"
        buttonVariant="tonal"
        isDisabled
        data-testid="react-disabled"
      >
        <ButtonGroupItem id="previous" icon="skip_previous">
          Previous
        </ButtonGroupItem>
        <ButtonGroupItem id="play" icon="play_arrow" variant="filled">
          Play
        </ButtonGroupItem>
        <ButtonGroupItem id="next" icon="skip_next">
          Next
        </ButtonGroupItem>
      </ButtonGroup>

      <div className="docs-button-group-connected">
        <ButtonGroup
          variant="connected"
          selectionMode="single"
          defaultSelectedKeys={['day']}
          aria-label="View (React, one disabled)"
          data-testid="react-item-disabled"
        >
          <ButtonGroupItem id="day">Day</ButtonGroupItem>
          <ButtonGroupItem id="week">Week</ButtonGroupItem>
          <ButtonGroupItem id="month" isDisabled>
            Month
          </ButtonGroupItem>
        </ButtonGroup>
      </div>

      <div className="docs-button-group-resizable" data-testid="react-overflow-box">
        <ButtonGroup
          overflow
          aria-label="Edit (React)"
          onAction={(key) => {
            setLast(String(key));
          }}
          data-testid="react-overflow"
        >
          <ButtonGroupItem id="cut" icon="content_cut">
            Cut
          </ButtonGroupItem>
          <ButtonGroupItem id="copy" icon="content_copy">
            Copy
          </ButtonGroupItem>
          <ButtonGroupItem id="paste" icon="content_paste">
            Paste
          </ButtonGroupItem>
          <ButtonGroupItem id="share" icon="share">
            Share
          </ButtonGroupItem>
          <ButtonGroupItem id="delete" icon="delete">
            Delete
          </ButtonGroupItem>
        </ButtonGroup>
      </div>

      <p className="docs-button-group-log">
        View: <output data-testid="react-view">{[...view].join(', ')}</output>. Last action:{' '}
        <output data-testid="react-log">{last}</output>
      </p>
    </div>
  );
}
