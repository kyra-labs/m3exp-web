import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from '../icon/Icon.js';
import { reactContract, renderReact } from '../test/parity.js';
import { Badge, BadgedBox } from './Badge.js';

afterEach(() => {
  document.body.innerHTML = '';
});

const html = async (ui: Parameters<typeof renderReact>[0]) => (await renderReact(ui)).innerHTML;

describe('<Badge>', () => {
  it('is the dot without content, announced "New notification" (owner decision M9 #7)', async () => {
    expect(await html(<Badge />)).toBe(
      '<span class="m3e-badge"><span class="m3e-badge__label">New notification</span></span>',
    );
  });

  it('shows a count; the visible digits are aria-hidden, the label repeats them', async () => {
    expect(await html(<Badge count={8} />)).toBe(
      '<span class="m3e-badge m3e-badge--large"><span class="m3e-badge__text" aria-hidden="true">8</span><span class="m3e-badge__label">8</span></span>',
    );
  });

  it('caps the count at max: 999+ by default (owner decision M9 #6)', async () => {
    const text = async (ui: Parameters<typeof renderReact>[0]) => {
      const root = await renderReact(ui);
      return [
        root.querySelector('.m3e-badge__text')!.textContent,
        root.querySelector('.m3e-badge__label')!.textContent,
      ];
    };
    expect(await text(<Badge count={999} />)).toEqual(['999', '999']);
    expect(await text(<Badge count={1000} />)).toEqual(['999+', '999+']);
    expect(await text(<Badge count={42} max={9} />)).toEqual(['9+', '9+']);
    expect(await text(<Badge count={0} />)).toEqual(['0', '0']);
  });

  it('takes other short content and an overriding label', async () => {
    const root = await renderReact(<Badge label="3 unread messages">NEW</Badge>);
    expect(root.querySelector('.m3e-badge__text')!.textContent).toBe('NEW');
    expect(root.querySelector('.m3e-badge__label')!.textContent).toBe('3 unread messages');
    const counted = await renderReact(<Badge count={3} label="3 unread messages" />);
    expect(counted.querySelector('.m3e-badge__label')!.textContent).toBe('3 unread messages');
    const dot = await renderReact(<Badge label="Updates available" />);
    expect(dot.querySelector('.m3e-badge__label')!.textContent).toBe('Updates available');
  });

  it('label="" leaves the badge out of the accessible name', async () => {
    expect(await html(<Badge label="" />)).toBe('<span class="m3e-badge"></span>');
    expect(await html(<Badge count={5} label="" />)).toBe(
      '<span class="m3e-badge m3e-badge--large"><span class="m3e-badge__text" aria-hidden="true">5</span></span>',
    );
  });

  it('children React renders nothing for stay a dot; non-text children need a label', async () => {
    for (const empty of [null, false, '']) {
      const root = await renderReact(<Badge>{empty}</Badge>);
      expect(root.firstElementChild!.className).toBe('m3e-badge');
    }
    const icon = await renderReact(
      <Badge>
        <Icon name="star" />
      </Badge>,
    );
    expect(icon.firstElementChild!.className).toBe('m3e-badge m3e-badge--large');
    expect(icon.querySelector('.m3e-badge__label')).toBeNull();
  });

  it('forwards the ref, classes and attributes', async () => {
    const ref = createRef<HTMLSpanElement>();
    const root = await renderReact(<Badge ref={ref} className="extra" data-testid="b" count={2} />);
    const badge = root.firstElementChild!;
    expect(ref.current).toBe(badge);
    expect(badge.className).toBe('m3e-badge m3e-badge--large extra');
    expect(badge.getAttribute('data-testid')).toBe('b');
  });
});

describe('<BadgedBox>', () => {
  it('renders the anchor, then the badge (read after it)', async () => {
    expect(
      await html(
        <BadgedBox badge={<Badge count={8} />}>
          <Icon name="inbox" label="Inbox" />
        </BadgedBox>,
      ),
    ).toBe(
      '<span class="m3e-badged-box"><span class="m3e-icon" role="img" aria-label="Inbox">inbox</span><span class="m3e-badge m3e-badge--large"><span class="m3e-badge__text" aria-hidden="true">8</span><span class="m3e-badge__label">8</span></span></span>',
    );
  });

  it('forwards the ref, classes and attributes', async () => {
    const ref = createRef<HTMLSpanElement>();
    const root = await renderReact(
      <BadgedBox ref={ref} className="extra" id="box" badge={<Badge />}>
        <Icon name="mail" />
      </BadgedBox>,
    );
    expect(ref.current).toBe(root.firstElementChild);
    expect(ref.current!.className).toBe('m3e-badged-box extra');
    expect(ref.current!.id).toBe('box');
  });
});

describe('the m3e-css contract', () => {
  // The two examples in badge.css's header (whitespace between tags removed).
  const contract = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html.replace(/>\s+</g, '><');
    return reactContract(div);
  };
  const examples = [
    contract(`<span class="m3e-badged-box">
      <span class="m3e-icon" role="img" aria-label="Inbox">inbox</span>
      <span class="m3e-badge m3e-badge--large">
        <span class="m3e-badge__text" aria-hidden="true">999+</span>
        <span class="m3e-badge__label">999+</span>
      </span>
    </span>`),
    contract(`<span class="m3e-badged-box">
      <span class="m3e-icon" role="img" aria-label="Mail">mail</span>
      <span class="m3e-badge"><span class="m3e-badge__label">New notification</span></span>
    </span>`),
  ];

  it('matches the documented DOM', async () => {
    const large = await renderReact(
      <BadgedBox badge={<Badge count={1000} />}>
        <Icon name="inbox" label="Inbox" />
      </BadgedBox>,
    );
    const dot = await renderReact(
      <BadgedBox badge={<Badge />}>
        <Icon name="mail" label="Mail" />
      </BadgedBox>,
    );
    expect(reactContract(large)).toBe(examples[0]);
    expect(reactContract(dot)).toBe(examples[1]);
  });
});
