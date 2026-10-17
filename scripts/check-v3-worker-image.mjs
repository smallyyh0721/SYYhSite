// Feed to `docker run --rm -i --network none --read-only --tmpfs /tmp:... IMAGE node --input-type=module -`.
// The image's /app is the cwd. All data is synthetic and remains in the disposable tmpfs.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {openContentStore} from './content-store.mjs';
import {normalizeContentConfig} from './content-config.mjs';
import {enqueueUpload} from './content-media.mjs';
import {runWorkerOnce} from './media-worker.mjs';
assert.equal(process.platform,'linux','Run inside the isolated Linux worker image');
const root=mkdtempSync(join(tmpdir(),'syyh-worker-smoke-')),store=join(root,'cos'),derived=join(store,'derived'),staging=join(root,'uploads');
for(const dir of [store,derived,staging])mkdirSync(dir,{recursive:true});
const storeId='isolated-worker-smoke-20261017';
for(const file of [join(store,'.syyh-store-id'),join(derived,'.syyh-store-id')])writeFileSync(file,storeId+'\n');
const source=join(root,'audio-video.mp4');
execFileSync('/usr/bin/ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i','testsrc2=size=640x360:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','2','-threads','1','-filter_threads','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart',source],{timeout:30000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});
const config=normalizeContentConfig({dbPath:join(root,'content.sqlite'),publicOrigin:'https://worker-smoke.test',ownerPasswordFile:join(root,'unused-owner.hash'),derivedRoot:derived,storeId,stagingRoot:staging});
const db=openContentStore(config.dbPath);
try {
 const bytes=readFileSync(source),queued=await enqueueUpload(db,config,{filename:'audio-video.mp4',body:bytes});
 const outcome=await runWorkerOnce({dbPath:config.dbPath,stagingRoot:staging,cosSiteRoot:store,storeId,ffmpegPath:'/usr/bin/ffmpeg',ffprobePath:'/usr/bin/ffprobe'});
 assert.equal(outcome.status,'ready',JSON.stringify(db.prepare('SELECT status,error FROM assets WHERE id=?').get(queued.id)));
 const asset=db.prepare('SELECT * FROM assets WHERE id=?').get(queued.id);assert.equal(asset.kind,'video');assert.equal(asset.original_sha256,createHash('sha256').update(bytes).digest('hex'));
 assert.ok(existsSync(join(derived,asset.poster_rel)));assert.ok(asset.poster_bytes>0);assert.ok(asset.duration_ms>=1900&&asset.duration_ms<=2100);
 const probe=JSON.parse(execFileSync('/usr/bin/ffprobe',['-v','error','-print_format','json','-show_streams',join(derived,asset.derived_rel)],{timeout:10000}).toString());
 assert.equal(probe.streams.find(s=>s.codec_type==='video')?.codec_name,'h264');assert.equal(probe.streams.find(s=>s.codec_type==='audio')?.codec_name,'aac');
 assert.ok(!existsSync(join(staging,asset.staging_name)));
 console.log(JSON.stringify({passed:true,syntheticInput:'2-second test pattern with audio',ready:true,video:'h264',audio:'aac',poster:true,originalHash:true,stagingRemoved:true,realCOSUntouched:true}));
} finally {db.close();}
