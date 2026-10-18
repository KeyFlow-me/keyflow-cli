import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { KeyflowServer } from '../dist/keyflow-api/keyflow-server.js';
import { keyflowFetch } from '../dist/keyflow-api/keyflow-fetch.js';
import { analyzeMarkdown } from '../dist/markdown-check/analyze-markdown.js';
import { uploadImages } from '../dist/images/upload-images.js';
import { writeAgentTarget } from '../dist/agent-setup/write-agent-target.js';

// 1x1 PNG
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082', 'hex');
const cli = new URL('../dist/index.js', import.meta.url).pathname;

function tempDir() {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-security-')));
}

// --- server pinning ---------------------------------------------------------

test('only https servers, or an explicitly allowed loopback http server, may receive credentials', () => {
  assert.equal(KeyflowServer.parse('https://staging.keyflow.me/some/path?x=1'), 'https://staging.keyflow.me');
  assert.throws(() => KeyflowServer.parse('http://attacker.example'), /must use https/);
  assert.throws(() => KeyflowServer.parse('http://localhost:3000'), /--allow-insecure-localhost/);
  assert.equal(KeyflowServer.parse('http://localhost:3000', { allowInsecureLocalhost: true }), 'http://localhost:3000');
  assert.throws(() => KeyflowServer.parse('http://10.0.0.5', { allowInsecureLocalhost: true }), /must use https/);
  // Assembled at runtime so the fixture is not mistaken for a stored credential URL.
  const withUserInfo = new URL('https://keyflow.me');
  withUserInfo.username = 'fixture';
  assert.throws(() => KeyflowServer.parse(withUserInfo.toString()), /must not contain credentials/);
  assert.throws(() => KeyflowServer.parse('not a url'), /Invalid KeyFlow server URL/);
});

test('an account without a recorded server and environment credentials belong to the default server', () => {
  assert.equal(KeyflowServer.of(null), 'https://www.keyflow.me');
  assert.equal(KeyflowServer.of({ uid: 'u', email: 'e', lastLogin: 'l' }), 'https://www.keyflow.me');
  assert.equal(KeyflowServer.of({ uid: 'u', email: 'e', lastLogin: 'l', baseUrl: 'https://kf.test' }), 'https://kf.test');
  assert.throws(() => KeyflowServer.of({ uid: 'u', email: 'e', lastLogin: 'l', baseUrl: 'http://attacker.example' }), /https/);
});

test('keyflowFetch stays on the pinned origin and refuses redirects', async () => {
  const calls = [];
  const fakeFetch = async (url, init) => { calls.push({ url, init }); return new Response('{}'); };
  await keyflowFetch('https://kf.test', '/api/cli/config', { method: 'GET' }, fakeFetch);
  assert.equal(calls[0].url, 'https://kf.test/api/cli/config');
  assert.equal(calls[0].init.redirect, 'error');
  assert.throws(() => keyflowFetch('https://kf.test', '//attacker.example/x', {}, fakeFetch), /left the pinned server/);
  assert.throws(() => keyflowFetch('https://kf.test', 'api/cli/config', {}, fakeFetch), /must start with/);
  assert.equal(calls.length, 1);
});

test('a .env file in the working directory is never loaded', () => {
  const dir = tempDir();
  const home = tempDir();
  try {
    fs.writeFileSync(path.join(dir, '.env'),
      'NEXT_PUBLIC_BASE_URL=https://attacker.example\nKEYFLOW_DEVICE_CREDENTIAL=planted-fixture\n');
    const env = { ...process.env, HOME: home };
    for (const key of Object.keys(env)) if (key.startsWith('KEYFLOW_') || key === 'NEXT_PUBLIC_BASE_URL') delete env[key];
    const result = spawnSync(process.execPath, [cli, 'status'], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Not logged in/);
    const source = fs.readFileSync(cli, 'utf8');
    assert.equal(/dotenv/.test(source), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(home, { recursive: true, force: true });
  }
});

// --- image confinement --------------------------------------------------------

function analyzeImages(dir, lines) {
  const file = path.join(dir, 'post.md');
  const source = ['# Title', 'Body', ...lines].join('\n');
  fs.writeFileSync(file, source);
  return analyzeMarkdown(file, source);
}

test('only real image files inside the post folder are uploaded', () => {
  const dir = tempDir();
  const outside = tempDir();
  try {
    const post = path.join(dir, 'post');
    fs.mkdirSync(path.join(post, 'images'), { recursive: true });
    fs.writeFileSync(path.join(post, 'images', 'ok.png'), PNG);
    fs.writeFileSync(path.join(dir, 'sibling.png'), PNG);
    fs.writeFileSync(path.join(outside, 'secret.png'), PNG);
    fs.writeFileSync(path.join(outside, 'id_ed25519'), 'PRIVATE KEY FIXTURE');
    fs.symlinkSync(path.join(outside, 'id_ed25519'), path.join(post, 'diagram.png'));
    fs.symlinkSync(outside, path.join(post, 'linked'));
    fs.writeFileSync(path.join(post, 'fake.png'), 'not an image');

    const analysis = analyzeImages(post, [
      '![ok](./images/ok.png)', // 3
      '![link](./diagram.png)', // 4
      '![up](../sibling.png)', // 5
      `![abs](${path.join(outside, 'secret.png')})`, // 6
      '![dir](./linked/secret.png)', // 7
      '![fake](./fake.png)', // 8
    ]);
    assert.deepEqual(analysis.items.map((item) => [item.line, item.code]), [
      [4, 'image-symlink'],
      [5, 'image-outside-folder'],
      [6, 'image-outside-folder'],
      [7, 'image-outside-folder'],
      [8, 'image-content-mismatch'],
    ]);
    assert.deepEqual(analysis.images.map((image) => image.raw), ['./images/ok.png']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('a dangling symlink is reported as a link, not followed', () => {
  const dir = tempDir();
  try {
    fs.symlinkSync(path.join(dir, 'missing-target.png'), path.join(dir, 'gone.png'));
    const analysis = analyzeImages(dir, ['![gone](./gone.png)']);
    assert.deepEqual(analysis.items.map((item) => item.code), ['image-symlink']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('upload re-checks each file and sends the exact bytes it hashed', async () => {
  const dir = tempDir();
  const outside = tempDir();
  try {
    fs.writeFileSync(path.join(dir, 'a.png'), PNG);
    const image = { raw: 'a.png', absolutePath: path.join(dir, 'a.png'), root: dir, usage: 'content', line: 1 };
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, init });
      if (url.endsWith('/api/cli/images')) {
        const body = JSON.parse(init.body);
        return new Response(JSON.stringify({ images: body.images.map((item) => ({ ...item, url: 'https://cdn/a.png', uploadUrl: 'https://r2/put' })) }));
      }
      return new Response('', { status: 200 });
    };
    await uploadImages('https://kf.test', 'token', 'public', [image], fakeFetch);
    assert.equal(calls[0].init.redirect, 'error');
    assert.equal(calls[1].init.redirect, 'error');
    assert.deepEqual(Buffer.from(calls[1].init.body), PNG);

    // Swapped for a link to a secret after `check` passed.
    fs.writeFileSync(path.join(outside, 'secret'), 'PRIVATE KEY FIXTURE');
    fs.rmSync(path.join(dir, 'a.png'));
    fs.symlinkSync(path.join(outside, 'secret'), path.join(dir, 'a.png'));
    calls.length = 0;
    await assert.rejects(uploadImages('https://kf.test', 'token', 'public', [image], fakeFetch), /symbolic link/);
    assert.equal(calls.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

// --- local trust ----------------------------------------------------------------

test('agent setup never writes through a linked project file but keeps linked global files working', () => {
  const dir = tempDir();
  try {
    const victim = path.join(dir, 'victim-profile');
    fs.writeFileSync(victim, 'original\n');
    const projectFile = path.join(dir, 'AGENTS.md');
    fs.symlinkSync(victim, projectFile);
    assert.throws(() => writeAgentTarget({ id: 'project', name: 'Project', scope: 'project', file: projectFile, detected: true }), /symbolic link/);
    assert.equal(fs.readFileSync(victim, 'utf8'), 'original\n');

    const dotfile = path.join(dir, 'dotfiles-CLAUDE.md');
    fs.writeFileSync(dotfile, '# Mine\n');
    const globalFile = path.join(dir, 'CLAUDE.md');
    fs.symlinkSync(dotfile, globalFile);
    assert.equal(writeAgentTarget({ id: 'claude', name: 'Claude', scope: 'global', file: globalFile, detected: true }), 'updated');
    assert.match(fs.readFileSync(dotfile, 'utf8'), /keyflow guide/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the browser is opened without a shell on every platform', () => {
  const source = fs.readFileSync(new URL('../dist/auth/open-browser.js', import.meta.url), 'utf8');
  assert.equal(/['"]cmd['"]/.test(source), false);
  assert.match(source, /rundll32/);
  assert.match(source, /url\.dll,FileProtocolHandler/);
  assert.match(source, /shell: false/);
});
