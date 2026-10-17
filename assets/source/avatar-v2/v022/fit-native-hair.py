"""Fit licensed native geometry; no third-party texture is used."""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent;core=out.parent/'v001/base-data/makehuman/data';spec=json.loads((out.parent/'v001/source-manifest.json').read_text(encoding='utf-8'))
if (out/'visitor-source.blend').exists():raise RuntimeError('Keep revision')
# Reconstruct exactly the approved anatomical foundation and its seed index space.
raw=[];bodyids=set();group=''
for line in (core/'3dobjs/base.obj').read_text(encoding='utf-8').splitlines():
    p=line.split()
    if not p:continue
    if p[0]=='v':raw.append(Vector(tuple(float(n) for n in p[1:4])))
    elif p[0]=='g':group=' '.join(p[1:])
    elif p[0]=='f' and group=='body':bodyids.update(int(n.split('/')[0])-1 for n in p[1:])
for name,factor in spec['morphTargets'].items():
    for line in next((core/'targets').rglob(name)).read_text(encoding='utf-8').splitlines():
        p=line.split()
        if len(p)==4 and not p[0].startswith('#'):raw[int(p[0])]+=Vector(tuple(float(n)*factor for n in p[1:]))
low=min(raw[i].y for i in bodyids);scale=1.7/(max(raw[i].y for i in bodyids)-low)
seed=[Vector((p.x*scale,-p.z*scale,(p.y-low)*scale)) for p in raw]
clo=(out/'hair-base/cortu_straight_bangs.mhclo').read_text(encoding='utf-8').splitlines();scales=[1,1,1]
for line in clo:
    p=line.split()
    if p and p[0] in ['x_scale','y_scale','z_scale']:
        axis={'x_scale':0,'y_scale':1,'z_scale':2}[p[0]];scales[axis]=abs(raw[int(p[1])][axis]-raw[int(p[2])][axis])/float(p[3])
mapped=[];active=False
for line in clo:
    p=line.split()
    if not p or p[0].startswith('#'):continue
    if p[0]=='verts':active=True;continue
    if not active:continue
    if not p[0].lstrip('-').isdigit():break
    if len(p)==1:mapped.append(seed[int(p[0])].copy())
    elif len(p)==9:
        ids=[int(n) for n in p[:3]];weights=[float(n) for n in p[3:6]];dx,dy,dz=[float(n) for n in p[6:9]]
        mapped.append(sum((seed[i]*w for i,w in zip(ids,weights)),Vector())+Vector((dx*scales[0],-dz*scales[2],dy*scales[1]))*scale)
vs=[];uvs=[];faces=[]
for line in (out/'hair-base/straight_bangs.obj').read_text(encoding='utf-8').splitlines():
    p=line.split()
    if not p:continue
    if p[0]=='v':vs.append(p[1:4])
    elif p[0]=='vt':uvs.append(tuple(float(n) for n in p[1:3]))
    elif p[0]=='f':faces.append([(int(n.split('/')[0])-1,int(n.split('/')[1])-1) for n in p[1:]])
assert len(vs)==len(mapped),(len(vs),len(mapped))
# Extend shoulder-length layers to the waist, retaining parting and face framing.
bottom=min(p.z for p in mapped);end=.98;stretch=(1.49-end)/max(.001,1.49-bottom)
for p in mapped:
    if p.z<1.49:
        t=(1.49-p.z)/(1.49-bottom);p.z=1.49-(1.49-p.z)*stretch;p.x*=1+.12*t
        # Keep front strands in front of the opaque top rather than through the torso.
        if p.y<-.015:p.y=min(p.y,-.10-.14*math.sin(math.pi*max(0,min(1,(p.z-.98)/.51))))
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v016/visitor-source.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['VisitorRig'];bpy.data.objects.remove(bpy.data.objects['LongBlackHair'],do_unlink=True)
mesh=bpy.data.meshes.new('Fitted licensed waist hair');mesh.from_pydata(mapped,[],[[i for i,t in f] for f in faces]);mesh.update();obj=bpy.data.objects.new('LongBlackHair',mesh);scene.collection.objects.link(obj);obj.parent=rig
uv=mesh.uv_layers.new(name='Hair strand atlas')
for poly,face in zip(mesh.polygons,faces):
    poly.use_smooth=True
    for li,(i,t) in zip(poly.loop_indices,face):uv.data[li].uv=uvs[t]
hair=bpy.data.materials.new('GPT silk fibre black hair');hair.use_nodes=True;p=hair.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.49;p.inputs['Specular IOR Level'].default_value=.14
tex=hair.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(out/'hair-base/straight_bangs_diff.png'));tex.image.pack()
mix=hair.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(.10,.10,.10,1);hair.node_tree.links.new(tex.outputs['Color'],mix.inputs[1]);hair.node_tree.links.new(mix.outputs[0],p.inputs['Base Color']);hair.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha']);mesh.materials.append(hair);hair.surface_render_method='DITHERED';hair.use_transparency_overlap=False
head=obj.vertex_groups.new(name='Head');spine=obj.vertex_groups.new(name='Spine')
for v in mesh.vertices:
    w=max(.1,min(1,(v.co.z-1.06)/.46));head.add([v.index],w,'REPLACE');spine.add([v.index],1-w,'REPLACE')
m=obj.modifiers.new('Visitor hair skin','ARMATURE');m.object=rig
obj['source']='straight_bangs by Cortu Johnstone';obj['license']='CC0-1.0';obj['modified']='fitted, extended, new material and skin weights'
scene.camera.data.ortho_scale=.96;scene.camera.location=(.02,-3.1,1.43);scene.camera.rotation_euler=(Vector((0,-.015,1.27))-scene.camera.location).to_track_quat('-Z','Y').to_euler();scene.render.engine='BLENDER_EEVEE_NEXT';scene.render.resolution_x=960;scene.render.resolution_y=960;scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
bpy.ops.object.select_all(action='DESELECT')
for o in scene.objects:
    if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'visitor.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=False,export_current_frame=True,export_rest_position_armature=True,export_vertex_color='NONE',export_all_vertex_colors=False,export_image_format='JPEG',export_image_quality=90,export_extras=True)
print('STRAIGHT_HAIR_GEOMETRY_REVIEWED',len(mapped))
