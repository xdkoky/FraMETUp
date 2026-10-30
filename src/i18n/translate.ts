/**
 * Message lookup keyed by the English source text (gettext-style): code stays
 * readable, and any string missing from a dictionary falls back to English.
 * `{name}` placeholders are interpolated from `vars`.
 */
export type Vars = Record<string, string | number>;
export type TFn = (source: string, vars?: Vars) => string;

export function makeT(dict: Record<string, string> | null): TFn {
  return (source, vars) => {
    const text = dict?.[source] ?? source;
    return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text;
  };
}
