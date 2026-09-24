import type { CheckItem } from './check-item.js';

const CALLOUT_TYPES = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION', 'AI', 'USER', 'BOT', 'STEP'];
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Find unclosed fenced code blocks and unknown callout types in a markdown body.
 * `lineOffset` is the file line where the body starts.
 */
export function findBlockProblems(body: string, lineOffset: number): CheckItem[] {
  const items: CheckItem[] = [];
  let fence: { marker: string; line: number } | null = null;
  body.split(/\r?\n/).forEach((line, index) => {
    const fileLine = lineOffset + index;
    const fenceMatch = line.match(FENCE_RE);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence.marker[0] && fenceMatch[1].length >= fence.marker.length && line.trim() === fenceMatch[1]) {
        fence = null;
      }
      return;
    }
    if (fenceMatch) {
      fence = { marker: fenceMatch[1], line: fileLine };
      return;
    }
    const callout = line.match(/^\s*(?:>\s*)+\[!([^\]\s]+)\]/);
    if (callout && !CALLOUT_TYPES.includes(callout[1].toUpperCase())) {
      items.push({
        code: 'unknown-callout',
        line: fileLine,
        message: `Unknown callout type [!${callout[1]}].`,
        hint: `Use one of: ${CALLOUT_TYPES.map((type) => `[!${type}]`).join(', ')}.`,
        severity: 'error',
      });
    }
  });
  if (fence) {
    const open = fence as { marker: string; line: number };
    items.push({
      code: 'unclosed-code-block',
      line: open.line,
      message: `Code block opened with ${open.marker} is never closed.`,
      hint: `Add a closing ${open.marker} line after the code.`,
      severity: 'error',
    });
  }
  return items;
}
