# CLI Simple Publishing PRD

**Path:** `specifications/features/cli-simple-publishing-prd.md`
**Version:** 2026.09.24
**Status:** Implemented (first release, not yet published to npm)
**Related Code:** `src/index.ts`, `src/commands/*.ts`, `src/post/*` (frontmatter, title, ID write-back), `src/images/*` (image references, limits, hashing, upload), `src/markdown-check/*` (offline checks), `src/guide/*` (guide loading and bundled fallback), `src/agent-setup/*` (agent targets and marked block), `src/keyflow-api/*` (base URL, server errors, ID token)
**Source of truth:** the Web PRD `../KeyFlow/specifications/features/cli-simple-publishing-prd.md` (product intent) and ARD `../KeyFlow/specifications/features/cli-simple-publishing-architecture.md` sections 3 and 4 (Web-CLI contract). This document mirrors them for the CLI side. When they disagree, the Web ARD wins.

---

## 1. Purpose

Make the CLI a publishing tool that works without remembering options: one file, one command. Images, publishing, updating the same post, and KeyFlow syntax guidance are added without adding required flags.

This PRD supersedes the non-goals "no publish-now behavior" and "no cover image upload" in [`cli-account-and-draft-workflow-prd.md`](cli-account-and-draft-workflow-prd.md).

## 2. Principles

1. **One file, one command.** The default usage is `keyflow push post.md`.
2. **Settings live in the file.** Title, tags, visibility, cover, and summary go in YAML frontmatter. Flags are only one-off overrides.
3. **Same file, same post.** The first push writes the post ID into the file; later pushes update that post.
4. **Local image paths just work.** The CLI uploads local images and rewrites paths in the uploaded copy only. The source file keeps its paths.
5. **Safe defaults.** With no settings the result is a private draft. Public publishing is always explicit.
6. **The server owns the rules.** The CLI fetches the guide from KeyFlow and keeps only a small offline fallback.
7. **Failures say how to fix them.** Every check item and server error carries a hint when available.
8. **AI agents are first-class users.** Any agent that can run shell commands can learn the flow from the CLI itself.

## 3. Commands

| Goal | Command |
|---|---|
| Log in once | `keyflow login` |
| Save, publish, or update | `keyflow push post.md` |
| Check offline | `keyflow check post.md [--json]` |
| Agent guide | `keyflow guide` |
| Tell agents about KeyFlow | `keyflow agent setup [--print] [--yes]` |

`push` options: `--dry-run` (offline, no login), `--publish` (this run only), `--json`.

### 3.1 Agent flow

1. `keyflow --help` or bare `keyflow`: the first line says "AI agents: run `keyflow guide` first".
2. `keyflow guide`: one Markdown guide.
3. The agent writes the file.
4. `keyflow check post.md --json`.
5. After human approval, `keyflow push post.md --json`.

## 4. Frontmatter

All fields are optional. No frontmatter behaves like the previous CLI: the first `# H1` is the title.

| Field | Behavior |
|---|---|
| `title` | Default: first ATX H1 outside code blocks, which is then removed from the uploaded body (plus one blank line after it). Fallback: file name. |
| `tags` | YAML list or comma string. A leading `#` is stripped. Sent as `tags`. |
| `publish` | `true` (or `--publish`) sends `status: published`; otherwise `draft`. |
| `visibility` | `public`, `followers`, or `private`. Default `public` when publishing, `private` otherwise. Other values fail `check`. |
| `series` | Parsed, not sent. The ARD 3.3 draft contract has no series field yet. |
| `cover` | Local path (uploaded with `usage: cover`) or `https` URL. Sent as `coverImage`. |
| `summary` | Sent as `summary`; the server skips the AI summary. |
| `language` | Sent as `language`. |
| `keyflow.id`, `keyflow.url` | Written by the CLI. `keyflow.id` is sent as `postId`. |

### 4.1 ID write-back

- After a successful push, when the returned `postId` or `url` differs from the file, the CLI writes only `keyflow.id` and `keyflow.url`.
- Every other line stays byte-for-byte identical, including line endings, comments, quoting, and a BOM. Missing frontmatter is created at the top of the file.
- The file is re-read right before writing so edits made during the upload are kept.
- If the post was deleted on KeyFlow, pushing the same file recreates it with the same ID (server contract, ARD 3.3). Delete the `keyflow:` block to create a separate new post. The CLI has no special handling for this case.

## 5. Images

1. Collect local image references from the body (standard Markdown image syntax, with an optional title or an angle-bracket path), skipping fenced code blocks and inline code, plus a local `cover`. Remote (`https:`, `data:`, `//`) targets are ignored.
2. Resolve paths relative to the markdown file (URI-decoded when needed).
3. Allow PNG, JPEG, WebP, GIF by extension; at most 10MB each and 50 per push (unique files per usage).
4. Compute SHA-256 per file and `POST /api/cli/images` with `{ visibility, images: [{ sha256, size, contentType, usage }] }`, deduplicated by hash and usage.
5. `PUT` only entries whose `uploadUrl` is non-null, with exactly the declared `Content-Type` and `Content-Length`.
6. Replace paths in the uploaded body only. `cover` becomes `coverImage`.
7. If `/api/cli/images` returns `404`, print that the server does not support image upload yet and stop before saving anything.

## 6. `keyflow check`

Offline. Items are `{ code, line, message, hint, severity }` with file line numbers.

| Code | Severity |
|---|---|
| `invalid-frontmatter` | error |
| `invalid-visibility` | error |
| `empty-content` | error |
| `unclosed-code-block` | error |
| `unknown-callout` (allowed: NOTE, TIP, IMPORTANT, WARNING, CAUTION, AI, USER, BOT, STEP) | error |
| `missing-image` | error |
| `unsupported-image-type` | error |
| `image-too-large` | error |
| `too-many-images` | error |

`push` and `push --dry-run` run the same checks first and stop on any error. `--dry-run` never sends a network request.

## 7. `keyflow guide`

- `GET /api/cli/guide` (`text/markdown`, header `X-KeyFlow-Guide-Version`). On success, cache to `~/.keyflow/guide.md` and `~/.keyflow/guide.version`, then print.
- On failure, print the cache; with no cache, print the bundled fallback. The fallback notice goes to stderr so stdout stays pure Markdown.
- The bundled fallback covers: upload order (write, check, human approval, push), frontmatter fields and defaults, callouts, math, fenced code with a language, Mermaid, `<link-card>`, `<document-card>`, Sandpack, the `#word` tag-link caution, the first-H1 title rule, and the safety rules.

## 8. `keyflow agent setup`

One table of targets (add a row for a new agent):

| Agent | File | Detected when |
|---|---|---|
| Codex | `$CODEX_HOME/AGENTS.md` (default `~/.codex`), or `AGENTS.override.md` when present | `~/.codex` exists |
| Antigravity (AGY) | `~/.gemini/AGENTS.md` | `~/.gemini/antigravity` or `~/.antigravity` exists |
| Gemini CLI | `~/.gemini/GEMINI.md` | `~/.gemini` exists |
| Claude Code | `~/.claude/skills/keyflow/SKILL.md` (created with skill frontmatter) | `~/.claude` exists |
| Cursor and other `AGENTS.md` tools | `./AGENTS.md` in the current directory | never by default; opt in by number |

- The same pointer text goes to every target inside `<!-- keyflow:agent:start -->` ... `<!-- keyflow:agent:end -->`. Re-running replaces only that block; content outside it is never changed.
- The command lists the targets and asks which to write (Enter = detected ones). `--yes` writes the detected ones without asking. `--print` only prints the block. In a non-interactive shell without `--yes`, nothing is written.
- The pointer says: when asked to post, upload, or publish to KeyFlow (키플로우), run `keyflow guide` first and follow it; do not copy rules.

## 9. Output and errors

- `push --json` prints `{ ok, file, title, status, visibility, postId, url, updated, fileUpdated, images: { total, uploaded, reused }, items, error? }`.
- Server errors use `{ error, code, hint }`. The CLI prints `error` and, when present, `hint`, and exits non-zero.

## 10. Safety

- The auth and device-credential flow is unchanged. Credentials are never printed.
- Automated tests never contact production. Real uploads are manual and need human approval.

## 11. Verification

- `npm run test` (builds first) covers frontmatter parsing and defaults, byte-preserving ID write-back, image collection outside code, path replacement, upload request shape and PUT headers, the images `404` stop, check rules, agent setup idempotency with a temp HOME, and the guide fallback chain.
- `npm run build`.
- Manual real upload only with human approval.

## 12. Out of scope

`keyflow new`, `keyflow syntax`, server-side checks, MCP, `pull`/`list`, and sending `series`.
