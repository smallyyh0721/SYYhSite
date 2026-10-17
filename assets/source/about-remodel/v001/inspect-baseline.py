import bpy, json
from pathlib import Path
from mathutils import Vector

out = Path(__file__).resolve().parent
report = {
    'blender': bpy.app.version_string,
    'file': bpy.data.filepath,
    'scene': bpy.context.scene.name,
    'frames': [bpy.context.scene.frame_start, bpy.context.scene.frame_end],
    'camera': bpy.context.scene.camera.name if bpy.context.scene.camera else None,
    'objects': [],
}
for obj in bpy.context.scene.objects:
    entry = {'name': obj.name, 'type': obj.type, 'location': list(obj.location), 'scale': list(obj.scale)}
    if obj.type == 'MESH':
        entry.update(vertices=len(obj.data.vertices), polygons=len(obj.data.polygons),
                     materials=[m.name if m else None for m in obj.data.materials],
                     modifiers=[(m.name, m.type) for m in obj.modifiers])
        pts = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        entry['bounds'] = [[min(p[i] for p in pts) for i in range(3)], [max(p[i] for p in pts) for i in range(3)]]
    if obj.type == 'ARMATURE':
        entry['head_bones'] = {b.name: {'head': list(b.head_local), 'tail': list(b.tail_local)} for b in obj.data.bones if b.name in ['Head','EyeL','EyeR','Spine']}
    report['objects'].append(entry)
(out/'baseline-metadata.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print('INSPECTED_BASELINE', json.dumps(report, ensure_ascii=False))
