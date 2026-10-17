import bpy,math,json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Retain revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v025/visitor-source.blend'))
scene=bpy.context.scene;hair=bpy.data.objects['LongBlackHair']
# Straight gravity fall clears the breast silhouette and continues freely to the waist.
# It must not be pressed back into the abdomen between large control faces.
for v in hair.data.vertices:
    p=v.co
    if p.z<1.52 and p.y<-.025:
        t=max(0,min(1,(1.52-p.z)/.20));t=t*t*(3-2*t)
        p.y=min(p.y,-.14-.22*t)
hair.data.update();scene.eevee.taa_render_samples=96
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
(out/'production-info.json').write_text(json.dumps({'body':'MakeHuman core CC0; original fitted adult visitor','hairBase':'Cortu Johnstone straight_bangs CC0, fitted/extended/new GPT atlas','hairSource':'../v022/hair-base/source-license.json','rasterSources':['../v025/hair-generation.json','../v003/face-generation.json'],'bones':len(bpy.data.objects['VisitorRig'].data.bones),'bodyMorphs':[k.name for k in bpy.data.objects['VisitorBody'].data.shape_keys.key_blocks],'glbBytes':(out/'visitor.glb').stat().st_size,'status':'native source and posters rendered; browser/compressed GLB review pending'},indent=2),encoding='utf-8')
print('CHARACTER_AND_MATCHED_POSTERS_RENDERED')
