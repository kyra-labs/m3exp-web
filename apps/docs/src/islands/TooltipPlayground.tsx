import {
  Button,
  Icon,
  IconButton,
  PlainTooltip,
  RichTooltip,
  TooltipTrigger,
} from '@kyralabs/m3exp-web/react';
import { useState } from 'react';

/** React tooltips: plain on icon buttons, a persistent rich tooltip with an action, controlled. */
export default function TooltipPlayground() {
  const [last, setLast] = useState('none');
  const [open, setOpen] = useState(false);
  return (
    <div className="docs-tooltip-demos" data-testid="react-tooltips">
      <TooltipTrigger>
        <IconButton aria-label="Add to list" data-testid="react-plain">
          <Icon name="add" />
        </IconButton>
        <PlainTooltip>Add to list</PlainTooltip>
      </TooltipTrigger>

      <TooltipTrigger position="below">
        <IconButton aria-label="Settings" data-testid="react-below">
          <Icon name="settings" />
        </IconButton>
        <PlainTooltip caret>Settings</PlainTooltip>
      </TooltipTrigger>

      <TooltipTrigger isPersistent>
        <IconButton aria-label="Permissions (React)" data-testid="react-rich">
          <Icon name="info" />
        </IconButton>
        <RichTooltip
          subhead="Permissions"
          action="Request access"
          onAction={() => {
            setLast('Request access');
          }}
        >
          Configure permissions for selected service accounts. You can add and remove service
          account members and assign roles to them.
        </RichTooltip>
      </TooltipTrigger>

      {/* Controlled: the button opens it; a click outside reports onOpenChange(false). */}
      <TooltipTrigger isOpen={open} onOpenChange={setOpen} isPersistent isDisabled>
        <Button
          variant="outlined"
          data-testid="react-controlled"
          onPress={() => {
            setOpen(true);
          }}
        >
          Show tooltip
        </Button>
        <PlainTooltip>Controlled with isOpen</PlainTooltip>
      </TooltipTrigger>

      <p className="docs-menu-log">
        Last action: <output data-testid="react-log">{last}</output>
      </p>
    </div>
  );
}
