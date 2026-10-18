# KeyFlow CLI ⚡️

The official command-line interface for **KeyFlow Editorial Studio**.  
Push markdown drafts directly from your terminal—or let your AI agents do it for you—straight to your KeyFlow workspace.

![npm](https://img.shields.io/npm/v/@keyflow-blog/cli?color=emerald)
![License](https://img.shields.io/npm/l/@keyflow-blog/cli)

## ✨ Features
- **One file, one command**: `keyflow push post.md` saves a private draft, publishes, or updates the same post.
- **Settings live in the file**: title, tags, visibility, cover, and summary go in optional YAML frontmatter. Without frontmatter, the first `# H1` is the title.
- **Local images just work**: Markdown images with local paths and a local `cover` are uploaded and linked. Your file keeps its local paths.
- **Same file, same post**: after the first push the CLI remembers the post ID in the file, so the next push updates it.
- **Built for AI agents**: `keyflow guide`, `keyflow check --json`, `push --json`, and `keyflow agent setup` let any agent (Claude Code, Codex, AGY, Gemini CLI, Cursor, ...) post correctly without guessing.
- **Browser Authentication**: Secure one-time browser approval. The browser sends only a short-lived one-time code to the local callback.
- **Account Controls**: Log in, log out, inspect local session status, and verify the installed CLI version.
- **Update Checks**: Compare your installed CLI with the latest npm release before choosing to update.
- **Agentic Workflow Ready**: Supports headless execution with `KEYFLOW_DEVICE_CREDENTIAL` for controlled CI/agent environments.
- **Safe by Default**: Without `publish: true` (or `--publish`), content lands as a **private draft**. Publishing is always an explicit choice.

---

## Documentation Language

The authoritative documentation language rule lives in [`AGENTS.md`](./AGENTS.md). This README is a human-facing pointer, not the source of truth.

In short, KeyFlow CLI documentation is written in English. Keep commands, file paths, API names, environment variables, package names, and external proper nouns literal.

---

## 🚀 Installation

Install the package globally via npm:

```bash
npm install -g @keyflow-blog/cli
```

*(Requires Node.js 18 or higher)*

This release retains the existing CLI package version format `YYYY.M.D`
(release date in Asia/Seoul), for example `2026.10.16`. Published versions are
immutable; a later same-day correction increments the final numeric component.
This release does not migrate the package to the Web application's release-tag scheme.

---

## 💻 Usage

### 1. Authenticate
Log in to your KeyFlow account. This opens your browser for a one-time approval.

```bash
keyflow login
```

What happens during login:

1. The CLI opens a temporary local callback server on `127.0.0.1:4242`.
2. Your browser opens the KeyFlow CLI approval page.
3. After you approve, the browser sends only a short-lived one-time code to the local callback.
4. The CLI exchanges that code with KeyFlow using PKCE.
5. KeyFlow returns a KeyFlow device credential, and the CLI saves that local device credential.

There is no token copy/paste step. The browser approval page never sends a Firebase refresh token, Firebase ID token, email, or uid to the local callback.
The interactive session is saved to `~/.keyflow/config.json` with user-only file permissions.

#### Keep personal and product accounts connected

```bash
keyflow account save taehwandev    # name the existing local connection, without logging out
keyflow login --account moru      # approve while signed into @moru in the browser
keyflow account list              # metadata only; never prints credentials
keyflow push moru.md --account moru
keyflow push personal.md --account taehwandev
keyflow account use taehwandev     # choose the default for commands without --account
keyflow status --account moru
```

Each saved connection belongs to one authenticated user. Named login checks the actual
KeyFlow username; use another browser or an incognito window when switching browser
accounts. It requires a server supporting username confirmation and fails safely on
older servers. `account save` labels an existing connection locally without verifying
that label as a username.

`keyflow push` keeps the short-lived Firebase ID token in `~/.keyflow/id-tokens.json`
(user-only permissions) and reuses it until five minutes before it expires, so pushes
within the hour skip the sign-in requests. `keyflow logout` deletes this file, and
credentials from environment variables are never cached.

Saved connections live in `~/.keyflow/accounts.json` (user-only permissions). The active
connection remains in the Desktop-compatible `config.json`; existing sessions are
preserved on the first mutation. Selection is `--account`, then `KEYFLOW_ACCOUNT`,
then the existing environment-credential/default-session behavior. An unknown named
account fails rather than falling back to another user's credentials. Automation and
agents should pass `--account` explicitly when more than one account is available.
New sessions are bound to their server origin and their Firebase UID is checked before
upload. Use separate markdown files per author; an existing `keyflow.id` belongs to its
original author and cannot be transferred by selecting another account.

### 2. Check Status
Verify your current session and connection status.

```bash
keyflow status
```

### 3. Log Out
Remove the selected local connection, or explicitly remove every saved connection.

```bash
keyflow logout
keyflow logout --account moru
keyflow logout --all
```

`logout` removes the selected account (`KEYFLOW_ACCOUNT` if set, otherwise the active
connection). Other saved accounts remain. `--all` removes all local saved sessions.
Environment credentials remain set until you unset them; logout never revokes credentials
on the server.

### 4. Push a Post
The whole flow is one file and one command:

```bash
keyflow login          # once
keyflow push post.md   # saves a private draft and remembers the post ID in the file
# edit post.md, set publish: true when you are ready
keyflow push post.md   # updates the same post and publishes it
```

#### Frontmatter (all optional)

```yaml
---
title: Next.js cache notes      # default: the first "# H1"
tags: [nextjs, cache]
publish: false                  # true = publish
visibility: public              # public | followers | private
cover: ./images/cover.png       # local path or https URL
summary: One-line summary       # default: KeyFlow writes an AI summary
language: en                    # ko | en, default: detected
translation_of: ./post.ko.md    # other language version: path or KeyFlow post id
keyflow:                        # written by the CLI after the first push; do not edit
  id: cli_1790000000000
  url: https://www.keyflow.me/@me/post/...
---
```

- No frontmatter works exactly like before: the first `# H1` is the title.
- When the title comes from the first `# H1`, that heading is removed from the uploaded body so the title is not shown twice.
- Defaults: without `publish: true` the post is a draft with `visibility: private`. With `publish: true` (or `--publish` for a single run) and no `visibility`, it is published as `public`.
- `translation_of` links a Korean and an English version of the same post. Use a path relative to the file (that file must be pushed first so it has `keyflow.id`) or a KeyFlow post id. `keyflow check` fails when the file is missing, not pushed yet, or uses the same `language`.
- `scheduled_at: "2026-10-20T09:00:00+09:00"` requests future publication, between one minute and 30 days from the current time. Use your future date and an explicit timezone. Leave `publish` false and omit `--publish`; combining immediate and scheduled publication is rejected. Scheduled drafts default to a future `visibility: public` while newly uploaded cover/content images stay private until publication.
- Scheduling requires the server's existing Cloud Tasks configuration and writer permissions. Before uploading images or content the CLI requires `capabilities.scheduledPublishing: true` from `/api/cli/config`; an old server fails closed. A success includes a confirmed `schedule` in JSON; saving a draft alone never counts as scheduling. If reservation fails after saving, the CLI exits nonzero, reports `postSaved: true`, and keeps `keyflow.id` so retrying updates that draft. Re-pushing registers a new reservation version; deleting `scheduled_at` from a file does not cancel a server reservation. Manage cancellation in KeyFlow's scheduled-post UI.
- `series` is read from the frontmatter but not sent yet; the current server contract has no series field.

#### Updating the same post

After the first successful push the CLI writes only `keyflow.id` and `keyflow.url` into the frontmatter (it creates the frontmatter if needed). Every other line in the file stays byte-for-byte the same. This is the only time the CLI changes your file.

The next push sends that ID and updates the same post. If the post was deleted on KeyFlow, pushing the same file recreates it with the same ID; delete the `keyflow:` block to create a separate new post.

For Korean/English editions, push the Korean file first, then add `translation_of: ./post.ko.md` to the English file and push it with the same account. Each file has its own `language`, title, summary, and saved ID. Each edition can be published immediately or scheduled separately; the pair is not an atomic batch.

#### Images

- Use local paths in normal Markdown images, relative to the markdown file (for example an image at `images/diagram.png` next to `post.md`). A local `cover` works the same way.
- Images inside code blocks and inline code are left alone. `https://` images are left as they are.
- PNG, JPEG, WebP, and GIF only. At most 10MB per image and 50 images per push. SVG is not accepted.
- The CLI hashes each image, asks KeyFlow which ones already exist, uploads only the missing ones, and replaces the paths in the uploaded copy. Your file keeps its local paths, so re-pushing does not upload the same image again.

#### Check before pushing

```bash
keyflow check post.md          # offline, no login needed
keyflow check post.md --json   # {ok, errors, warnings, items: [{code, line, message, hint, severity}]}
```

`check` finds unclosed code blocks, unknown callout types, invalid frontmatter or visibility, missing local images, unsupported image types, images over 10MB, and more than 50 images. `push` runs the same checks first and uploads nothing when there is an error.

```bash
keyflow push post.md --dry-run   # checks and shows what would be sent; no network request
keyflow push post.md --json      # machine-readable result: {ok, postId, url, status, visibility, images, error}
```

Server errors are shown with their hint when KeyFlow provides one (`{error, code, hint}`).

### 5. Version and Updates
Show the installed CLI version:

```bash
keyflow version
```

Check the latest npm release:

```bash
keyflow version --check
keyflow update
```

`keyflow update` checks whether a newer release exists and prints the npm install command. It does not modify your system by default.

To explicitly run the global npm update:

```bash
keyflow update --yes
```

---

## 🤖 Using KeyFlow from AI Agents

Most people just tell their agent "post this to KeyFlow" (키플로우에 올려줘). The CLI itself is the shared entry point, so this works the same in Claude Code, Codex, AGY (Antigravity), Gemini CLI, Cursor, or any agent that can run shell commands:

1. `keyflow --help` — the first line tells agents to run `keyflow guide` first.
2. `keyflow guide` — prints one short Markdown guide: upload steps, frontmatter, KeyFlow syntax (callouts, math, code, Mermaid, link and document cards, Sandpack), common mistakes, and safety rules.
3. The agent writes the markdown file.
4. `keyflow check post.md --json` — the agent fixes every error.
5. After the human approves, `keyflow push post.md --json`.

`keyflow guide` downloads the latest guide from KeyFlow (`GET /api/cli/guide`) and caches it in `~/.keyflow/guide.md` with its version in `~/.keyflow/guide.version`. Offline, it prints the cached copy, or a bundled copy when there is no cache. Status notes go to stderr, so stdout is pure Markdown. The same guide is available at `https://www.keyflow.me/tools/cli/guide.md` for agents that can only read URLs.

### Tell your agents about KeyFlow once: `keyflow agent setup`

```bash
keyflow agent setup          # shows the targets, asks which ones to write
keyflow agent setup --yes    # writes to every detected agent without asking
keyflow agent setup --print  # only prints the text, for agents not in the table
```

It adds the same few lines to each agent's instruction file: "when asked to post, upload, or publish to KeyFlow (키플로우), run `keyflow guide` first and follow it". It never copies the rules, so these files never go stale. The text sits inside a marked block (`<!-- keyflow:agent:start -->` ... `<!-- keyflow:agent:end -->`); running the command again replaces only that block and never touches the rest of the file.

| Agent | File |
|---|---|
| Codex | `~/.codex/AGENTS.md` (`$CODEX_HOME` respected; `AGENTS.override.md` when it exists) |
| Antigravity (AGY) | `~/.gemini/AGENTS.md` |
| Gemini CLI | `~/.gemini/GEMINI.md` |
| Claude Code | `~/.claude/skills/keyflow/SKILL.md` (a user skill) |
| Cursor and other `AGENTS.md` tools | `AGENTS.md` in the current repository (optional, pick it by number) |
| Anything else | paste the output of `keyflow agent setup --print` |

Cursor keeps its global rules in its settings UI, so for Cursor use the repository `AGENTS.md` or paste the `--print` text into its User Rules.

---

## 🔐 Automating with AI Agents (Headless Mode)

If you are building an automated pipeline (like a GitHub Action or an AI Agent), you can bypass the interactive browser approval by providing a KeyFlow device credential directly via environment variables.

Use this only for trusted automation. Do not copy credentials from the local session file into chat, logs, source control, or shared shell history.

```bash
export KEYFLOW_DEVICE_CREDENTIAL="your_keyflow_device_credential_here"
keyflow push generated-article.md
```

The CLI uses `KEYFLOW_DEVICE_CREDENTIAL` only when it is explicitly present. Normal `keyflow login` stores the local session under `~/.keyflow/config.json` with user-only file permissions.

`KEYFLOW_REFRESH_TOKEN` remains supported only as a legacy fallback for older automation. New automation should use `KEYFLOW_DEVICE_CREDENTIAL`.

### Session Priority

When a command needs authentication, the CLI checks credentials in this order:

1. `KEYFLOW_DEVICE_CREDENTIAL` environment variable.
2. `KEYFLOW_REFRESH_TOKEN` environment variable, legacy fallback only.
3. `~/.keyflow/config.json` from `keyflow login`.
4. Legacy `./.keyflow_session.json` fallback for older local installs.

Use `KEYFLOW_DEVICE_CREDENTIAL` only in controlled CI or agent environments. For normal local use, run `keyflow login`.

### Recommended AI Agent Prompt

If you prefer a prompt over `keyflow agent setup`, use this:

```text
You are preparing a KeyFlow post with the KeyFlow CLI.

Rules:
- Run `keyflow guide` first and follow it.
- Never ask for, print, log, or store KeyFlow credentials, Firebase tokens, device credentials, refresh tokens, or `.env` values.
- Use an existing authenticated local CLI session when available.
- If authentication is missing, ask the human to run `keyflow login` locally or provide `KEYFLOW_DEVICE_CREDENTIAL` through their own secret manager. Do not request the credential in chat.
- Run `keyflow check <file> --json` and fix every error.
- Only run `keyflow push <file>` after the human has approved it. Get explicit approval before `publish: true` or `--publish`.
- Do not claim the post is published unless `keyflow push` reported it.
- Report the resulting post ID and URL.
```

For non-interactive agent runs, keep `KEYFLOW_DEVICE_CREDENTIAL` in the runner's secret store and inject it only for the command that needs it:

```bash
KEYFLOW_DEVICE_CREDENTIAL="$KEYFLOW_DEVICE_CREDENTIAL" keyflow push generated-article.md
```

---

## 🔜 Roadmap
- `keyflow new` to create a post file with frontmatter and syntax examples.
- `keyflow syntax [topic]` and server-side checks driven by one KeyFlow syntax rule list.
- `series` support once the server accepts it.

## 📄 License
MIT License © 2026 [KeyFlow Editorial Studio](https://keyflow.me)
