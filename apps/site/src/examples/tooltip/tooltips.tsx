import {
  Icon,
  IconButton,
  PlainTooltip,
  RichTooltip,
  TooltipTrigger,
} from '@kyralabs/m3exp-web/react';

export default function Tooltips() {
  return (
    <>
      <TooltipTrigger>
        <IconButton aria-label="Favorite">
          <Icon name="favorite" />
        </IconButton>
        <PlainTooltip>Add to favorites</PlainTooltip>
      </TooltipTrigger>
      <TooltipTrigger isPersistent>
        <IconButton aria-label="Permissions">
          <Icon name="info" />
        </IconButton>
        <RichTooltip subhead="Permissions" action="Request access" caret>
          Configure permissions for selected service accounts.
        </RichTooltip>
      </TooltipTrigger>
    </>
  );
}
