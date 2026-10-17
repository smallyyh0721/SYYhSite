import bpy, json
from pathlib import Path
root=Path(__file__).resolve().parent
results=[]
for group in ['group-a','group-b']:
    path=root/group/'character.blend'
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    images=[{'name':i.name,'packed':bool(i.packed_file),'path':i.filepath} for i in bpy.data.images if i.source=='FILE']
    results.append({'group':group,'file':bpy.data.filepath,'scene':scene.name,'engine':scene.render.engine,'camera':scene.camera.name if scene.camera else None,'meshes':sum(o.type=='MESH' for o in scene.objects),'curves':sum(o.type=='CURVE' for o in scene.objects),'images':images,'image_planes':[o.name for o in scene.objects if o.type=='MESH' and len(o.data.vertices)<=4],'resolution':[scene.render.resolution_x,scene.render.resolution_y]})
(root/'native-readback.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print('NATIVE_READBACK',json.dumps(results,ensure_ascii=False))
