/**
 * Bundled fallback guide. Used only when the server guide cannot be fetched and no
 * cached copy exists. The server guide (`GET /api/cli/guide`) is the source of truth.
 */
export const FALLBACK_GUIDE = `# KeyFlow CLI guide for AI agents (offline copy)

This is the copy bundled with the CLI. Run \`keyflow guide\` again when online for the latest rules.

## Markdown upload order

1. Write or edit the markdown file.
2. Run \`keyflow check <file> --json\` and fix every error.
3. Show the human what will be uploaded and get approval.
4. Run \`keyflow push <file>\` (add \`--json\` for machine-readable output).

Never ask for, print, log, or store KeyFlow credentials, tokens, or \`.env\` values.
If the CLI is not logged in, ask the human to run \`keyflow login\` themselves.
Get explicit human approval before publishing publicly (\`publish: true\` or \`--publish\`).

## HTML results

Use the separate HTML commands for a report, demo, or other self-contained result:

\`\`\`bash
keyflow html push report.html --title "Report" --language en --dry-run --json
keyflow html push report.html --title "Report" --language en --account NAME --json
keyflow html push report.html --title "Report" --as link --publish --account NAME --json
keyflow html list --account NAME --json
keyflow html push report.html --id ARTIFACT_ID --account NAME --json
\`\`\`

- Upload only after human approval; publishing additionally requires explicit approval and \`--publish\`.
  A new result defaults to a post with owner-only draft access. \`--draft\` explicitly saves a draft;
  do not combine it with \`--publish\`. An unpublished link is not a public share link.
- Use one nonempty UTF-8 \`.html\` or \`.htm\` file, at most 1 MiB including embedded assets.
  Keep CSS/JavaScript inline and embed images/fonts as data URLs in the isolated sandbox. External CDN assets, API calls,
  local relative files, browser storage, forms, and scripted popups are unsupported. Real user clicks
  on HTTP(S) links open safe new tabs; \`#fragment\` links scroll within the result.
- A new upload requires \`--title\` (at most 120 characters); \`--description\` is optional (at most 500).
  Choose \`--as post|link\` and optionally \`--language ko|en\`. \`--folder ID\` is create-only.
  Posts use the existing reader/library; standalone links are full-viewport pages outside feed/profile lists.
- \`--dry-run\` needs no login, makes no network request, and never rewrites the source file.
  Use it instead of \`keyflow check\` for HTML. HTML pushes never add frontmatter or saved IDs to the file.
- Retain the returned artifact ID for \`--id\` updates. The CLI reads the current version first and preserves
  omitted title, description, status, publication mode, and language. Mode conversion is forbidden.
  A version conflict stops without an automatic retry; inspect the current result before retrying.
- The selected server must advertise \`capabilities.htmlArtifacts: true\` before upload; old servers fail safely.
  \`html list\` fetches metadata, not source, uses current linked post state, hides Trash, and marks orphaned results.
- Use the Web editor for cover images, tags, custom slugs, bilingual edition linking, and advanced publishing.
  No HTML CLI delete command exists. Web's My HTML results list moves linked posts to Trash;
  deleting standalone links or orphaned results requires permanent-deletion confirmation.
- Keep account selection explicit when needed. Report IDs/URLs and confirmed state; never print credentials,
  storage keys, or raw source HTML in command results. Normal Markdown publishing stays unchanged.

## Frontmatter (all optional)

\`\`\`yaml
---
title: My post            # default: the first "# H1" (removed from the body)
tags: [nextjs, cache]
publish: false            # true = publish; default false = draft
visibility: public        # public | followers | private
cover: ./images/cover.png # local path or https URL
summary: One-line summary # default: AI summary
language: en              # ko | en, default: auto-detect
translation_of: ./post.ko.md # other language version: path or KeyFlow post id
scheduled_at: "2026-10-20T09:00:00+09:00" # optional future time; leave publish false
---
\`\`\`

- Default: private draft. \`publish: true\` without \`visibility\` publishes as \`public\`.
- After the first push the CLI writes \`keyflow.id\` and \`keyflow.url\` into the frontmatter.
  Do not edit them. The next push updates the same post. Delete the \`keyflow\` block to create a new post.
- \`translation_of\` links this file to the same post in another language. A path is relative to this file,
  and that file must be pushed first (it needs \`keyflow.id\`). Both files' \`language\` must differ.
- Add \`scheduled_at\` only for future publication (one minute to 30 days, explicit timezone).
  Do not combine it with \`publish: true\` or \`--publish\`. A scheduled post remains a draft and new images
  stay private until the server publishes it. Require a confirmed \`schedule\` result, not just a saved ID.
  The CLI checks server scheduling support before uploading any images or content.
  If registration fails after saving, the CLI keeps the ID and exits nonzero. Removing the field does not
  cancel a server reservation; use KeyFlow's scheduled-post UI. Each language edition is scheduled separately.
- Local image paths (\`![alt](./images/a.png)\`) are resolved relative to the file and uploaded.
  PNG, JPEG, WebP, GIF only; 10MB per image; 50 images per push. Keep images inside the post's
  folder as real files: symbolic links and paths outside the folder are rejected.

## KeyFlow syntax

- Callouts: \`> [!NOTE]\`, \`[!TIP]\`, \`[!IMPORTANT]\`, \`[!WARNING]\`, \`[!CAUTION]\`, \`[!AI]\`, \`[!USER]\`, \`[!BOT]\`, \`[!STEP]\`

  \`\`\`markdown
  > [!TIP]
  > Callout body text.
  \`\`\`

- Math: inline \`$E = mc^2$\`, block \`$$ ... $$\` on their own lines.
- Code: fenced code blocks with a language name after the opening fence (for example \`ts\`, \`python\`). Always close the fence.
- Mermaid: a fenced block with the \`mermaid\` language.
- Link card: \`<link-card url="https://example.com" title="Title" description="Description" image="https://example.com/og.png"></link-card>\`
- Document card: \`<document-card url="https://example.com/doc" title="Title" date="2026-01-01"></document-card>\`
- Sandpack: a fenced \`sandpack\` block containing JSON with the files to run.

## Common mistakes

- \`#word\` after whitespace (or at the start of a line) becomes a tag link. Write \`\\#word\` or use backticks when it is not a tag.
- The first \`# H1\` is used as the title when \`title\` is missing, so do not repeat the title as an H1.
- Unknown callout types and unclosed code blocks are errors in \`keyflow check\`.
`;
