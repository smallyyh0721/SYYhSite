import sharp from 'sharp';
import { readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const input = process.argv[2] || 'assets/source/v2/v001/night-generation.json';
const records = JSON.parse(await readFile(input, 'utf8')).assets;
const manifestFile = 'assets/source/v2/v001/runtime-manifest.json';
const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
for (const record of records) {
  const group = record.id.includes('cloud-') || record.id.includes('portrait') ? 'environment' : 'islands';
  const master = `assets/source/v2/v001/${record.id}.png`;
  const output = `public/media/v2/${group}/${record.id}.webp`;
  await mkdir(`public/media/v2/${group}`, { recursive: true });
  try { await stat(master); throw new Error('Refusing to overwrite generated master ' + master); }
  catch (e) { if (e.code !== 'ENOENT') throw e; }
  await copyFile(record.source, master);
  const metadata = await sharp(master).metadata();
  const stats = await sharp(master).stats();
  if (group === 'islands' && (!metadata.hasAlpha || stats.channels[3].min !== 0)) throw new Error('Island must retain alpha');
  await sharp(master).webp({quality:88,alphaQuality:100,effort:6}).toFile(output);
  manifest.assets.push({id:record.id,master,path:output.replace('public',''),width:metadata.width,height:metadata.height,
    hasTransparency:metadata.hasAlpha,bytes:(await stat(output)).size,
    sha256:createHash('sha256').update(await readFile(output)).digest('hex'),source:record.source,
    provenance:'ChatGPT built-in imagegen',promptRecord:input,role:group});
  console.log(output, metadata.width, metadata.height, manifest.assets.at(-1).bytes);
}
await writeFile(manifestFile, JSON.stringify(manifest,null,2)+'\n');
await writeFile('public/media/v2/manifest.json', JSON.stringify(manifest,null,2)+'\n');
