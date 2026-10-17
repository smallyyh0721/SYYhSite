"""Second modelling pass: anatomical skin, fitted garments and ribbon hair.
Run in an independent Blender background process. v001 is retained unchanged.
"""
import bpy, json, math, shutil
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

output=Path(__file__).resolve().parent
base=output.parent/'v001'
template=base/'build-character.py'
ns={'__file__':str(template),'__name__':'avatar_foundation'}
exec(compile(template.read_text(encoding='utf-8').split('# Swimwear follows')[0],str(template),'exec'),ns)
globals().update({k:v for k,v in ns.items() if not k.startswith('__')})
output.mkdir(parents=True,exist_ok=True)
if (output/'visitor-work-v005.blend').exists():raise RuntimeError('Choose a new revision instead of overwriting this modelling pass')
upstream=root/'docs/agent-work/logs/makehuman-source/makehuman/data/targets'
extra=output/'morph-data';extra.mkdir(exist_ok=True)
extra_targets={'l-eye-scale-incr.target':.20,'r-eye-scale-incr.target':.20}
for name,factor in extra_targets.items():
    src=next(upstream.rglob(name));shutil.copy2(src,extra/name)
    for line in src.read_text(encoding='utf-8').splitlines():
        p=line.split()
        if len(p)==4 and not p[0].startswith('#'):
            index=int(p[0]);dx,dy,dz=[float(n)*factor*scale for n in p[1:]]
            points[index]+=Vector((dx,-dz,dy))
            if index in remap:bodymesh.vertices[remap[index]].co=points[index]
bodymesh.update()
skin.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.60
skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.71,.49,.41,1)
navy.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.49
hairmat.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.38
hairlight.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.42
robe.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.12
robe.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.78
lace=material('Ivory embroidery',(.65,.61,.51),.78,alpha=.65)
body.shape_key_add(name='Basis')
for key,names,factor in [('Blink',['eye-left-closure.target','eye-right-closure.target'],1.15),('Smile',['mouth-corner-puller.target'],.72)]:
    block=body.shape_key_add(name=key)
    for name in names:
        src=upstream/'expression/units/asian'/name;shutil.copy2(src,extra/name)
        for line in src.read_text(encoding='utf-8').splitlines():
            p=line.split()
            if len(p)==4 and not p[0].startswith('#') and int(p[0]) in remap:
                dx,dy,dz=[float(n)*factor*scale for n in p[1:]]
                block.data[remap[int(p[0])]].co+=Vector((dx,-dz,dy))
# Blush and lips remain model-native colour, no borrowed image texture.
colors=bodymesh.color_attributes.new(name='Complexion',type='FLOAT_COLOR',domain='POINT')
for i,v in enumerate(bodymesh.vertices):
    p=v.co; blush=math.exp(-((abs(p.x)-.040)/.020)**2-((p.z-1.557)/.012)**2)*max(0,min(1,(-p.y-.08)*25))
    colors.data[i].color=(.71+.025*blush,.49-.06*blush,.41-.038*blush,1)
color_node=skin.node_tree.nodes.new('ShaderNodeVertexColor');color_node.layer_name='Complexion'
skin.node_tree.links.new(color_node.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bodymesh.materials.append(lips)
for poly in bodymesh.polygons:
    p=sum((bodymesh.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
    poly.material_index=0
sub=body.modifiers.new('Smooth anatomical skin','SUBSURF');sub.levels=1;sub.render_levels=1
bvh=BVHTree.FromPolygons([v.co for v in bodymesh.vertices],[list(p.vertices) for p in bodymesh.polygons],all_triangles=False)
def front(x,z,offset=.009):
    hit,normal,_,_=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)),2)
    return hit+Vector((0,-offset,0)) if hit else Vector((x,-.10,z))
def radial(theta,z):
    direction=Vector((math.sin(theta),-math.cos(theta),0))
    hit,normal,_,_=bvh.ray_cast(Vector((0,0,z)), direction,1)
    return hit+direction*.010 if hit else Vector((.14*direction.x,.105*direction.y,z))
# Two smoothly bounded fitted cups; the cloth is a new topology rather than selected body faces.
for side in [-1,1]:
    vs=[front(side*.105,1.265)];fs=[];rings=12;segments=72
    for j in range(1,rings+1):
        r=j/rings
        for i in range(segments):
            a=2*math.pi*i/segments
            x=side*.105+.112*r*math.cos(a);z=1.265+.127*r*math.sin(a)
            vs.append(front(x,z))
    for i in range(segments):fs.append((0,1+i,1+(i+1)%segments))
    for j in range(rings-1):
        for i in range(segments):a=1+j*segments+i;b=1+j*segments+(i+1)%segments;fs.append((a,b,b+segments,a+segments))
    cup=mesh('Tailored swimwear cup'+str(side),vs,fs,navy)
    curve('Soft cup seam'+str(side),[front(side*.105+.112*math.cos(a),1.265+.127*math.sin(a),.0045) for a in [2*math.pi*i/36 for i in range(37)]],.0014,navy,'Spine')
    curve('Fine swimwear strap'+str(side),[front(side*.155,1.35),(side*.158,-.020,1.386),(side*.16,.055,1.37),(side*.16,.075,1.25)],.003,navy,'Spine')
sphere('Central gold fastener',front(0,1.188,.008),(.004,.002,.004),gold,'Spine',16)
vs=[];fs=[];segments=96;rows=15
for j in range(rows):
    t=j/(rows-1)
    for i in range(segments):
        a=2*math.pi*i/segments;bottomz=.937-.157*abs(math.cos(a))**1.7
        z=1.010*(1-t)+bottomz*t;vs.append(radial(a,z))
for j in range(rows-1):
    for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;fs.append((a,a+segments,b+segments,b))
mesh('Tailored high waist swimwear',vs,fs,navy,'pelvis')
patch_vs=[];patch_fs=[]
for j in range(10):
    t=j/9;z=.775+.14*t;width=.032+.019*t
    for k in range(10):
        x=(k/9*2-1)*width;patch_vs.append(front(x,z,.012))
for j in range(9):
    for k in range(9):a=j*10+k;patch_fs.append((a,a+1,a+11,a+10))
mesh('Opaque swimwear front gusset',patch_vs,patch_fs,navy,'pelvis')
curve('Swimwear waist binding',[radial(2*math.pi*i/48,1.011) for i in range(49)],.0025,navy,'Spine')
for side in [-1,1]:sphere('Gold hip clasp'+str(side),(side*.148,-.044,1.005),(.006,.003,.004),gold,'Spine',16)
head=rig.data.bones['Head'].head_local;eyes=[rig.data.bones['EyeL'].head_local,rig.data.bones['EyeR'].head_local]
for side,eye in zip(['L','R'],eyes):
    sphere('EyeWhite'+side,eye+Vector((0,.014,0)),(.0165,.022,.0115),white,'Eye'+side)
    sphere('Iris'+side,eye+Vector((0,-.0065,0)),(.0085,.002,.009),iris,'Eye'+side)
    sphere('Pupil'+side,eye+Vector((0,-.009,0)),(.0038,.001,.006),pupil,'Eye'+side)
    sphere('EyeCatchlight'+side,eye+Vector((-.0025,-.0105,.003)),(.0017,.001,.0017),white,'Eye'+side,16)
    eyelash=[front(eye.x-.018,eye.z+.005,.004),front(eye.x,eye.z+.012,.005),front(eye.x+.020,eye.z+.007,.004)]
for side,eye in zip(['L','R'],eyes):
    curve('Subtle upper lash '+side,[front(eye.x-.016,eye.z+.003,.001),front(eye.x,eye.z+.008,.001),front(eye.x+.017,eye.z+.004,.001)],.0007,hairmat,'Head')
# Shaped open crown, no closed sphere covering the forehead.
vs=[];fs=[];n=72;m=18;center=Vector((0,-.030,1.622))
for j in range(m):
    t=j/(m-1)
    for i in range(n):
        a=2*math.pi*i/n;back=(math.sin(a)+1)/2;limit=math.radians(72+50*back);theta=.015+t*limit
        vs.append(center+Vector((.089*math.sin(theta)*math.cos(a),.108*math.sin(theta)*math.sin(a),.091*math.cos(theta))))
for j in range(m-1):
    for i in range(n):a=j*n+i;b=j*n+(i+1)%n;fs.append((a,b,b+n,a+n))
mesh('Parted black crown',vs,fs,hairmat,'Head')
def ribbon(name,controls,width,mat,frontlock=False):
    vs=[];fs=[];steps=32;across=5
    p0,p1,p2,p3=[Vector(p) for p in controls]
    for j in range(steps):
        t=j/(steps-1);p=p0*(1-t)**3+p1*3*(1-t)**2*t+p2*3*(1-t)*t*t+p3*t**3
        # The smooth hair control cage stays in front of the chest; no discontinuous ray clamping.
        w=width*(.25+.75*math.sin(math.pi*max(.10,min(.93,t)))**.5)*(1-.80*t**6)
        for k in range(across):
            u=k/(across-1)*2-1;vs.append(p+Vector((u*w,.0035*(1-u*u),.0005*math.sin(u*3))))
    for j in range(steps-1):
        for k in range(across-1):a=j*across+k;fs.append((a,a+1,a+1+across,a+across))
    obj=mesh(name,vs,fs,mat,'Head')
    headg=obj.vertex_groups['Head'];spineg=obj.vertex_groups.new(name='Spine')
    for v in obj.data.vertices:
        w=max(.15,min(1,(v.co.z-1.12)/.36));headg.add([v.index],w,'REPLACE');spineg.add([v.index],1-w,'REPLACE')
    return obj
for i in range(60):
    a=math.pi*i/59;x=.083*math.cos(a);y=.082*math.sin(a)-.010
    endx=x*2.35+.007*math.sin(i*1.5);endz=.96+.03*math.sin(i*.6)
    ribbon('Long straight back layer %02d'%i,[(x,y,1.67),(x*1.32,y*1.25+.020,1.48),(endx*.93,.135,1.13),(endx,.115,endz)],.014,hairmat if i%4 else hairlight)
for side in [-1,1]:
    for i in range(7):
        x=side*(.086+i*.007)
        ribbon('Waist length front lock'+str(side)+str(i),[(side*(.018+i*.006),-.035,1.705),(side*(.065+i*.008),-.205,1.56),(x,-.330,1.30),(x*1.38,-.185,.96+.025*i)],.010,hairmat if i%3 else hairlight,True)
    sphere('Gold drop earring'+str(side),(side*.081,-.047,1.524),(.004,.003,.010),gold,'Head',16)
curve('Delicate gold necklace',[front(-.052,1.425,.004),front(-.025,1.403,.004),front(0,1.391,.005),front(.025,1.403,.004),front(.052,1.425,.004)],.0013,gold,'Spine')
sphere('Gold pendant',front(0,1.383,.006),(.004,.0018,.0055),gold,'Spine',16)
# Open robe wraps behind the torso with soft loose sleeves and flowing front hems.
for side in [-1,1]:
    vs=[];fs=[];n=25;m=18
    for j in range(n):
        t=j/(n-1);z=1.387-t*.84
        for k in range(m):
            u=k/(m-1);a=-.78+u*2.42;rx=.20+.055*t+.013*math.sin(t*8+u*5);ry=.10+.065*t
            vs.append((side*rx*math.cos(a),ry*math.sin(a),z+.015*math.sin(u*math.pi)))
    for j in range(n-1):
        for k in range(m-1):a=j*m+k;fs.append((a,a+1,a+1+m,a+m))
    robeobj=mesh('Flowing gauze robe'+str(side),vs,fs,robe,'Spine'); smooth=robeobj.modifiers.new('Soft cloth drape','SUBSURF');smooth.levels=1;smooth.render_levels=1
    curve('Robe embroidered front hem'+str(side),[vs[j*m] for j in range(n)],.0015,lace,'Spine')
    shoulder=rig.data.bones['upperarm01.'+('L' if side>0 else 'R')].head_local
    elbow=rig.data.bones['lowerarm01.'+('L' if side>0 else 'R')].head_local
    direction=(elbow-shoulder).normalized();axis1=direction.cross(Vector((0,1,0))).normalized();axis2=direction.cross(axis1).normalized()
    vs=[];fs=[];n=14;m=40
    for j in range(n):
        t=j/(n-1);center=shoulder+(elbow-shoulder)*(.1+.95*t);radius=.070+.025*t
        for k in range(m):a=2*math.pi*k/m;vs.append(center+(axis1*math.cos(a)+axis2*math.sin(a))*radius)
    for j in range(n-1):
        for k in range(m):a=j*m+k;b=j*m+(k+1)%m;fs.append((a,b,b+m,a+m))
    sleeveobj=mesh('Airy short robe sleeve'+str(side),vs,fs,robe,'upperarm01.'+('L' if side>0 else 'R'));smooth=sleeveobj.modifiers.new('Soft sleeve edge','SUBSURF');smooth.levels=1;smooth.render_levels=1
# IK lowers the arms naturally; targets are editable and will drive the greeting action.
for side,x in [('L',.26),('R',-.26)]:
    target=bpy.data.objects.new('Wrist target '+side,None);bpy.context.collection.objects.link(target);target.location=(x,-.035,.93)
    pole=bpy.data.objects.new('Elbow pole '+side,None);bpy.context.collection.objects.link(pole);pole.location=(x*1.6,-.08,1.19)
    ik=rig.pose.bones['lowerarm02.'+side].constraints.new('IK');ik.target=target;ik.pole_target=pole;ik.chain_count=4;ik.use_tail=True;ik.pole_angle=0
# GPT-produced face albedo is projected onto actual deforming head topology.
face_record=json.loads((output/'face-generation.json').read_text(encoding='utf-8'))
shutil.copy2(face_record['source'],output/'face-albedo.png')
faceimage=bpy.data.images.load(str(output/'face-albedo.png'));faceimage.pack()
facemat=material('Character face albedo',(1,1,1),.58)
tex=facemat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=faceimage
uvnode=facemat.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map='Face projection'
facemat.node_tree.links.new(uvnode.outputs['UV'],tex.inputs['Vector']);facemat.node_tree.links.new(tex.outputs['Color'],facemat.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bodymesh.materials.append(facemat);face_slot=len(bodymesh.materials)-1
faceuv=bodymesh.uv_layers.new(name='Face projection')
anchors=[(1.464,.065),(1.505,.25),(1.547,.40),(1.5815,.56),(1.611,.64),(1.713,1.0)]
def face_v(z):
    for (z0,v0),(z1,v1) in zip(anchors,anchors[1:]):
        if z<=z1:return v0+(v1-v0)*max(0,(z-z0)/(z1-z0))
    return 1.0
for poly in bodymesh.polygons:
    p=sum((bodymesh.vertices[i].co for i in poly.vertices),Vector())/len(poly.vertices)
    if p.z>1.466 and p.y<-.077 and poly.normal.y<-.12:
        poly.material_index=face_slot
    for loop in poly.loop_indices:
        p=bodymesh.vertices[bodymesh.loops[loop].vertex_index].co
        faceuv.data[loop].uv=(p.x/.19+.5,face_v(p.z))
# Fitted cloth follows evaluated posed skin, including the smooth breast/shoulder surface.
for obj in list(bpy.data.objects):
    if obj.type!='MESH' or not obj.name.startswith('Tailored swimwear cup'):continue
    smooth=obj.modifiers.new('Smooth tailored fabric','SUBSURF');smooth.levels=1;smooth.render_levels=1
    fit=obj.modifiers.new('Exact posed body fit','SHRINKWRAP');fit.target=body;fit.wrap_method='NEAREST_SURFACEPOINT';fit.wrap_mode='OUTSIDE';fit.offset=.005
# No vertex-colour multiplication of the face photograph in the runtime GLB.
skin.node_tree.nodes.remove(color_node)
skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.71,.49,.37,1)
bodymesh.color_attributes.remove(colors)
# Black fibre hair cards use GPT texture/alpha, retaining the real hair mesh.
hair_record=json.loads((output/'hair-generation.json').read_text(encoding='utf-8'))
shutil.copy2(hair_record['source'],output/'hair-lock.png')
hairimage=bpy.data.images.load(str(output/'hair-lock.png'));hairimage.pack()
haircard=material('Fine black hair fibres',(1,1,1),.54)
hairtex=haircard.node_tree.nodes.new('ShaderNodeTexImage');hairtex.image=hairimage
haircard.node_tree.links.new(hairtex.outputs['Color'],haircard.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
haircard.node_tree.links.new(hairtex.outputs['Alpha'],haircard.node_tree.nodes.get('Principled BSDF').inputs['Alpha'])
haircard.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.18
for obj in list(bpy.data.objects):
    if obj.type!='MESH' or not any(word in obj.name for word in ['Long straight back layer','Waist length front lock','Parted black crown']):continue
    uv=obj.data.uv_layers.new(name='Hair fibres')
    if obj.name=='Parted black crown':
        opaque=material('Matte black crown',(.008,.010,.014),.68);p=opaque.node_tree.nodes.get('Principled BSDF');p.inputs['Specular IOR Level'].default_value=.08
        for link in list(opaque.node_tree.links):
            if link.to_socket==p.inputs['Alpha']:opaque.node_tree.links.remove(link)
        p.inputs['Alpha'].default_value=1;obj.data.materials.clear();obj.data.materials.append(opaque)
        for loop in obj.data.loops:
            i=loop.vertex_index;uv.data[loop.index].uv=((i%72)/72*3,(i//72)/17*.70+.20)
    else:
        obj.data.materials.clear();obj.data.materials.append(haircard)
        for loop in obj.data.loops:
            i=loop.vertex_index;uv.data[loop.index].uv=(.40+(i%5)/4*.20,(1-(i//5)/31)*.94+.02)
scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Soft beach light');scene.world.use_nodes=True
scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.32,.38,.47,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.3
def light(name,loc,power,color,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler()
light('Beach dawn key',(2,-3,3),130,(1,.88,.77),3)
light('Sea fill',(-2,-2,1.8),85,(.75,.85,1),3)
light('Hair warm rim',(1,2,2.8),180,(1,.91,.8),2)
camdata=bpy.data.cameras.new('Model review camera');cam=bpy.data.objects.new('Model review camera',camdata);bpy.context.collection.objects.link(cam)
cam.location=(.035,-3.1,1.41);cam.rotation_euler=(Vector((0,-.015,1.24))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=1.08;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=800;scene.render.resolution_y=1080;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
scene.frame_start=1;scene.frame_end=84;scene.render.fps=24
body.data.shape_keys.key_blocks['Smile'].value=.16
bpy.context.view_layer.update()
bpy.ops.wm.save_as_mainfile(filepath=str(output/'visitor-work-v005.blend'))
scene.render.filepath=str(output/'model-review-front.png');bpy.ops.render.render(write_still=True)
cam.location=(1.1,-2.9,1.44);cam.rotation_euler=(Vector((0,0,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(output/'model-review-three-quarter.png');bpy.ops.render.render(write_still=True)
(output/'build-status.json').write_text(json.dumps({'status':'second modelling pass; inspect actual images before exporting',
    'blend':str(output/'visitor-work-v005.blend'),'bodyVertices':len(used),'bones':len(rig.data.bones),
    'morphs':['Blink','Smile'],'webModelExported':False,'greetingRendered':False},indent=2)+'\n',encoding='utf-8')
print('V005_RENDERED')
