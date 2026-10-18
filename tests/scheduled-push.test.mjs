import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../dist/', import.meta.url).href;
function run(mode) {
  const fixtureHome = fs.mkdtempSync(path.join(os.tmpdir(), 'keyflow-schedule-'));
  const env = { ...process.env, HOME: fixtureHome };
  for (const key of Object.keys(env)) if (key.startsWith('KEYFLOW_')) delete env[key];
  try {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import fs from 'node:fs';
      import { saveConfig } from '${root}lib/config.js';
      import { pushCommand } from '${root}commands/push.js';
      const baseUrl='https://www.keyflow.me', mode=${JSON.stringify(mode)};
      const time=new Date(Date.now()+3600000).toISOString();
      saveConfig({uid:'uid-moru',username:'moru',email:'moru@example.test',lastLogin:'fixture',
        deviceCredential:'fixture',baseUrl},'moru');
      fs.writeFileSync('cover.png',Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082','hex'));
      fs.writeFileSync('ko.md','---\\nlanguage: ko\\nkeyflow:\\n  id: source-ko\\n---\\n한국어');
      fs.writeFileSync('en.md','---\\ntitle: Moru\\nlanguage: en\\ntranslation_of: ./ko.md\\nscheduled_at: "'+time+'"\\ncover: ./cover.png\\n---\\n![Mo](./cover.png)');
      let saved, images=0, configs=0;
      const idToken='h.'+Buffer.from(JSON.stringify({user_id:'uid-moru'})).toString('base64url')+'.s';
      globalThis.fetch=async(url,init={})=>{
        const json=(body,status=200)=>Response.json(body,{status});
        if(url.endsWith('/session'))return json({customToken:'custom',username:'moru'});
        if(url.endsWith('/api/cli/config')){configs++;return json({apiKey:'fixture',...(mode==='old'?{}:{capabilities:{scheduledPublishing:true}})});}
        if(url.includes('signInWithCustomToken'))return json({idToken,refreshToken:'fixture',expiresIn:'3600'});
        if(url.endsWith('/images')){
          images++;
          const b=JSON.parse(init.body); assert.equal(b.visibility,'private');
          return json({images:b.images.map(i=>({...i,url:'https://assets.test/secure/'+i.usage,uploadUrl:null}))});
        }
        if(url.endsWith('/draft')){
          assert.equal(init.headers.Authorization,'Bearer '+idToken);
          saved=JSON.parse(init.body);
          assert.equal(saved.status,'draft'); assert.equal(saved.visibility,'public');
          assert.equal(saved.scheduledAt,time); assert.equal(saved.translationOf,'source-ko');
          assert.equal(saved.locale,'en'); assert.match(saved.coverImage,/secure/); assert.match(saved.content,/secure/);
          const identity={postId:'saved-en',url:baseUrl+'/en/manage/workspace/posts'};
          if(mode==='failed')return json({...identity,postSaved:true,error:'failed',code:'registration_failed'},502);
          return json({success:true,...identity,...(mode==='old'?{}:{schedule:{postId:'saved-en',version:'v1',scheduledAt:time,status:'scheduled'}})});
        }
        throw new Error('Unexpected URL '+url);
      };
      process.on('exit',code=>{
        assert.equal(code,mode==='success'?0:1);
        assert.equal(configs,1);
        if(mode==='old'){
          assert.equal(saved,undefined); assert.equal(images,0);
          assert.doesNotMatch(fs.readFileSync('en.md','utf8'),/id: saved-en/);
        }else{
          assert.ok(saved);
          assert.match(fs.readFileSync('en.md','utf8'),/id: saved-en/);
        }
      });
      await pushCommand('en.md',{account:'moru',json:true});
    `], { cwd: fixtureHome, env, encoding: 'utf8' });
    assert.equal(result.status, mode === 'success' ? 0 : 1, result.stderr || result.stdout);
    assert.equal(result.stderr, '');
    const out = JSON.parse(result.stdout);
    assert.equal(out.ok, mode === 'success');
    assert.equal(out.postId, mode === 'old' ? undefined : 'saved-en');
    if (mode === 'success') assert.equal(out.schedule.status, 'scheduled');
    else { assert.equal(out.postSaved, mode === 'old' ? undefined : true);
      assert.equal(out.error.code, mode === 'old' ? 'schedule-not-supported' : 'registration_failed'); }
  } finally { fs.rmSync(fixtureHome, { recursive: true, force: true }); }
}

test('named scheduled bilingual push keeps cover/content private and confirms the reservation', () => run('success'));
test('failed reservation retains the saved translation ID in the real source file', () => run('failed'));
test('old server cannot silently ignore the requested publication time', () => run('old'));
