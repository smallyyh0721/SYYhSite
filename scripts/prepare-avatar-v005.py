from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1];folder=root/'assets/source/avatar-v2';out=folder/'v005';out.mkdir(parents=True,exist_ok=True)
code=(folder/'v004/build-character.py').read_text(encoding='utf-8')
code=code.replace('visitor-work-v004.blend','visitor-work-v005.blend').replace('V004_RENDERED','V005_RENDERED')
marker='# No vertex-colour multiplication of the face photograph in the runtime GLB.'
idx=code.index(marker)
code=code[:idx]+"""# Fitted cloth follows evaluated posed skin, including the smooth breast/shoulder surface.
for obj in list(bpy.data.objects):
    if obj.type!='MESH' or not obj.name.startswith('Tailored swimwear cup'):continue
    smooth=obj.modifiers.new('Smooth tailored fabric','SUBSURF');smooth.levels=1;smooth.render_levels=1
    fit=obj.modifiers.new('Exact posed body fit','SHRINKWRAP');fit.target=body;fit.wrap_method='NEAREST_SURFACEPOINT';fit.wrap_mode='OUTSIDE';fit.offset=.005
"""+code[idx:]
# Give the loose garment continuous shoulders and less mechanically flat front panels.
code=code.replace("robe.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.20","robe.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.12")
# Restore discreet physical lash contours to support the painted albedo at oblique angles.
marker="# Shaped open crown, no closed sphere covering the forehead."
idx=code.index(marker)
code=code[:idx]+"""for side,eye in zip(['L','R'],eyes):
    curve('Subtle upper lash '+side,[front(eye.x-.016,eye.z+.003,.001),front(eye.x,eye.z+.008,.001),front(eye.x+.017,eye.z+.004,.001)],.0007,hairmat,'Head')
"""+code[idx:]
(out/'build-character.py').write_text(code,encoding='utf-8')
for file in ['face-generation.json','hair-generation.json']:shutil.copy2(folder/'v004'/file,out/file)
print('Prepared v005: exact posed skin fit, subtle lashes and light gauze')
