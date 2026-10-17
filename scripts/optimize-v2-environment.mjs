// Technical runtime encoding only. GPT masters and previous manifests are retained.
import sharp from 'sharp';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const folder='assets/source/v2/v002';await mkdir(folder,{recursive:true});
const manifest=JSON.parse(await readFile('public/media/v2/manifest.json','utf8'));
await writeFile(folder+'/previous-runtime-manifest.json',JSON.stringify(manifest,null,2));
for(const asset of manifest.assets){
  if(!asset.path.includes('/environment/'))continue;
  const isCloud=asset.path.includes('/cloud-');const limit=asset.path.includes('cloud-near')?120000:asset.path.includes('cloud-far')?100000:160000;
  let selected;
  for(const width of isCloud?[1536,1280,1152]:[null]){
    for(const quality of [86,82,78,74,70,66,62,58]){
      let pipe=sharp(asset.master);if(isCloud)pipe=pipe.resize(width,width/2);
      const bytes=await pipe.webp({quality,alphaQuality:isCloud?70:90,effort:6}).toBuffer();
      if(bytes.length<=limit){selected={bytes,quality,alphaQuality:isCloud?70:90};break}
    }
    if(selected)break;
  }
  if(!selected)throw new Error('Runtime budget unreachable '+asset.path);
  const file='public'+asset.path;await writeFile(file,selected.bytes);const meta=await sharp(selected.bytes).metadata();
  asset.bytes=selected.bytes.length;asset.sha256=createHash('sha256').update(selected.bytes).digest('hex');asset.width=meta.width;asset.height=meta.height;asset.encoding={format:'webp',quality:selected.quality,alphaQuality:selected.alphaQuality,method:'technical encoding; original composition and GPT master unchanged'};
}
manifest.version=3;manifest.scope='approved v2 source artwork with runtime environment budget encoding';
await writeFile(folder+'/runtime-manifest.json',JSON.stringify(manifest,null,2));await writeFile('public/media/v2/manifest.json',JSON.stringify(manifest,null,2));
const env=manifest.assets.filter(a=>a.path.includes('/environment/'));const total=env.reduce((sum,a)=>sum+a.bytes,0);if(total>1200000)throw new Error('Environment package budget');console.log({environmentBytes:total,images:env.map(a=>({path:a.path,bytes:a.bytes,quality:a.encoding.quality}))});
