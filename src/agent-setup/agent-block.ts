const start = '<!-- keyflow:agent:start -->';
const end = '<!-- keyflow:agent:end -->';

/** The same short pointer is written for every agent. Rules are never copied here. */
const pointer = `## KeyFlow (키플로우)

When the user asks to post, upload, or publish something to KeyFlow (키플로우), run \`keyflow guide\` first and follow it.
Do not copy KeyFlow rules into this file; \`keyflow guide\` always has the current ones.
If the \`keyflow\` command is missing, ask the user to install it with \`npm install -g @keyflow-blog/cli\`.`;

/** Marked block written into agent instruction files by `keyflow agent setup`. */
export const AGENT_BLOCK = {
  start,
  end,
  pointer,
  text: `${start}\n${pointer}\n${end}`,
} as const;
