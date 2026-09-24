import type { PostMeta } from './parse-frontmatter.js';
import type { SplitDocument } from './split-document.js';

export type ResolvedPost = {
  title: string;
  titleSource: 'frontmatter' | 'h1' | 'filename';
  /** Body to upload (frontmatter removed, H1 removed when it was used as title). */
  body: string;
  status: 'published' | 'draft';
  visibility: string;
  tags: string[];
  series?: string;
  cover?: string;
  summary?: string;
  language?: string;
  postId?: string;
  existingUrl?: string;
};

export type ResolveOptions = {
  /** `--publish` flag: treat as `publish: true` for this run only. */
  publish?: boolean;
  /** Fallback title when neither frontmatter nor H1 provides one. */
  fallbackTitle: string;
};

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Apply the simple-publishing defaults:
 * - publish true (frontmatter or --publish) => published, visibility defaults to public
 * - otherwise => draft, visibility defaults to private
 * - title: frontmatter > first H1 (removed from the body) > file name
 */
export function resolvePost(doc: SplitDocument, meta: PostMeta, options: ResolveOptions): ResolvedPost {
  const publish = options.publish === true || meta.publish === true;
  let title = meta.title;
  let titleSource: ResolvedPost['titleSource'] = 'frontmatter';
  let body = doc.body;

  if (!title) {
    const h1 = findFirstH1(body);
    if (h1) {
      title = h1.title;
      titleSource = 'h1';
      body = removeLine(body, h1.index, doc.eol);
    } else {
      title = options.fallbackTitle;
      titleSource = 'filename';
    }
  }

  return {
    title,
    titleSource,
    body,
    status: publish ? 'published' : 'draft',
    visibility: meta.visibility || (publish ? 'public' : 'private'),
    tags: meta.tags,
    series: meta.series,
    cover: meta.cover,
    summary: meta.summary,
    language: meta.language,
    postId: meta.keyflowId,
    existingUrl: meta.keyflowUrl,
  };
}

/** Find the first ATX H1 outside fenced code blocks. `index` is the 0-based line index. */
function findFirstH1(body: string): { title: string; index: number } | null {
  const lines = body.split(/\r?\n/);
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = line.match(FENCE_RE);
    if (fence) {
      if (fenceMatch && fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length && line.trim() === fenceMatch[1]) {
        fence = null;
      }
      continue;
    }
    if (fenceMatch) {
      fence = fenceMatch[1];
      continue;
    }
    const h1 = line.match(/^ {0,3}#[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/);
    if (h1) return { title: h1[1].trim(), index: i };
  }
  return null;
}

/** Remove one line (and a single blank line right after it) while keeping every other byte. */
function removeLine(body: string, index: number, eol: string): string {
  const lines = body.split(/\r?\n/);
  const removeCount = lines[index + 1] !== undefined && lines[index + 1].trim() === '' ? 2 : 1;
  lines.splice(index, removeCount);
  return lines.join(eol);
}
