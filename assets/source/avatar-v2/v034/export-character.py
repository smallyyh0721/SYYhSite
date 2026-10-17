"""Final matched native character, preserving all previous revisions."""
import bpy, json
from pathlib import Path
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Preserve source revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v033/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody']
# The opaque swimsuit has a smooth cloth surface, rather than anatomical bumps.
# Identical displacement on all keys preserves the actual facial morphs and rig.
basis=body.data.shape_keys.key_blocks['Basis']; original=[v.co.copy() for v in basis.data]
adj=[[] for v in original]
for e in body.data.edges:
    a,b=e.vertices;adj[a].append(b);adj[b].append(a)
selected=[]
for i,p in enumerate(original):
    if 1.155<p.z<1.38 and p.y<-.08 and .035<abs(p.x)<.197:
        edge=min((p.z-1.155)/.025,(1.38-p.z)/.025,(abs(p.x)-.035)/.025,(.197-abs(p.x))/.025,1)
        selected.append((i,max(0,edge)*.6))
ys=[p.y for p in original]
for step in range(24):
    new=ys.copy()
    for i,weight in selected:
        if adj[i]:new[i]=ys[i]+weight*(sum(ys[j] for j in adj[i])/len(adj[i])-ys[i])
    ys=new
for key in body.data.shape_keys.key_blocks:
    for i,weight in selected:key.data[i].co.y+=ys[i]-original[i].y
body.data.update();body.data.shape_keys.key_blocks['Blink'].value=0
scene.eevee.taa_render_samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,export_vertex_color='NONE',export_all_vertex_colors=False,export_image_format='JPEG',export_image_quality=90,export_extras=True)
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'about-night.png');bpy.ops.render.render(write_still=True)
(out/'production-info.json').write_text(json.dumps({'sourceRevision':'v033 native eyelid albedo and swept hair','body':'MakeHuman core CC0; fitted adult visitor; opaque swimsuit surface smoothed identically for all morphs','hairBase':'Cortu Johnstone straight_bangs CC0, fitted/extended/new GPT atlas','hairSource':'../v022/hair-base/source-license.json','rasterSources':['../v025/hair-generation.json','../v033/face-generation.json'],'bones':len(bpy.data.objects['VisitorRig'].data.bones),'bodyMorphs':[k.name for k in body.data.shape_keys.key_blocks],'glbBytes':(out/'visitor.glb').stat().st_size,'status':'native source/posters/export; compressed browser review required'},indent=2),encoding='utf-8')
print('CHARACTER_AND_MATCHED_POSTERS_RENDERED')
