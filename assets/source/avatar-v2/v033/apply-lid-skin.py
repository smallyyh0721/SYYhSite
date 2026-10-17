import bpy,json
from pathlib import Path
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Keep source revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v031/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];skin=body.data.materials[0];nt=skin.node_tree;nt.nodes.clear()
print('READ_NATIVE_UV', [l.name for l in body.data.uv_layers])
assert 'Face projection' in body.data.uv_layers
p=nt.nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.56;p.inputs['Subsurface Weight'].default_value=.06
base=nt.nodes.new('ShaderNodeTexImage');base.image=bpy.data.images.load(str(out.parent/'v008/skin-atlas.png'));base.image.pack();uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='MakeHuman CC0 UV';nt.links.new(uv.outputs[0],base.inputs[0])
face=nt.nodes.new('ShaderNodeTexImage');face.image=bpy.data.images.load(str(out/'face-lid-albedo.png'));face.image.pack();fuv=nt.nodes.new('ShaderNodeUVMap');fuv.uv_map='Face projection';nt.links.new(fuv.outputs[0],face.inputs[0])
pos=nt.nodes.new('ShaderNodeNewGeometry');xyz=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(pos.outputs['Position'],xyz.inputs[0]);norm=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(pos.outputs['Normal'],norm.inputs[0])
def calc(op,a,b):
    n=nt.nodes.new('ShaderNodeMath');n.operation=op
    for i,v in enumerate([a,b]):
        if isinstance(v,(int,float)):n.inputs[i].default_value=v
        else:nt.links.new(v,n.inputs[i])
    return n.outputs[0]
mask=calc('MULTIPLY',calc('GREATER_THAN',xyz.outputs['Z'],1.466),calc('LESS_THAN',xyz.outputs['Y'],-.077));mask=calc('MULTIPLY',mask,calc('LESS_THAN',norm.outputs['Y'],-.12))
mix=nt.nodes.new('ShaderNodeMixRGB');nt.links.new(mask,mix.inputs[0]);nt.links.new(base.outputs['Color'],mix.inputs[1]);nt.links.new(face.outputs['Color'],mix.inputs[2]);nt.links.new(mix.outputs[0],p.inputs['Base Color']);dest=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(p.outputs[0],dest.inputs[0])
atlas=bpy.data.images.new('Visitor native lid skin atlas',width=2048,height=2048,alpha=False);tex=nt.nodes.new('ShaderNodeTexImage');tex.image=atlas;nt.nodes.active=tex
scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body;body.data.shape_keys.key_blocks['Blink'].value=0
bpy.ops.object.bake(type='DIFFUSE');atlas.filepath_raw=str(out/'skin-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack();nt.links.new(uv.outputs[0],tex.inputs[0]);nt.links.new(tex.outputs['Color'],p.inputs['Base Color'])
scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
for blink in [0,1]:
    body.data.shape_keys.key_blocks['Blink'].value=blink;scene.render.filepath=str(out/('native-lids-%s.png'%blink));bpy.ops.render.render(write_still=True)
print('NATIVE_LID_SKIN_RENDERED')
