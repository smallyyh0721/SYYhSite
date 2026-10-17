from pathlib import Path
import shutil,json
root=Path(__file__).resolve().parents[1]
folder=root/'assets/source/avatar-v2';out=folder/'v004';out.mkdir(parents=True,exist_ok=True)
code=(folder/'v003/build-character.py').read_text(encoding='utf-8')
changes={
 "extra_targets={'l-eye-scale-incr.target':.60,'r-eye-scale-incr.target':.60}":"extra_targets={'l-eye-scale-incr.target':.20,'r-eye-scale-incr.target':.20}",
 "def front(x,z,offset=.003):":"def front(x,z,offset=.009):",
 "return hit+direction*.003":"return hit+direction*.010",
 "cup=mesh('Tailored swimwear cup'+str(side),vs,fs,navy,'Spine')":"cup=mesh('Tailored swimwear cup'+str(side),vs,fs,navy)",
 "sphere('EyeWhite'+side,eye,(.019,.022,.0155),white,'Eye'+side)":"sphere('EyeWhite'+side,eye+Vector((0,.014,0)),(.0165,.022,.0115),white,'Eye'+side)",
 "sphere('Iris'+side,eye+Vector((0,-.021,0)),(.010,.002,.0115),iris,'Eye'+side)":"sphere('Iris'+side,eye+Vector((0,-.0065,0)),(.0085,.002,.009),iris,'Eye'+side)",
 "sphere('Pupil'+side,eye+Vector((0,-.0235,0)),(.0043,.001,.007),pupil,'Eye'+side)":"sphere('Pupil'+side,eye+Vector((0,-.009,0)),(.0038,.001,.006),pupil,'Eye'+side)",
 "sphere('EyeCatchlight'+side,eye+Vector((-.003,-.025,.004)),(.002,.001,.002),white,'Eye'+side,16)":"sphere('EyeCatchlight'+side,eye+Vector((-.0025,-.0105,.003)),(.0017,.001,.0017),white,'Eye'+side,16)",
 "uv.data[loop.index].uv=((i%5)/4,(1-(i//5)/31)*.94+.02)":"uv.data[loop.index].uv=(.40+(i%5)/4*.20,(1-(i//5)/31)*.94+.02)",
}
for a,b in changes.items():
    assert a in code,a
    code=code.replace(a,b,1)
a="opaque=haircard.copy();opaque.name='Crown black fibres';p=opaque.node_tree.nodes.get('Principled BSDF')"
b="opaque=material('Matte black crown',(.008,.010,.014),.68);p=opaque.node_tree.nodes.get('Principled BSDF');p.inputs['Specular IOR Level'].default_value=.08"
assert a in code;code=code.replace(a,b,1)
# Continuous covered front gusset avoids the radial crotch singularity.
marker="curve('Swimwear waist binding'"
idx=code.index(marker)
code=code[:idx]+"""patch_vs=[];patch_fs=[]
for j in range(10):
    t=j/9;z=.775+.14*t;width=.032+.019*t
    for k in range(10):
        x=(k/9*2-1)*width;patch_vs.append(front(x,z,.012))
for j in range(9):
    for k in range(9):a=j*10+k;patch_fs.append((a,a+1,a+11,a+10))
mesh('Opaque swimwear front gusset',patch_vs,patch_fs,navy,'pelvis')
"""+code[idx:]
code=code.replace('visitor-work-v003.blend','visitor-work-v004.blend').replace('V003_RENDERED','V004_RENDERED')
(out/'build-character.py').write_text(code,encoding='utf-8')
for file in ['face-generation.json','hair-generation.json']:shutil.copy2(folder/'v003'/file,out/file)
print('Prepared v004: garment skin coupling, cornea placement, dense hair and dark crown')
