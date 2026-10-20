// Copy buttons of code blocks (CodeBlock.astro): one delegated listener. The result is announced
// through a polite live region and shown by the icon for a moment.
const CONFIRM_MS = 2000;

let attached = false;

export function attachCopyButtons(): void {
  if (attached) return;
  attached = true;
  const status = document.createElement('div');
  status.className = 'site-sr-only';
  status.setAttribute('role', 'status');
  document.body.append(status);

  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-copy]');
    const code = button?.closest('.site-code')?.querySelector('pre')?.textContent;
    if (!button || code === undefined) return;
    const icon = button.querySelector('.m3e-icon');
    void navigator.clipboard.writeText(code).then(
      () => {
        status.textContent = 'Copied to the clipboard';
        if (icon) icon.textContent = 'check';
        setTimeout(() => {
          if (icon) icon.textContent = 'content_copy';
          status.textContent = '';
        }, CONFIRM_MS);
      },
      () => {
        status.textContent = 'Copy failed: select the code and copy it instead';
      },
    );
  });
}
