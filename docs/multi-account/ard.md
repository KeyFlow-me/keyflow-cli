---
status: review
type: ai-generated
---

# Multi-account storage and authorization

## Ownership

- Application/Node CLI: `src/lib/config.ts` keeps its public session API;
  one account-store owner persists named profiles and mirrors the active session.
- Commands own explicit selection and safe error messages; auth owns PKCE,
  identity comparison and origin checks. Publishing keeps server ownership checks.
- KeyFlow Web owns username verification in device-code issuance and the approval UI.
  The authenticated device-session response adds optional `username` metadata.

## Contracts

`CLIConfig` gains optional `username`, `accountName` and `baseUrl`. Existing
`deviceCredential`, `tokenType`, `refreshToken`, `email`, `uid`, `lastLogin` remain.
`loadConfig(account?)`, `saveConfig(config, account?)`, `clearConfig(account?, all?)`
preserve existing callers. `AccountStore.list()`, `.use(name)` and `.saveCurrent(name)`
serve account commands. Unknown named accounts throw; absence of a bare default
returns null. Explicit argument wins over `KEYFLOW_ACCOUNT`; a selected profile
wins over ambient credential variables. Bare default retains existing env precedence.

Named sessions live in `~/.keyflow/accounts.json`, version 1, with credentials
restricted to 0600 and atomic replacement. `config.json` remains a flat active
session so Desktop can continue reading/writing it. Read-only commands do not
migrate files. Mutations snapshot the current flat session before replacing it.
An existing profile for another UID cannot be silently overwritten by an alias.

CLI login sends `username` in the browser query; approval sends optional
`expectedUsername` to `/api/auth/device/issue`. The server derives the actual
username from its authenticated UID's user record and rejects mismatches before
writing a grant. `/api/auth/device/session` adds optional `username` from that
same verified user. Callbacks and exchange responses remain code/state and
device-credential-only respectively. The CLI derives UID from the Firebase token
exchange and Firebase `accounts:lookup`, then checks saved UID/origin for later use.
Custom-token sign-in alone does not guarantee UID/email response fields; use the
authenticated ID-token lookup described in the [Firebase REST reference](https://firebase.google.com/docs/reference/rest/auth#section-get-account-info).
No new trust in callback PII.

## Verification and rollback

Use temporary homes, fixture credentials and mocked HTTP for multi-account storage,
two-account uploads, unknown names, env conflicts, UID mismatch, logout isolation,
corruption and permission tests. Run CLI tests/build and Web device-auth tests,
full auth surface tests, lint/type checks and approval UI states when the server/UI changes.
Attempt the production build and report environment or baseline blockers separately.
Check both old and new request shapes. No dependency or Firestore schema migration.
Rollback code leaves the active flat session readable by the old CLI/Desktop;
saved profiles remain local and must not be deleted automatically.
