// Typed access to src/generated/api.json (scripts/api.js).
import data from '../generated/api.json';

export interface ReactProp {
  name: string;
  type: string;
  values: string | null;
  optional: boolean;
  description: string;
  default: string | null;
  deprecated: string | true | null;
}

export interface ReactExport {
  kind: 'component' | 'hook' | 'function';
  description: string;
  deprecated: string | true | null;
  props: ReactProp[];
  inherits: string[];
}

export interface ElementAttribute {
  property: string;
  attribute: string;
  type: string;
  reflect: boolean;
  declaredType: string | null;
  description: string;
  deprecated: string | true | null;
}

export interface ElementEvent {
  name: string;
  detail: string;
  description: string;
  deprecated: string | true | null;
}

export interface ElementApi {
  entry: string;
  class: string;
  description: string;
  deprecated: string | true | null;
  attributes: ElementAttribute[];
  events: ElementEvent[];
}

export interface CssApi {
  overview: string;
  sources: string;
  classes: string[];
  customProperties: { name: string; default: string | null; tokens: string | null }[];
}

export interface SpecSection {
  title: string;
  fields: Record<string, string>;
}

interface Api {
  react: Record<string, ReactExport>;
  elements: Record<string, ElementApi>;
  css: Record<string, CssApi>;
  spec: Record<string, SpecSection>;
}

export const API = data as unknown as Api;

/** The first spec field present among `names`. */
export function specField(spec: SpecSection | undefined, ...names: string[]): string | undefined {
  if (!spec) return undefined;
  for (const n of names) {
    const value = spec.fields[n];
    if (value) return value;
  }
  return undefined;
}

/** A deprecation note as text ("" when the tag has no text). */
export const deprecationText = (d: string | true | null): string | null =>
  d === null ? null : d === true ? '' : d;
