from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'assets/source/avatar-v2/v013';out.mkdir(exist_ok=True)
code=(out.parent/'v010/prepare-greeting.py').read_text(encoding='utf-8')
code=code.replace("v009/visitor-source.blend","v012/visitor-source.blend")
code=code.replace('parentq.inverted()@delta@parentq','rest.inverted()@delta@rest')
marker='# Expressive transition'
insert="""
# Palm offered upward with fingers leading toward the visitor; parent IK is evaluated first.
wrist=rig.pose.bones['wrist.R'];wrist.rotation_mode='QUATERNION'
scene.frame_set(1);wrist.rotation_quaternion=Quaternion();wrist.keyframe_insert(data_path='rotation_quaternion',frame=1);wrist.keyframe_insert(data_path='rotation_quaternion',frame=18)
for f in [42,64,84]:
    scene.frame_set(f);bpy.context.view_layer.update()
    direction=Vector((-.01,-.18,.018));rotation=direction.to_track_quat('Y','Z')
    matrix=rotation.to_matrix().to_4x4();matrix.translation=wrist.head.copy();wrist.matrix=matrix
    bpy.context.view_layer.update();wrist.keyframe_insert(data_path='rotation_quaternion',frame=f)
"""
code=code.replace(marker,insert+'\n'+marker)
code=code.replace("scene.camera.data.type='ORTHO';scene.camera.data.ortho_scale=1.88;scene.camera.location=(0,-3.1,1.43)","scene.camera.data.type='PERSP';scene.camera.data.lens=50;scene.camera.data.sensor_width=36;scene.camera.location=(0,-2.48,1.43)")
compositor="""
# Separate generated beach plate; the actor and all motion remain native Blender geometry.
scene.use_nodes=True;nodes=scene.node_tree.nodes;nodes.clear();links=scene.node_tree.links
layer=nodes.new('CompositorNodeRLayers');plate=nodes.new('CompositorNodeImage');plate.image=bpy.data.images.load(str(out.parent/'beach-v001/day.png'));plate.image.pack()
scale=nodes.new('CompositorNodeScale');scale.space='RENDER_SIZE';scale.frame_method='CROP';links.new(plate.outputs['Image'],scale.inputs[0])
over=nodes.new('CompositorNodeAlphaOver');over.inputs[0].default_value=1;over.use_premultiply=True;links.new(scale.outputs[0],over.inputs[1]);links.new(layer.outputs['Image'],over.inputs[2]);dest=nodes.new('CompositorNodeComposite');links.new(over.outputs[0],dest.inputs[0])
"""
code=code.replace('scene.frame_set(1);bpy.ops.wm.save_as_mainfile',compositor+'\nscene.frame_set(1);bpy.ops.wm.save_as_mainfile')
(out/'prepare-greeting.py').write_text(code,encoding='utf-8')
