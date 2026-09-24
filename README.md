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

### 2. Check Status
Verify your current session and connection status.

```bash
keyflow status
```

### 3. Log Out
Remove the local CLI session file.

```bash
keyflow logout
```

`logout` clears `~/.keyflow/config.json` and the legacy local session fallback in the current directory. If `KEYFLOW_DEVICE_CREDENTIAL` or `KEYFLOW_REFRESH_TOKEN` is still set in your shell, commands in that shell can still authenticate through those environment variables.

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
keyflow:                        # written by the CLI after the first push; do not edit
  id: cli_1790000000000
  url: https://www.keyflow.me/@me/post/...
---
```

- No frontmatter works exactly like before: the first `# H1` is the title.
- When the title comes from the first `# H1`, that heading is removed from the uploaded body so the title is not shown twice.
- Defaults: without `publish: true` the post is a draft with `visibility: private`. With `publish: true` (or `--publish` for a single run) and no `visibility`, it is published as `public`.
- `series` is read from the frontmatter but not sent yet; the current server contract has no series field.

#### Updating the same post

After the first successful push the CLI writes only `keyflow.id` and `keyflow.url` into the frontmatter (it creates the frontmatter if needed). Every other line in the file stays byte-for-byte the same. This is the only time the CLI changes your file.

The next push sends that ID and updates the same post. If the post was deleted on KeyFlow, pushing the same file recreates it with the same ID; delete the `keyflow:` block to create a separate new post.

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
