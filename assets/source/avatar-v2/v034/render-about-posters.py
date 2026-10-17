import bpy
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out/'visitor-source.blend'))
scene=bpy.context.scene;camera=scene.camera
camera.data.type='ORTHO';camera.data.ortho_scale=.80
camera.location=(0,-3,1.405);camera.rotation_euler=(Vector((0,0,1.405))-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=960;scene.render.resolution_y=960;scene.eevee.taa_render_samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(out/'about-source.blend'))
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'about-night.png');bpy.ops.render.render(write_still=True)
print('HALF_BODY_MATCHED_POSTERS_RENDERED')
