"""Collect only CC0 core anatomical data; no MakeHuman application code or unrelated project assets."""
from pathlib import Path
import shutil, json, hashlib
root = Path(__file__).resolve().parents[1]
repo = root / 'docs/agent-work/logs/makehuman-source'
out = root / 'assets/source/avatar-v2/v001'
out.mkdir(parents=True, exist_ok=True)
targets = {
    'asian-female-young.target': 1.0,
    'universal-female-young-averagemuscle-averageweight.target': 1.0,
    'female-young-averagemuscle-averageweight-maxcup-averagefirmness.target': .62,
    'head-oval.target': .35,
    'head-scale-horiz-decr.target': .16,
    'head-scale-vert-incr.target': .12,
}
files = ['LICENSE.md','LICENSE.ASSETS.md','makehuman/data/3dobjs/base.obj',
         'makehuman/data/rigs/default.mhskel','makehuman/data/rigs/default_weights.mhw']
for name in targets:
    found = list((repo / 'makehuman/data/targets').rglob(name))
    assert len(found) == 1, (name, len(found))
    files.append(str(found[0].relative_to(repo)).replace('\\','/'))
records = []
for relative in files:
    source = repo / relative
    dest = out / 'base-data' / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, dest)
    records.append({'file': str(dest.relative_to(out)), 'upstream':relative,
        'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
reference = json.loads((out/'reference-generation.json').read_text(encoding='utf-8'))['assets'][0]
shutil.copy2(reference['source'],out/'character-turnaround.png')
shutil.copy2(root/'design/v2-material-preview/v001/images/character.png',out/'approved-character.png')
manifest = {'source':'https://github.com/makehumancommunity/makehuman',
    'commit':'a8bc2d54ff0ac92e78ff71431b1023eda42bf482', 'license':'CC0-1.0 core assets only',
    'licenseEvidence':'https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md#c-the-license-for-the-bundled-assets',
    'adultAge':25,'heightMeters':1.7,'morphTargets':targets,'files':records,
    'status':'source-prepared; character modelling, clothes, rig and animation still to produce'}
(out/'source-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
obj=(repo/'makehuman/data/3dobjs/base.obj').read_text(encoding='utf-8')
groups={};current='none';vertices=[]
for line in obj.splitlines():
    if line.startswith('v '): vertices.append([float(v) for v in line.split()[1:4]])
    if line.startswith('g '): current=line[2:];groups.setdefault(current,0)
    if line.startswith('f '): groups[current]=groups.get(current,0)+1
rig=json.loads((repo/'makehuman/data/rigs/default.mhskel').read_text(encoding='utf-8'))
print(json.dumps({'files':len(files),'vertices':len(vertices),'groups':sorted(groups.items(), key=lambda item: -item[1])[:20],'rigKeys':list(rig),
    'bones':list(rig['bones'])[:16],'jointSample':list(rig.get('joints',{}).items())[:3]},ensure_ascii=False))
