---
status: review
type: ai-generated
---

# Multiple CLI accounts

Writers must retain independent local connections for personal and product accounts,
select an account for one upload, and switch the default without logging in again.
This extends the existing single-account CLI publishing PRD.

## Acceptance

- `login --account <username>` adds a connection without losing the existing one.
- `account list`, `account save <name>` and `account use <name>` expose saved
  connections, preserve an existing session under an explicit name, and select a default.
- `push --account <name>` and `KEYFLOW_ACCOUNT` select a saved connection. A missing
  explicit selection fails instead of using another account or ambient credentials.
- Existing bare commands and the Desktop-compatible `~/.keyflow/config.json` work.
- `logout` removes the selected local account, `logout --account <name>` removes
  that connection, and `logout --all` explicitly removes all local connections.
- Login approval must reject a different authenticated username at the server.
  The CLI verifies the returned username before storing a named login.
- Status/list never reveal credentials. Uploads validate the returned Firebase UID
  against the saved UID before images or drafts are sent.
- Tests use temporary configuration roots and mocked transport. No real login,
  upload, credential changes, package publication or production deployment runs.

## Compatibility and failure states

Legacy single-session files and environment credentials remain supported. Explicit
account selection never falls through. Corrupt local account storage fails clearly
and is never silently replaced. Existing sessions are retained as `default` when
they have no saved name; `account save taehwandev` can name the existing connection.
Existing `login` without a name retains its original behavior. New named login
requires the server username confirmation; old servers must fail closed for it.

This concerns separately authenticated users, not delegated publishing as another
author under one UID. No account merging or shared-ownership permissions are added.
