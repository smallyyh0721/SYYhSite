import sharp from 'sharp';
import {readFile,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const revision=process.argv[2]||'v037';if(!/^v\d{3}$/.test(revision))throw new Error('Invalid revision');
const source='assets/source/avatar-v2/'+revision;const dest='public/media/v2/avatar';const info=JSON.parse(await readFile(source+'/encoded-manifest.json','utf8'));const files=[];
if(!info.allFourVariantsEncoded||info.variants.length!==8)throw new Error('All four matched video pairs are required');
for(const label of ['day','night','day-portrait','night-portrait']){
  const records=info.variants.filter(r=>r.path.includes('/greeting-'+label+'.'));
  if(records.length!==2)continue;
  for(const record of records){const name=record.path.split('/').at(-1);const data=await readFile(record.path);if(createHash('sha256').update(data).digest('hex')!==record.sha256)throw new Error('Source changed after decode');await copyFile(record.path,dest+'/'+name);files.push({...record,path:dest+'/'+name});}
  const p=dest+'/greeting-'+label+'.webp';await sharp(source+'/greeting-'+label+'-poster.png').resize(label.includes('portrait')?720:1280,label.includes('portrait')?1280:720).webp({quality:80,effort:6}).toFile(p);const data=await readFile(p);if(data.length>150000)throw new Error('Poster budget exceeded');files.push({path:p,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await writeFile(source+'/runtime-manifest.json',JSON.stringify({at:new Date().toISOString(),sourceScene:'greeting-source.blend',nativeAnimation:true,frames:84,fps:24,durationSeconds:3.5,allFourVariantsEncoded:info.allFourVariantsEncoded,files},null,2));console.log(files.map(f=>({path:f.path,bytes:f.bytes})));
