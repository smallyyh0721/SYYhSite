import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const works = [
  {
    slug: 'yixuan-football',
    source: 'D:/social_impact/绝区零Zenless Zone Zero/yixuan仪玄',
    files: [
      ['9cfccb0f-43ba-41e7-9290-4c996853e456.png', '01-cover.webp'],
      ['a56a3444-dac9-4588-b6d9-5c9f6c6ec72b.png', '02.webp'],
      ['a3ce99c2-1925-4986-8dcc-1d40fb57f4d6.png', '03.webp'],
      ['9f356860-8ae1-4a5d-8b7a-69c627135005.png', '04.webp'],
      ['df4afa2c-0abb-419e-bd0b-9fb03e287f0a.png', '05.webp'],
      ['14a7c4b8-83bf-4b4a-9074-f8a3f7d3cb9d.png', '06.webp'],
      ['27ae9810-90de-4bcb-bb93-1fcdced8c054.png', '07.webp'],
      ['92dced6d-0606-4918-b678-e93d8e95e717.png', '08.webp'],
      ['basic.png', '09-reference.webp'],
      ['1122bfcd-ff97-4066-ac93-70628910e4aa.png', '10-contact-sheet.webp'],
    ],
  },
  {
    slug: 'mist-exit-ten-shots',
    source: 'D:/social_impact/创作项目/jiao_qing_雾尽之处十镜/v001',
    files: [
      ['S01_走回原处.png', '01.webp'],
      ['S02_光落在眼底.png', '02.webp'],
      ['S03_花在看她们.png', '03.webp'],
      ['S04_退路收紧.png', '04.webp'],
      ['S05_不再后退.png', '05.webp'],
      ['S06_为彼此开路_v2.png', '06.webp'],
      ['S07_借你一会儿_v3.png', '07-cover.webp'],
      ['S08_风知道出口.png', '08.webp'],
      ['S09_穿过最后一层雾_v2.png', '09.webp'],
      ['S10_她也在凝视.png', '10.webp'],
    ],
  },
];

const manifest = [];
for (const work of works) {
  const output = path.join(root, 'public', 'media', 'v3', 'works', work.slug);
  await mkdir(output, { recursive: true });
  for (const [inputName, outputName] of work.files) {
    const input = path.join(work.source, inputName);
    const bytes = await readFile(input);
    const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
    const destination = path.join(output, outputName);
    const image = sharp(bytes).rotate();
    const metadata = await image.metadata();
    await image.resize({ width: 1680, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(destination);
    const converted = await readFile(destination);
    manifest.push({
      slug: work.slug,
      source: input,
      sourceSha256,
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      publicPath: `/media/v3/works/${work.slug}/${outputName}`,
      publicBytes: converted.length,
      publicSha256: createHash('sha256').update(converted).digest('hex'),
    });
  }
}
await writeFile(path.join(root, 'docs', 'agent-work', 'v3-first-works-media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${manifest.length} web images; ${manifest.reduce((sum, entry) => sum + entry.publicBytes, 0)} public bytes.`);
