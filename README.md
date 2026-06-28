# KeyFlow CLI ⚡️

The official command-line interface for **KeyFlow Editorial Studio**.  
Push markdown drafts directly from your terminal—or let your AI agents do it for you—straight to your KeyFlow workspace.

![npm](https://img.shields.io/npm/v/@keyflow-blog/cli?color=emerald)
![License](https://img.shields.io/npm/l/@keyflow-blog/cli)

## ✨ Features
- **Effortless Publishing**: Upload any local `.md` file as a private draft in seconds.
- **Smart Parsing**: Automatically extracts the `<h1>` (e.g., `# My Title`) from your markdown to use as the post title.
- **Browser Authentication**: Secure one-time browser approval. The browser sends only a short-lived one-time code to the local callback.
- **Agentic Workflow Ready**: Supports headless execution with `KEYFLOW_DEVICE_CREDENTIAL` for controlled CI/agent environments.
- **Safe by Default**: All pushed content lands as a **private draft**. You always have the final say before publishing to the world.

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

### 3. Push a Draft
Upload a local markdown file.  
*(Make sure the first line of your file is an `# H1 Header`—KeyFlow CLI will automatically use it as the title!)*

```bash
keyflow push my-article.md
```

Your file will instantly appear in the **All Posts** section of your KeyFlow Editorial Studio as a private draft.

---

## 🤖 Automating with AI Agents (Headless Mode)

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

---

## 🔜 Roadmap (Coming Soon)
- `--publish` option to bypass the draft stage and publish immediately.
- `--cover <image_path>` option to attach a local image as the post's cover image.

## 📄 License
MIT License © 2026 [KeyFlow Editorial Studio](https://keyflow.me)
