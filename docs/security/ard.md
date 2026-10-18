---
status: review
type: ai-generated
---

# Credential destination and local trust

The CLI is run inside folders other people write: cloned blogs, templates and
agent workspaces. Nothing in the working directory may decide where credentials
go, which account posts, or which local files leave the machine.

## Ownership

- `src/keyflow-api/keyflow-server.ts` decides which origin may receive an
  account's credentials. Login parses `--server`; every other command calls
  `KeyflowServer.of(config)`.
- `src/keyflow-api/keyflow-fetch.ts` is the only way to call a KeyFlow server.
  It joins an absolute path onto the pinned origin, rejects a result on any other
  origin, and sets `redirect: 'error'`.
- `src/images/image-file-guard.ts` decides which local files may be uploaded.
  `check`/`push` analysis and the upload step both use it.
- `src/account/account-store.ts` reads sessions only from `~/.keyflow`.

## Contracts

- No `.env` loading. `NEXT_PUBLIC_BASE_URL` has no effect.
- Server: `https` only; `http` only for `localhost`, `127.0.0.1` or `[::1]` with
  `--allow-insecure-localhost`; URLs with user info are rejected. The origin is
  saved as `baseUrl` at login. An account without `baseUrl` (saved before
  2026-10-16) and environment-variable credentials use `https://www.keyflow.me`.
  `getIdToken` still rejects an account whose `baseUrl` differs from the target.
- Google token endpoints are fixed hosts; they also refuse redirects and encode
  the server-provided `apiKey`.
- Images: the real path must be inside the real path of the markdown file's
  folder, the file itself must not be a symbolic link, and its first bytes must
  match the PNG/JPEG/WebP/GIF signature of its extension. Upload re-checks, reads
  once, and sends the hashed bytes.
- `./.keyflow_session.json` is neither read nor deleted.
- `keyflow agent setup` refuses to write through a symbolic link for the
  project-scope `AGENTS.md`; global files under the home folder may be links.
- Browser opening never uses a shell (`rundll32 url.dll,FileProtocolHandler` on
  Windows, `open`/`xdg-open` elsewhere). The URL is always printed as well.

## Compatibility

Local development against a KeyFlow server uses
`keyflow login --server http://localhost:3000 --allow-insecure-localhost`
instead of `NEXT_PUBLIC_BASE_URL`. Images outside the post folder must be moved
into it. Very old installs that only have `./.keyflow_session.json` log in again.

## Verification

`tests/security-hardening.test.mjs` covers server parsing, origin pinning,
redirect refusal, `.env` being ignored, every image rejection case including a
file swapped for a link after `check`, the agent setup link rule and the
shell-free browser opener. `tests/account-store.test.mjs` covers the ignored
working-directory session.
