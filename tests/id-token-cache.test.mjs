import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = new URL('../dist/', import.meta.url).href;
function scenario(body, home = fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-token-cache-'))) {
  const env = {...process.env, HOME: home};
  for (const key of Object.keys(env)) if (key.startsWith('KEYFLOW_')) delete env[key];
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import path from 'node:path';
      import {saveConfig,loadConfig,clearConfig} from '${root}lib/config.js';
      import {getIdToken} from '${root}keyflow-api/get-id-token.js';
      import {pushCommand} from '${root}commands/push.js';
      const baseUrl='https://www.keyflow.me';
      const cacheFile=path.join(process.env.HOME,'.keyflow','id-tokens.json');
      const a={uid:'uid-a',email:'a@example.test',lastLogin:'fixture',deviceCredential:'fixture-a',baseUrl};
      const calls=[]; let minted=0; let expiresIn='3600'; let rejectFirstDraft=false;
      const jwt=n=>'h.'+Buffer.from(JSON.stringify({user_id:'uid-a',n})).toString('base64url')+'.s';
      globalThis.fetch=async(url,init={})=>{
        calls.push({url,init});
        const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
        if(url.endsWith('/session'))return json({customToken:'custom'});
        if(url.endsWith('/api/cli/config'))return json({apiKey:'fixture-api-key'});
        if(url.includes('signInWithCustomToken'))return json({idToken:jwt(++minted),expiresIn});
        if(url.endsWith('/api/cli/draft')){
          if(rejectFirstDraft){rejectFirstDraft=false;return json({error:'Unauthorized',code:'unauthorized'},401);}
          return json({success:true,postId:'post-a',url:baseUrl+'/@a/post/test'});
        }
        throw new Error('Unexpected request: '+url);
      };
      const count=part=>calls.filter(x=>x.url.includes(part)).length;
      ${body}
    `], {cwd: home, env, encoding: 'utf8'});
    assert.equal(result.status, 0, result.stderr || result.stdout);
  } finally { fs.rmSync(home, {recursive: true, force: true}); }
}

test('a second push within the token lifetime makes no auth requests', () => scenario(`
  saveConfig(a,'a');
  const first=await getIdToken(baseUrl,loadConfig('a'),()=>{});
  const before=calls.length;
  assert.equal(await getIdToken(baseUrl,loadConfig('a'),()=>{}),first);
  assert.equal(calls.length,before);
  assert.equal(count('/session'),1); assert.equal(count('/api/cli/config'),1); assert.equal(count('accounts:lookup'),0);
  assert.equal(fs.statSync(cacheFile).mode & 0o777,0o600);
  assert.equal(fs.readFileSync(cacheFile,'utf8').includes('fixture-a'),false);
`));

test('a token with five minutes or less left is replaced', () => scenario(`
  saveConfig(a,'a');
  expiresIn='300';
  const first=await getIdToken(baseUrl,loadConfig('a'),()=>{});
  assert.notEqual(await getIdToken(baseUrl,loadConfig('a'),()=>{}),first);
  assert.equal(count('/session'),2);
`));

test('another credential, server or logout never reuses the cached token', () => scenario(`
  saveConfig(a,'a');
  await getIdToken(baseUrl,loadConfig('a'),()=>{});
  await getIdToken(baseUrl,{...a,deviceCredential:'fixture-other'},()=>{});
  assert.equal(count('/session'),2);
  clearConfig('a');
  assert.equal(fs.existsSync(cacheFile),false);
`));

test('credentials from the environment are not written to the cache', () => scenario(`
  process.env.KEYFLOW_DEVICE_CREDENTIAL='fixture-env';
  await getIdToken(baseUrl,loadConfig(),()=>{});
  await getIdToken(baseUrl,loadConfig(),()=>{});
  assert.equal(count('/session'),2);
  assert.equal(fs.existsSync(cacheFile),false);
`));

test('push retries once with a fresh token when the cached one is rejected', () => scenario(`
  saveConfig(a,'a');
  const cached=await getIdToken(baseUrl,loadConfig('a'),()=>{});
  rejectFirstDraft=true;
  const file=path.join(process.cwd(),'post.md');fs.writeFileSync(file,'# Post\\nBody');
  process.on('exit',code=>{
    assert.equal(code,0);
    const drafts=calls.filter(x=>x.url.endsWith('/draft')).map(x=>x.init.headers.Authorization);
    assert.deepEqual(drafts,['Bearer '+cached,'Bearer '+jwt(2)]);
    assert.equal(count('/session'),2);
    assert.match(fs.readFileSync(file,'utf8'),/id: post-a/);
  });
  await pushCommand(file,{account:'a',json:true});
`));
