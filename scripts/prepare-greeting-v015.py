from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'assets/source/avatar-v2/v015';out.mkdir(exist_ok=True)
code=(out.parent/'v014/prepare-greeting.py').read_text(encoding='utf-8').replace('up=Vector((0,0,1))','up=Vector((0,0,-1))')
code+= """
# Review the same action in portrait and moonlit lighting before full sequence rendering.
scene.camera.data.sensor_fit='VERTICAL';scene.camera.data.sensor_height=26;scene.camera.location=(0,-2.0,1.43);scene.camera.rotation_euler=(Vector((0,-.025,1.25))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=540;scene.render.resolution_y=960;scene.render.filepath=str(out/'pose-portrait-day.png');bpy.ops.render.render(write_still=True)
plate.image=bpy.data.images.load(str(out.parent/'beach-v001/night.png'));plate.image.pack()
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'pose-portrait-night.png');bpy.ops.render.render(write_still=True)
"""
(out/'prepare-greeting.py').write_text(code,encoding='utf-8')
