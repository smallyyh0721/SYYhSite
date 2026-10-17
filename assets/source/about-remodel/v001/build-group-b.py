"""Final permitted group B. Geometry review only, no website installation."""
import bpy, math, json, random
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parent
SITE=ROOT.parents[3]
OUT=ROOT/'group-b';OUT.mkdir(exist_ok=True)
if (OUT/'character.blend').exists():raise RuntimeError('Second group already exists; stop at two groups')
SOURCE=SITE/'assets/source/avatar-v2/v034/visitor-source.blend'
random.seed(20261016)


def mat(name,color,rough=.45,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    m.diffuse_color=(*color,1)
    return m,p


def mesh(name,verts,faces,material=None):
    d=bpy.data.meshes.new(name);d.from_pydata(verts,[],faces);d.update()
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
    for p in d.polygons:p.use_smooth=True
    if material:d.materials.append(material)
    return o


def subdiv(o,n=1):
    s=o.modifiers.new('Surface refinement','SUBSURF');s.levels=n;s.render_levels=n


def tube(name,pts,radius,material):
    d=bpy.data.curves.new(name,'CURVE');d.dimensions='3D';d.bevel_depth=radius;d.bevel_resolution=2
    s=d.splines.new('POLY');s.points.add(len(pts)-1)
    for p,co in zip(s.points,pts):p.co=(*co,1)
    d.materials.append(material);o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
    return o


def sphere(name,loc,r,material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,location=loc)
    o=bpy.context.object;o.name=name;o.scale=(r,r,r);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons:p.use_smooth=True
    o.data.materials.append(material);return o


def bezier(ps,t):
    a,b,c,d=[Vector(p) for p in ps]
    return a*(1-t)**3+b*3*t*(1-t)**2+c*3*t*t*(1-t)+d*t**3


bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
src=bpy.data.objects['VisitorBody']
for k in src.data.shape_keys.key_blocks:
    if k.name!='Basis':k.value=0
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
evaluated=src.evaluated_get(bpy.context.evaluated_depsgraph_get());d=evaluated.to_mesh()
vv=[src.matrix_world@v.co for v in d.vertices];ff=[tuple(p.vertices) for p in d.polygons]
uvs={layer.name:[[tuple(layer.data[i].uv) for i in p.loop_indices] for p in d.polygons] for layer in d.uv_layers}
evaluated.to_mesh_clear()
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.name='Group B / sculpted silver CG portrait'
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=80;scene.cycles.use_denoising=True
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.025
scene.render.threads_mode='FIXED';scene.render.threads=12
scene.render.resolution_x=1050;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-.2
world=bpy.data.worlds.new('CG portrait studio');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs[0].default_value=(.075,.095,.13,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.26

# Retain native UV topology, sculpt contour, remove covered torso geometry entirely.
for p in vv:
    w=math.exp(-((p.z-1.51)/.048)**2)*max(0,min(1,(-p.y-.035)/.06))
    p.x*=1-.055*w
    cheek=math.exp(-((abs(p.x)-.044)/.026)**2-((p.z-1.554)/.022)**2)
    p.y-=.0018*cheek
face_ids=[i for i,f in enumerate(ff) if all(vv[j].z>1.442 for j in f)]
used=sorted({j for i in face_ids for j in ff[i]});mapping={old:new for new,old in enumerate(used)}
body=mesh('Refined head and neck',[vv[i] for i in used],[[mapping[j] for j in ff[i]] for i in face_ids])
for name,layer in uvs.items():
    dst=body.data.uv_layers.new(name=name)
    for p,idx in zip(body.data.polygons,face_ids):
        for li,co in zip(p.loop_indices,layer[idx]):dst.data[li].uv=co
skin,p=mat('Skin / packed native UV albedo',(.50,.31,.24),.48)
p.inputs['Subsurface Weight'].default_value=.065;p.inputs['Subsurface Radius'].default_value=(.0018,.00085,.00045)
p.inputs['Specular IOR Level'].default_value=.27
nodes=skin.node_tree.nodes;links=skin.node_tree.links
uv=nodes.new('ShaderNodeUVMap');uv.uv_map='MakeHuman CC0 UV'
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(SITE/'assets/source/avatar-v2/v033/skin-atlas.png'));tex.image.pack()
links.new(uv.outputs[0],tex.inputs[0]);links.new(tex.outputs['Color'],p.inputs['Base Color'])
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=900
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.10;bump.inputs['Distance'].default_value=.00006
links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
body.data.materials.append(skin);subdiv(body,1)
body['source']='MakeHuman CC0 anatomy; new contour; existing project-owned GPT UV albedo; no portrait billboard'

# Continuous opaque tailored bust, not a clipped copy of the old body surface.
coat,coat_p=mat('Ivory wool / woven roughness',(.36,.34,.30),.70)
knit,_=mat('Midnight fine knit',(.009,.013,.020),.70)
noise=coat.node_tree.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1300
bump=coat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.20;bump.inputs['Distance'].default_value=.00010
coat.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height']);coat.node_tree.links.new(bump.outputs['Normal'],coat_p.inputs['Normal'])
sections=[(1.105,.215,.140,-.012),(1.18,.235,.145,-.012),(1.27,.255,.133,-.006),(1.34,.268,.108,0),(1.373,.252,.091,-.005),(1.398,.170,.078,-.009),(1.424,.070,.060,-.018),(1.448,.051,.052,-.021),(1.463,.049,.050,-.022)]
cv=[];cf=[];segs=160
for z,rx,ry,cy in sections:
    for k in range(segs):
        a=math.tau*k/segs
        # Small tailored folds rather than a perfect ellipsoidal plastic shell.
        wrinkle=.0010*math.sin(a*14+z*32)*max(0,(1.40-z)/.30)
        cv.append(((rx+wrinkle)*math.sin(a),cy-(ry+wrinkle)*math.cos(a),z))
for j in range(len(sections)-1):
    for k in range(segs):
        a=j*segs+k;b=j*segs+(k+1)%segs;cf.append((a,b,b+segs,a+segs))
jacket=mesh('Continuous tailored jacket and collar',cv,cf,coat);jacket.data.materials.append(knit)
for poly in jacket.data.polygons:
    c=poly.center
    # Top collar and a clean central opening are dark knit, with no missing faces.
    if c.z>1.425 or (c.y<-.04 and abs(c.x)<.025+max(0,c.z-1.20)*.20):poly.material_index=1
subdiv(jacket,2);solid=jacket.modifiers.new('Wool thickness','SOLIDIFY');solid.thickness=.002
for sign in [-1,1]:
    lv=[];lf=[]
    path=[(.045,-.087,1.441,.024),(.090,-.100,1.398,.037),(.139,-.117,1.351,.047),(.090,-.153,1.292,.036),(.042,-.166,1.188,.010)]
    for x,y,z,width in path:
        for k in range(5):
            u=k/4;lv.append((sign*(x+(u-.5)*width),y-.004*math.sin(u*math.pi),z))
    for j in range(4):
        for k in range(4):
            a=j*5+k;lf.append((a,a+1,a+6,a+5))
    obj=mesh('Clean rolled lapel '+str(sign),lv,lf,coat);subdiv(obj,2)
    solid=obj.modifiers.new('Lapel edge thickness','SOLIDIFY');solid.thickness=.0018
silver,_=mat('Satin silver',(.42,.46,.50),.24,.85)
for sign in [-1,1]:
    pts=[(sign*.080+.009*math.cos(t*math.tau/80),-.043,1.539+.012*math.sin(t*math.tau/80)) for t in range(81)]
    tube('Silver ear cuff '+str(sign),pts,.00115,silver)

# Optical eye parts, recessed in the actual face rather than painted glints.
ivory,ps=mat('Warm sclera',(.62,.64,.60),.22)
ps.inputs['Specular IOR Level'].default_value=.36
iris,ip=mat('Hazel grey iris',(.055,.085,.070),.31)
vc=iris.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='IrisTint';iris.node_tree.links.new(vc.outputs['Color'],ip.inputs['Base Color'])
glass,gp=mat('Corneal clear coat',(.97,.99,1),.025);gp.inputs['Transmission Weight'].default_value=1;gp.inputs['IOR'].default_value=1.38
for side,cx in [('L',.0302),('R',-.0302)]:
    cy=-.1178;cz=1.5815;rad=.0138
    sphere('Eye globe '+side,(cx,cy,cz),rad,ivory)
    for name,radius,caprad,material,colored in [('Iris',rad,.0057,iris,True),('Cornea',rad+.00022,.0068,glass,False)]:
        v=[];f=[];cols=[];n=96;nr=14
        for j in range(nr+1):
            r=caprad*j/nr
            for k in range(n):
                a=k*math.tau/n;y=cy-math.sqrt(max(.00000001,radius*radius-r*r))-.00012
                v.append((cx+r*math.cos(a),y,cz+r*math.sin(a)))
                noise=.55+.25*math.sin(a*75+r*3000)+.12*math.cos(a*143-r*500)
                col=(.025+.07*noise,.033+.09*noise,.025+.06*noise)
                if r<.0023:col=(.001,.001,.001)
                if r>caprad*.88:col=tuple(c*.35 for c in col)
                cols.append((*col,1))
        for j in range(nr):
            for k in range(n):
                a=j*n+k;b=j*n+(k+1)%n;f.append((a,b,b+n,a+n))
        obj=mesh(name+' '+side,v,f,material)
        if colored:
            attr=obj.data.color_attributes.new(name='IrisTint',type='FLOAT_COLOR',domain='POINT')
            for datum,color in zip(attr.data,cols):datum.color=color
            obj.data.color_attributes.active_color=attr

# Rebuilt short swept groom: solid, tapered curved locks with fine native fibres.
hair,hp=mat('Silver ash hair / satin anisotropy',(.16,.175,.19),.36)
hp.inputs['Specular IOR Level'].default_value=.27;hp.inputs['Anisotropic'].default_value=.45
hp.inputs['Coat Weight'].default_value=.10
hc=Vector((0,-.010,1.598));rx=.089;ry=.108;rz=.111
sv=[];sf=[];rows=40;cols=144
for j in range(rows+1):
    for k in range(cols+1):
        phi=k*math.tau/cols;limit=2.12-.86*((1+math.cos(phi))/2)**2
        theta=.008+(limit-.008)*j/rows
        sv.append(hc+Vector((rx*math.sin(theta)*math.sin(phi),-ry*math.sin(theta)*math.cos(phi),rz*math.cos(theta))))
for j in range(rows):
    for k in range(cols):
        a=j*(cols+1)+k;sf.append((a,a+1,a+cols+2,a+cols+1))
scalp=mesh('Short groom underlayer',sv,sf,hair);subdiv(scalp,1)
fibres=bpy.data.curves.new('Fine curved silver fibres','CURVE');fibres.dimensions='3D';fibres.bevel_depth=.000065;fibres.bevel_resolution=1
fibres.materials.append(hair);fo=bpy.data.objects.new('Native groom fibres',fibres);bpy.context.collection.objects.link(fo)
strand_count=0


def make_lock(index,controls,width,depth):
    global strand_count
    centers=[bezier(controls,t/28) for t in range(29)]
    frames=[]
    for j,p in enumerate(centers):
        tangent=(centers[min(j+1,28)]-centers[max(0,j-1)]).normalized()
        axis=Vector((1,0,0));normal=tangent.cross(axis).normalized()
        if normal.length<.1:normal=tangent.cross(Vector((0,1,0))).normalized()
        binormal=tangent.cross(normal).normalized();frames.append((normal,binormal))
    v=[];f=[];segs=10
    for j,p in enumerate(centers):
        t=j/28;shape=(.40+.60*math.sin(math.pi*t)**.6)*(1-t*.92)
        normal,binormal=frames[j]
        for k in range(segs):
            a=k*math.tau/segs
            v.append(p+normal*(depth*math.sin(a)*shape)+binormal*(width*math.cos(a)*shape))
    for j in range(28):
        for k in range(segs):
            a=j*segs+k;b=j*segs+(k+1)%segs;f.append((a,b,b+segs,a+segs))
    obj=mesh('Swept solid lock %02d'%index,v,f,hair);subdiv(obj,1)
    for strand in range(85):
        phase=random.uniform(0,math.tau);offset=random.uniform(.82,1.06)
        sp=fibres.splines.new('POLY');sp.points.add(28)
        for j,(point,p) in enumerate(zip(sp.points,centers)):
            t=j/28;shape=(.40+.60*math.sin(math.pi*t)**.6)*(1-t*.92)
            normal,binormal=frames[j];wave=.00045*math.sin(t*math.pi*2+phase)
            co=p+normal*(depth*math.sin(phase)*shape*offset+wave)+binormal*(width*math.cos(phase)*shape*offset)
            point.co=(*co,1);point.radius=max(.03,(1-t)**.35)*random.uniform(.75,1.1)
        strand_count+=1


idx=0
# Broad frontal sweep, raised crown and curved tips: no vertical parallel bob.
for i in range(27):
    t=i/26;x=-.074+.148*t
    rootz=1.633+.014*math.sin(math.pi*t)
    controls=[(x,-.087,rootz),(x-.020,-.080,1.740+.025*math.sin(t*math.pi)),(x-.050,.035,1.787-.018*abs(t-.5)),(x-.044,.085,1.651+.012*math.sin(i))]
    make_lock(idx,controls,.009+random.random()*.004,.0045+random.random()*.0015);idx+=1
for sign in [-1,1]:
    for i in range(13):
        t=i/12
        controls=[(sign*(.077+.008*t),-.061+.105*t,1.655-.028*t),(sign*.105,-.025+.105*t,1.660),(sign*.107,.059+.031*t,1.584),(sign*.077,.075,1.545+.012*t)]
        make_lock(idx,controls,.0068,.0035);idx+=1
for i in range(12):
    a=.55+(math.pi*2-1.1)*i/11
    controls=[(rx*.55*math.sin(a),.01-ry*.55*math.cos(a),1.693),(rx*.95*math.sin(a),.02-ry*.95*math.cos(a),1.680),(rx*math.sin(a),.02-ry*math.cos(a),1.595),(rx*.83*math.sin(a),.02-ry*.83*math.cos(a),1.541)]
    make_lock(idx,controls,.0075,.0038);idx+=1
fo['strand_count']=strand_count;fo['native_geometry']=True

# Reproducible neutral studio; no raster background or image plane is used.
def area(name,loc,energy,color,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc
    obj.rotation_euler=(Vector((0,-.01,1.57))-obj.location).to_track_quat('-Z','Y').to_euler()
area('Soft key',(-.65,-.9,2.05),25,(1,.89,.80),.8)
area('Gentle fill',(.7,-.5,1.7),7,(.76,.84,1),.7)
area('Hair separation',(.3,.45,2.02),25,(.85,.91,1),.55)
area('Corneal reflection',(-.18,-.75,1.75),2,(1,.98,.94),.26)
cd=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',cd);scene.collection.objects.link(cam);scene.camera=cam
cd.type='ORTHO';cd.ortho_scale=.64
target=Vector((0,-.01,1.50))


def set_camera(angle):
    a=math.radians(angle);cam.location=(2.6*math.sin(a),-2.6*math.cos(a),1.55)
    cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()


scene['group']='B';scene['attempt_limit']=2
scene['review_scope']='Actual static three-dimensional modelling review; facial animation and web optimization are not completed'
scene['reference']='Cyberfiction offline CG quality; no reference-site model, frame or texture reused'
set_camera(0);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'character.blend'))
status={'group':'B','status':'rendering','native_file':str(OUT/'character.blend'),'groom_strands':strand_count,'solid_hair_locks':idx,'views':[],'limitations':['Static modelling review, not a production facial rig','Cycles procedural shading differs from portable GLB shading']}
(OUT/'status.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
for name,angle in [('front',0),('three-quarter',32),('profile',78)]:
    set_camera(angle);scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
    status['views'].append(name);(OUT/'status.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
set_camera(0);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'character.blend'))
for obj in list(scene.objects):
    if obj.type=='CURVE':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type=='MESH':obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'character-review.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=True,export_vertex_color='ACTIVE',export_extras=True)
status['status']='rendered_native_and_geometry_preview';status['glb_bytes']=(OUT/'character-review.glb').stat().st_size
(OUT/'status.json').write_text(json.dumps(status,indent=2),encoding='utf-8')
print('FINAL_SECOND_GROUP_COMPLETE',json.dumps(status))
