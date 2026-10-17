import bpy,json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Retain source revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v012/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];rig=bpy.data.objects['VisitorRig']
# Resolve the same smooth surface for basis and both expressions; retains native UV and weights.
keys=body.data.shape_keys.key_blocks;sub=next(m for m in body.modifiers if m.type=='SUBSURF');sub.levels=1;sub.render_levels=1
for k in keys:k.value=0
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(deps)
base=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=True,depsgraph=deps)
shapes={}
for name in ['Blink','Smile']:
    keys[name].value=1;bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();tmp=bpy.data.meshes.new_from_object(body.evaluated_get(deps),preserve_all_data_layers=True,depsgraph=deps)
    assert len(tmp.vertices)==len(base.vertices);shapes[name]=[v.co.copy() for v in tmp.vertices];keys[name].value=0;bpy.data.meshes.remove(tmp)
body.data=base;body.modifiers.remove(sub);body.shape_key_add(name='Basis')
for name,coords in shapes.items():
    block=body.shape_key_add(name=name)
    for v,co in zip(block.data,coords):v.co=co
body.data.shape_keys.key_blocks['Smile'].value=.16
# Roots meet the scalp instead of protruding as straight cut card ends above the temples.
hair=bpy.data.objects['LongBlackHair']
for v in hair.data.vertices:
    if abs(v.co.x)>.065 and v.co.z>1.67:v.co.z-=.015
hair.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,export_vertex_color='NONE',export_all_vertex_colors=False,export_image_format='JPEG',export_image_quality=90)
# Actual poster render, square half-body; night changes the lights, no repaint of the image.
scene.camera.location=(.02,-3.1,1.43);scene.camera.rotation_euler=(Vector((0,-.015,1.27))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.camera.data.ortho_scale=.96
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'about-night.png');bpy.ops.render.render(write_still=True)
(out/'runtime-info.json').write_text(json.dumps({'status':'source and GLB exported; actual GLB consumer regression pending','bones':len(rig.data.bones),'bodyVertices':len(body.data.vertices),'morphs':[k.name for k in body.data.shape_keys.key_blocks],'glbBytes':(out/'visitor.glb').stat().st_size,'albedoEncoding':'JPEG90 withinGLB; PNG source retained'},indent=2),encoding='utf-8')
print('SMOOTH_SOURCE_POSTERS_COMPLETE')
