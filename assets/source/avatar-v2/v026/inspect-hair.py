import bpy,json
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=Path(__file__).resolve().parent;bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v025/visitor-source.blend'))
hair=bpy.data.objects['LongBlackHair'];body=bpy.data.objects['VisitorBody'];deps=bpy.context.evaluated_depsgraph_get();ev=body.evaluated_get(deps);tree=BVHTree.FromPolygons([v.co for v in ev.data.vertices],[list(p.vertices) for p in ev.data.polygons]);h=hair.evaluated_get(deps)
rows=[]
for p in h.data.polygons:
    co=sum((h.data.vertices[i].co for i in p.vertices),Vector())/len(p.vertices)
    if not (1.13<co.z<1.34 and .06<abs(co.x)<.14 and co.y<-.01):continue
    hit,_,_,_=tree.ray_cast(Vector((co.x,-1,co.z)),Vector((0,1,0)),2)
    if hit:rows.append({'poly':p.index,'hair':list(co),'bodyY':hit.y,'buried':co.y-hit.y,'uv':list(h.data.uv_layers.active.data[p.loop_indices[0]].uv)})
(out/'hair-surface-diagnostics.json').write_text(json.dumps({'matAlpha':hair.data.materials[0].surface_render_method,'world':list(hair.matrix_world.translation),'polygons':rows[:35],'stats':{'total':len(rows),'buried':sum(r['buried']>0 for r in rows),'deepest':max((r['buried'] for r in rows),default=0)}},indent=2),encoding='utf-8')
