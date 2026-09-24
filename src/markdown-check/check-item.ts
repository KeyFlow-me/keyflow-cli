/** One `keyflow check` finding. `line` is a 1-based line in the markdown file. */
export type CheckItem = {
  code: string;
  line: number;
  message: string;
  hint?: string;
  severity: 'error' | 'warning';
};
