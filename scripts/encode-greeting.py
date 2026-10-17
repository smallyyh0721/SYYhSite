"""Encode complete native sequences, retain originals, then actually decode outputs."""
import json,subprocess,hashlib,sys,re
from pathlib import Path
revision=sys.argv[1] if len(sys.argv)>1 else 'v037';model=sys.argv[2] if len(sys.argv)>2 else 'v034'
assert re.fullmatch(r'v\d{3}',revision) and re.fullmatch(r'v\d{3}',model)
root=Path(__file__).resolve().parents[1];source=root/('assets/source/avatar-v2/'+revision);out=source/'videos';out.mkdir(exist_ok=True)
exe=root/'docs/agent-work/logs/media-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
records=[];pending=[]
for label in ['day','night','day-portrait','night-portrait']:
    frames=root/('docs/agent-work/logs/greeting-'+revision)/label
    if not all((frames/('frame-%04d.png'%i)).is_file() for i in range(1,85)):pending.append(label);continue
    portrait='portrait' in label;size='720:1280' if portrait else '1280:720'
    for ext in ['mp4','webm']:
        file=out/('greeting-'+label+'.'+ext)
        if not file.exists():
            cmd=[str(exe),'-hide_banner','-loglevel','error','-nostdin','-framerate','24','-start_number','1','-i',str(frames/'frame-%04d.png'),'-frames:v','84','-vf','scale='+size+':flags=lanczos','-an']
            if ext=='mp4':cmd+=['-c:v','libx264','-preset','slow','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart']
            else:cmd+=['-c:v','libvpx-vp9','-b:v','0','-crf','34','-deadline','good','-cpu-used','3','-pix_fmt','yuv420p']
            subprocess.run(cmd+[str(file)],check=True)
        # Full decode, not a header or substituted test movie.
        result=subprocess.run([str(exe),'-hide_banner','-nostdin','-i',str(file),'-map','0:v:0','-f','null','-'],capture_output=True,text=True)
        if result.returncode:raise RuntimeError(result.stderr)
        if file.stat().st_size>1200000:raise RuntimeError('Greeting exceeds strict1.2MB '+str(file))
        records.append({'path':str(file.relative_to(root)).replace('\\','/'),'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'fullDecodeExit':result.returncode,'width':720 if portrait else 1280,'height':1280 if portrait else 720,'frames':84,'fps':24,'durationSeconds':3.5})
        print('ENCODED_DECODED',label,ext,file.stat().st_size,flush=True)
total=sum(r['bytes'] for r in records)
if total>6000000:raise RuntimeError('Four-pair total exceeds6MB')
(source/'encoded-manifest.json').write_text(json.dumps({'nativeScene':'greeting-source.blend','sourceModel':'../'+model+'/visitor-source.blend','sourcePlates':'../beach-v001/','sourceFramesDirectory':'docs/agent-work/logs/greeting-'+revision,'allFourVariantsEncoded':not pending,'pending':pending,'totalVideoBytes':total,'variants':records},indent=2)+'\n',encoding='utf-8')
