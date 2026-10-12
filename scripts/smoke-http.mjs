import assert from 'node:assert/strict';
const base=new URL(process.argv[2]||'http://127.0.0.1:8080/');
const results=[];
for(const path of ['/','/hub/','/works/','/works/sky-city/','/works/ancient-landform/','/works/apocalypse/','/works/anime-home/','/about/','/story/','/board/','/draft/']){
 const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(15000)});assert.equal(response.status,200,path);assert.match(response.headers.get('content-type'),/text\/html/);const html=await response.text();assert.match(html,/<h1/);results.push({path,status:response.status});
}
const missing=await fetch(new URL('/this-channel-does-not-exist/',base));assert.equal(missing.status,404);assert.match(await missing.text(),/NO SIGNAL/);results.push({path:'/this-channel-does-not-exist/',status:404});
const health=await fetch(new URL('/api/health',base));assert.equal(health.status,200);assert.equal((await health.json()).status,'ok');
const board=await fetch(new URL('/api/messages',base));assert.equal(board.status,200);assert.ok(Array.isArray((await board.json()).entries));
const asset=await fetch(new URL('/media/avatar-proxy.glb',base));assert.equal(asset.status,200);const bytes=Buffer.from(await asset.arrayBuffer());assert.equal(bytes.toString('ascii',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.ok(gltf.skins.length>0);assert.ok(gltf.nodes.some(n=>n.name==='Head'));assert.equal(asset.headers.get('x-content-type-options'),'nosniff');
console.log(JSON.stringify({base:String(base),routes:results,health:'ok',board:'ok',glb:{bytes:bytes.length,skins:gltf.skins.length}},null,2));
