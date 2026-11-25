import type { CheckItem } from './check-item.js';

const CALLOUT_TYPES = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION', 'AI', 'USER', 'BOT', 'STEP'];
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
const COMPARE_OPEN_RE = /^ {0,3}:::compare\s*$/;
const COMPARE_CLOSE_RE = /^ {0,3}:::\s*$/;
const IMAGE_RE = /!\[(?:[^\]\\]|\\.)*\]\(\s*(?:<[^>\n]+>|[^\s()]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

/**
 * Find unclosed fenced code blocks, unknown callout types, and invalid :::compare blocks in a markdown body.
 * `lineOffset` is the file line where the body starts.
 */
export function findBlockProblems(body: string, lineOffset: number): CheckItem[] {
  const items: CheckItem[] = [];
  let fence: { marker: string; line: number } | null = null;
  let compareBlock: { line: number; imageCount: number } | null = null;
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
    if (compareBlock) {
      if (COMPARE_CLOSE_RE.test(line)) {
        if (compareBlock.imageCount !== 2) {
          items.push({
            code: 'invalid-compare-block',
            line: compareBlock.line,
            message: `:::compare block contains ${compareBlock.imageCount} image(s); expected exactly 2.`,
            hint: 'Put exactly 2 Markdown images (Before then After) between :::compare and :::.',
            severity: 'error',
          });
        }
        compareBlock = null;
        return;
      }
      IMAGE_RE.lastIndex = 0;
      const matches = line.match(IMAGE_RE);
      if (matches) compareBlock.imageCount += matches.length;
      return;
    }
    if (COMPARE_OPEN_RE.test(line)) {
      compareBlock = { line: fileLine, imageCount: 0 };
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
  if (compareBlock) {
    const open = compareBlock as { line: number; imageCount: number };
    items.push({
      code: 'unclosed-compare-block',
      line: open.line,
      message: ':::compare block is never closed.',
      hint: 'Add a closing ::: line after the two comparison images.',
      severity: 'error',
    });
  }
  return items;
}
