import { isLocalImagePath } from './is-local-image-path.js';

export type ImageRef = {
  /** The path exactly as written in the markdown. */
  raw: string;
  /** 1-based line number inside the scanned text. */
  line: number;
  /** Offsets of `raw` inside the scanned text (end exclusive). */
  start: number;
  end: number;
};

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
// ![alt](<path with spaces> "title") or ![alt](path "title")
const IMAGE_RE = /!\[(?:[^\]\\]|\\.)*\]\(\s*(<[^>\n]*>|[^\s()]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;

/**
 * Collect local image references from markdown, skipping fenced code blocks and inline code.
 * Remote images (`https://...`, `data:`) are ignored.
 */
export function collectLocalImages(markdown: string): ImageRef[] {
  const refs: ImageRef[] = [];
  let fence: string | null = null;
  let offset = 0;
  markdown.split('\n').forEach((rawLine, index) => {
    const lineStart = offset;
    offset += rawLine.length + 1;
    const line = rawLine.replace(/\r$/, '');
    const fenceMatch = line.match(FENCE_RE);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && line.trim() === fenceMatch[1]) {
        fence = null;
      }
      return;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      return;
    }
    const masked = maskInlineCode(line);
    IMAGE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMAGE_RE.exec(masked)) !== null) {
      let target = match[1];
      let targetStart = match.index + match[0].indexOf(target, match[0].indexOf(']('));
      if (target.startsWith('<') && target.endsWith('>')) {
        target = target.slice(1, -1);
        targetStart += 1;
      }
      if (!isLocalImagePath(target)) continue;
      refs.push({ raw: target, line: index + 1, start: lineStart + targetStart, end: lineStart + targetStart + target.length });
    }
  });
  return refs;
}

/** Replace inline code spans with spaces so their content is never matched, keeping offsets. */
function maskInlineCode(line: string): string {
  let out = '';
  let i = 0;
  while (i < line.length) {
    if (line[i] !== '`') {
      out += line[i];
      i += 1;
      continue;
    }
    let run = 0;
    while (line[i + run] === '`') run += 1;
    const close = findClosingTicks(line, i + run, run);
    if (close === -1) {
      out += line.slice(i, i + run);
      i += run;
      continue;
    }
    out += ' '.repeat(close + run - i);
    i = close + run;
  }
  return out;
}

/** Index of a backtick run of exactly `run` ticks at or after `from`, or -1. */
function findClosingTicks(line: string, from: number, run: number): number {
  const ticks = '`'.repeat(run);
  let search = from;
  while (search <= line.length) {
    const found = line.indexOf(ticks, search);
    if (found === -1) return -1;
    let after = found + run;
    if (line[after] !== '`') return found;
    while (line[after] === '`') after += 1;
    search = after;
  }
  return -1;
}
