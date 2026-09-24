/**
 * Bundled fallback guide. Used only when the server guide cannot be fetched and no
 * cached copy exists. The server guide (`GET /api/cli/guide`) is the source of truth.
 */
export const FALLBACK_GUIDE = `# KeyFlow CLI guide for AI agents (offline copy)

This is the copy bundled with the CLI. Run \`keyflow guide\` again when online for the latest rules.

## Upload order

1. Write or edit the markdown file.
2. Run \`keyflow check <file> --json\` and fix every error.
3. Show the human what will be uploaded and get approval.
4. Run \`keyflow push <file>\` (add \`--json\` for machine-readable output).

Never ask for, print, log, or store KeyFlow credentials, tokens, or \`.env\` values.
If the CLI is not logged in, ask the human to run \`keyflow login\` themselves.
Get explicit human approval before publishing publicly (\`publish: true\` or \`--publish\`).

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
---
\`\`\`

- Default: private draft. \`publish: true\` without \`visibility\` publishes as \`public\`.
- After the first push the CLI writes \`keyflow.id\` and \`keyflow.url\` into the frontmatter.
  Do not edit them. The next push updates the same post. Delete the \`keyflow\` block to create a new post.
- Local image paths (\`![alt](./images/a.png)\`) are resolved relative to the file and uploaded.
  PNG, JPEG, WebP, GIF only; 10MB per image; 50 images per push.

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
