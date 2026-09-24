/** Server error shape for every `/api/cli/*` route: `{ error, code, hint }`. */
export class KeyflowError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly hint?: string;
  constructor(message: string, status: number, code?: string, hint?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.hint = hint;
  }
}
