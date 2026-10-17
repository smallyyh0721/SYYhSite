"""Read v005, preserve its scene, bake posed base and one skin atlas for glTF.
Exports a REVIEW GLB only; public integration follows actual re-import/visual checks.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
source=out.parent/'v005/visitor-work-v005.blend'
print('BACKGROUND_INPUT',json.dumps({'file':bpy.data.filepath,'objects':[o.name for o in bpy.context.scene.objects]}))
if (out/'visitor-runtime-review.glb').exists():raise RuntimeError('Retain this review export and choose a new revision')
bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene;rig=bpy.data.objects['VisitorRig'];body=bpy.data.objects['VisitorBody']
scene.frame_set(1);bpy.context.view_layer.update()
print('READ_SOURCE',json.dumps({'file':bpy.data.filepath,'bones':len(rig.data.bones),'morphs':[k.name for k in body.data.shape_keys.key_blocks]}))
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type=='SHRINKWRAP' and m.target==body:m.offset=.015
deps=bpy.context.evaluated_depsgraph_get()
evaluated=rig.evaluated_get(deps)
pose={p.name:p.matrix.copy() for p in evaluated.pose.bones}
deform={name:pose[name]@rig.data.bones[name].matrix_local.inverted() for name in pose}
meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' and m.object==rig for m in o.modifiers)]
for obj in meshes:
    to_world=obj.matrix_world.copy();to_local=to_world.inverted()
    bindings=[]
    for v in obj.data.vertices:
        row=[(deform[obj.vertex_groups[g.group].name],g.weight) for g in v.groups if obj.vertex_groups[g.group].name in deform and g.weight>0]
        bindings.append(row)
    def posed(co,index):
        row=bindings[index]
        if not row:return co.copy()
        p=to_world@co;total=sum(w for m,w in row)
        return to_local@(sum((m@p*w for m,w in row),Vector())/total)
    keys=obj.data.shape_keys
    if keys:
        for key in keys.key_blocks:
            for i,v in enumerate(key.data):v.co=posed(v.co,i)
        for i,v in enumerate(obj.data.vertices):v.co=keys.key_blocks['Basis'].data[i].co
    else:
        for i,v in enumerate(obj.data.vertices):v.co=posed(v.co,i)
    for m in list(obj.modifiers):
        if m.type=='ARMATURE' and m.object==rig:obj.modifiers.remove(m)
    obj.data.update()
# Constraints generated the posed matrices; their result becomes the new editable rest.
for p in rig.pose.bones:
    for c in list(p.constraints):p.constraints.remove(c)
depth=lambda p:len(p.parent_recursive)
for p in sorted(rig.pose.bones,key=depth):p.matrix=pose[p.name]
bpy.context.view_layer.update();bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='POSE');bpy.ops.pose.armature_apply(selected=False);bpy.ops.object.mode_set(mode='OBJECT')
for obj in meshes:
    m=obj.modifiers.new('Rest skin','ARMATURE');m.object=rig
    bpy.context.view_layer.objects.active=obj
    while obj.modifiers[0]!=m:bpy.ops.object.modifier_move_up(modifier=m.name)
bpy.context.view_layer.update()
# One VisitorBody primitive: all facial morphs remain addressable by the web consumer.
body.data.uv_layers.active=body.data.uv_layers['MakeHuman CC0 UV']
body.data.uv_layers['MakeHuman CC0 UV'].active_render=True
atlas=bpy.data.images.new('Visitor skin atlas',width=2048,height=2048,alpha=False)
for mat in body.data.materials:
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=atlas;mat.node_tree.nodes.active=node
scene.render.engine='CYCLES';scene.cycles.samples=1
scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True;scene.render.bake.margin=12
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
sub=next(m for m in body.modifiers if m.type=='SUBSURF');sub.levels=0;sub.render_levels=0
bpy.ops.object.bake(type='DIFFUSE')
atlas.filepath_raw=str(out/'skin-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack()
skin=bpy.data.materials.new('Visitor skin albedo');skin.use_nodes=True
p=skin.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.58;p.inputs['Subsurface Weight'].default_value=.06
tex=skin.node_tree.nodes.new('ShaderNodeTexImage');tex.image=atlas
uv=skin.node_tree.nodes.new('ShaderNodeUVMap');uv.uv_map='MakeHuman CC0 UV'
skin.node_tree.links.new(uv.outputs['UV'],tex.inputs['Vector']);skin.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
body.data.materials.clear();body.data.materials.append(skin)
for poly in body.data.polygons:poly.material_index=0
# The high-quality source render still uses its smooth surface; game mesh keeps its morph topology.
sub.levels=0;sub.render_levels=1
for obj in meshes:
    if obj==body:continue
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
    for m in list(obj.modifiers):
        if m.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=m.name)
# Consolidate fibre draw calls while preserving named vertex groups and texture UVs.
hair=[o for o in meshes if o.name.startswith(('Long straight back layer','Waist length front lock'))]
bpy.ops.object.select_all(action='DESELECT')
for o in hair:o.select_set(True)
bpy.context.view_layer.objects.active=hair[0];bpy.ops.object.join();bpy.context.object.name='LongBlackHair'
bpy.context.view_layer.update()
scene.cycles.samples=32;scene.cycles.use_denoising=True
camera=scene.camera;camera.location=(.035,-3.1,1.41);camera.rotation_euler=(Vector((0,-.015,1.24))-camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor-runtime-review.glb'),export_format='GLB',use_selection=True,
    export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,
    export_vertex_color='NONE',export_all_vertex_colors=False)
scene.render.filepath=str(out/'posed-atlas-review.png');bpy.ops.render.render(write_still=True)
(out/'runtime-status.json').write_text(json.dumps({'status':'review export; verify source and actual GLB before integration',
    'bones':len(rig.data.bones),'morphs':[k.name for k in body.data.shape_keys.key_blocks],
    'glbBytes':(out/'visitor-runtime-review.glb').stat().st_size,'source':str(out/'visitor-source.blend')},indent=2)+'\n',encoding='utf-8')
print('REVIEW_GLB_EXPORTED')
