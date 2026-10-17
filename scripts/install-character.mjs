import sharp from 'sharp';
import {copyFile,mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision=process.argv[2]||'v034';if(!/^v\d{3}$/.test(revision))throw new Error('Invalid revision');
const source='assets/source/avatar-v2/'+revision;const dest='public/media/v2/avatar';await mkdir(dest,{recursive:true});
await copyFile(source+'/visitor-web.glb',dest+'/visitor.glb');
for(const theme of ['day','night'])await sharp(source+'/about-'+theme+'.png').webp({quality:82,effort:6}).toFile(dest+'/about-'+theme+'.webp');
const files=[];for(const name of ['visitor.glb','about-day.webp','about-night.webp']){const p=dest+'/'+name;const bytes=await readFile(p);files.push({path:p,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})}
await writeFile(source+'/runtime-manifest.json',JSON.stringify({at:new Date().toISOString(),source:'visitor-source.blend',rasterSources:['../v033/face-generation.json','../v025/hair-generation.json'],licenses:['../v001/source-manifest.json','../v022/hair-base/source-license.json'],compression:'glTF Transform4.5.0 Meshopt;16/12/14/12 position/normal/UV/weight bits; preserved source and body morphs',files},null,2));console.log(files);
