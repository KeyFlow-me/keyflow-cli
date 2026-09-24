import { parse as parseYaml } from 'yaml';
import { FrontmatterError } from './frontmatter-error.js';
import type { SplitDocument } from './split-document.js';

export type PostMeta = {
  title?: string;
  tags: string[];
  publish?: boolean;
  visibility?: string;
  series?: string;
  cover?: string;
  summary?: string;
  language?: string;
  keyflowId?: string;
  keyflowUrl?: string;
};

/** Parse the YAML frontmatter into known post fields. Unknown keys are ignored. */
export function parseFrontmatter(doc: SplitDocument): PostMeta {
  if (!doc.hasFrontmatter || !doc.yaml.trim()) return { tags: [] };
  let data: unknown;
  try {
    data = parseYaml(doc.yaml);
  } catch (error) {
    const linePos = (error as { linePos?: Array<{ line: number }> }).linePos;
    const line = linePos?.[0]?.line ? linePos[0].line + 1 : 1;
    const message = error instanceof Error ? error.message.split('\n')[0] : 'Invalid YAML';
    throw new FrontmatterError(`Invalid frontmatter YAML: ${message}`, line);
  }
  if (data === null || data === undefined) return { tags: [] };
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new FrontmatterError('Frontmatter must be a YAML mapping (key: value).', 1);
  }
  const record = data as Record<string, unknown>;
  const keyflow = (record.keyflow && typeof record.keyflow === 'object' ? record.keyflow : {}) as Record<string, unknown>;
  return {
    title: asString(record.title),
    tags: asTags(record.tags),
    publish: asBoolean(record.publish),
    visibility: asString(record.visibility)?.toLowerCase(),
    series: asString(record.series),
    cover: asString(record.cover),
    summary: asString(record.summary),
    language: asString(record.language),
    keyflowId: asString(keyflow.id),
    keyflowUrl: asString(keyflow.url),
  };
}

function asString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function asTags(value: unknown): string[] {
  const raw: unknown[] = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const tags: string[] = [];
  for (const item of raw) {
    const tag = asString(item)?.replace(/^#+/, '').trim();
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true' || lowered === 'yes') return true;
    if (lowered === 'false' || lowered === 'no') return false;
  }
  return undefined;
}
