import { Icon, IconButton, TextField } from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/**
 * React text fields: Compose's TextFieldWithErrorState (a counter and an error past 10
 * characters), TextFieldWithIcons (a clear button), a prefix / suffix field, a multi-line field
 * and an outlined field with the label above.
 */
export default function TextFieldPlayground() {
  const [username, setUsername] = useState('');
  const [query, setQuery] = useState('Material');
  const tooLong = username.length > 10;
  return (
    <div className="docs-text-field-grid" data-testid="react-text-fields">
      <TextField
        label="Username"
        value={username}
        onChange={setUsername}
        isRequired
        maxLength={20}
        isInvalid={tooLong}
        errorMessage="Text input too long"
        description="Up to 10 characters"
      />
      <TextField
        variant="outlined"
        label="Search"
        value={query}
        onChange={setQuery}
        leadingIcon="search"
        trailingIcon={
          query ? (
            <IconButton aria-label="Clear text" onPress={() => setQuery('')}>
              <Icon name="cancel" />
            </IconButton>
          ) : undefined
        }
      />
      <TextField label="Amount" prefix="$" suffix="USD" inputMode="decimal" />
      <TextField variant="outlined" label="Message" multiline description="Grows with its lines" />
      <TextField variant="outlined" labelPosition="above" label="Label above" placeholder="Placeholder" />
      <TextField label="Disabled" defaultValue="Input text" isDisabled />
    </div>
  );
}
