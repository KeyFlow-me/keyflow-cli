export type SplitDocument = {
  /** True when the file starts with a `---` YAML frontmatter block. */
  hasFrontmatter: boolean;
  /** Raw YAML text between the fences (without the fences). */
  yaml: string;
  /** Markdown body after the closing fence. */
  body: string;
  /** 1-based file line number where `body` starts. */
  bodyStartLine: number;
  /** Line ending detected in the file. */
  eol: '\n' | '\r\n';
};

/**
 * Split a markdown source into its frontmatter and body.
 * A frontmatter block must start on the first line with `---` and end with a
 * line that is exactly `---` (or `...`). A leading BOM is ignored.
 */
export function splitDocument(source: string): SplitDocument {
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const text = source.startsWith('﻿') ? source.slice(1) : source;
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trimEnd() !== '---') {
    return { hasFrontmatter: false, yaml: '', body: text, bodyStartLine: 1, eol };
  }
  for (let i = 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trimEnd();
    if (trimmed === '---' || trimmed === '...') {
      const yaml = lines.slice(1, i).join('\n');
      const body = lines.slice(i + 1).join(eol);
      return { hasFrontmatter: true, yaml, body, bodyStartLine: i + 2, eol };
    }
  }
  // An opening fence without a closing fence is plain markdown (e.g. a thematic break).
  return { hasFrontmatter: false, yaml: '', body: text, bodyStartLine: 1, eol };
}
