import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.argv[2] || 'http://localhost:18980';
const url=new URL(origin);
if (!['http:','https:'].includes(url.protocol) || url.pathname!=='/' || url.search || url.hash || url.username) throw Error('Pass an origin only');
const results=[];
for(const path of ['/','/hub/','/works/','/works/themes/ancient/','/works/themes/apocalypse/','/about/','/story/','/board/','/owner/']) {
 const r=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,path);
 const html=await r.text(),csp=r.headers.get('content-security-policy')||'';
 const nonce=/script-src 'self' 'nonce-([^']+)'/.exec(csp)?.[1];assert.ok(nonce,path+' missing nonce');
 assert.ok(!/script-src[^;]*'unsafe-(?:inline|eval)'/.test(csp),path+' unsafe scripts');
 const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(([,attrs])=>!attrs.includes('src='));
 assert.ok(scripts.length>0,path+' no inline Next payload');for(const [,attrs]of scripts)assert.ok(attrs.includes(`nonce="${nonce}"`),path+' unprotected inline script');
 assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert.match(r.headers.get('cache-control'),/no-store/);
 if(path==='/about/') {assert.ok(html.includes('/media/v3/about-sequence/v002'));assert.ok(!html.includes('序列审核控制'));assert.ok(!html.includes('type="range"'));}
 if(path==='/owner/')assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
 results.push({path,status:r.status,nonce:true,inlineScripts:scripts.length});
}
const first=await fetch(origin+'/about/'),second=await fetch(origin+'/about/');assert.notEqual(first.headers.get('content-security-policy'),second.headers.get('content-security-policy'));
for(const path of ['/.env','/.git/config','/api/owner/works','/media/v3/works/private.webp']){const r=await fetch(origin+path);assert.ok([401,404].includes(r.status),path);results.push({path,status:r.status});}
const draft=await fetch(origin+'/draft/',{redirect:'manual'});assert.equal(draft.status,308);assert.equal(draft.headers.get('location'),'/works/');
await mkdir('docs/agent-work/evidence/V3-CONTENT-API-01',{recursive:true});
await writeFile('docs/agent-work/evidence/V3-CONTENT-API-01/http-security.json',JSON.stringify({at:new Date().toISOString(),origin,results},null,2)+'\n');
console.log(`${results.length} routes passed; per-request nonce and legacy draft redirect passed.`);
