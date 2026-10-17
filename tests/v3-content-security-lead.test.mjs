import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import { createServer } from '../services/guestbook/server.mjs';
import { hashPassword } from '../services/guestbook/owner-password.mjs';

const password='lead-security-fixture-2026';
const encoded=await hashPassword(password);
function fixture(extra={}) {
  const root=mkdtempSync(join(tmpdir(),'syyh-lead-security-'));
  const derived=join(root,'cos','derived'); mkdirSync(derived,{recursive:true});
  writeFileSync(join(derived,'.syyh-store-id'),'lead-fixture');
  const secret=join(root,'owner.hash');writeFileSync(secret,encoded,{mode:0o600});
  const config={dbPath:join(root,'content.sqlite'),publicOrigin:'https://lead.test',ownerPasswordFile:secret,derivedRoot:derived,storeId:'lead-fixture',stagingRoot:join(root,'staging'),...extra};
  const app=createServer({dbPath:':memory:',content:config});
  return {app,config,async close(){await app.close();rmSync(root,{recursive:true,force:true});}};
}
const headers={host:'lead.test',origin:'https://lead.test','x-forwarded-proto':'https'};

test('login concurrency reserves rate-limit slots before expensive verification',async()=>{
  const f=fixture({loginIpLimit:2,loginGlobalLimit:30});
  try {
    const results=await Promise.all(Array.from({length:6},()=>f.app.inject({method:'POST',url:'/api/owner/session',headers,payload:{password:'incorrect-password'}})));
    assert.equal(results.filter(r=>r.statusCode===401).length,2);
    assert.equal(results.filter(r=>r.statusCode===429).length,4);
  } finally {await f.close();}
});

test('loopback development session uses a cookie accepted by browsers',async()=>{
  const f=fixture({publicOrigin:'http://localhost:8080',allowInsecureDev:true});
  try {
    const response=await f.app.inject({method:'POST',url:'/api/owner/session',headers:{host:'localhost:8080',origin:'http://localhost:8080'},payload:{password}});
    assert.equal(response.statusCode,200);
    const cookie=String(response.headers['set-cookie']);
    assert.ok(!cookie.startsWith('__Host-') || /; Secure(?:;|$)/.test(cookie),'__Host- requires Secure even on a loopback development origin');
  } finally {await f.close();}
});

test('unauthenticated upload is rejected before waiting for its body',async()=>{
  const f=fixture(); let pending;
  try {
    await f.app.listen({host:'127.0.0.1',port:0});
    const port=f.app.server.address().port;
    const outcome=await new Promise(resolve=>{
      pending=http.request({hostname:'127.0.0.1',port,method:'POST',path:'/api/owner/uploads?filename=test.png',headers:{...headers,'content-type':'application/octet-stream','content-length':'1000000'}},res=>{res.resume();resolve(res.statusCode);});
      pending.on('error',()=>resolve('connection-closed'));
      pending.setTimeout(1000,()=>{resolve('timeout-waiting-for-body');pending.destroy();});
      pending.flushHeaders();
    });
    assert.equal(outcome,401);
  } finally {pending?.destroy();await f.close();}
});
