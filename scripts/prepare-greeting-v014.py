from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'assets/source/avatar-v2/v014';out.mkdir(exist_ok=True)
code=(out.parent/'v013/prepare-greeting.py').read_text(encoding='utf-8')
start=code.index('for f in [42,64,84]:')
end=code.index('# Expressive transition',start)
code=code[:start]+"""for f in [42,64,84]:
    scene.frame_set(f);bpy.context.view_layer.update()
    # Aim the actual finger chain, not an assumed local bone axis.
    forward=(rig.pose.bones['finger3-3.R'].tail-wrist.head).normalized()
    across=(rig.pose.bones['finger2-1.R'].head-rig.pose.bones['finger5-1.R'].head).normalized()
    normal=forward.cross(across).normalized()
    desired=Vector((-.01,-.18,.018)).normalized();align=forward.rotation_difference(desired)
    moved=align@normal;up=Vector((0,0,1));up=(up-desired*up.dot(desired)).normalized()
    angle=math.atan2(desired.dot(moved.cross(up)),moved.dot(up))
    delta=Quaternion(desired,angle)@align
    rotation=delta@wrist.matrix.to_quaternion();matrix=rotation.to_matrix().to_4x4();matrix.translation=wrist.head.copy();wrist.matrix=matrix
    bpy.context.view_layer.update();wrist.keyframe_insert(data_path='rotation_quaternion',frame=f)
"""+code[end:]
code=code.replace('for f in [1,42,84]:','for f in [84]:')
(out/'prepare-greeting.py').write_text(code,encoding='utf-8')
