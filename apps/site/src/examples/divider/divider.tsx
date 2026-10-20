export default function Divider() {
  return (
    <div style={{ inlineSize: '100%' }}>
      <p>Above the line</p>
      <hr className="m3e-divider" />
      <p>Below the line</p>
      <div style={{ display: 'flex', gap: 'var(--m3e-sys-space-200)', alignItems: 'stretch' }}>
        <span>Left</span>
        <hr className="m3e-divider m3e-divider--vertical" aria-orientation="vertical" />
        <span>Right</span>
      </div>
    </div>
  );
}
