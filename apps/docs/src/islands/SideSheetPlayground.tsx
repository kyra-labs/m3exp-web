import { Button, SideSheet } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/**
 * React side sheets, controlled: a standard sheet beside the content and a modal sheet with a back
 * button and actions; the last request is shown.
 */
export default function SideSheetPlayground() {
  const [standard, setStandard] = useState(true);
  const [modal, setModal] = useState(false);
  const [last, setLast] = useState('none');
  return (
    <div data-testid="react-side-sheets">
      <div className="docs-button-row">
        <Button
          onPress={() => {
            setModal(true);
          }}
          data-testid="react-open-modal"
        >
          Modal side sheet
        </Button>
        <span>
          Last: <output data-testid="react-last">{last}</output>
        </span>
      </div>
      <SideSheet
        variant="modal"
        isOpen={modal}
        onOpenChange={(open) => {
          setLast(open ? 'opened' : 'dismissed');
          setModal(open);
        }}
        headline="Filters"
        backButton
        onBack={() => {
          setLast('back');
        }}
        divider
        actions={
          <>
            <Button
              onPress={() => {
                setLast('saved');
                setModal(false);
              }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              onPress={() => {
                setModal(false);
              }}
            >
              Cancel
            </Button>
          </>
        }
        data-testid="react-modal"
      >
        <p>Filter options go here.</p>
      </SideSheet>

      <div className="docs-side-sheet-frame" data-testid="react-standard-frame">
        <div className="docs-side-sheet-frame__main">
          <p>
            Standard:{' '}
            <output data-testid="react-standard-value">{standard ? 'open' : 'closed'}</output>
          </p>
          <Button
            variant="tonal"
            onPress={() => {
              setStandard(!standard);
            }}
            data-testid="react-toggle-standard"
          >
            Toggle side sheet
          </Button>
        </div>
        <SideSheet
          isOpen={standard}
          onOpenChange={setStandard}
          headline="React sheet"
          data-testid="react-standard"
        >
          <p>Supplementary content.</p>
        </SideSheet>
      </div>
    </div>
  );
}
