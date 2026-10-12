import sharp from 'sharp';
import {mkdir,stat} from 'node:fs/promises';
await mkdir('public/media',{recursive:true});
for(const name of ['01-sky-city','02-ancient-landform','03-apocalypse','04-anime-home']){
 const source=name==='03-apocalypse'?'03-apocalypse-planet':name;
 await sharp(`design/review-v2/islands/${source}.png`).resize({width:1600,withoutEnlargement:true}).webp({quality:84}).toFile(`public/media/${name}.webp`);
 console.log(name,(await stat(`public/media/${name}.webp`)).size);
}
