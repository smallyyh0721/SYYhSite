import bpy,json
from pathlib import Path
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Retain revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v019/visitor-source.blend'))
scene=bpy.context.scene;hair=bpy.data.objects['LongBlackHair'];mat=hair.data.materials[0];nt=mat.node_tree;p=nt.nodes.get('Principled BSDF')
for uv in hair.data.uv_layers.active.data:uv.uv.x=(uv.uv.x-.42)/.16
nt.nodes.clear();p=nt.nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.56;p.inputs['Specular IOR Level'].default_value=.10
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(out/'hair-atlas.png'));tex.image.pack();nt.links.new(tex.outputs['Color'],p.inputs['Base Color']);nt.links.new(tex.outputs['Alpha'],p.inputs['Alpha'])
dest=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(p.outputs['BSDF'],dest.inputs[0]);mat.surface_render_method='DITHERED';mat.use_transparency_overlap=False
scene.eevee.taa_render_samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'about-night.png');bpy.ops.render.render(write_still=True)
print('GPT_ATLAS_ON_NATIVE_MESH_RENDERED')
