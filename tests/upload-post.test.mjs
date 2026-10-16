import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadPost } from '../dist/post/upload-post.js';

const time = '2026-10-17T00:00:00.000Z';
const post = { title: '한글', body: '본문', language: 'ko', status: 'draft', visibility: 'public',
  tags: [], scheduledAt: time, translationOf: 'en-source' };
const identity = { postId: 'saved-ko', url: 'https://keyflow.test/ko/@moru/post/ko' };
test('upload sends language, locale, translation, cover and requested schedule, and verifies proof', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'https://keyflow.test/api/cli/draft');
      assert.equal(init.headers.Authorization, 'Bearer fixture-token');
      const payload = JSON.parse(init.body);
      assert.deepEqual(payload, { title: '한글', content: 'secure-content', status: 'draft', visibility: 'public',
        language: 'ko', locale: 'ko', translationOf: 'en-source', scheduledAt: time, coverImage: 'secure-cover' });
      return Response.json({ success: true, ...identity,
        schedule: { postId: identity.postId, version: 'v1', status: 'scheduled', scheduledAt: time } });
    };
    assert.equal((await uploadPost('https://keyflow.test', 'fixture-token', post, 'secure-content', 'secure-cover')).schedule.status, 'scheduled');
  } finally { globalThis.fetch = original; }
});

test('old or malformed server scheduling proof fails while preserving a confirmed draft identity', async () => {
  const original = globalThis.fetch;
  try {
    for (const schedule of [undefined, { postId: 'wrong' }, { postId: identity.postId, version: 'v1',
      status: 'scheduled', scheduledAt: '2026-10-18T00:00:00.000Z' }]) {
      globalThis.fetch = async () => Response.json({ success: true, ...identity, schedule });
      await assert.rejects(uploadPost('https://keyflow.test', 'fixture', post, 'body'), error => {
        assert.equal(error.code, 'schedule-unconfirmed');
        assert.deepEqual(error.savedPost, identity);
        return true;
      });
    }
    globalThis.fetch = async () => Response.json({ success: false, postSaved: true, ...identity,
      code: 'registration_failed', error: 'Schedule registration failed', hint: 'Retry the saved draft' }, { status: 502 });
    await assert.rejects(uploadPost('https://keyflow.test', 'fixture', post, 'body'), error => {
      assert.equal(error.code, 'registration_failed');
      assert.deepEqual(error.savedPost, identity);
      return true;
    });
    globalThis.fetch = async () => Response.json({ error: 'forbidden' }, { status: 403 });
    await assert.rejects(uploadPost('https://keyflow.test', 'fixture', post, 'body'), error => !error.savedPost);
  } finally { globalThis.fetch = original; }
});
