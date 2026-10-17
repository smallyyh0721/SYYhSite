from pathlib import Path
import sys,re
revision=sys.argv[1] if len(sys.argv)>1 else 'v037'
model=sys.argv[2] if len(sys.argv)>2 else 'v034'
assert re.fullmatch(r'v\d{3}',revision) and re.fullmatch(r'v\d{3}',model)
root=Path(__file__).resolve().parents[1];out=root/('assets/source/avatar-v2/'+revision);out.mkdir(exist_ok=True)
code=(out.parent/'v015/prepare-greeting.py').read_text(encoding='utf-8').replace('v012/visitor-source.blend',model+'/visitor-source.blend')
code=code.replace('(-.205,-.32,1.12)','(-.16,-.28,1.12)').replace('(-.15,-.48,1.27)','(-.06,-.38,1.27)')
code=code[:code.index('scene.frame_set(1);bpy.ops.wm.save_as_mainfile')]
code+= """
scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=64
# Slight sea breeze is native vertex animation, not a sliding still image.
hair=bpy.data.objects['LongBlackHair'];hair.shape_key_add(name='Basis');wind=hair.shape_key_add(name='Sea breeze')
for v in wind.data:
    t=max(0,min(1,(1.52-v.co.z)/.54));v.co.x+=.014*t*math.sin(v.co.z*8+v.co.x*12);v.co.y+=.004*t
for f,value in [(1,0),(26,.42),(54,.78),(84,.20)]:wind.value=value;wind.keyframe_insert(data_path='value',frame=f)
daylights={o.name:(tuple(o.data.color),o.data.energy) for o in scene.objects if o.type=='LIGHT'}
dayworld=tuple(scene.world.node_tree.nodes['Background'].inputs[0].default_value)
variants=[];frames=root/'docs/agent-work/logs/greeting-v028';frames.mkdir(exist_ok=True)
for theme,portrait in [('day',False),('night',False),('day',True),('night',True)]:
    label=theme+('-portrait' if portrait else '')
    if portrait:
        scene.render.resolution_x=1080;scene.render.resolution_y=1920;scene.camera.data.sensor_fit='VERTICAL';scene.camera.data.sensor_height=26;scene.camera.data.lens=50;scene.camera.location=(0,-1.85,1.44);focus=Vector((0,-.025,1.415))
    else:
        scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.camera.data.sensor_fit='AUTO';scene.camera.data.sensor_width=36;scene.camera.data.lens=50;scene.camera.location=(0,-2.10,1.44);focus=Vector((0,-.025,1.415))
    scene.camera.rotation_euler=(focus-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    plate.image=bpy.data.images.load(str(out.parent/('beach-v001/'+theme+'.png')));plate.image.pack()
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=dayworld if theme=='day' else (.035,.05,.085,1)
    for o in scene.objects:
        if o.type!='LIGHT':continue
        if theme=='day':o.data.color,o.data.energy=daylights[o.name]
        elif 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
        elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
        else:o.data.color=(.70,.83,1);o.data.energy=95
    scene.frame_set(1)
    if label=='day':bpy.ops.wm.save_as_mainfile(filepath=str(out/'greeting-source.blend'))
    scene.frame_set(84);scene.render.filepath=str(out/('greeting-'+label+'-poster.png'));bpy.ops.render.render(write_still=True)
    folder=frames/label;folder.mkdir(exist_ok=True)
    for f in range(1,85):
        path=folder/('frame-%04d.png'%f)
        if path.exists():continue
        scene.frame_set(f);scene.render.filepath=str(path);bpy.ops.render.render(write_still=True)
        print('GREETING_FRAME',label,f,flush=True)
    variants.append({'theme':theme,'portrait':portrait,'width':scene.render.resolution_x,'height':scene.render.resolution_y,'frames':84,'fps':24,'duration':3.5,'path':str(folder),'cameraLocation':list(scene.camera.location),'lens':scene.camera.data.lens})
    (out/'render-status.json').write_text(json.dumps({'status':'sequences rendering','completed':variants},indent=2),encoding='utf-8')
(out/'render-status.json').write_text(json.dumps({'status':'all four native sequences rendered; encoding and decode review pending','completed':variants},indent=2),encoding='utf-8')
print('FOUR_GREETING_SEQUENCES_RENDERED',flush=True)
"""
code=code.replace('frames=root/', 'frames=out.parents[3]/')
code=code.replace('greeting-v028','greeting-'+revision)
if '--preview-only' in sys.argv:
    code=code.replace("    folder=frames/label;folder.mkdir(exist_ok=True)","    continue\n    folder=frames/label;folder.mkdir(exist_ok=True)")
    code=code.replace('all four native sequences rendered; encoding and decode review pending','camera posters only; not rendered sequences')
# out = <repo>/assets/source/avatar-v2/v028, parents[3] is the repository root.
(out/'render-greeting.py').write_text(code,encoding='utf-8')
