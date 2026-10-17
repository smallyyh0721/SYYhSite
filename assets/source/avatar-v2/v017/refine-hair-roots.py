import bpy
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Retain revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v016/visitor-source.blend'))
scene=bpy.context.scene;hair=bpy.data.objects['LongBlackHair']
for v in hair.data.vertices:
    p=v.co
    if p.z<1.64:continue
    q=Vector((p.x/.087,(p.y+.028)/.108,(p.z-1.621)/.085))
    if q.length<=1.025:continue
    q=q.normalized()*1.015;fitted=Vector((q.x*.087,q.y*.108-.028,q.z*.085+1.621))
    w=min(1,max(0,(p.z-1.64)/.027));v.co=p.lerp(fitted,w)
hair.data.update()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,export_vertex_color='NONE',export_all_vertex_colors=False,export_image_format='JPEG',export_image_quality=90)
scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.camera.data.ortho_scale=.96;scene.camera.location=(.02,-3.1,1.43);scene.camera.rotation_euler=(Vector((0,-.015,1.27))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'about-night.png');bpy.ops.render.render(write_still=True)
print('HAIR_ROOTS_SOURCE_REVIEWED')
