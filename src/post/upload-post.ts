import { keyflowFetch } from '../keyflow-api/keyflow-fetch.js';
import { KeyflowError } from '../keyflow-api/keyflow-error.js';
import { readKeyflowError } from '../keyflow-api/read-keyflow-error.js';
import type { ResolvedPost } from './resolve-post.js';

/** Verify save and schedule separately; a failed reservation must retain the saved draft ID. */
export async function uploadPost(baseUrl: string, idToken: string, post: ResolvedPost, content: string, coverImage?: string) {
  const response = await keyflowFetch(baseUrl, '/api/cli/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ title: post.title, content, status: post.status, visibility: post.visibility,
      ...(post.tags.length ? { tags: post.tags } : {}),
      ...(coverImage ? { coverImage } : {}), ...(post.postId ? { postId: post.postId } : {}),
      ...(post.language ? { language: post.language, locale: post.language } : {}),
      ...(post.translationOf ? { translationOf: post.translationOf } : {}),
      ...(post.summary ? { summary: post.summary } : {}),
      ...(post.scheduledAt ? { scheduledAt: post.scheduledAt } : {}) }),
  });
  const result = await response.clone().json().catch(() => ({})) as Record<string, unknown>;
  const identity = typeof result.postId === 'string' && result.postId
    ? { postId: result.postId, url: typeof result.url === 'string' ? result.url : undefined } : undefined;
  if (!response.ok) {
    const error = await readKeyflowError(response, 'Server rejected the upload');
    if (result.postSaved === true) error.savedPost = identity;
    throw error;
  }
  if (!result.success || !identity) throw new Error('Upload response did not confirm a saved postId.');
  if (post.scheduledAt) {
    const schedule = result.schedule as Record<string, unknown> | undefined;
    if (!schedule || schedule.postId !== identity.postId || schedule.status !== 'scheduled'
      || typeof schedule.version !== 'string' || !schedule.version
      || schedule.scheduledAt !== post.scheduledAt) {
      const error = new KeyflowError('Draft saved, but the server did not confirm the schedule.', response.status,
        'schedule-unconfirmed', 'The draft ID was kept. Check server scheduling support before retrying.');
      error.savedPost = identity;
      throw error;
    }
    return { ...identity, schedule: { postId: identity.postId, version: schedule.version,
      scheduledAt: post.scheduledAt, status: 'scheduled' as const } };
  }
  return { ...identity, schedule: undefined };
}
