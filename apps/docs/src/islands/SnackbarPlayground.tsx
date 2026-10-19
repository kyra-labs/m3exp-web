import { Button, SnackbarHost, useSnackbarHostState } from '@kyralabs/m3exp-web/react';
import { useRef, useState } from 'react';

/**
 * React snackbars: `useSnackbarHostState()` + `<SnackbarHost>` (the ScaffoldSamples snackbars);
 * the last result is shown below.
 */
export default function SnackbarPlayground() {
  const hostState = useSnackbarHostState();
  const [last, setLast] = useState('none');
  const count = useRef(0);
  return (
    <div data-testid="react-snackbars">
      <div className="docs-button-row">
        <Button
          onPress={() => {
            void hostState.showSnackbar(`Snackbar # ${String(++count.current)}`).then(setLast);
          }}
          data-testid="react-show-simple"
        >
          Show snackbar
        </Button>
        <Button
          variant="tonal"
          onPress={() => {
            void hostState
              .showSnackbar({
                message: `Snackbar # ${String(++count.current)}`,
                actionLabel: 'Action',
                withDismissAction: true,
                duration: 'indefinite',
              })
              .then(setLast);
          }}
          data-testid="react-show-indefinite"
        >
          Indefinite, with dismiss
        </Button>
        <Button
          variant="outlined"
          onPress={() => {
            hostState.focus();
          }}
          data-testid="react-focus-snackbar"
        >
          Move focus to the snackbar
        </Button>
      </div>
      <p>
        Last result: <output data-testid="react-last">{last}</output>
      </p>
      <SnackbarHost hostState={hostState} data-testid="react-host" />
    </div>
  );
}
