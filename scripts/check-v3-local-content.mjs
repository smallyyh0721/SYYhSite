import assert from 'node:assert/strict';
import { readFile, rename, writeFile, mkdir } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

// Deliberately fixed to the isolated Docker QA stack, never a production endpoint.
const origin = 'http://localhost:18980';
const evidence = [];
let cookie = '', csrf = '';
async function call(path, {method='GET',body,owner=false,headers={}}={}) {
  const response = await fetch(origin+path, {method,redirect:'manual',signal:AbortSignal.timeout(30000),headers:{
    ...(owner ? {Cookie:cookie,Origin:origin,'X-CSRF-Token':csrf}:{}),
    ...(body !== undefined ? {'Content-Type':Buffer.isBuffer(body)?'application/octet-stream':'application/json'}:{}),...headers,
  },...(body!==undefined?{body:Buffer.isBuffer(body)?body:JSON.stringify(body)}:{})});
  const bytes=Buffer.from(await response.arrayBuffer());
  let json; try {json=JSON.parse(bytes.toString());} catch {}
  return {response,status:response.status,bytes,json};
}
async function check(name,fn) { await fn(); evidence.push({name,passed:true}); console.log('PASS',name); }
const login=await call('/api/owner/session',{method:'POST',body:{password:'local-owner-test-2026'},headers:{Origin:origin}});
assert.equal(login.status,200); cookie=login.response.headers.get('set-cookie').split(';')[0]; csrf=login.json.csrfToken;
assert.match(cookie,/^syyh_owner=/);
const slug=`qa-api-${Date.now().toString(36)}`;
const draft={slug,themeId:'home',title:'本地联调 · 发布快照',subtitle:'',category:'联调样例',description:'仅用于本地 Docker 验收。',sortOrder:99,coverAssetId:null,media:[],processMedia:[]};
let work;
await check('create private draft',async()=>{const r=await call('/api/owner/works',{method:'POST',owner:true,body:{draft}});assert.equal(r.status,201);work=r.json.work;assert.equal((await call('/api/works/'+slug)).status,404);});
const assets=[];
for(const [file,name] of [['.local/imports/yixuan-football/01-cover.png','fixture.png'],['.local/v3-video-fixture.mp4','fixture.mp4']]) {
  await check(`upload and process ${name}`,async()=>{
    const r=await call('/api/owner/uploads?filename='+name,{method:'POST',owner:true,body:await readFile(file)});assert.equal(r.status,202);const id=r.json.asset.id;
    let asset;
    for(let i=0;i<90;i++) { const state=await call('/api/owner/assets/'+id,{owner:true});assert.equal(state.status,200);asset=state.json.asset;if(['ready','error'].includes(asset.status))break;await delay(1000); }
    assert.equal(asset.status,'ready',JSON.stringify(asset));assets.push(asset);
    assert.equal((await call(asset.src)).status,404);assert.equal((await call(asset.src,{owner:true})).status,200);
  });
}
draft.coverAssetId=assets[0].id;draft.media=assets.map((asset,i)=>({assetId:asset.id,alt:i?'蓝色视频测试':'人物图片测试',caption:i?'短片测试':'图片测试'}));
await check('save and authenticated preview',async()=>{const r=await call('/api/owner/works/'+work.id,{method:'PUT',owner:true,body:{revision:work.revision,draft}});assert.equal(r.status,200);work=r.json.work;assert.equal((await call('/api/owner/works/'+work.id+'/preview',{owner:true})).status,200);});
await check('publish without rebuilding frontend',async()=>{const r=await call('/api/owner/works/'+work.id+'/publish',{method:'POST',owner:true,body:{revision:work.revision}});assert.equal(r.status,200);work=r.json.work;const page=await call('/works/'+slug+'/');assert.equal(page.status,200);assert.ok(page.bytes.toString().includes(draft.title));});
await check('MP4 poster, HEAD and single byte range',async()=>{const video=assets[1];assert.equal(video.kind,'video');assert.equal((await call(video.poster)).status,200);const head=await call(video.src,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.bytes.length,0);const r=await call(video.src,{headers:{Range:'bytes=0-31'}});assert.equal(r.status,206);assert.equal(r.bytes.length,32);assert.match(r.response.headers.get('content-range'),/^bytes 0-31\//);});
await check('draft edit leaves published snapshot unchanged',async()=>{const oldTitle=draft.title;draft.title='尚未发布的新标题';const r=await call('/api/owner/works/'+work.id,{method:'PUT',owner:true,body:{revision:work.revision,draft}});assert.equal(r.status,200);work=r.json.work;assert.equal((await call('/api/works/'+slug)).json.work.title,oldTitle);});
await check('storage outage blocks upload and publish, permits text edit and unpublish',async()=>{
  const marker='.local/store/derived/.syyh-store-id';const offline=marker+'.qa-offline';await rename(marker,offline);
  try {
    assert.equal((await call(assets[0].src)).status,503);
    assert.equal((await call('/api/owner/uploads?filename=fixture.png',{method:'POST',owner:true,body:await readFile('.local/imports/yixuan-football/01-cover.png')})).status,503);
    assert.equal((await call('/api/owner/works/'+work.id+'/publish',{method:'POST',owner:true,body:{revision:work.revision}})).status,503);
    draft.description='存储离线时仍能保存文本。';const r=await call('/api/owner/works/'+work.id,{method:'PUT',owner:true,body:{revision:work.revision,draft}});assert.equal(r.status,200);work=r.json.work;
    const u=await call('/api/owner/works/'+work.id+'/unpublish',{method:'POST',owner:true,body:{revision:work.revision}});assert.equal(u.status,200);work=u.json.work;
  } finally {await rename(offline,marker);}
  assert.equal((await call('/api/works/'+slug)).status,404);assert.equal((await call(assets[0].src)).status,404);assert.equal((await call(assets[1].poster)).status,404);assert.equal((await call('/works/'+slug+'/')).status,404);
});
await check('production seed originals have no public bypass',async()=>{assert.equal((await call('/media/v3/works/yixuan-football/01-cover.webp')).status,404);});
await check('logout revokes session',async()=>{assert.equal((await call('/api/owner/session',{owner:true,method:'DELETE'})).status,200);assert.equal((await call('/api/owner/works',{owner:true})).status,401);});
await mkdir('docs/agent-work/evidence/V3-CONTENT-API-01',{recursive:true});
await writeFile('docs/agent-work/evidence/V3-CONTENT-API-01/linux-http.json',JSON.stringify({at:new Date().toISOString(),origin,slug,evidence},null,2)+'\n');
console.log(`Completed ${evidence.length} isolated Linux HTTP checks.`);
