import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve('assets/source/about-remodel/v001');
const report={at:new Date().toISOString(),maxGroups:2,groups:[],websiteChanged:[]};
for(const name of ['a','b']){
  const dir=resolve(root,'group-'+name);
  const status=JSON.parse(await readFile(resolve(dir,'status.json'),'utf8'));
  const native=await stat(resolve(dir,'character.blend'));
  const glb=await readFile(resolve(dir,'character-review.glb'));
  if(glb.toString('utf8',0,4)!=='glTF'||glb.readUInt32LE(4)!==2||glb.readUInt32LE(8)!==glb.length)throw new Error('Invalid glTF container '+name);
  const jsonLength=glb.readUInt32LE(12);
  const doc=JSON.parse(glb.toString('utf8',20,20+jsonLength).trim());
  const triangleCount=(doc.meshes||[]).flatMap(m=>m.primitives).reduce((sum,p)=>sum+(p.indices!==undefined?doc.accessors[p.indices].count/3:0),0);
  const imageResults=[];
  for(const view of ['front','three-quarter','profile']){
    const png=await readFile(resolve(dir,view+'.png'));
    if(png.readUInt32BE(0)!==0x89504e47)throw new Error('Not a PNG '+name+view);
    const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
    if(width!==1050||height!==1200)throw new Error('Unexpected view size');
    imageResults.push({view,width,height,bytes:png.length,sha256:createHash('sha256').update(png).digest('hex')});
  }
  report.groups.push({name:name.toUpperCase(),status:status.status,nativeBytes:native.size,glbBytes:glb.length,meshes:doc.meshes?.length||0,materials:doc.materials?.length||0,triangles:triangleCount,skins:doc.skins?.length||0,views:imageResults});
}
const baseline=JSON.parse((await readFile(resolve(root,'website-before.json'),'utf8')).replace(/^\uFEFF/,''));
for(const entry of baseline){
  const current=createHash('sha256').update(await readFile(entry.File)).digest('hex').toUpperCase();
  if(current!==entry.SHA256)report.websiteChanged.push(entry.File);
}
report.websiteFilesCompared=baseline.length;
report.ok=report.groups.length===2&&report.websiteChanged.length===0&&report.groups.every(g=>g.status==='rendered_native_and_geometry_preview');
await writeFile(resolve(root,'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;
