import sharp from 'sharp';
import {copyFile,mkdir,writeFile,readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const source='assets/source/avatar-v2/v016';const dest='public/media/v2/avatar';await mkdir(dest,{recursive:true});
await copyFile(source+'/visitor-web-review.glb',dest+'/visitor.glb');
for(const theme of ['day','night'])await sharp(source+'/about-'+theme+'.png').webp({quality:82,effort:6}).toFile(dest+'/about-'+theme+'.webp');
const files=[];for(const name of ['visitor.glb','about-day.webp','about-night.webp']){const p=dest+'/'+name;const bytes=await readFile(p);files.push({path:p,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}
await writeFile(source+'/installed-review.json',JSON.stringify({at:new Date().toISOString(),status:'actual model and poster integration; artistic review remains open',compression:'gltf-transform4.5.0 meshopt position16/normal12/texcoord14/weight12; immutable original source retained',files},null,2));console.log(files);
