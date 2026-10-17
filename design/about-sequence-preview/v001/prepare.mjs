// Technical sprite-cell extraction and WebP encoding only. All artwork is image_gen output.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const sourceRoot = path.join(repo, 'assets/source/about-sequence/v001');
const source = process.argv[2];
if (!source) throw new Error('Provide the generated nine-frame sheet path');
await mkdir(sourceRoot, { recursive: true });
await mkdir(path.join(here, 'frames'), { recursive: true });
const retained = path.join(sourceRoot, 'keyframes-original.png');
if (path.resolve(source) !== retained) await copyFile(source, retained);
const metadata = await sharp(retained).metadata();
const frames = [];
for (let index = 0; index < 9; index++) {
  const col = index % 3, row = Math.floor(index / 3);
  const left = Math.round(col * metadata.width / 3), top = Math.round(row * metadata.height / 3);
  const width = Math.round((col + 1) * metadata.width / 3) - left;
  const height = Math.round((row + 1) * metadata.height / 3) - top;
  const buffer = await sharp(retained).extract({ left, top, width, height }).webp({ quality: 92, effort: 6 }).toBuffer();
  const url = `./frames/frame-${String(index + 1).padStart(3, '0')}.webp`;
  await writeFile(path.join(here, url), buffer);
  frames.push({ index, url, yawTargetDegrees: (index - 4) * 6, width, height, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') });
}
const original = await readFile(retained);
const manifest = { version: 1, created: '2026-10-16', purpose: 'Independent original-image sequence review; not integrated into website', generator: 'built-in image_gen', source: 'assets/source/about-sequence/v001/keyframes-original.png', sourceSha256: createHash('sha256').update(original).digest('hex'), sourceDimensions: { width: metadata.width, height: metadata.height }, sourceReference: 'Owned approved greeting-image/v001/character.png; face identity reference only', frameCount: 9, totalBytes: frames.reduce((sum, item) => sum + item.bytes, 0), interpolation: 'none; discrete original keyframes only', limitations: ['Nine AI-generated keyframes; not a production-ready continuous 300-frame render', 'Identity, hair, pose and light may drift between generated views', 'Yaw values are prompt targets, not calibrated camera measurements'], frames };
await writeFile(path.join(here, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await writeFile(path.join(sourceRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ frameCount: frames.length, sourceDimensions: manifest.sourceDimensions, totalBytes: manifest.totalBytes }, null, 2));
