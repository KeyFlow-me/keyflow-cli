import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import type { HtmlArtifactContracts as Contract } from './contracts.js';

function summary(value: unknown, uid: string): Contract['Summary'] {
  const item = value as Record<string, unknown> | null;
  if (!item || typeof item !== 'object' || Array.isArray(item)
    || !segment(item.id) || !segment(item.authorId) || (uid !== 'env-uid' && item.authorId !== uid)
    || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120
    || typeof item.description !== 'string' || item.description.length > 500
    || !['draft', 'published'].includes(String(item.status))
    || !Number.isSafeInteger(item.version) || (item.version as number) < 1
    || !Number.isSafeInteger(item.bytes) || (item.bytes as number) < 1 || (item.bytes as number) > 1024 * 1024
    || typeof item.createdAt !== 'string' || typeof item.updatedAt !== 'string'
    || (item.publication !== undefined && !['post', 'link'].includes(String(item.publication)))
    || (item.language !== undefined && !['ko', 'en'].includes(String(item.language)))) invalid();
  return {
    id: item!.id as string, authorId: item!.authorId as string, title: item!.title as string,
    description: item!.description as string, status: item!.status as Contract['Summary']['status'],
    version: item!.version as number, bytes: item!.bytes as number,
    createdAt: item!.createdAt as string, updatedAt: item!.updatedAt as string,
    ...(item!.publication ? { publication: item!.publication as 'post' | 'link' } : {}),
    ...(item!.language ? { language: item!.language as 'ko' | 'en' } : {}),
    ...(typeof item!.postSlug === 'string' ? { postSlug: item!.postSlug } : {}),
    ...(typeof item!.authorHandle === 'string' ? { authorHandle: item!.authorHandle } : {}),
    ...(['public', 'private', 'followers'].includes(String(item!.visibility)) ? { visibility: item!.visibility as 'public' | 'private' | 'followers' } : {}),
    ...(item!.orphaned === true ? { orphaned: true } : {}),
  };
}

function url(value: unknown, origin: string) {
  if (typeof value !== 'string' || !value) invalid();
  let parsed: URL;
  try { parsed = new URL(value as string, origin); } catch { return invalid(); }
  if (parsed.origin !== origin || parsed.username || parsed.password || parsed.search || parsed.hash) invalid();
  return parsed.toString();
}
function segment(value: unknown) { return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value); }
function invalid(): never { throw new KeyflowError('The server did not confirm a valid HTML result.', 502, 'invalid-html-response'); }

/** Select safe metadata only; server HTML, storage keys and unknown fields are never printed. */
export const htmlArtifactResponse = { summary, url };
