import { AssistChip, ChipSet, Icon, SuggestionChip } from '@kyralabs/m3exp-web/react';

export default function Assist() {
  return (
    <ChipSet aria-label="Trip actions">
      <AssistChip leadingIcon={<Icon name="event" />}>Add to calendar</AssistChip>
      <AssistChip variant="elevated" leadingIcon={<Icon name="directions" />}>
        Directions
      </AssistChip>
      <AssistChip isDisabled leadingIcon={<Icon name="share" />}>
        Share
      </AssistChip>
      <SuggestionChip>Window seat</SuggestionChip>
      <SuggestionChip variant="elevated" icon={<Icon name="lightbulb" />}>
        Pack an umbrella
      </SuggestionChip>
    </ChipSet>
  );
}
