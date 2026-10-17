import sharp from 'sharp';
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = 'design/v2-material-preview/v001';
const source = 'assets/source/v2/v001';
const output = 'public/media/v2';
await mkdir(source, { recursive: true });
await mkdir(`${output}/islands`, { recursive: true });
await mkdir(`${output}/environment`, { recursive: true });
const preview = JSON.parse(await readFile(`${base}/manifest.json`, 'utf8'));
const pack = { version: 2, scope: 'approved source artwork encoded for website; night/layers added separately', assets: [] };
for (const asset of preview.assets) {
  if (asset.category !== 'island' && asset.category !== 'environment') continue;
  if (!asset.approvedByUser && asset.id !== 'island-home') throw new Error(`Unapproved input ${asset.id}`);
  const data = await readFile(`${base}/${asset.path}`);
  if (createHash('sha256').update(data).digest('hex') !== asset.sha256) throw new Error(`Modified input ${asset.id}`);
  const id = asset.id.replace('island-', '').replace('environment-', '');
  const dest = asset.category === 'island' ? `${output}/islands/${id}-day.webp` : `${output}/environment/${id}.webp`;
  const master = `${source}/${asset.category === 'island' ? `${id}-day` : `environment-${id}`}.png`;
  await copyFile(`${base}/${asset.path}`, master);
  // Encoding only: no cropping, repainting, relighting or alpha manipulation.
  await sharp(data).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(dest);
  pack.assets.push({ id: asset.id, master, path: dest.replace('public', ''), bytes: (await stat(dest)).size,
    sha256: createHash('sha256').update(await readFile(dest)).digest('hex'), sourceSha256: asset.sha256,
    width: asset.width, height: asset.height, sourceApproval: asset.id === 'island-home' ? 'User chat: 通过，按 v003 制作并接入' : 'review-feedback-before-v003.md', provenance: asset.provenance });
  console.log(dest, pack.assets.at(-1).bytes);
}
await writeFile(`${source}/runtime-manifest.json`, JSON.stringify(pack, null, 2) + '\n');
await writeFile(`${output}/manifest.json`, JSON.stringify(pack, null, 2) + '\n');
