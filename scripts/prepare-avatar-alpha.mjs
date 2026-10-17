import {readFile,writeFile} from 'node:fs/promises';
const revision=process.argv[2]||'v034';if(!/^v\d{3}$/.test(revision))throw new Error('Invalid revision');
const source='assets/source/avatar-v2/'+revision+'/visitor.glb';const bytes=await readFile(source);
const size=bytes.readUInt32LE(12);const data=JSON.parse(bytes.subarray(20,20+size).toString('utf8'));
let changed=0;for(const mat of data.materials||[])if(mat.name==='GPT silk fibre black hair'){mat.alphaMode='MASK';mat.alphaCutoff=.25;changed++}
if(changed!==1)throw new Error('Expected exactly one native hair material');
const raw=Buffer.from(JSON.stringify(data));const len=Math.ceil(raw.length/4)*4;const json=Buffer.alloc(len,0x20);raw.copy(json);
const tail=bytes.subarray(20+size);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+len+tail.length,8);header.writeUInt32LE(len,12);header.writeUInt32LE(0x4e4f534a,16);
await writeFile('assets/source/avatar-v2/'+revision+'/visitor-alpha.glb',Buffer.concat([header,json,tail]));console.log('Hair uses native alpha mask; source blend/export retained');
