/** Server error shape for every `/api/cli/*` route: `{ error, code, hint }`. */
export class KeyflowError extends Error {
    status;
    code;
    hint;
    /** A server-confirmed draft survives a later scheduling failure. */
    savedPost;
    constructor(message, status, code, hint) {
        super(message);
        this.status = status;
        this.code = code;
        this.hint = hint;
    }
}
