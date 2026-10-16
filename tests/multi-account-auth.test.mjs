import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root = new URL('../dist/', import.meta.url).href;
function scenario(body) {
  const fixtureHome = fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-multi-auth-'));
  const env = {...process.env, HOME: fixtureHome};
  for (const key of Object.keys(env)) if(key.startsWith('KEYFLOW_')) delete env[key];
  try {
    const result = spawnSync(process.execPath, ['--input-type=module','-e', `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import path from 'node:path';
      import {saveConfig,loadConfig} from '${root}lib/config.js';
      import {getIdToken} from '${root}keyflow-api/get-id-token.js';
      import {DeviceLoginSession} from '${root}auth/device-login-session.js';
      import {pushCommand} from '${root}commands/push.js';
      const baseUrl='https://www.keyflow.me';
      const a={uid:'uid-a',email:'a@example.test',lastLogin:'fixture',deviceCredential:'fixture-a',username:'taehwandev',baseUrl};
      const b={uid:'uid-b',email:'b@example.test',lastLogin:'fixture',deviceCredential:'fixture-b',username:'moru',baseUrl};
      const calls=[];
      let current='a'; let username='moru'; let wrongUid=false;
      globalThis.fetch=async(url,init={})=>{
        calls.push({url,init});
        const json=data=>new Response(JSON.stringify(data),{status:200});
        if(url.endsWith('/exchange'))return json({deviceCredential:'fixture-b'});
        if(url.endsWith('/session')){current=init.headers.Authorization==='Bearer fixture-a'?'a':'b';return json({customToken:'custom-'+current,username});}
        if(url.endsWith('/api/cli/config'))return json({apiKey:'fixture-api-key'});
        if(url.includes('signInWithCustomToken'))return json({idToken:'id-'+current,refreshToken:'fixture-unused',expiresIn:'3600'});
        if(url.includes('accounts:lookup'))return json({users:[{localId:wrongUid?'uid-other':'uid-'+current,email:current+'@example.test'}]});
        if(url.includes('securetoken.googleapis.com'))return json({id_token:'legacy-id',user_id:wrongUid?'uid-other':'uid-a'});
        if(url.endsWith('/api/cli/draft')){
          assert.equal(init.headers.Authorization,'Bearer id-b');
          return json({success:true,postId:'post-b',url:baseUrl+'/@moru/post/test'});
        }
        throw new Error('Unexpected request: '+url);
      };
      ${body}
    `], {cwd:fixtureHome,env,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr || result.stdout);
  } finally {fs.rmSync(fixtureHome,{recursive:true,force:true});}
}

test('named publishing uses the chosen identity despite ambient credentials',()=>scenario(`
  saveConfig(a,'taehwandev');saveConfig(b,'moru');
  process.env.KEYFLOW_DEVICE_CREDENTIAL='ambient-fixture';
  process.env.KEYFLOW_ACCOUNT='taehwandev';
  assert.equal(await getIdToken(baseUrl,loadConfig('taehwandev'),()=>{}),'id-a');
  const file=path.join(process.cwd(),'moru.md');fs.writeFileSync(file,'# Moru\\nBody');
  process.on('exit',code=>{
    assert.equal(code,0);
    assert.equal(calls.filter(x=>x.url.endsWith('/session')).at(-1).init.headers.Authorization,'Bearer fixture-b');
    assert.equal(calls.filter(x=>x.url.endsWith('/draft')).length,1);
    assert.match(fs.readFileSync(file,'utf8'),/id: post-b/);
  });
  await pushCommand(file,{account:'moru',json:true});
`));

test('wrong returned UID and wrong server stop before publishing',()=>scenario(`
  wrongUid=true;
  await assert.rejects(getIdToken(baseUrl,b,()=>{}),/does not match/);
  const count=calls.length;
  await assert.rejects(getIdToken('https://other.example.test',b,()=>{}),/another KeyFlow server/);
  assert.equal(calls.length,count);
  assert.equal(calls.some(x=>x.url.endsWith('/draft')||x.url.endsWith('/images')),false);
  await assert.rejects(getIdToken(baseUrl,{...a,deviceCredential:undefined,refreshToken:'legacy-fixture'},()=>{}),/does not match/);
`));

test('login verifies username before writing and preserves the personal connection',()=>scenario(`
  saveConfig(a,'taehwandev');
  const context={baseUrl,account:'moru',authRequest:{state:'state',codeVerifier:'fixture'}};
  username='taehwandev';
  await assert.rejects(DeviceLoginSession.complete(JSON.stringify({state:'state',code:'fixture'}),context),/did not match/);
  assert.equal(loadConfig().uid,'uid-a');assert.throws(()=>loadConfig('moru'),/Unknown/);
  username=undefined;
  await assert.rejects(DeviceLoginSession.complete(JSON.stringify({state:'state',code:'fixture'}),context),/did not match/);
  username='moru';
  await DeviceLoginSession.complete(JSON.stringify({state:'state',code:'fixture'}),context);
  assert.equal(loadConfig('moru').uid,'uid-b');assert.equal(loadConfig('taehwandev').uid,'uid-a');
`));

test('bad callback state and unknown profile never contact authentication',()=>scenario(`
  await assert.rejects(DeviceLoginSession.complete(JSON.stringify({state:'wrong',code:'fixture'}),{authRequest:{state:'state'}}),/State mismatch/);
  process.env.KEYFLOW_DEVICE_CREDENTIAL='ambient-fixture';
  assert.throws(()=>loadConfig('missing'),/Unknown/);
  assert.equal(calls.length,0);
`));

test('offline dry run ignores missing named accounts and makes no requests',()=>scenario(`
  const file=path.join(process.cwd(),'draft.md');fs.writeFileSync(file,'# Offline\\nBody');
  process.on('exit',code=>{assert.equal(code,0);assert.equal(calls.length,0);assert.equal(fs.readFileSync(file,'utf8'),'# Offline\\nBody');});
  await pushCommand(file,{account:'missing',dryRun:true,json:true});
`));
