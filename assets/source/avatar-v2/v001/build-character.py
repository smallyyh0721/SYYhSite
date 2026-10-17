"""Blender-owned scene; CC0 anatomical base, original hairstyle/clothing/rig integration.

This is a first modelling pass to inspect and refine, never a finished-identity claim.
"""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.kdtree import KDTree

dest=Path(__file__).resolve().parent
root=dest.parents[3]
data=dest/'base-data/makehuman/data'
print('INPUT',json.dumps({'version':bpy.app.version_string,'file':bpy.data.filepath,'scene':bpy.context.scene.name,'objects':[o.name for o in bpy.context.scene.objects]}))
bpy.ops.wm.read_factory_settings(use_empty=True)
source=json.loads((dest/'source-manifest.json').read_text(encoding='utf-8'))
verts=[];uvs=[];faces=[];group=''
for line in (data/'3dobjs/base.obj').read_text(encoding='utf-8').splitlines():
    parts=line.split()
    if not parts: continue
    if parts[0]=='v': verts.append(Vector(tuple(float(x) for x in parts[1:4])))
    elif parts[0]=='vt': uvs.append(tuple(float(x) for x in parts[1:3]))
    elif parts[0]=='g': group=' '.join(parts[1:])
    elif parts[0]=='f':
        corners=[(int(v.split('/')[0])-1,int(v.split('/')[1])-1 if '/' in v else 0) for v in parts[1:]]
        faces.append((group,corners))
for name,factor in source['morphTargets'].items():
    target=next((data/'targets').rglob(name))
    for line in target.read_text(encoding='utf-8').splitlines():
        p=line.split()
        if len(p)==4 and not p[0].startswith('#'): verts[int(p[0])]+=Vector(tuple(float(v)*factor for v in p[1:]))
body_faces=[f for g,f in faces if g=='body']
used=sorted(set(i for f in body_faces for i,t in f)); remap={v:i for i,v in enumerate(used)}
bottom=min(verts[i].y for i in used); height=max(verts[i].y for i in used)-bottom
scale=1.7/height
points=[Vector((v.x*scale,-v.z*scale,(v.y-bottom)*scale)) for v in verts]
def material(name,color,rough=.45,metal=0,alpha=1):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,alpha);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,alpha)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;p.inputs['Alpha'].default_value=alpha
    return m
skin=material('Warm porcelain skin',(.71,.44,.33),.47)
skin.node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.08
navy=material('Opaque midnight swimwear',(.012,.022,.047),.31)
hairmat=material('Black silk hair',(.008,.011,.018),.25)
hairlight=material('Soft graphite hair glints',(.019,.024,.038),.32)
gold=material('Small gold accessories',(.72,.41,.09),.23,.8)
robe=material('Ivory gauze',(.82,.78,.66),.65,alpha=.50)
white=material('Eye ivory',(.89,.85,.79),.27)
iris=material('Warm brown iris',(.12,.057,.026),.26)
pupil=material('Pupil',(.004,.006,.008),.23)
lips=material('Soft rose lips',(.43,.18,.16),.43)
bodymesh=bpy.data.meshes.new('Adult body topology');bodymesh.from_pydata([points[i] for i in used],[],[[remap[i] for i,t in f] for f in body_faces]);bodymesh.update()
body=bpy.data.objects.new('VisitorBody',bodymesh);bpy.context.collection.objects.link(body);bodymesh.materials.append(skin)
uv=bodymesh.uv_layers.new(name='MakeHuman CC0 UV')
for poly,f in zip(bodymesh.polygons,body_faces):
    poly.use_smooth=True
    for loop,(i,t) in zip(poly.loop_indices,f): uv.data[loop].uv=uvs[t]
rigspec=json.loads((data/'rigs/default.mhskel').read_text(encoding='utf-8'))
weights=json.loads((data/'rigs/default_weights.mhw').read_text(encoding='utf-8'))['weights']
rename={'head':'Head','spine02':'Spine','eye.L':'EyeL','eye.R':'EyeR'}
arm=bpy.data.armatures.new('VisitorRigData');rig=bpy.data.objects.new('VisitorRig',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
joint=lambda name:sum((points[i] for i in rigspec['joints'][name]),Vector())/len(rigspec['joints'][name])
for name,spec in rigspec['bones'].items():
    b=arm.edit_bones.new(rename.get(name,name));b.head=joint(spec['head']);b.tail=joint(spec['tail'])
    if (b.tail-b.head).length<.0001: b.tail=b.head+Vector((0,0,.02))
for name,spec in rigspec['bones'].items():
    if spec['parent']:arm.edit_bones[rename.get(name,name)].parent=arm.edit_bones[rename.get(spec['parent'],spec['parent'])]
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
weight_by_vertex={}
for name,rows in weights.items():
    g=body.vertex_groups.new(name=rename.get(name,name))
    for index,w in rows:
        if index in remap:
            g.add([remap[index]],w,'REPLACE');weight_by_vertex.setdefault(remap[index],[]).append((rename.get(name,name),w))
mod=body.modifiers.new('Visitor skin','ARMATURE');mod.object=rig;body.parent=rig
kd=KDTree(len(bodymesh.vertices))
for v in bodymesh.vertices:kd.insert(v.co,v.index)
kd.balance()
def bind(obj,bone=None):
    if obj.type!='MESH':
        bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.convert(target='MESH');obj=bpy.context.object;obj.select_set(False)
    if bone:
        g=obj.vertex_groups.new(name=bone);g.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    else:
        groups={}
        for v in obj.data.vertices:
            _,index,_=kd.find(obj.matrix_world@v.co)
            for name,w in weight_by_vertex.get(index,[('Spine',1)]):
                if name not in groups:groups[name]=obj.vertex_groups.new(name=name)
                groups[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('Visitor skin','ARMATURE');mod.object=rig;obj.parent=rig
    return obj
def mesh(name,vs,fs,mat,bone=None):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(mat)
    for p in d.polygons:p.use_smooth=True
    return bind(o,bone)
def curve(name,coords,radius,mat,bone='Head'):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.resolution_u=10;d.bevel_depth=radius;d.bevel_resolution=3
    s=d.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
    for b,co in zip(s.bezier_points,coords):b.co=co;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);d.materials.append(mat)
    return bind(o,bone)
def sphere(name,loc,size,mat,bone='Head',segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=16,location=loc)
    o=bpy.context.object;o.name=name;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    for p in o.data.polygons:p.use_smooth=True
    return bind(o,bone)
# Swimwear follows the actual adult body surface; opaque cloth covers all intimate areas.
def garment(name,predicate,mat):
    chosen=[p for p in bodymesh.polygons if predicate(sum((bodymesh.vertices[i].co for i in p.vertices),Vector())/len(p.vertices))]
    ids=sorted(set(i for p in chosen for i in p.vertices));mapping={v:i for i,v in enumerate(ids)}
    o=mesh(name,[bodymesh.vertices[i].co+bodymesh.vertices[i].normal*.0025 for i in ids],[[mapping[i] for i in p.vertices] for p in chosen],mat)
    return o
garment('High waist bikini bottoms',lambda p:.79<p.z<1.025 and (p.z>.915 or abs(p.x)<.085+(.915-p.z)*.8),navy)
garment('Bikini fitted cups',lambda p:1.18<p.z<1.385 and p.y<-.01 and abs(p.x)<.23 and ((abs(p.x)-.104)/.113)**2+((p.z-1.276)/.119)**2<1.10,navy)
for side in [-1,1]:
    curve('Swimwear shoulder strap'+str(side),[(side*.15,-.064,1.3),(side*.165,-.025,1.43),(side*.17,.072,1.43),(side*.15,.085,1.29)],.004,navy,'Spine')
curve('Swimwear underbust band',[(-.20,.07,1.22),(-.21,-.033,1.22),(0,-.093,1.22),(.21,-.033,1.22),(.20,.07,1.22)],.011,navy,'Spine')
head=rig.data.bones['Head'].head_local;eyes=[rig.data.bones['EyeL'].head_local,rig.data.bones['EyeR'].head_local]
print('LANDMARKS',json.dumps({'head':list(head),'eyes':[list(p) for p in eyes],'height':1.7,'bodyVertices':len(used),'bones':len(rig.data.bones)}))
for side,eye in zip(['L','R'],eyes):
    # Eye anatomy remains true 3D, with separate moving iris and pupil.
    sphere('EyeWhite'+side,eye,(.016,.018,.013),white,'Eye'+side)
    sphere('Iris'+side,eye+Vector((0,-.016,0)),(.0085,.0035,.009),iris,'Eye'+side)
    sphere('Pupil'+side,eye+Vector((0,-.019,0)),(.004,.002,.0065),pupil,'Eye'+side)
    sphere('EyeCatchlight'+side,eye+Vector((-.002,-.021,.003)),(.0018,.001,.0018),white,'Eye'+side,16)
    curve('Upper eyelash'+side,[eye+Vector((-.016,-.011,.006)),eye+Vector((0,-.018,.012)),eye+Vector((.018,-.007,.006))],.0013,hairmat,'Head')
    curve('Eyebrow'+side,[eye+Vector((-.021,-.003,.027)),eye+Vector((0,-.007,.03)),eye+Vector((.022,.002,.027))],.002,hairmat,'Head')
# Long layered black hair: shaped crown, broad flowing locks, restrained strand highlights.
headz=max(v.co.z for v in bodymesh.vertices)
sphere('Hair crown',(0,.008,headz-.075),(.082,.075,.092),hairmat,'Head',48)
for j in range(28):
    a=math.pi*(.10+1.80*j/27);x=.079*math.sin(a);y=.053*math.cos(a)+.025
    endx=x*1.6+.016*math.sin(j*1.7);endy=.105+.025*math.cos(j*.9);endz=1.015+.06*math.sin(j*.8)
    coords=[(x,y,headz-.045),(x*1.13,y*1.2,1.50),(endx*.86,endy,1.32),(endx,endy,endz)]
    curve('Silk back lock %02d'%j,coords,.010+(.003 if j%3==0 else 0),hairmat,'Head')
    if j%2==0:curve('Hair glint %02d'%j,[(x+.003,y-.004,headz-.05),(x*1.13+.003,y*1.2-.007,1.5),(endx*.86+.003,endy-.008,1.32),(endx+.003,endy-.008,endz+.015)],.0011,hairlight,'Head')
for side in [-1,1]:
    for j in range(4):
        curve('Face framing lock'+str(side)+str(j),[(side*(.014+j*.010),-.061,headz-.004),(side*(.065+j*.004),-.082,headz-.10),(side*(.078+j*.012),-.041,1.47),(side*(.108+j*.014),-.02,1.22)],.006,hairmat,'Head')
    sphere('Gold drop earring'+str(side),(side*.082,-.010,1.49),(.005,.005,.012),gold,'Head',16)
curve('Gold necklace',[(-.055,-.048,1.44),(-.035,-.072,1.411),(0,-.089,1.395),(.035,-.072,1.411),(.055,-.048,1.44)],.0017,gold,'Spine')
sphere('Gold pendant',(0,-.096,1.383),(.005,.0025,.0065),gold,'Spine',16)
# Airy open robe constructed in panels; body and opaque swimsuit stay fully covered.
for side in [-1,1]:
    vs=[];fs=[];n=20;m=12
    for zindex in range(n):
        t=zindex/(n-1);z=1.445-t*.91
        for j in range(m):
            u=j/(m-1);x=side*(.09+u*(.19+.10*t));y=.058-.11*u+.03*math.sin(t*math.pi*3+u*2);vs.append((x,y,z+.02*math.sin(u*math.pi)))
    for i in range(n-1):
        for j in range(m-1):a=i*m+j;fs.append((a,a+1,a+1+m,a+m))
    mesh('Gauze front panel'+str(side),vs,fs,robe)
    curve('Robe soft trim'+str(side),[vs[i*m] for i in range(n)],.0023,robe,'Spine')
scene=bpy.context.scene
scene.world=bpy.data.worlds.new('Beach studio dawn');scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.28,.34,.43,1)
scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.45
def light(name,loc,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.3))-o.location).to_track_quat('-Z','Y').to_euler()
light('Soft dawn key',(2,-3,3),220,(1,.87,.74),3)
light('Ocean fill',(-2,-2,1.8),140,(.68,.8,1),3)
light('Hair rim',(1,2,2.8),280,(1,.89,.74),2)
camdata=bpy.data.cameras.new('Model review camera');cam=bpy.data.objects.new('Model review camera',camdata);bpy.context.collection.objects.link(cam)
cam.location=(.10,-3.1,1.42);cam.rotation_euler=(Vector((0,0,1.19))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=1.12;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=720;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
bpy.ops.wm.save_as_mainfile(filepath=str(dest/'visitor-work-v001.blend'))
scene.render.filepath=str(dest/'model-review-front.png');bpy.ops.render.render(write_still=True)
(dest/'build-status.json').write_text(json.dumps({'status':'first modelling pass rendered; requires visual inspection and refinement',
    'blend':str(dest/'visitor-work-v001.blend'),'render':scene.render.filepath,'bodyVertices':len(used),'bones':len(rig.data.bones),
    'webModelExported':False,'greetingRendered':False},indent=2)+'\n',encoding='utf-8')
print('FIRST_PASS_SAVED')
