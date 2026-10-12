import sharp from 'sharp';
import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = 'assets/source/world-v3/v001';
const spec = JSON.parse(await readFile(base + '/prompts.json', 'utf8'));
await mkdir('public/media/world-v3', { recursive: true });
const measured = [];
for (const asset of spec.assets) {
  try { await stat(asset.sourcePath); }
  catch { await copyFile(asset.generatedPath, asset.sourcePath); }
  const original = await readFile(asset.sourcePath);
  const meta = await sharp(original).metadata();
  const stats = await sharp(original).stats();
  if (asset.transparent && (!meta.hasAlpha || stats.channels[3].min !== 0)) throw Error(asset.id + ': real transparent alpha required');
  await sharp(original).resize({ width: asset.transparent ? 1200 : 1600, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100 }).toFile(asset.runtimePath);
  const output = await readFile(asset.runtimePath);
  const runtime = await sharp(output).metadata();
  measured.push({ id: asset.id, sourcePath: asset.sourcePath, runtimePath: asset.runtimePath,
    source: { width: meta.width, height: meta.height, bytes: original.length, sha256: createHash('sha256').update(original).digest('hex') },
    runtime: { width: runtime.width, height: runtime.height, hasAlpha: runtime.hasAlpha, bytes: output.length, sha256: createHash('sha256').update(output).digest('hex') },
    alphaMin: asset.transparent ? stats.channels[3].min : null, alphaMax: asset.transparent ? stats.channels[3].max : null,
    visualInspection: 'native imagegen output inspected; complete island silhouettes / background-only environments', status: 'draft' });
  console.log(asset.id, runtime.width + 'x' + runtime.height, output.length + ' bytes', 'alpha=' + runtime.hasAlpha);
}
await writeFile(base + '/manifest.json', JSON.stringify({ version: 1, scope: 'P2 runtime draft assets', assets: measured }, null, 2) + '\n');
