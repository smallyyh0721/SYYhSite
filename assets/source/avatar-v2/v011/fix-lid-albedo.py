import bpy,json
from pathlib import Path
out=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v009/visitor-source.blend'))
if (out/'visitor-source.blend').exists():raise RuntimeError('Preserve revision')
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];rig=bpy.data.objects['VisitorRig']
skin=body.data.materials[0];nt=skin.node_tree;p=nt.nodes.get('Principled BSDF');old=next(l.from_socket for l in nt.links if l.to_socket==p.inputs['Base Color'])
pos=nt.nodes.new('ShaderNodeNewGeometry');xyz=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(pos.outputs['Position'],xyz.inputs[0])
def calc(op,a,b=None):
    n=nt.nodes.new('ShaderNodeMath');n.operation=op
    for i,v in enumerate([a,b] if b is not None else [a]):
        if isinstance(v,(int,float)):n.inputs[i].default_value=v
        else:nt.links.new(v,n.inputs[i])
    return n.outputs[0]
x,y,z=[xyz.outputs[i] for i in range(3)]
xx=calc('DIVIDE',calc('SUBTRACT',calc('ABSOLUTE',x),.0302),.025)
zz=calc('DIVIDE',calc('SUBTRACT',z,1.5815),.0125)
rad=calc('ADD',calc('MULTIPLY',xx,xx),calc('MULTIPLY',zz,zz))
mask=calc('MULTIPLY',calc('MINIMUM',1,calc('MAXIMUM',0,calc('MULTIPLY',calc('SUBTRACT',1.5,rad),2))),calc('LESS_THAN',y,-.09))
mix=nt.nodes.new('ShaderNodeMixRGB');nt.links.new(mask,mix.inputs[0]);nt.links.new(old,mix.inputs[1]);mix.inputs[2].default_value=(.64,.49,.43,1);nt.links.new(mix.outputs[0],p.inputs['Base Color'])
atlas=bpy.data.images.new('Clean eyelid albedo',width=2048,height=2048,alpha=False);n=nt.nodes.new('ShaderNodeTexImage');n.image=atlas;nt.nodes.active=n
scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
sub=next(m for m in body.modifiers if m.type=='SUBSURF');sub.levels=1;sub.render_levels=1
bpy.ops.object.bake(type='DIFFUSE');atlas.filepath_raw=str(out/'skin-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack()
uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='MakeHuman CC0 UV';nt.links.new(uv.outputs['UV'],n.inputs['Vector']);nt.links.new(n.outputs['Color'],p.inputs['Base Color'])
scene.cycles.samples=32;sub.levels=0;sub.render_levels=1
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
for blink in [0,1]:
    body.data.shape_keys.key_blocks['Blink'].value=blink;scene.render.filepath=str(out/('eyes-%s.png'%blink));bpy.ops.render.render(write_still=True)
body.data.shape_keys.key_blocks['Blink'].value=0
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,export_vertex_color='NONE',export_all_vertex_colors=False)
print('V011_LIDS_RENDERED_EXPORTED')
