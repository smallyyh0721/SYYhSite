import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';
const root = path.resolve(import.meta.dirname, '..');
const files = ['01-rivals-hero', '02-one-lamp', '03-next-dawn'];
const source = path.join(root, 'assets/source/story-luqing-jiao/v001');
const output = path.join(root, 'public/media/v3/story');
await mkdir(output, { recursive: true });
const manifest = [];
for (const name of files) {
  const input = await readFile(path.join(source, `${name}.png`));
  const target = path.join(output, `${name}.webp`);
  await sharp(input).resize({ width: 1680, withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(target);
  const result = await readFile(target);
  manifest.push({ source: `${name}.png`, sourceSha256: createHash('sha256').update(input).digest('hex'), publicPath: `/media/v3/story/${name}.webp`, bytes: result.length, publicSha256: createHash('sha256').update(result).digest('hex') });
}
await writeFile(path.join(source, 'manifest.json'), `${JSON.stringify({ tool: 'built-in image_gen', references: ['D:/social_impact/luqing/基准图/白T三视图.png', 'D:/social_impact/jiao/人物形象基准库_v1/01_身份基准/原始人物三视图.png'], assets: manifest }, null, 2)}\n`);
console.log(`Prepared ${manifest.length} Story images; ${manifest.reduce((n, f) => n + f.bytes, 0)} bytes.`);
