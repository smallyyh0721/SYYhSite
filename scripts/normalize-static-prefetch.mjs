// Next 16.4 export uses path.relative before converting '/' to '.'. On Windows,
// '\\' survives as subdirectories. Copy the exact RSC payload to its URL filename.
// Existing exports and bytes are retained; Linux's already-flat files need no change.
import {readdir,copyFile,readFile} from 'node:fs/promises';
import {resolve,join,relative,dirname} from 'node:path';
const root=resolve(process.argv[2]||'out');let copied=0;
async function leaves(directory){const result=[];for(const entry of await readdir(directory,{withFileTypes:true})){const file=join(directory,entry.name);if(entry.isDirectory())result.push(...await leaves(file));else if(entry.isFile()&&entry.name.endsWith('.txt'))result.push(file)}return result}
async function visit(directory){for(const entry of await readdir(directory,{withFileTypes:true})){if(!entry.isDirectory())continue;const file=join(directory,entry.name);if(entry.name.startsWith('__next.')){for(const source of await leaves(file)){const filename=relative(directory,source).split(/[\\/]/).join('.');const destination=join(directory,filename);try{const existing=await readFile(destination);if(!existing.equals(await readFile(source)))throw new Error('Conflicting RSC payload '+destination)}catch(error){if(error.code!=='ENOENT')throw error;await copyFile(source,destination);copied++}}}else await visit(file)}}
await visit(root);console.log('Static prefetch payload aliases copied:',copied);
