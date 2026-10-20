/** `surfaceContainerHigh` → `surface-container-high` (token object key → custom property name). */
export function kebab(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
