import bpy,json
from pathlib import Path
out=Path(__file__).resolve().parent
if (out/'visitor.glb').exists():raise RuntimeError('Choose new revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v008/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];rig=bpy.data.objects['VisitorRig']
# Preserve morph topology and bake just robe smoothing. Consolidate hair draw calls.
hair=[o for o in scene.objects if o.type=='MESH' and any(s in o.name for s in ['Swept ','Temple strand','Part right fringe'])]
bpy.ops.object.select_all(action='DESELECT')
for o in hair:o.select_set(True)
bpy.context.view_layer.objects.active=hair[0];bpy.ops.object.join();bpy.context.object.name='LongBlackHair'
for o in list(scene.objects):
    if o.type!='MESH' or o==body:continue
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    for m in list(o.modifiers):
        if m.type not in ['ARMATURE']:bpy.ops.object.modifier_apply(modifier=m.name)
sub=next(m for m in body.modifiers if m.type=='SUBSURF');sub.levels=0;sub.render_levels=1
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,export_vertex_color='NONE',export_all_vertex_colors=False)
print('EXPORTED', (out/'visitor.glb').stat().st_size)
# Actual file re-import in an empty scene; retain lighting and camera specification.
lights=[(o.name,tuple(o.location),tuple(o.rotation_euler),o.data.energy,tuple(o.data.color),o.data.size) for o in scene.objects if o.type=='LIGHT']
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(out/'visitor.glb'))
scene=bpy.context.scene
meshes=[o for o in scene.objects if o.type=='MESH'];rig=next(o for o in scene.objects if o.type=='ARMATURE');body=bpy.data.objects.get('VisitorBody')
assert body and body.type=='MESH'
assert all(n in rig.data.bones for n in ['Head','Spine','EyeL','EyeR'])
assert all(n in body.data.shape_keys.key_blocks for n in ['Blink','Smile'])
(out/'reimport-checks.json').write_text(json.dumps({'bytes':(out/'visitor.glb').stat().st_size,'bones':len(rig.data.bones),'morphs':[k.name for k in body.data.shape_keys.key_blocks],'bodyMaterials':len(body.data.materials),'meshCount':len(meshes),'maxVertices':sum(len(o.data.vertices) for o in meshes),'actualGlbReimport':True},indent=2),encoding='utf-8')
for name,loc,rot,energy,color,size in lights:
    d=bpy.data.lights.new(name,'AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=rot
scene.world=bpy.data.worlds.new('Review world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.32,.38,.47,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.3
from mathutils import Vector
d=bpy.data.cameras.new('Actual GLB camera');o=bpy.data.objects.new('Actual GLB camera',d);scene.collection.objects.link(o);o.location=(.035,-3.1,1.41);o.rotation_euler=(Vector((0,-.015,1.24))-o.location).to_track_quat('-Z','Y').to_euler();d.type='ORTHO';d.ortho_scale=1.08;scene.camera=o
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True;scene.render.resolution_x=800;scene.render.resolution_y=1080;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(out/'actual-glb-open.png');bpy.ops.render.render(write_still=True)
body.data.shape_keys.key_blocks['Blink'].value=1;scene.render.filepath=str(out/'actual-glb-blink.png');bpy.ops.render.render(write_still=True)
print('ACTUAL_GLB_REIMPORTED_RENDERED')
