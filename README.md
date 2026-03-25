# KeyFlow CLI ⚡️

The official command-line interface for **KeyFlow Editorial Studio**.  
Push markdown drafts directly from your terminal—or let your AI agents do it for you—straight to your KeyFlow workspace.

![npm](https://img.shields.io/npm/v/@keyflow-blog/cli?color=emerald)
![License](https://img.shields.io/npm/l/@keyflow-blog/cli)

## ✨ Features
- **Effortless Publishing**: Upload any local `.md` file as a private draft in seconds.
- **Smart Parsing**: Automatically extracts the `<h1>` (e.g., `# My Title`) from your markdown to use as the post title.
- **Browser Authentication**: Secure OAuth flow via the browser. No need to manage API keys or passwords.
- **Agentic Workflow Ready**: Fully supports headless execution by injecting the `KEYFLOW_REFRESH_TOKEN` environment variable, enabling 100% automated AI blogging pipelines.
- **Safe by Default**: All pushed content lands as a **private draft**. You always have the final say before publishing to the world.

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
Log in to your KeyFlow account. This will open a browser window for secure authentication.

```bash
keyflow login
```

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

If you are building an automated pipeline (like a GitHub Action or an AI Agent), you can bypass the `keyflow login` command by providing a refresh token directly via environment variables.

1. **Obtain a Token**: Run `keyflow login` on your local machine.
2. **Extract the Token**: Check the generated `~/.keyflow_session.json` file for your `refreshToken`.
3. **Set the ENV Variable**: In your CI/CD or Agent environment, set `KEYFLOW_REFRESH_TOKEN`.

```bash
export KEYFLOW_REFRESH_TOKEN="your_refresh_token_here"
keyflow push generated-article.md
```

The CLI will automatically use the provided token to authenticate silently.

---

## 🔜 Roadmap (Coming Soon)
- `--publish` option to bypass the draft stage and publish immediately.
- `--cover <image_path>` option to attach a local image as the post's cover image.

## 📄 License
MIT License © 2026 [KeyFlow Editorial Studio](https://keyflow.me)