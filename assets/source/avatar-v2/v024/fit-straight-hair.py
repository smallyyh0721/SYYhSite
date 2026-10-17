import bpy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Preserve revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v022/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];hair=bpy.data.objects['LongBlackHair']
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(deps)
surface=BVHTree.FromPolygons([v.co for v in evaluated.data.vertices],[list(p.vertices) for p in evaluated.data.polygons])
count=0
for v in hair.data.vertices:
    p=v.co
    if p.z<1.52 and p.y<-.015:
        hit,normal,face,distance=surface.ray_cast(Vector((p.x,-1,p.z)),Vector((0,1,0)),2)
        if hit and p.y>hit.y-.014:p.y=hit.y-.014;count+=1
    if abs(p.x)<.063 and p.y<-.118 and 1.555<p.z<1.632:
        p.z+=.058*(1.632-p.z)/.077
hair.data.update();print('FRONT_FIT',count,'HAIR_BOUNDS',min(v.co.z for v in hair.data.vertices),max(v.co.z for v in hair.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'));scene.render.filepath=str(out/'hair-fit-review.png');bpy.ops.render.render(write_still=True)
