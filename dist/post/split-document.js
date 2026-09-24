/**
 * Split a markdown source into its frontmatter and body.
 * A frontmatter block must start on the first line with `---` and end with a
 * line that is exactly `---` (or `...`). A leading BOM is ignored.
 */
export function splitDocument(source) {
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
