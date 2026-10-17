import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { works } from '../src/lib/contracts.ts';
const root=path.resolve(import.meta.dirname,'..');
const ledger=JSON.parse(await readFile(path.join(root,'docs/agent-work/v3-first-works-media-manifest.json'),'utf8'));
for(const [index,work] of works.entries()) {
  const folder=path.join(root,'.local/imports',work.slug); await mkdir(folder,{recursive:true});
  const files=[];
  for(const [role,items] of [['media',work.media],['process',work.processMedia??[]]]) {
    for(const item of items) {
      const source=ledger.find(entry=>entry.publicPath===item.src);
      if(!source) throw new Error(`Missing source: ${item.src}`);
      const input=await readFile(source.source);
      if(createHash('sha256').update(input).digest('hex')!==source.sourceSha256) throw new Error(`Source changed: ${source.source}`);
      const filename=path.basename(item.src,'.webp')+'.png';
      const destination=path.join(folder,filename);
      try {await copyFile(source.source,destination,constants.COPYFILE_EXCL);} catch(error) {
        if(error.code!=='EEXIST') throw error;
        if(createHash('sha256').update(await readFile(destination)).digest('hex')!==source.sourceSha256) throw new Error('Existing import file differs; preserving it');
      }
      files.push({filename,role,alt:item.alt,caption:item.caption,cover:item.src===work.image});
    }
  }
  const draft={slug:work.slug,title:work.title,themeId:work.themeId,subtitle:work.subtitle,category:work.category,description:work.description,sortOrder:index+1};
  await writeFile(path.join(folder,'manifest.json'),JSON.stringify({draft,files},null,2)+'\n');
  await writeFile(path.join(folder,'.complete'),'Files closed and source SHA256 verified before transfer.\n');
  console.log(`${work.slug}: ${files.length} original files prepared for private SFTP import.`);
}
