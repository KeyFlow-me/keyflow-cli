import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { readHtmlSource } from '../dist/html-artifacts/read-source.js';

const cli = new URL('../dist/index.js', import.meta.url).pathname;
const dist = new URL('../dist/', import.meta.url).href;
const source = '<!doctype html><html lang="ko"><style>body{color:red}</style><img src="data:image/png;base64,AA=="><h1>결과물</h1><script>document.body.dataset.ready="yes"</script></html>';
const uid = 'owner-html';
function summary(extra = {}) {
  return { id: 'html-one', authorId: uid, title: 'Server title', description: 'Server description',
    status: 'published', publication: 'post', language: 'en', version: 7, bytes: Buffer.byteLength(source),
    createdAt: '2026-10-19T00:00:00Z', updatedAt: '2026-10-19T00:00:00Z',
    postSlug: 'my-custom-slug', authorHandle: 'writer', ...extra };
}
function child(args, options) {
  return new Promise((resolve, reject) => {
    const process = spawn(globalThis.process.execPath, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    process.stdout.on('data', value => { stdout += value; });
    process.stderr.on('data', value => { stderr += value; });
    process.on('error', reject);
    process.on('exit', code => resolve({ code, stdout, stderr }));
  });
}
async function fixture(run, options = {}) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-html-')));
  const requests = [];
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString();
    const call = { path: request.url, method: request.method, authorization: request.headers.authorization,
      body: text ? JSON.parse(text) : undefined };
    requests.push(call);
    if (options.handle && await options.handle(call, response, requests)) return;
    response.setHeader('Content-Type', 'application/json');
    if (call.path === '/api/cli/config') {
      response.end(JSON.stringify({ apiKey: 'fixture', capabilities: { htmlArtifacts: options.capability ?? true } }));
    } else if (call.path === '/api/auth/device/session') {
      assert.equal(call.authorization, 'Bearer fixture-device');
      response.end(JSON.stringify({ customToken: 'fixture-custom' }));
    } else if (call.method === 'GET' && call.path.startsWith('/api/cli/html?')) {
      response.end(JSON.stringify({ success: true, artifact: summary({ html: source, objectKey: 'DO-NOT-PRINT' }) }));
    } else if (call.path === '/api/cli/html' && call.method === 'GET') {
      response.end(JSON.stringify({ success: true, artifacts: [summary({ html: source, objectKey: 'DO-NOT-PRINT', token: 'DO-NOT-PRINT' })] }));
    } else if (call.path === '/api/cli/html' && call.method === 'POST') {
      const { html, expectedVersion, artifactId, folderId, ...metadata } = call.body;
      response.end(JSON.stringify({ success: true,
        artifact: summary({ ...metadata, version: expectedVersion ? expectedVersion + 1 : 1,
          html, objectKey: 'DO-NOT-PRINT', token: 'DO-NOT-PRINT' }),
        url: options.url ?? '/en/@writer/post/my-custom-slug' }));
    } else { response.statusCode = 404; response.end('{}'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const env = { ...process.env, HOME: directory };
  for (const key of Object.keys(env)) if (key.startsWith('KEYFLOW_')) delete env[key];
  const file = path.join(directory, 'result.html');
  fs.writeFileSync(file, options.source ?? source);
  const preloader = path.join(directory, 'firebase-fixture.mjs');
  fs.writeFileSync(preloader, `const original=globalThis.fetch;globalThis.fetch=async(url,init)=>{
    if(String(url).startsWith('https://identitytoolkit.googleapis.com/'))return Response.json({
      idToken:'h.'+Buffer.from(JSON.stringify({user_id:${JSON.stringify(uid)}})).toString('base64url')+'.s',expiresIn:'3600'});
    return original(url,init);
  };`);
  if (options.login !== false) {
    const seeded = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import {AccountStore} from '${dist}account/account-store.js';
      import {IdTokenCache} from '${dist}account/id-token-cache.js';
      const config={uid:${JSON.stringify(uid)},email:'fixture@example.test',username:'writer',lastLogin:'fixture',
        deviceCredential:'fixture-device',baseUrl:${JSON.stringify(origin)}};
      AccountStore.save(config,'selected');
      if(${options.noCache !== true})IdTokenCache.put(${JSON.stringify(origin)},config,{idToken:'cached-fixture',uid:config.uid,expiresAt:Date.now()+3600000});
    `], { env, encoding: 'utf8' });
    assert.equal(seeded.status, 0, seeded.stderr);
  }
  const execute = async (...args) => {
    const result = await child(['--import', preloader, cli, 'html', ...args], { cwd: directory, env });
    assert.equal(result.stderr, '', result.stderr);
    const json = args.includes('--json') ? JSON.parse(result.stdout) : undefined;
    assert.doesNotMatch(result.stdout, /DO-NOT-PRINT|fixture-device|cached-fixture|objectKey|<html/);
    return { ...result, json };
  };
  try { await run({ execute, requests, file, directory, origin }); }
  finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); }
}

test('real CLI creates an owner-only draft post by default and never changes source bytes', async () => fixture(async ({ execute, requests, file }) => {
  const before = fs.readFileSync(file);
  const result = await execute('push', file, '--title', '새 HTML', '--description', '설명', '--folder', 'folder-one', '--account', 'selected', '--json');
  assert.equal(result.code, 0);
  assert.equal(result.json.artifact.status, 'draft');
  assert.equal(result.json.artifact.publication, 'post');
  assert.match(result.json.url, /\/en\/@writer\/post\/my-custom-slug$/);
  assert.deepEqual(requests.map(call => [call.method, call.path]), [['GET', '/api/cli/config'], ['POST', '/api/cli/html']]);
  assert.deepEqual(requests[1].body, { title: '새 HTML', description: '설명', html: source,
    status: 'draft', publication: 'post', folderId: 'folder-one' });
  assert.equal(requests[1].authorization, 'Bearer cached-fixture');
  assert.deepEqual(fs.readFileSync(file), before);
}));

test('real CLI explicitly publishes a standalone Korean link', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--title', '공유', '--publish', '--as', 'link', '--language', 'ko', '--json');
  assert.equal(result.code, 0);
  assert.equal(requests[1].body.status, 'published');
  assert.equal(requests[1].body.publication, 'link');
  assert.equal(requests[1].body.language, 'ko');
}));

test('explicit ID reads current version and preserves omitted title, description, status, type and language', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--id', 'html-one', '--account', 'selected', '--json');
  assert.equal(result.code, 0);
  assert.equal(result.json.updated, true);
  assert.deepEqual(requests.map(call => call.path), ['/api/cli/config', '/api/cli/html?artifactId=html-one', '/api/cli/html']);
  assert.deepEqual(requests[2].body, { title: 'Server title', description: 'Server description', html: source,
    status: 'published', publication: 'post', language: 'en', artifactId: 'html-one', expectedVersion: 7 });
  assert.equal(result.json.artifact.version, 8);
}));

test('update accepts explicit metadata and draft overrides while preserving optimistic version', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--id', 'html-one', '--draft', '--title', 'Changed', '--description', '', '--language', 'ko', '--json');
  assert.equal(result.code, 0);
  assert.deepEqual(requests[2].body, { title: 'Changed', description: '', html: source, status: 'draft', publication: 'post', language: 'ko', artifactId: 'html-one', expectedVersion: 7 });
}));

test('offline dry-run validates new and update plans without accounts or requests', async () => fixture(async ({ execute, requests, file }) => {
  const first = await execute('push', file, '--title', 'Offline', '--dry-run', '--json');
  assert.equal(first.code, 0); assert.equal(first.json.dryRun, true);
  const second = await execute('push', file, '--id', 'html-one', '--dry-run', '--account', 'does-not-exist', '--json');
  assert.equal(second.code, 0); assert.equal(second.json.metadata, 'retained-from-server-on-upload');
  assert.equal(second.json.title, undefined); assert.equal(second.json.status, undefined);
  assert.equal(requests.length, 0);
}, { login: false }));

for (const [label, flags, code] of [
  ['missing title', [], 'invalid-title'], ['conflicting status', ['--title', 'T', '--publish', '--draft'], 'conflicting-status'],
  ['invalid publication', ['--title', 'T', '--as', 'page'], 'invalid-publication'],
  ['invalid language', ['--title', 'T', '--language', 'fr'], 'invalid-language'],
  ['folder override', ['--id', 'html-one', '--folder', 'folder'], 'folder-update-forbidden'],
  ['folder on standalone link', ['--title', 'T', '--as', 'link', '--folder', 'folder'], 'folder-link-forbidden'],
  ['invalid ID', ['--id', '../escape'], 'invalid-id'],
]) test(`${label} is rejected before authentication`, async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, ...flags, '--json');
  assert.equal(result.code, 1); assert.equal(result.json.error.code, code); assert.equal(requests.length, 0);
}));

test('publication cannot switch during an update and no POST is attempted', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--id', 'html-one', '--as', 'link', '--json');
  assert.equal(result.code, 1); assert.equal(result.json.error.code, 'publication-change-forbidden');
  assert.equal(requests.filter(call => call.method === 'POST').length, 0);
}));

test('old server capability fails closed before token exchange or HTML requests', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--title', 'T', '--json');
  assert.equal(result.code, 1); assert.equal(result.json.error.code, 'html-not-supported');
  assert.deepEqual(requests.map(call => call.path), ['/api/cli/config']);
}, { capability: false, noCache: true }));

test('unknown selected account cannot fall back to another local account', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--title', 'T', '--account', 'unknown', '--json');
  assert.equal(result.code, 1); assert.equal(result.json.error.code, 'account-selection-failed'); assert.equal(requests.length, 0);
}));

test('list exposes curated owner metadata without raw source or internal fields', async () => fixture(async ({ execute, requests }) => {
  const result = await execute('list', '--account', 'selected', '--json');
  assert.equal(result.code, 0); assert.deepEqual(result.json.artifacts, [summary()]);
  assert.deepEqual(requests.map(call => call.path), ['/api/cli/config', '/api/cli/html']);
}));

test('human-readable list distinguishes native visibility, orphaned rows and standalone public links', async () => fixture(async ({ execute }) => {
  const result = await execute('list');
  assert.equal(result.code, 0);
  assert.match(result.stdout, /html-one\tpost\tpublished\tprivate\tServer title/);
  assert.match(result.stdout, /orphan\tpost\tpublished\torphaned\tServer title/);
  assert.match(result.stdout, /link\tlink\tpublished\tpublic\tServer title/);
}, { handle: (call, response) => {
  if (call.method !== 'GET' || call.path !== '/api/cli/html') return false;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify({ success: true, artifacts: [summary({ visibility: 'private' }), summary({ id: 'orphan', orphaned: true }), summary({ id: 'link', publication: 'link' })] }));
  return true;
} }));

test('conflicts and uncertain failures never blindly retry a save or print server content', async () => {
  for (const status of [409, 500]) await fixture(async ({ execute, requests, file }) => {
    const result = await execute('push', file, '--id', 'html-one', '--json');
    assert.equal(result.code, 1); assert.equal(result.json.error.code, status === 409 ? 'version-conflict' : 'internal-error');
    assert.equal(requests.filter(call => call.path === '/api/cli/html' && call.method === 'POST').length, 1);
  }, { handle: (call, response) => {
    if (call.method !== 'POST' || call.path !== '/api/cli/html') return false;
    response.writeHead(status, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ success: false, error: source + ' DO-NOT-PRINT', hint: 'DO-NOT-PRINT', code: status === 409 ? 'version-conflict' : 'internal-error' }));
    return true;
  } });
});

test('a cached token gets one authenticated retry only after an explicit 401 rejection', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--title', 'T', '--json');
  assert.equal(result.code, 0);
  const saves = requests.filter(call => call.path === '/api/cli/html');
  assert.equal(saves.length, 2); assert.equal(saves[0].authorization, 'Bearer cached-fixture');
  assert.notEqual(saves[1].authorization, saves[0].authorization);
  assert.equal(requests.filter(call => call.path === '/api/auth/device/session').length, 1);
  assert.equal(requests.filter(call => call.path === '/api/cli/config').length, 1);
}, { handle: (call, response, requests) => {
  if (call.path !== '/api/cli/html' || requests.filter(item => item.path === '/api/cli/html').length !== 1) return false;
  response.writeHead(401, { 'Content-Type': 'application/json' }); response.end('{"success":false,"code":"unauthorized"}'); return true;
} }));

test('a second 401 stops after one retry', async () => fixture(async ({ execute, requests, file }) => {
  const result = await execute('push', file, '--title', 'T', '--json');
  assert.equal(result.code, 1); assert.equal(result.json.error.code, 'unauthorized');
  assert.equal(requests.filter(call => call.path === '/api/cli/html').length, 2);
}, { handle: (call, response) => {
  if (call.path !== '/api/cli/html') return false;
  response.writeHead(401, { 'Content-Type': 'application/json' }); response.end('{"success":false,"code":"unauthorized"}'); return true;
} }));

test('cross-origin result URLs cannot be printed as successful links', async () => fixture(async ({ execute, file }) => {
  const result = await execute('push', file, '--title', 'T', '--json');
  assert.equal(result.code, 1); assert.equal(result.json.error.code, 'invalid-html-response');
}, { url: 'https://attacker.example/result' }));

test('HTTP redirects do not forward the bearer token or retry writes', async () => fixture(async ({ execute, requests, file, origin }) => {
  const result = await execute('push', file, '--title', 'T', '--json');
  assert.equal(result.code, 1); assert.equal(requests.length, 2);
}, { handle: (call, response) => {
  if (call.path !== '/api/cli/html') return false;
  response.writeHead(307, { Location: '/leak' }); response.end(); return true;
} }));

test('strict source validation rejects bytes, extension, size and NUL without modifying originals', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-html-bytes-'));
  try {
    for (const [name, bytes, code] of [
      ['bad.html', Buffer.from([0xc3, 0x28]), 'invalid-utf8'],
      ['empty.html', Buffer.from(' \n'), 'empty-html'], ['nul.htm', Buffer.from('<p>\0</p>'), 'invalid-html'],
      ['large.html', Buffer.alloc(1024 * 1024 + 1, 65), 'html-too-large'], ['wrong.txt', Buffer.from(source), 'html-file-required'],
    ]) {
      const file = path.join(directory, name); fs.writeFileSync(file, bytes);
      assert.throws(() => readHtmlSource(file), error => error.code === code);
      assert.deepEqual(fs.readFileSync(file), bytes);
    }
    const bom = path.join(directory, 'bom.HTML');
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(source)]);
    fs.writeFileSync(bom, bytes);
    assert.equal(readHtmlSource(bom).html, source); assert.deepEqual(fs.readFileSync(bom), bytes);
    const exact = path.join(directory, 'exact.htm'); fs.writeFileSync(exact, Buffer.alloc(1024 * 1024, 65));
    assert.equal(readHtmlSource(exact).bytes, 1024 * 1024);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
