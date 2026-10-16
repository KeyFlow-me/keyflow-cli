import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSchedule } from '../dist/post/resolve-schedule.js';
import { analyzeMarkdown } from '../dist/markdown-check/analyze-markdown.js';

const now = Date.parse('2026-10-16T00:00:00Z');
test('scheduling accepts timezone offsets and exact supported time boundaries', () => {
  assert.equal(resolveSchedule('2026-10-16T09:01:00+09:00', now), '2026-10-16T00:01:00.000Z');
  assert.equal(resolveSchedule('2026-11-15T00:00:00Z', now), '2026-11-15T00:00:00.000Z');
  for (const value of [null, true, 123, [], '', '2026-10-16T01:00:00',
    '2026-10-16T00:00:59Z', '2026-11-15T00:00:01Z', '2026-10-32T12:00:00Z',
    '2026-10-16T24:00:00Z', '2026-10-16T01:00:00+24:00']) {
    assert.throws(() => resolveSchedule(value, now), /scheduled_at/);
  }
});

test('check resolves a scheduled public-target draft and rejects an immediate-publish conflict', () => {
  const time = new Date(Date.now() + 3600_000).toISOString();
  const source = `---\ntitle: Scheduled\nlanguage: ko\nscheduled_at: "${time}"\n---\nBody`;
  const good = analyzeMarkdown('/tmp/post.md', source);
  assert.equal(good.errors, 0);
  assert.equal(good.post.scheduledAt, time);
  assert.equal(good.post.status, 'draft');
  assert.equal(good.post.visibility, 'public');
  assert.equal(analyzeMarkdown('/tmp/post.md', source, true).errors, 1);
  assert.equal(analyzeMarkdown('/tmp/post.md', source.replace('title:', 'publish: true\ntitle:')).errors, 1);
  assert.equal(analyzeMarkdown('/tmp/post.md', source.replace(`"${time}"`, 'false')).errors, 1);
});
