"""Native Blender revision: continuous fitted swimwear and swept layered hair.
Preserves v006 and exports only after separate import validation.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v006/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];rig=bpy.data.objects['VisitorRig']
if (out/'visitor-source.blend').exists():raise RuntimeError('Retain existing revision')
for o in list(scene.objects):
    if any(s in o.name for s in ['Tailored swimwear','Tailored high waist','Opaque swimwear front','Soft cup seam','LongBlackHair','Parted black crown']):bpy.data.objects.remove(o,do_unlink=True)
# Paint-style native surface mask: clothing shares the skinned surface without intersections.
skin=body.data.materials[0];nt=skin.node_tree;p=nt.nodes.get('Principled BSDF')
old=next(l.from_socket for l in nt.links if l.to_socket==p.inputs['Base Color'])
geo=nt.nodes.new('ShaderNodeNewGeometry');xyz=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(geo.outputs['Position'],xyz.inputs[0])
def calc(op,a,b=None):
    n=nt.nodes.new('ShaderNodeMath');n.operation=op
    for i,v in enumerate([a,b] if b is not None else [a]):
        if isinstance(v,(int,float)):n.inputs[i].default_value=v
        else:nt.links.new(v,n.inputs[i])
    return n.outputs[0]
x,y,z=[xyz.outputs[i] for i in range(3)]
xx=calc('DIVIDE',calc('SUBTRACT',calc('ABSOLUTE',x),.101),.102)
zz=calc('DIVIDE',calc('SUBTRACT',z,1.281),.105)
cup=calc('MULTIPLY',calc('LESS_THAN',calc('ADD',calc('MULTIPLY',xx,xx),calc('MULTIPLY',zz,zz)),1.02),calc('LESS_THAN',y,.008))
# Connected back/underbust band; opaque front coverage remains independent of pose.
band=calc('MULTIPLY',calc('GREATER_THAN',z,1.197),calc('LESS_THAN',z,1.222))
top=calc('MAXIMUM',cup,band)
lower=calc('SUBTRACT',.944,calc('MULTIPLY',calc('POWER',calc('MAXIMUM',0,calc('SUBTRACT',1,calc('DIVIDE',calc('ABSOLUTE',x),.165))),1.35),.14))
bottom=calc('MULTIPLY',calc('GREATER_THAN',z,lower),calc('LESS_THAN',z,1.006))
mask=calc('MAXIMUM',top,bottom)
mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX';nt.links.new(mask,mix.inputs[0]);nt.links.new(old,mix.inputs[1]);mix.inputs[2].default_value=(.012,.022,.047,1)
nt.links.new(mix.outputs[0],p.inputs['Base Color'])
# Bake color into original UV so GLB uses the same single primitive and facial morphs.
atlas=bpy.data.images.new('Fitted visitor atlas',width=2048,height=2048,alpha=False)
n=nt.nodes.new('ShaderNodeTexImage');n.image=atlas;nt.nodes.active=n
scene.render.engine='CYCLES';scene.cycles.samples=1
scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
sub=next(m for m in body.modifiers if m.type=='SUBSURF');sub.levels=0;sub.render_levels=0
bpy.ops.object.bake(type='DIFFUSE');atlas.filepath_raw=str(out/'skin-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack()
nt.links.new(n.outputs['Color'],p.inputs['Base Color']);uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='MakeHuman CC0 UV';nt.links.new(uv.outputs['UV'],n.inputs['Vector'])
sub.render_levels=1
hair=bpy.data.materials.new('Layered black silk');hair.use_nodes=True
hp=hair.node_tree.nodes.get('Principled BSDF');hp.inputs['Base Color'].default_value=(.007,.009,.014,1);hp.inputs['Roughness'].default_value=.47;hp.inputs['Specular IOR Level'].default_value=.20
def mesh(name,vs,fs):
    d=bpy.data.meshes.new(name);d.from_pydata(vs,[],fs);d.update();o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);d.materials.append(hair)
    for f in d.polygons:f.use_smooth=True
    h=o.vertex_groups.new(name='Head');s=o.vertex_groups.new(name='Spine')
    for v in d.vertices:
        w=max(.12,min(1,(v.co.z-1.10)/.42));h.add([v.index],w,'REPLACE');s.add([v.index],1-w,'REPLACE')
    a=o.modifiers.new('Visitor skin','ARMATURE');a.object=rig;o.parent=rig
    return o
# Close scalp follows the skull; hairline is swept to an off-centre part.
vs=[];fs=[];N=96;M=22;center=Vector((0,-.028,1.621))
for j in range(M):
    t=j/(M-1)
    for i in range(N):
        a=2*math.pi*i/N;front=max(0,-math.sin(a));theta=t*math.radians(110-46*front)
        vs.append(center+Vector((.087*math.sin(theta)*math.cos(a),.108*math.sin(theta)*math.sin(a),.085*math.cos(theta))))
for j in range(M-1):
    for i in range(N):k=j*N+i;l=j*N+(i+1)%N;fs.append((k,l,l+N,k+N))
mesh('Swept scalp',vs,fs)
def lock(name,controls,width):
    p0,p1,p2,p3=[Vector(p) for p in controls];vs=[];fs=[];N=48;M=7
    for j in range(N):
        t=j/(N-1);c=p0*(1-t)**3+3*p1*t*(1-t)**2+3*p2*t*t*(1-t)+p3*t**3
        w=width*(.35+.65*math.sin(math.pi*min(.98,t+.02))**.5)*(1-.95*t**10)
        for k in range(M):
            u=2*k/(M-1)-1;vs.append(c+Vector((w*u,-.003*(1-u*u),.001*math.cos(u*math.pi))))
    for j in range(N-1):
        for k in range(M-1):a=j*M+k;fs.append((a,a+1,a+1+M,a+M))
    return mesh(name,vs,fs)
for i in range(32):
    a=math.pi*i/31;x=.084*math.cos(a);y=.085*math.sin(a)-.024
    lock('Swept back lock %02d'%i,[(x,y,1.684),(x*1.3,y*1.4,1.50),(x*2.0,.13,1.20),(x*2.3+.01*math.sin(i),.10,.94+.075*math.sin(i*.7))],.012)
for side in [-1,1]:
    for i in range(6):
        x=side*(.085+i*.009)
        lock('Swept face lock %s %s'%(side,i),[(side*(-.011+i*.009),-.061,1.696),(side*(.050+i*.014),-.147,1.624),(x*1.5,-.273,1.27),(x*1.75,-.107,.965+.035*i)],.011)
    # Face framing pieces turn away from the forehead rather than dropping from the crown.
    for i in range(4):
        lock('Temple strand %s %s'%(side,i),[(side*.026,-.088,1.69),(side*.097,-.129,1.65),(side*.105,-.117,1.52),(side*(.121+i*.012),-.12,1.38-i*.055)],.006)
# Gentle smooth robe instead of rigid shoulder corners.
for o in scene.objects:
    if o.type=='MESH' and any(s in o.name for s in ['Flowing gauze','Airy short robe']):
        m=o.modifiers.new('Soft gauze folds','SUBSURF');m.levels=1;m.render_levels=2
scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.camera.location=(.035,-3.1,1.41);scene.camera.rotation_euler=(Vector((0,-.015,1.24))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
scene.render.filepath=str(out/'model-review-front.png');bpy.ops.render.render(write_still=True)
print('V007_REFINED')
