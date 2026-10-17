import bpy,json,math
from pathlib import Path
from mathutils import Vector,Quaternion
out=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v012/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];rig=bpy.data.objects['VisitorRig']
print('BONES',json.dumps({n:{'head':list(b.head_local),'tail':list(b.tail_local)} for n,b in rig.data.bones.items() if n in ['EyeL','EyeR','Head','Spine','upperarm01.R','lowerarm01.R','lowerarm02.R','wrist.R','hand.R']}))
# Restore a pole-free IK chain from the already posed relaxed rest to reach forward.
pb=rig.pose.bones['lowerarm02.R'];target=bpy.data.objects.new('Greeting wrist target',None);scene.collection.objects.link(target)
start=rig.matrix_world@pb.tail;target.location=start
ik=pb.constraints.new('IK');ik.target=target;ik.chain_count=4;ik.use_tail=True;ik.iterations=120
for f,pos in [(1,start),(18,start),(42,Vector((-.205,-.32,1.12))),(64,Vector((-.15,-.48,1.27))),(84,Vector((-.15,-.48,1.27)))]:
    target.location=pos;target.keyframe_insert(data_path='location',frame=f)

# Palm offered upward with fingers leading toward the visitor; parent IK is evaluated first.
wrist=rig.pose.bones['wrist.R'];wrist.rotation_mode='QUATERNION'
scene.frame_set(1);wrist.rotation_quaternion=Quaternion();wrist.keyframe_insert(data_path='rotation_quaternion',frame=1);wrist.keyframe_insert(data_path='rotation_quaternion',frame=18)
for f in [42,64,84]:
    scene.frame_set(f);bpy.context.view_layer.update()
    # Aim the actual finger chain, not an assumed local bone axis.
    forward=(rig.pose.bones['finger3-3.R'].tail-wrist.head).normalized()
    across=(rig.pose.bones['finger2-1.R'].head-rig.pose.bones['finger5-1.R'].head).normalized()
    normal=forward.cross(across).normalized()
    desired=Vector((-.01,-.18,.018)).normalized();align=forward.rotation_difference(desired)
    moved=align@normal;up=Vector((0,0,-1));up=(up-desired*up.dot(desired)).normalized()
    angle=math.atan2(desired.dot(moved.cross(up)),moved.dot(up))
    delta=Quaternion(desired,angle)@align
    rotation=delta@wrist.matrix.to_quaternion();matrix=rotation.to_matrix().to_4x4();matrix.translation=wrist.head.copy();wrist.matrix=matrix
    bpy.context.view_layer.update();wrist.keyframe_insert(data_path='rotation_quaternion',frame=f)
# Expressive transition; world-axis deltas composed over original rest.
def bone_key(name,angle,frame):
    bone=rig.pose.bones[name];rest=rig.data.bones[name].matrix_local.to_quaternion();parent=rig.data.bones[name].parent
    parentq=parent.matrix_local.to_quaternion() if parent else Quaternion()
    delta=Quaternion((1,0,0),math.radians(angle));bone.rotation_mode='QUATERNION'
    bone.rotation_quaternion=rest.inverted()@delta@rest
    bone.keyframe_insert(data_path='rotation_quaternion',frame=frame)
for f,lean,nod,smile in [(1,0,0,0),(18,0,0,.05),(42,2,1,.38),(64,5,2,.67),(84,5,2,.67)]:
    bone_key('Spine',lean,f);bone_key('Head',nod,f)
    body.data.shape_keys.key_blocks['Smile'].value=smile;body.data.shape_keys.key_blocks['Smile'].keyframe_insert(data_path='value',frame=f)
for f,value in [(1,0),(26,0),(28,1),(31,0),(84,0)]:
    body.data.shape_keys.key_blocks['Blink'].value=value;body.data.shape_keys.key_blocks['Blink'].keyframe_insert(data_path='value',frame=f)
scene.frame_start=1;scene.frame_end=84;scene.render.fps=24
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.render.resolution_percentage=100
scene.camera.data.type='PERSP';scene.camera.data.lens=50;scene.camera.data.sensor_width=36;scene.camera.location=(0,-2.48,1.43);scene.camera.rotation_euler=(Vector((0,-.025,1.25))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.cycles.samples=24;scene.cycles.use_denoising=True

# Separate generated beach plate; the actor and all motion remain native Blender geometry.
scene.use_nodes=True;nodes=scene.node_tree.nodes;nodes.clear();links=scene.node_tree.links
layer=nodes.new('CompositorNodeRLayers');plate=nodes.new('CompositorNodeImage');plate.image=bpy.data.images.load(str(out.parent/'beach-v001/day.png'));plate.image.pack()
scale=nodes.new('CompositorNodeScale');scale.space='RENDER_SIZE';scale.frame_method='CROP';links.new(plate.outputs['Image'],scale.inputs[0])
over=nodes.new('CompositorNodeAlphaOver');over.inputs[0].default_value=1;over.use_premultiply=True;links.new(scale.outputs[0],over.inputs[1]);links.new(layer.outputs['Image'],over.inputs[2]);dest=nodes.new('CompositorNodeComposite');links.new(over.outputs[0],dest.inputs[0])

scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(out/'greeting-animation-review.blend'))
for f in [84]:
    scene.frame_set(f);scene.render.filepath=str(out/('pose-%03d.png'%f));bpy.ops.render.render(write_still=True)
print('GREETING_POSES_RENDERED')

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
