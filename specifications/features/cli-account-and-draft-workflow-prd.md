# CLI Account and Draft Workflow PRD

**Path:** `specifications/features/cli-account-and-draft-workflow-prd.md`
**Version:** 2026.06.28
**Status:** Release Candidate
**Related Code:** `src/index.ts`, `src/commands/*.ts`, `src/auth/*.ts`, `src/version/*.ts`

---

## Purpose

KeyFlow CLI must be usable as a small but complete publishing client, not only as an auth transport. A writer should be able to authenticate, inspect the local session, safely log out, validate a markdown draft locally, upload it as a private draft, and check whether the CLI itself needs an update.

This PRD defines the minimum command surface and acceptance criteria before the CLI quality-of-life work can be considered shippable.

## Background

The secure device auth work replaced direct browser token delivery with one-time code + PKCE + local device credentials. That improved security, but it also exposed product gaps:

- `login` existed but `logout` did not.
- `push` uploaded content but did not provide a local dry-run path.
- `push` needed to prove the server returned a real draft `postId` before reporting success.
- Version and update checks were missing, making support and rollout harder.
- CLI documentation needed to match the real command set.

## Goals

- Provide a complete local account command set: `login`, `logout`, `status`.
- Ensure draft upload is explicit, private-by-default, and validated by server response.
- Add a local no-network validation mode for draft files.
- Add installed-version and latest-release checks.
- Keep update installation explicit; never modify the global CLI install unless the user passes an explicit flag.
- Provide a safe AI-agent usage prompt for draft creation workflows.
- Document all commands in English.

## Non-Goals

- ~~Do not add publish-now behavior. `push` must continue to create private drafts only.~~ Superseded by [`cli-simple-publishing-prd.md`](cli-simple-publishing-prd.md): `publish: true` or `--publish` publishes; the default is still a private draft.
- ~~Do not add cover image upload in this slice.~~ Superseded by [`cli-simple-publishing-prd.md`](cli-simple-publishing-prd.md): local `cover` and body images are uploaded.
- Do not change Web `/api/cli/draft` behavior in this slice.
- Do not run a real draft upload automatically during agent verification because it creates user account state.
- Do not remove legacy refresh-token support yet; keep it as a migration fallback.

## Command Requirements

### `keyflow login`

- Opens the KeyFlow browser approval page.
- Uses local callback server + one-time code + PKCE.
- Stores only the KeyFlow device credential in the local config.
- Browser callback must not include Firebase refresh tokens, Firebase ID tokens, email, or uid.

### `keyflow logout`

- Removes local CLI session files when present.
- Must report permission/delete failures and exit non-zero instead of silently claiming logout.
- Must warn if `KEYFLOW_DEVICE_CREDENTIAL` or `KEYFLOW_REFRESH_TOKEN` is still set in the shell.
- Must not revoke server sessions in this slice.

### `keyflow status`

- Reports whether a local or environment-based credential is available.
- Distinguishes device credential sessions from legacy refresh-token sessions.
- Must not print raw credentials.

### `keyflow push <file>`

- Reads a local markdown file.
- Extracts title from the first Markdown H1 when available.
- Sends `status: draft` and `visibility: private`.
- Exchanges the saved local credential for a short-lived ID token immediately before upload.
- Requires server response `{ success: true, postId: string }` before reporting success.
- Prints the draft ID and URL when available.
- Must fail on empty files, missing files, auth failure, non-OK API responses, or missing `postId`.

### `keyflow push <file> --dry-run`

- Validates the file path, non-empty content, title extraction, and character count.
- Must not require login.
- Must not send any network request.

### `keyflow version`

- Prints the installed CLI version.

### `keyflow version --check`

- Checks npm registry for the latest published `@keyflow-blog/cli` version.
- Prints whether an update is available.
- Must fail clearly if the registry cannot be reached.

### `keyflow update`

- Checks npm registry for the latest version.
- If an update exists, prints the explicit npm install command.
- Must not install anything by default.

### `keyflow update --yes`

- Runs `npm install -g @keyflow-blog/cli@latest` only after the explicit `--yes` flag.
- Must surface npm install failures.

## AI Agent Usage Contract

The README must include a reusable prompt for AI agents that:

- Prohibits asking for, printing, logging, or storing KeyFlow credentials, Firebase tokens, device credentials, refresh tokens, or `.env` values.
- Directs agents to use an existing local session when available.
- Requires missing auth to be handled by human-run `keyflow login` or a secret-manager-provided `KEYFLOW_DEVICE_CREDENTIAL`, not chat copy/paste.
- Requires `keyflow push <file> --dry-run` before any upload.
- Requires explicit human approval before creating a private draft.
- States that `push` creates drafts only and does not publish posts.
- Requires the agent to report the returned Draft ID and URL when available.

## Safety Requirements

- Never print local credentials, Firebase tokens, device credentials, or refresh tokens.
- Do not write credentials outside `~/.keyflow/config.json` except for the existing legacy fallback behavior.
- Do not create drafts during automated verification unless the tester explicitly runs the real `push` command.
- Use `HOME="$(mktemp -d)"` for local manual tests that should not touch the developer's real CLI session.

## Verification Requirements

Required automated checks:

- `npm run test`
- `npm run build`
- `git diff --check`
- `npx --yes @taehwandev/vibeguard audit . --rules "$AGENTPLAYBOOK_HOME"`

Required local smoke checks:

- `CLI_HOME="$(mktemp -d)" HOME="$CLI_HOME" node dist/index.js push test_draft.md --dry-run`
- `CLI_HOME="$(mktemp -d)" HOME="$CLI_HOME" node dist/index.js version`
- `CLI_HOME="$(mktemp -d)" HOME="$CLI_HOME" node dist/index.js logout`
- `CLI_HOME="$(mktemp -d)" HOME="$CLI_HOME" node dist/index.js status`
- `CLI_HOME="$(mktemp -d)" HOME="$CLI_HOME" node dist/index.js update`

Manual real upload verification, only when the tester accepts the external state change:

```bash
cd <keyflow-cli-repo>
CLI_HOME="$(mktemp -d)"
HOME="$CLI_HOME" NEXT_PUBLIC_BASE_URL=https://www.keyflow.me node dist/index.js login
HOME="$CLI_HOME" NEXT_PUBLIC_BASE_URL=https://www.keyflow.me node dist/index.js push test_draft.md
```

Expected result:

- CLI prints `Draft uploaded and verified`.
- CLI prints a non-empty `Draft ID`.
- The draft appears in KeyFlow Web as a private draft.

## Implementation Status

Current working tree has an implementation draft for:

- `logout`
- `version`
- `version --check`
- `update`
- `update --yes`
- `push --dry-run`
- `push` response verification
- README usage updates
- CLI contract tests

Before commit, review this PRD against the implementation and decide whether real draft upload verification is required for the release candidate.
