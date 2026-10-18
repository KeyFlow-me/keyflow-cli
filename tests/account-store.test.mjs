import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const configUrl = new URL('../dist/lib/config.js', import.meta.url).href;
const storeUrl = new URL('../dist/account/account-store.js', import.meta.url).href;
function scenario(body) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-accounts-'));
  const env = { ...process.env, HOME: home };
  for (const key of Object.keys(env)) if (key.startsWith('KEYFLOW_')) delete env[key];
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import path from 'node:path';
      import {loadConfig, saveConfig, clearConfig} from ${JSON.stringify(configUrl)};
      import {AccountStore} from ${JSON.stringify(storeUrl)};
      const dir = path.join(process.env.HOME, '.keyflow');
      const file = path.join(dir, 'config.json');
      const accounts = path.join(dir, 'accounts.json');
      const a = {uid:'uid-a',email:'a@example.test',lastLogin:'fixture',deviceCredential:'fixture-a'};
      const b = {uid:'uid-b',email:'b@example.test',lastLogin:'fixture',deviceCredential:'fixture-b'};
      ${body}
    `], { cwd: home, env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
}

test('named selection beats ambient secrets; unknown names never fall through', () => scenario(`
  saveConfig(a,'alice'); saveConfig(b,'bob');
  process.env.KEYFLOW_DEVICE_CREDENTIAL='ambient-fixture';
  process.env.KEYFLOW_ACCOUNT='alice';
  assert.equal(loadConfig().uid,a.uid);
  assert.equal(loadConfig('bob').uid,b.uid);
  assert.throws(()=>loadConfig('missing'),/Unknown account/);
  process.env.KEYFLOW_ACCOUNT='missing';
  assert.throws(()=>loadConfig(),/Unknown account/);
  delete process.env.KEYFLOW_ACCOUNT;
  assert.equal(loadConfig().deviceCredential,'ambient-fixture');
`));

test('a session file in the working directory is never read, migrated or deleted', () => scenario(`
  const legacy=path.join(process.cwd(),'.keyflow_session.json');
  fs.writeFileSync(legacy,JSON.stringify(a));
  assert.equal(loadConfig(),null);
  assert.deepEqual(AccountStore.list(),[]);
  assert.throws(()=>AccountStore.use('default'),/Unknown account/);
  saveConfig(b,'bob');
  assert.equal(loadConfig().uid,b.uid);
  assert.throws(()=>loadConfig('default'),/Unknown account/);
  assert.equal(fs.readFileSync(legacy,'utf8'),JSON.stringify(a));
  clearConfig(undefined,true);
  assert.equal(fs.readFileSync(legacy,'utf8'),JSON.stringify(a));
`));

test('switching snapshots and list is metadata only', () => scenario(`
  saveConfig(a);
  saveConfig(b,'bob');
  assert.equal(loadConfig('default').uid,a.uid);
  const before=fs.readFileSync(accounts,'utf8');
  assert.equal(JSON.stringify(AccountStore.list()).includes('fixture-'),false);
  assert.equal(fs.readFileSync(accounts,'utf8'),before);
  AccountStore.use('default');
  assert.equal(loadConfig().uid,a.uid);
  assert.equal(loadConfig('bob').uid,b.uid);
  assert.equal(fs.statSync(file).mode & 0o777,0o600);
  assert.equal(fs.statSync(accounts).mode & 0o777,0o600);
  assert.equal(fs.statSync(dir).mode & 0o777,0o700);
`));

test('aliases cannot steal another UID; Desktop overwrites retain both sessions', () => scenario(`
  saveConfig(a,'alice');
  assert.throws(()=>saveConfig(b,'alice'),/another user/);
  fs.writeFileSync(file,JSON.stringify({...b,accountName:'alice'}));
  const listed=AccountStore.list();
  assert.equal(listed.find(x=>x.name==='alice').uid,a.uid);
  assert.equal(listed.find(x=>x.active).uid,b.uid);
  AccountStore.use('alice');
  assert.equal(loadConfig().uid,a.uid);
  assert.equal(loadConfig('default').uid,b.uid);
  AccountStore.saveCurrent('personal');
  assert.equal(loadConfig('personal').uid,a.uid);
`));

test('logout removes only selected session; all explicitly clears local files', () => scenario(`
  saveConfig(a,'alice'); saveConfig(b,'bob');
  clearConfig('alice');
  assert.equal(loadConfig().uid,b.uid);
  assert.throws(()=>loadConfig('alice'),/Unknown account/);
  clearConfig();
  assert.equal(loadConfig(),null);
  saveConfig(a,'alice'); saveConfig(b,'bob');
  process.env.KEYFLOW_ACCOUNT='alice';
  clearConfig();
  delete process.env.KEYFLOW_ACCOUNT;
  assert.equal(loadConfig().uid,b.uid);
  clearConfig(undefined,true);
  assert.equal(fs.existsSync(file),false);
  assert.equal(fs.existsSync(accounts),false);
`));

test('corruption fails explicitly and is not overwritten', () => scenario(`
  saveConfig(a,'alice');
  fs.writeFileSync(accounts,'broken-json');
  assert.throws(()=>AccountStore.list(),/Invalid KeyFlow/);
  assert.throws(()=>saveConfig(b,'bob'),/Invalid KeyFlow/);
  assert.equal(fs.readFileSync(accounts,'utf8'),'broken-json');
  assert.equal(loadConfig().uid,a.uid);
  fs.writeFileSync(file,'broken-flat');
  assert.throws(()=>loadConfig(),/Invalid KeyFlow/);
`));

test('bare login retains an unnamed previous user instead of replacing default', () => scenario(`
  saveConfig(a);
  saveConfig(b);
  assert.equal(loadConfig().uid,b.uid);
  assert.equal(loadConfig('default').uid,a.uid);
  assert.equal(AccountStore.list().filter(x=>x.active).length,1);
`));

test('explicit all logout clears corrupt registry and flat session without parsing', () => scenario(`
  fs.mkdirSync(dir);
  fs.writeFileSync(file,'broken-flat');
  fs.writeFileSync(accounts,'broken-registry');
  assert.throws(()=>loadConfig(),/Invalid KeyFlow/);
  assert.throws(()=>AccountStore.list(),/Invalid KeyFlow/);
  clearConfig(undefined,true);
  assert.equal(fs.existsSync(file),false);
  assert.equal(fs.existsSync(accounts),false);
`));
