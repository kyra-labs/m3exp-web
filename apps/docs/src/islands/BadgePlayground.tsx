import { Badge, BadgedBox, Button, Icon, IconButton } from '@kyralabs/m3exp-web/react';
import { useId, useState } from 'react';

/**
 * React badges: a count that overflows to 999+, the dot, and short text with its own label.
 * IconButton asks for aria-label or aria-labelledby; aria-labelledby names it from the icon and
 * the badge (an aria-label would leave the badge out).
 */
export default function BadgePlayground() {
  const [count, setCount] = useState(8);
  const id = useId();
  return (
    <div data-testid="react-badges">
      <div className="docs-badges">
        <IconButton aria-labelledby={`${id}-inbox ${id}-inbox-badge`} data-testid="react-count">
          <BadgedBox badge={count > 0 ? <Badge id={`${id}-inbox-badge`} count={count} /> : null}>
            <Icon id={`${id}-inbox`} name="inbox" label="Inbox" />
          </BadgedBox>
        </IconButton>
        <IconButton
          variant="tonal"
          aria-labelledby={`${id}-mail ${id}-mail-badge`}
          data-testid="react-dot"
        >
          <BadgedBox badge={<Badge id={`${id}-mail-badge`} />}>
            <Icon id={`${id}-mail`} name="mail" label="Mail" />
          </BadgedBox>
        </IconButton>
        <IconButton
          variant="outlined"
          aria-labelledby={`${id}-new ${id}-new-badge`}
          data-testid="react-text"
        >
          <BadgedBox
            badge={
              <Badge id={`${id}-new-badge`} label="New features">
                NEW
              </Badge>
            }
          >
            <Icon id={`${id}-new`} name="star" label="What's new" />
          </BadgedBox>
        </IconButton>
      </div>
      <div className="docs-badges">
        <Button
          variant="outlined"
          data-testid="react-add-1"
          onPress={() => {
            setCount((n) => n + 1);
          }}
        >
          Add 1
        </Button>
        <Button
          variant="outlined"
          data-testid="react-add-500"
          onPress={() => {
            setCount((n) => n + 500);
          }}
        >
          Add 500
        </Button>
        <Button
          variant="text"
          data-testid="react-clear"
          onPress={() => {
            setCount(0);
          }}
        >
          Clear
        </Button>
        <p className="docs-menu-log">
          Count: <output data-testid="react-count-value">{count}</output>
        </p>
      </div>
    </div>
  );
}
