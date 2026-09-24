import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Tests run against the compiled output (`npm test` builds first via `pretest`).
import { splitDocument } from '../dist/post/split-document.js';
import { parseFrontmatter } from '../dist/post/parse-frontmatter.js';
import { resolvePost } from '../dist/post/resolve-post.js';
import { writeKeyflowIdentity } from '../dist/post/write-keyflow-identity.js';
import { collectLocalImages } from '../dist/images/collect-local-images.js';
import { replaceImagePaths } from '../dist/images/replace-image-paths.js';
import { uploadImages } from '../dist/images/upload-images.js';
import { imageKey } from '../dist/images/image-key.js';
import { analyzeMarkdown } from '../dist/markdown-check/analyze-markdown.js';
import { AGENT_BLOCK } from '../dist/agent-setup/agent-block.js';
import { agentTargets } from '../dist/agent-setup/agent-targets.js';
import { upsertAgentBlock } from '../dist/agent-setup/upsert-agent-block.js';
import { writeAgentTarget } from '../dist/agent-setup/write-agent-target.js';
import { loadGuide } from '../dist/guide/load-guide.js';
import { FALLBACK_GUIDE } from '../dist/guide/fallback-guide.js';

const { start: BLOCK_START, end: BLOCK_END, pointer: AGENT_POINTER } = AGENT_BLOCK;
const guideCachePaths = (home) => ({ guide: path.join(home, '.keyflow', 'guide.md') });

const tempDir = () => mkdtempSync(path.join(tmpdir(), 'keyflow-cli-test-'));
const resolve = (source, publish) => {
  const doc = splitDocument(source);
  return resolvePost(doc, parseFrontmatter(doc), { publish, fallbackTitle: 'file-name' });
};
// 1x1 PNG
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082', 'hex');

// --- frontmatter -----------------------------------------------------------

test('no frontmatter: first H1 is the title and is removed from the body, private draft', () => {
  const post = resolve('# Hello World\n\nBody text.\n');
  assert.equal(post.title, 'Hello World');
  assert.equal(post.titleSource, 'h1');
  assert.equal(post.body, 'Body text.\n');
  assert.equal(post.status, 'draft');
  assert.equal(post.visibility, 'private');
  assert.equal(post.postId, undefined);
});

test('H1 inside a fenced code block is not used as the title', () => {
  const post = resolve('```md\n# Not a title\n```\n\n# Real Title\ntext\n');
  assert.equal(post.title, 'Real Title');
  assert.match(post.body, /# Not a title/);
});

test('frontmatter fields are parsed and title from frontmatter keeps the body H1', () => {
  const source = [
    '---',
    'title: From Frontmatter',
    'tags: [nextjs, "#cache"]',
    'visibility: followers',
    'series: deep-dive',
    'cover: ./images/cover.png',
    'summary: One line',
    'language: ko',
    'keyflow:',
    '  id: cli_123',
    '  url: https://www.keyflow.me/@me/post/x',
    '---',
    '# Section',
    'text',
  ].join('\n');
  const post = resolve(source);
  assert.equal(post.title, 'From Frontmatter');
  assert.equal(post.titleSource, 'frontmatter');
  assert.deepEqual(post.tags, ['nextjs', 'cache']);
  assert.equal(post.visibility, 'followers');
  assert.equal(post.series, 'deep-dive');
  assert.equal(post.cover, './images/cover.png');
  assert.equal(post.summary, 'One line');
  assert.equal(post.language, 'ko');
  assert.equal(post.postId, 'cli_123');
  assert.equal(post.existingUrl, 'https://www.keyflow.me/@me/post/x');
  assert.equal(post.body, '# Section\ntext');
});

test('publish defaults: publish true => published public; --publish flag works the same', () => {
  const published = resolve('---\npublish: true\n---\n# T\nx');
  assert.equal(published.status, 'published');
  assert.equal(published.visibility, 'public');
  const flag = resolve('# T\nx', true);
  assert.equal(flag.status, 'published');
  assert.equal(flag.visibility, 'public');
  const explicit = resolve('---\npublish: true\nvisibility: private\n---\n# T\nx');
  assert.equal(explicit.visibility, 'private');
  const draft = resolve('---\ntags: a, b\n---\n# T\nx');
  assert.equal(draft.status, 'draft');
  assert.equal(draft.visibility, 'private');
  assert.deepEqual(draft.tags, ['a', 'b']);
});

// --- id write-back ---------------------------------------------------------

test('write-back creates frontmatter when missing and keeps the rest byte-identical', () => {
  const source = '# Title\r\n\r\nBody with trailing spaces   \r\n';
  const next = writeKeyflowIdentity(source, 'cli_1', 'https://www.keyflow.me/@me/post/a');
  assert.equal(next, '---\r\nkeyflow:\r\n  id: cli_1\r\n  url: https://www.keyflow.me/@me/post/a\r\n---\r\n' + source);
  const reparsed = resolve(next);
  assert.equal(reparsed.postId, 'cli_1');
  assert.equal(reparsed.title, 'Title');
});

test('write-back adds a keyflow block to existing frontmatter without touching other lines', () => {
  const source = '---\ntitle: "Quoted: title"   # comment\ntags:\n  - a\n  - b\n---\n# Body H1\n\ntext\n';
  const next = writeKeyflowIdentity(source, 'cli_2', 'https://www.keyflow.me/@me/post/b');
  assert.equal(
    next,
    '---\ntitle: "Quoted: title"   # comment\ntags:\n  - a\n  - b\nkeyflow:\n  id: cli_2\n  url: https://www.keyflow.me/@me/post/b\n---\n# Body H1\n\ntext\n',
  );
});

test('write-back replaces existing keyflow id/url lines only', () => {
  const source = '---\nkeyflow:\n    id: old   # keep indent\n    note: keep me\ntitle: T\n---\nbody';
  const next = writeKeyflowIdentity(source, 'cli_3', 'https://x.test/p');
  assert.equal(next, '---\nkeyflow:\n    id: cli_3\n    url: https://x.test/p\n    note: keep me\ntitle: T\n---\nbody');
  // Idempotent when values are unchanged.
  assert.equal(writeKeyflowIdentity(next, 'cli_3', 'https://x.test/p'), next);
});

test('write-back quotes values that are not plain YAML scalars', () => {
  const next = writeKeyflowIdentity('# T\n', 'cli_4', 'https://x.test/a #b');
  assert.match(next, /url: "https:\/\/x\.test\/a #b"/);
  assert.equal(resolve(next).existingUrl, 'https://x.test/a #b');
});

// --- images ----------------------------------------------------------------

test('image collection skips fenced code, inline code, and remote URLs', () => {
  const md = [
    '![a](./images/a.png)',
    '`![inline](./no.png)` and ![b](<images/b c.png> "title")',
    '```',
    '![code](./code.png)',
    '```',
    '~~~~',
    '![tilde](./tilde.png)',
    '~~~~',
    '![remote](https://example.com/r.png) ![data](data:image/png;base64,AAAA)',
    '![again](./images/a.png)',
  ].join('\n');
  const refs = collectLocalImages(md);
  assert.deepEqual(refs.map((ref) => [ref.raw, ref.line]), [
    ['./images/a.png', 1],
    ['images/b c.png', 2],
    ['./images/a.png', 10],
  ]);
});

test('path replacement changes only image targets', () => {
  const md = 'See ![a](./a.png) and `![a](./a.png)`\n![b](<./b b.png>)\n';
  const refs = collectLocalImages(md);
  const out = replaceImagePaths(md, refs, (raw) => ({ './a.png': 'https://cdn/a.png', './b b.png': 'https://cdn/b.png' })[raw]);
  assert.equal(out, 'See ![a](https://cdn/a.png) and `![a](./a.png)`\n![b](<https://cdn/b.png>)\n');
});

test('uploadImages dedupes by hash, PUTs only missing images with exact headers', async () => {
  const dir = tempDir();
  writeFileSync(path.join(dir, 'a.png'), PNG);
  writeFileSync(path.join(dir, 'copy.png'), PNG);
  const images = [
    { raw: 'a.png', absolutePath: path.join(dir, 'a.png'), usage: 'content', line: 1 },
    { raw: 'copy.png', absolutePath: path.join(dir, 'copy.png'), usage: 'content', line: 2 },
    { raw: 'a.png', absolutePath: path.join(dir, 'a.png'), usage: 'cover', line: 3 },
  ];
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/api/cli/images')) {
      const body = JSON.parse(init.body);
      return new Response(
        JSON.stringify({
          images: body.images.map((image) => ({
            sha256: image.sha256,
            usage: image.usage,
            url: `https://cdn/${image.usage}/${image.sha256}.png`,
            uploadUrl: image.usage === 'cover' ? 'https://r2/put-cover' : null,
          })),
        }),
        { status: 200 },
      );
    }
    return new Response('', { status: 200 });
  };
  const result = await uploadImages('https://kf.test', 'token', 'public', images, fakeFetch);
  const request = JSON.parse(calls[0].init.body);
  assert.equal(request.visibility, 'public');
  assert.equal(request.images.length, 2);
  assert.deepEqual(Object.keys(request.images[0]).sort(), ['contentType', 'sha256', 'size', 'usage']);
  assert.equal(request.images[0].contentType, 'image/png');
  assert.equal(request.images[0].size, PNG.length);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'https://r2/put-cover');
  assert.equal(calls[1].init.method, 'PUT');
  assert.equal(calls[1].init.headers['Content-Type'], 'image/png');
  assert.equal(calls[1].init.headers['Content-Length'], String(PNG.length));
  assert.equal(result.uploaded, 1);
  assert.equal(result.reused, 1);
  assert.equal(result.urls.get(imageKey('content', path.join(dir, 'copy.png'))), `https://cdn/content/${request.images[0].sha256}.png`);
});

test('uploadImages stops with a clear error when the server has no image API (404)', async () => {
  const dir = tempDir();
  writeFileSync(path.join(dir, 'a.png'), PNG);
  const fakeFetch = async () => new Response('Not found', { status: 404 });
  await assert.rejects(
    uploadImages('https://kf.test', 't', 'private', [{ raw: 'a.png', absolutePath: path.join(dir, 'a.png'), usage: 'content', line: 1 }], fakeFetch),
    (error) => error.code === 'images-not-supported' && /does not support image upload/.test(error.message),
  );
});

// --- check -----------------------------------------------------------------

test('check reports unclosed code, unknown callouts, and image problems with file line numbers', () => {
  const dir = tempDir();
  mkdirSync(path.join(dir, 'images'));
  writeFileSync(path.join(dir, 'images', 'ok.png'), PNG);
  writeFileSync(path.join(dir, 'images', 'icon.svg'), '<svg/>');
  writeFileSync(path.join(dir, 'images', 'big.png'), Buffer.alloc(10 * 1024 * 1024 + 1));
  const file = path.join(dir, 'post.md');
  const source = [
    '---', // 1
    'cover: ./images/missing-cover.png', // 2
    '---', // 3
    '# Title', // 4
    '> [!TIP]', // 5
    '> fine', // 6
    '> [!DANGER]', // 7
    '![ok](./images/ok.png)', // 8
    '![svg](./images/icon.svg)', // 9
    '![big](./images/big.png)', // 10
    '![gone](./images/gone.png)', // 11
    '```ts', // 12
    '> [!NOPE] inside code is ignored', // 13
  ].join('\n');
  const analysis = analyzeMarkdown(file, source);
  const codes = analysis.items.map((item) => [item.code, item.line]);
  assert.deepEqual(codes, [
    ['missing-image', 2],
    ['unknown-callout', 7],
    ['unsupported-image-type', 9],
    ['image-too-large', 10],
    ['missing-image', 11],
    ['unclosed-code-block', 12],
  ]);
  for (const item of analysis.items) {
    assert.ok(item.message && item.hint, `${item.code} has message and hint`);
  }
  assert.equal(analysis.images.length, 1);
});

test('check limits a push to 50 images and flags invalid frontmatter', () => {
  const dir = tempDir();
  const lines = ['# Many'];
  for (let i = 0; i < 51; i += 1) {
    writeFileSync(path.join(dir, `i${i}.png`), PNG);
    lines.push(`![i](./i${i}.png)`);
  }
  const many = analyzeMarkdown(path.join(dir, 'many.md'), lines.join('\n'));
  assert.ok(many.items.some((item) => item.code === 'too-many-images'));

  const broken = analyzeMarkdown(path.join(dir, 'broken.md'), '---\ntitle: [unclosed\n---\nbody');
  assert.equal(broken.items[0].code, 'invalid-frontmatter');
  assert.equal(broken.post, undefined);

  const badVisibility = analyzeMarkdown(path.join(dir, 'v.md'), '---\nvisibility: everyone\n---\n# T\nbody');
  assert.deepEqual(badVisibility.items.map((item) => [item.code, item.line]), [['invalid-visibility', 2]]);
});

// --- agent setup -----------------------------------------------------------

test('agent block insert is idempotent and never touches other content', () => {
  const original = '# My rules\n\nKeep this.\n';
  const once = upsertAgentBlock(original);
  assert.ok(once.startsWith(original));
  assert.ok(once.includes(BLOCK_START) && once.includes(BLOCK_END) && once.includes(AGENT_POINTER));
  assert.equal(upsertAgentBlock(once), once);

  const stale = `${original}\n${BLOCK_START}\nold text\n${BLOCK_END}\n\nAfter block.\n`;
  const replaced = upsertAgentBlock(stale);
  assert.equal(replaced.split(BLOCK_START).length, 2);
  assert.ok(!replaced.includes('old text'));
  assert.ok(replaced.startsWith(original) && replaced.endsWith(`${BLOCK_END}\n\nAfter block.\n`));
});

test('agent setup writes detected targets under a temp HOME and re-running changes nothing', () => {
  const home = tempDir();
  const cwd = tempDir();
  mkdirSync(path.join(home, '.codex'));
  mkdirSync(path.join(home, '.claude'));
  mkdirSync(path.join(home, '.gemini', 'antigravity'), { recursive: true });
  writeFileSync(path.join(home, '.codex', 'AGENTS.md'), 'existing codex rules\n');

  const targets = agentTargets({ home, cwd });
  const detected = targets.filter((target) => target.detected);
  assert.deepEqual(detected.map((target) => target.id), ['codex', 'antigravity', 'gemini', 'claude']);
  assert.equal(targets.find((target) => target.id === 'project').detected, false);

  assert.deepEqual(detected.map(writeAgentTarget), ['updated', 'created', 'created', 'created']);
  const codex = readFileSync(path.join(home, '.codex', 'AGENTS.md'), 'utf8');
  assert.ok(codex.startsWith('existing codex rules\n'));
  const skill = readFileSync(path.join(home, '.claude', 'skills', 'keyflow', 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: keyflow\ndescription: .+\n---\n/);
  assert.ok(existsSync(path.join(home, '.gemini', 'AGENTS.md')));
  assert.ok(existsSync(path.join(home, '.gemini', 'GEMINI.md')));

  assert.deepEqual(agentTargets({ home, cwd }).filter((t) => t.detected).map(writeAgentTarget), ['unchanged', 'unchanged', 'unchanged', 'unchanged']);
});

test('codex target prefers AGENTS.override.md when it exists', () => {
  const home = tempDir();
  mkdirSync(path.join(home, '.codex'));
  writeFileSync(path.join(home, '.codex', 'AGENTS.override.md'), 'override\n');
  const codex = agentTargets({ home, cwd: home }).find((target) => target.id === 'codex');
  assert.equal(codex.file, path.join(home, '.codex', 'AGENTS.override.md'));
});

// --- guide -----------------------------------------------------------------

test('guide caches the server copy, then falls back to cache, then to the bundled copy', async () => {
  const home = tempDir();
  const online = async () =>
    new Response('# Server guide\n', { status: 200, headers: { 'Content-Type': 'text/markdown', 'X-KeyFlow-Guide-Version': '2026-09-24' } });
  const offline = async () => {
    throw new Error('network down');
  };

  const bundled = await loadGuide({ baseUrl: 'https://kf.test', homeDir: home, fetchImpl: offline });
  assert.equal(bundled.source, 'bundled');
  assert.equal(bundled.markdown, FALLBACK_GUIDE);
  for (const phrase of ['keyflow check', '[!STEP]', '<link-card', '<document-card', 'sandpack', 'mermaid', 'tag link', 'approval']) {
    assert.ok(FALLBACK_GUIDE.includes(phrase), `fallback guide mentions ${phrase}`);
  }

  const fresh = await loadGuide({ baseUrl: 'https://kf.test', homeDir: home, fetchImpl: online });
  assert.deepEqual([fresh.source, fresh.version], ['server', '2026-09-24']);
  assert.equal(readFileSync(guideCachePaths(home).guide, 'utf8'), '# Server guide\n');

  const cached = await loadGuide({ baseUrl: 'https://kf.test', homeDir: home, fetchImpl: offline });
  assert.deepEqual([cached.source, cached.version, cached.markdown], ['cache', '2026-09-24', '# Server guide\n']);

  const serverError = await loadGuide({ baseUrl: 'https://kf.test', homeDir: home, fetchImpl: async () => new Response('x', { status: 500 }) });
  assert.equal(serverError.source, 'cache');
});
