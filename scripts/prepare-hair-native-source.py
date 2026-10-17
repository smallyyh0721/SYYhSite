import zipfile,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'assets/source/avatar-v2/v019/hair-base';out.mkdir(parents=True,exist_ok=True)
z=zipfile.ZipFile(root/'docs/agent-work/logs/hair01_cc0.zip')
files=[]
for name in ['o4saken_long01.obj','o4saken_long01.mhclo']:
    data=z.read('hair/o4saken_long01/'+name);(out/name).write_bytes(data);files.append({'file':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
record={'asset':'o4saken_long01 native geometry only','author':'04saken (MHCLO header), published by punkduck (official pack index)','source':'https://static.makehumancommunity.org/assets/assetpacks/hair01.html','archive':'https://files2.makehumancommunity.org/asset_packs/hair01/hair01_cc0.zip','license':'CC-BY-4.0 used as stricter grant; official pack lists CC0 but original MHCLO header says CC BY4.0','licenseURL':'https://creativecommons.org/licenses/by/4.0/','changes':'fit to original 25yo visitor morphology, extend to waist, custom GPT hair fibre material, new rig weights; no source raster textures included','files':files}
(out/'source-license.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
