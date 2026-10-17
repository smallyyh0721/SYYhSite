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
if (output/'visitor-work-v002.blend').exists():raise RuntimeError('Choose a new revision instead of overwriting this modelling pass')
upstream=root/'docs/agent-work/logs/makehuman-source/makehuman/data/targets'
extra=output/'morph-data';extra.mkdir(exist_ok=True)
extra_targets={'l-eye-scale-incr.target':.60,'r-eye-scale-incr.target':.60}
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
robe.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.20
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
    if abs(p.x)<.026 and abs(p.z-1.522)<.006 and p.y<-.112:poly.material_index=1
sub=body.modifiers.new('Smooth anatomical skin','SUBSURF');sub.levels=1;sub.render_levels=1
bvh=BVHTree.FromPolygons([v.co for v in bodymesh.vertices],[list(p.vertices) for p in bodymesh.polygons],all_triangles=False)
def front(x,z,offset=.003):
    hit,normal,_,_=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)),2)
    return hit+Vector((0,-offset,0)) if hit else Vector((x,-.10,z))
def radial(theta,z):
    direction=Vector((math.sin(theta),-math.cos(theta),0))
    hit,normal,_,_=bvh.ray_cast(Vector((0,0,z))+direction, -direction,2)
    return hit+direction*.003 if hit else Vector((.14*direction.x,.105*direction.y,z))
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
    curve('Fine swimwear strap'+str(side),[front(side*.155,1.35),(side*.158,-.070,1.43),(side*.16,.065,1.43),(side*.16,.075,1.25)],.003,navy,'Spine')
sphere('Central gold fastener',front(0,1.188,.008),(.004,.002,.004),gold,'Spine',16)
vs=[];fs=[];segments=96;rows=15
for j in range(rows):
    t=j/(rows-1)
    for i in range(segments):
        a=2*math.pi*i/segments;bottomz=.951-.123*abs(math.cos(a))**1.7
        z=1.010*(1-t)+bottomz*t;vs.append(radial(a,z))
for j in range(rows-1):
    for i in range(segments):a=j*segments+i;b=j*segments+(i+1)%segments;fs.append((a,a+segments,b+segments,b))
mesh('Tailored high waist swimwear',vs,fs,navy)
curve('Swimwear waist binding',[radial(2*math.pi*i/48,1.011) for i in range(49)],.0025,navy,'Spine')
for side in [-1,1]:sphere('Gold hip clasp'+str(side),(side*.148,-.044,1.005),(.006,.003,.004),gold,'Spine',16)
head=rig.data.bones['Head'].head_local;eyes=[rig.data.bones['EyeL'].head_local,rig.data.bones['EyeR'].head_local]
for side,eye in zip(['L','R'],eyes):
    sphere('EyeWhite'+side,eye,(.019,.022,.0155),white,'Eye'+side)
    sphere('Iris'+side,eye+Vector((0,-.021,0)),(.010,.002,.0115),iris,'Eye'+side)
    sphere('Pupil'+side,eye+Vector((0,-.0235,0)),(.0043,.001,.007),pupil,'Eye'+side)
    sphere('EyeCatchlight'+side,eye+Vector((-.003,-.025,.004)),(.002,.001,.002),white,'Eye'+side,16)
    eyelash=[front(eye.x-.018,eye.z+.005,.004),front(eye.x,eye.z+.012,.005),front(eye.x+.020,eye.z+.007,.004)]
    curve('Defined upper eyelash'+side,eyelash,.0015,hairmat,'Head')
    curve('Mature eyebrow'+side,[front(eye.x-.021,eye.z+.027,.003),front(eye.x,eye.z+.030,.003),front(eye.x+.022,eye.z+.026,.003)],.0020,hairmat,'Head')
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
        if frontlock and 1.05<p.z<1.48:p.y=min(p.y,front(p.x,p.z,.010).y)
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
        ribbon('Waist length front lock'+str(side)+str(i),[(side*(.022+i*.006),-.116,1.696),(side*.073,-.135,1.57),(x,-.155,1.33),(x*1.38,-.127,.96+.025*i)],.010,hairmat if i%3 else hairlight,True)
    sphere('Gold drop earring'+str(side),(side*.081,-.047,1.524),(.004,.003,.010),gold,'Head',16)
curve('Delicate gold necklace',[front(-.052,1.425,.004),front(-.025,1.403,.004),front(0,1.391,.005),front(.025,1.403,.004),front(.052,1.425,.004)],.0013,gold,'Spine')
sphere('Gold pendant',front(0,1.383,.006),(.004,.0018,.0055),gold,'Spine',16)
# Open robe wraps behind the torso with soft loose sleeves and flowing front hems.
for side in [-1,1]:
    vs=[];fs=[];n=25;m=18
    for j in range(n):
        t=j/(n-1);z=1.435-t*.88
        for k in range(m):
            u=k/(m-1);a=-.78+u*2.42;rx=.20+.055*t+.013*math.sin(t*8+u*5);ry=.10+.065*t
            vs.append((side*rx*math.cos(a),ry*math.sin(a),z+.015*math.sin(u*math.pi)))
    for j in range(n-1):
        for k in range(m-1):a=j*m+k;fs.append((a,a+1,a+1+m,a+m))
    mesh('Flowing gauze robe'+str(side),vs,fs,robe)
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
    mesh('Airy short robe sleeve'+str(side),vs,fs,robe)
# IK lowers the arms naturally; targets are editable and will drive the greeting action.
for side,x in [('L',.26),('R',-.26)]:
    target=bpy.data.objects.new('Wrist target '+side,None);bpy.context.collection.objects.link(target);target.location=(x,-.035,.93)
    pole=bpy.data.objects.new('Elbow pole '+side,None);bpy.context.collection.objects.link(pole);pole.location=(x*1.6,-.08,1.19)
    ik=rig.pose.bones['lowerarm02.'+side].constraints.new('IK');ik.target=target;ik.pole_target=pole;ik.chain_count=4;ik.use_tail=True;ik.pole_angle=0
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
bpy.ops.wm.save_as_mainfile(filepath=str(output/'visitor-work-v002.blend'))
scene.render.filepath=str(output/'model-review-front.png');bpy.ops.render.render(write_still=True)
cam.location=(1.1,-2.9,1.44);cam.rotation_euler=(Vector((0,0,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(output/'model-review-three-quarter.png');bpy.ops.render.render(write_still=True)
(output/'build-status.json').write_text(json.dumps({'status':'second modelling pass; inspect actual images before exporting',
    'blend':str(output/'visitor-work-v002.blend'),'bodyVertices':len(used),'bones':len(rig.data.bones),
    'morphs':['Blink','Smile'],'webModelExported':False,'greetingRendered':False},indent=2)+'\n',encoding='utf-8')
print('V002_RENDERED')
