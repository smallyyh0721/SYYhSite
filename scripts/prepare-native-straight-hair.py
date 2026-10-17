from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1];out=root/'assets/source/avatar-v2/v022'
code=(out.parent/'v019/fit-native-hair.py').read_text(encoding='utf-8')
code=code.replace('o4saken_long01.mhclo','cortu_straight_bangs.mhclo').replace('o4saken_long01.obj','straight_bangs.obj')
code=code.replace('(.42+uvs[t][0]*.16,uvs[t][1])','uvs[t]')
start=code.index("tex=hair.node_tree.nodes.new('ShaderNodeTexImage')")
end=code.index("head=obj.vertex_groups.new",start)
code=code[:start]+"""tex=hair.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(out/'hair-base/straight_bangs_diff.png'));tex.image.pack()
mix=hair.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.10,.10,.10,1);hair.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);hair.node_tree.links.new(mix.outputs[0],p.inputs['Base Color']);hair.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha']);mesh.materials.append(hair);hair.surface_render_method='DITHERED';hair.use_transparency_overlap=False
"""+code[end:]
code=code.replace("'o4saken_long01 by 04saken; published by punkduck'","'straight_bangs by Cortu Johnstone'").replace("'CC-BY-4.0'","'CC0-1.0'")
code=code.replace('NATIVE_WAIST_HAIR_READY_FOR_INSPECTION','STRAIGHT_HAIR_GEOMETRY_REVIEWED')
(out/'fit-native-hair.py').write_text(code,encoding='utf-8')
(out/'hair-base/source-license.json').write_text(json.dumps({'author':'Cortu Johnstone','asset':'straight_bangs','license':'CC0-1.0','source':'https://static.makehumancommunity.org/assets/assetpacks/hair01.html','archive':'https://files2.makehumancommunity.org/asset_packs/hair01/hair01_cc0.zip','evidence':'Original MHCLO and MHMat both explicitly state Cortu Johnstone - CC0; pack index independently lists CC0','changes':'new adult morphology fitting, waist extension, binding and planned GPT black atlas'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
