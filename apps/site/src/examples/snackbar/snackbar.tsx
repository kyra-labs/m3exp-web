import { Button, SnackbarHost, useSnackbarHostState } from '@kyralabs/m3exp-web/react';

export default function Snackbars() {
  const snackbars = useSnackbarHostState();
  return (
    <>
      <Button
        variant="tonal"
        onPress={() => {
          void snackbars.showSnackbar('Photo saved');
        }}
      >
        Show a snackbar
      </Button>
      <Button
        variant="outlined"
        onPress={() => {
          void snackbars
            .showSnackbar({
              message: 'Message archived',
              actionLabel: 'Undo',
              withDismissAction: true,
            })
            .then((result) => {
              console.log(result); // 'action-performed' | 'dismissed'
            });
        }}
      >
        With an action
      </Button>
      <SnackbarHost hostState={snackbars} />
    </>
  );
}
