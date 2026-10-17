"""Two bounded Codex/Blender character studies. Never installs website assets.

The existing CC0 anatomical topology is a starting point; facial form, physical
eyes, groom, wardrobe, shaders and review scenes are rebuilt for this review.
"""
import bpy
import bmesh
import json
import math
import random
import sys
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parent
SITE = ROOT.parents[3]
SOURCE = SITE / 'assets/source/avatar-v2/v034/visitor-source.blend'
GROUP = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else 'A'
assert GROUP in ('A', 'B'), 'Exactly two permitted groups'
OUT = ROOT / ('group-' + GROUP.lower())
OUT.mkdir(exist_ok=True)
if (OUT / 'character.blend').exists():
    raise RuntimeError('Preserve completed group; do not create hidden extra variants')
random.seed(260016 + ord(GROUP))
CG = GROUP == 'B'


def mesh_object(name, verts, faces, material=None):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    for p in mesh.polygons:
        p.use_smooth = True
    if material:
        mesh.materials.append(material)
    return obj


def material(name, color, roughness=.45, metal=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metal
    mat.diffuse_color = (*color, 1)
    return mat, shader


def smooth_modifier(obj, levels=1):
    mod = obj.modifiers.new('Portrait surface refinement', 'SUBSURF')
    mod.levels = levels
    mod.render_levels = levels
    return mod


def tube(name, points, radius, mat, radii=None, resolution=3):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 2
    curve.bevel_depth = radius
    curve.bevel_resolution = resolution
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for i, (p, co) in enumerate(zip(spline.points, points)):
        p.co = (*co, 1)
        p.radius = radii[i] if radii else 1
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    return obj


def uv_sphere(name, location, scale, mat, segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.materials.append(mat)
    return obj


def color_attribute(obj, name, colors):
    attr = obj.data.color_attributes.new(name=name, type='FLOAT_COLOR', domain='POINT')
    for entry, color in zip(attr.data, colors):
        entry.color = (*color, 1)
    obj.data.color_attributes.active_color = attr
    return attr


def add_vertex_color(mat, shader, name):
    node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
    node.layer_name = name
    mat.node_tree.links.new(node.outputs['Color'], shader.inputs['Base Color'])


def blend(a, b, amount):
    return tuple(x*(1-amount)+y*amount for x,y in zip(a,b))


def gaussian(x, z, cx, cz, rx, rz):
    return math.exp(-2*((x-cx)/rx)**2-2*((z-cz)/rz)**2)


def bezier(points, t):
    a,b,c,d = [Vector(p) for p in points]
    return a*(1-t)**3+b*3*t*(1-t)**2+c*3*t*t*(1-t)+d*t**3


def point_camera(camera, location, target):
    camera.location = location
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()


# Read the actual source before constructing an independent scene.
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
source_body = bpy.data.objects['VisitorBody']
for key in source_body.data.shape_keys.key_blocks:
    if key.name != 'Basis':
        key.value = 0
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
evaluated = source_body.evaluated_get(bpy.context.evaluated_depsgraph_get())
source_mesh = evaluated.to_mesh()
raw_verts = [source_body.matrix_world @ v.co for v in source_mesh.vertices]
raw_faces = [tuple(p.vertices) for p in source_mesh.polygons]
evaluated.to_mesh_clear()

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = 'Codex About portrait ' + GROUP
scene.unit_settings.system = 'METRIC'
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .025
scene.render.resolution_x = 1050
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.film_transparent = False
scene.view_settings.view_transform = 'AgX'
scene.view_settings.look = 'AgX - Medium High Contrast'
scene.render.threads_mode = 'FIXED'
scene.render.threads = 12
world = bpy.data.worlds.new('Neutral portrait environment')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.12,.14,.18,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .32
scene.world = world

# Sculpt an independent bust and soften the old exaggerated chest projection.
verts = []
for source in raw_verts:
    p = source.copy()
    face = max(0, min(1, (-p.y-.045)/.055))
    jaw = gaussian(abs(p.x),p.z,.042,1.506,.055,.047)*face
    p.x *= 1-(.065 if CG else .035)*jaw
    p.y -= .0020*gaussian(abs(p.x),p.z,.044,1.554,.025,.022)*face
    if CG:
        for cx in [-.0302,.0302]:
            weight=gaussian(p.x,p.z,cx,1.582,.023,.017)*face
            p.x += (p.x-cx)*.055*weight
            p.z += (p.z-1.582)*.055*weight
    if 1.17 < p.z < 1.36 and p.y < -.07:
        weight=math.sin(math.pi*(p.z-1.17)/.19)**2
        p.y = p.y + (-.075-p.y)*.28*weight
    verts.append(p)
keep_faces=[f for f in raw_faces if all(verts[i].z>1.135 for i in f)]
used=sorted({i for f in keep_faces for i in f})
remap={old:new for new,old in enumerate(used)}
body=mesh_object('Sculpted portrait / head neck shoulders', [verts[i] for i in used], [[remap[i] for i in f] for f in keep_faces])
body['anatomical_source']='MakeHuman CC0 topology, independent sculpted derivative of project baseline'
body['group']=GROUP
body['no_portrait_plane']=True
skin, skin_shader=material('Skin / layered subsurface microstructure', (.57,.32,.24), .43)
skin_shader.inputs['Subsurface Weight'].default_value=.12
skin_shader.inputs['Subsurface Radius'].default_value=(.0022,.0010,.0006)
skin_shader.inputs['Specular IOR Level'].default_value=.32
body.data.materials.append(skin)
colors=[]
for v in body.data.vertices:
    x,y,z=v.co
    front=max(0,min(1,(-y-.065)/.035))
    base=(.60,.355,.265) if not CG else (.64,.395,.32)
    cheek=gaussian(abs(x),z,.043,1.551,.028,.022)*front
    col=blend(base,(.59,.235,.20),.18*cheek)
    lip=gaussian(x,z,0,1.510,.025,.0068)*front
    col=blend(col,(.31,.075,.065),.72*lip)
    inner=gaussian(x,z,0,1.510,.021,.00125)*front
    col=blend(col,(.10,.025,.025),.65*inner)
    eye_shadow=gaussian(abs(x),z,.031,1.593,.024,.008)*front
    col=blend(col,(.31,.16,.13),.15*eye_shadow)
    colors.append(col)
color_attribute(body,'SkinTint',colors)
add_vertex_color(skin,skin_shader,'SkinTint')
nt=skin.node_tree
noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1050
noise.inputs['Detail'].default_value=2.0
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.16;bump.inputs['Distance'].default_value=.000075
nt.links.new(noise.outputs['Fac'],bump.inputs['Height']);nt.links.new(bump.outputs['Normal'],skin_shader.inputs['Normal'])
smooth_modifier(body,1)
bvh=BVHTree.FromPolygons([v.co for v in body.data.vertices],[p.vertices[:] for p in body.data.polygons],all_triangles=False)


def surface_y(x,z,offset=.0006):
    hit=bvh.ray_cast(Vector((x,-.7,z)),Vector((0,1,0)))
    return (hit[0].y-offset) if hit[0] else -.12


# Physical eyeballs with curved, vertex-coloured irises and optical catchlights.
ivory,eye_shader=material('Sclera / warm wet ivory',(.70,.71,.66),.19)
eye_shader.inputs['Specular IOR Level'].default_value=.45
iris_mat,iris_shader=material('Iris / radial pigment geometry',(.13,.065,.023),.31)
add_vertex_color(iris_mat,iris_shader,'IrisTint')
pupil_mat,pupil_shader=material('Pupil / optical black',(.001,.001,.001),.09)
clear,clear_shader=material('Cornea / physical transparent coat',(.97,.99,1),.018)
clear_shader.inputs['Transmission Weight'].default_value=1
clear_shader.inputs['IOR'].default_value=1.38
eyeliner,_=material('Lash / soft charcoal',(.009,.006,.005),.40)
brow,_=material('Eyebrows / individual fibres',(.025,.013,.010),.49)
eye_parts=[]


def eye_cap(name,cx,cy,cz,radius,max_rad,mat,colored=False):
    vv=[];cc=[];ff=[];rings=14;segments=96
    for j in range(rings+1):
        r=max_rad*(j/rings)
        for k in range(segments):
            a=k*math.tau/segments
            y=cy-math.sqrt(max(.00000001,radius*radius-r*r))-.00008
            vv.append((cx+r*math.cos(a),y,cz+r*math.sin(a)))
            if colored:
                radial=r/max_rad
                streak=.50+.25*math.sin(a*73+radial*14)+.13*math.sin(a*143-radial*21)
                color=(.038+streak*.13,.018+streak*.055,.006+streak*.017) if not CG else (.025+streak*.055,.046+streak*.075,.047+streak*.072)
                if radial>.86:color=blend(color,(.009,.009,.007),(radial-.86)/.14*.85)
                if radial<.42:color=(.002,.0015,.001)
                cc.append(color)
    for j in range(rings):
        for k in range(segments):
            a=j*segments+k;b=j*segments+(k+1)%segments
            ff.append((a,b,b+segments,a+segments))
    obj=mesh_object(name,vv,ff,mat)
    if colored:color_attribute(obj,'IrisTint',cc)
    return obj


for side,cx in [('L',.0302),('R',-.0302)]:
    cy=-.1176;cz=1.5815;rad=.0142 if CG else .0137
    eye_parts.append(uv_sphere('Eyeball '+side,(cx,cy,cz),(rad,rad,rad),ivory))
    eye_parts.append(eye_cap('Radial iris '+side,cx,cy,cz,rad,.0059 if CG else .0056,iris_mat,True))
    # Front corneal cap is a real refractive surface, not a painted white glint.
    eye_parts.append(eye_cap('Corneal lens '+side,cx,cy-.00015,cz,rad+.00025,.0070,clear))
    # Brows and lashes follow actual facial surface rather than a portrait decal.
    sign=1 if cx>0 else -1
    brow_points=[]
    for k in range(37):
        t=k/36;x=sign*(.012+.044*t);z=1.614+.006*math.sin(math.pi*t)-.005*t
        brow_points.append((x,surface_y(x,z,.0008),z))
    tube('Brow silhouette '+side,brow_points,.00095,brow,[.18+.80*math.sin(math.pi*t/36)**.6 for t in range(37)],2)
    for k in range(75):
        t=(k+.2)/75;x=sign*(.012+.043*t);z=1.614+.006*math.sin(math.pi*t)-.005*t
        length=.0018+.002*math.sin(math.pi*t)
        pts=[]
        for j in range(4):
            u=j/3;xx=x+sign*.0017*u;zz=z+length*u
            pts.append((xx,surface_y(xx,zz,.0010),zz))
        tube('Brow fibre '+side+str(k),pts,.000085,brow,[1,.9,.6,.03],1)
    upper=[]
    for k in range(35):
        t=k/34;x=cx+(t-.5)*.030;z=cz+.001+.0057*math.sin(math.pi*t)
        upper.append((x,surface_y(x,z,.00045),z))
    tube('Upper eyelid rim '+side,upper,.00035,eyeliner,[.15+.8*math.sin(math.pi*k/34)**.5 for k in range(35)],2)
    for k in range(22):
        t=(k+.5)/22;x=cx+(t-.5)*.029;z=cz+.001+.0057*math.sin(math.pi*t)
        y=surface_y(x,z,.0005);length=.0014+.0016*math.sin(math.pi*t)
        pts=[(x,y,z),(x+(t-.5)*.001,y-.0010,z+length*.4),(x+(t-.5)*.0015,y-.0016,z+length)]
        tube('Eyelash '+side+str(k),pts,.000075,eyeliner,[1,.65,.02],1)

# Opaque tailored clothing replaces the old swimsuit/transparent robe.
knit,knit_shader=material('Fine knit / ' + ('ivory' if CG else 'ink'),(.64,.62,.56) if CG else (.014,.018,.022),.72)
coat,coat_shader=material('Tailored wool / ' + ('chalk' if CG else 'charcoal'),(.58,.56,.51) if CG else (.040,.045,.052),.62)
for mat,shader in [(knit,knit_shader),(coat,coat_shader)]:
    n=mat.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=1550;n.inputs['Detail'].default_value=2
    b=mat.node_tree.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=.18;b.inputs['Distance'].default_value=.00012
    mat.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']);mat.node_tree.links.new(b.outputs['Normal'],shader.inputs['Normal'])


def garment(name,mat,offset,coat_open=False):
    face_ids=[]
    for poly in body.data.polygons:
        coords=[body.data.vertices[i].co for i in poly.vertices]
        center=sum(coords,Vector())/len(coords)
        if max(p.z for p in coords)>1.397:continue
        if coat_open and center.y<-.025 and abs(center.x)<.017+max(0,1.40-center.z)*.23:continue
        face_ids.append(tuple(poly.vertices))
    indices=sorted({i for f in face_ids for i in f});mapping={old:new for new,old in enumerate(indices)}
    vv=[body.data.vertices[i].co+body.data.vertices[i].normal*offset for i in indices]
    obj=mesh_object(name,vv,[[mapping[i] for i in f] for f in face_ids],mat)
    smooth_modifier(obj,1)
    solid=obj.modifiers.new('Garment thickness','SOLIDIFY');solid.thickness=.0016
    return obj


garment('Fine-knit inner layer',knit,.003)
garment('Fitted tailored jacket',coat,.009,True)
collarverts=[];collarfaces=[]
for j in range(9):
    t=j/8;z=1.392+t*(.048 if not CG else .025)
    for k in range(96):
        a=math.tau*k/96
        collarverts.append((.049*math.sin(a),-.018-.054*math.cos(a),z))
for j in range(8):
    for k in range(96):
        a=j*96+k;b=j*96+(k+1)%96;collarfaces.append((a,b,b+96,a+96))
collar=mesh_object('Soft standing collar',collarverts,collarfaces,knit)
solid=collar.modifiers.new('Collar fabric thickness','SOLIDIFY');solid.thickness=.002
smooth_modifier(collar,1)

for sign in [-1,1]:
    # A fitted non-planar lapel, lofted on the front of the garment.
    path=[(.046,1.425),(.082,1.392),(.116,1.348),(.071,1.292),(.041,1.205)]
    lv=[]
    for k,(x,z) in enumerate(path):
        for j in range(4):
            width=[.022,.032,.040,.029,.012][k]
            xx=sign*(x+(j/3-.5)*width)
            yy=surface_y(xx,min(z,1.393),.014) if z<1.394 else -.064
            lv.append((xx,yy-.004*math.sin(j/3*math.pi),z))
    lf=[]
    for k in range(4):
        for j in range(3):
            a=k*4+j;lf.append((a,a+1,a+5,a+4))
    lapel=mesh_object('Sculpted jacket lapel '+str(sign),lv,lf,coat)
    smooth_modifier(lapel,2);solid=lapel.modifiers.new('Lapel thickness','SOLIDIFY');solid.thickness=.002

metal,metal_shader=material('Brushed pale gold' if not CG else 'Brushed silver',(.57,.35,.12) if not CG else (.60,.64,.68),.23,.85)
for sign in [-1,1]:
    pts=[]
    for k in range(73):
        a=math.tau*k/72;pts.append((sign*.081+.011*math.cos(a),-.034,1.532+.015*math.sin(a)))
    tube('Small ear hoop '+str(sign),pts,.0013,metal,resolution=3)
    uv_sphere('Earring stud '+str(sign),(sign*.079,-.037,1.547),(.0023,.0018,.0023),metal,32,16)

# New solid scalp and a dense native 3D groom, with no alpha hair cards.
hair_color=(.013,.008,.006) if not CG else (.37,.39,.42)
hair_mat,hair_shader=material('Groom / ' + ('raven brown' if not CG else 'smoke silver'),hair_color,.28)
hair_shader.inputs['Anisotropic'].default_value=.65
hair_shader.inputs['Coat Weight'].default_value=.18
hair_shader.inputs['Coat Roughness'].default_value=.28
scalpverts=[];scalpfaces=[]
RX=.088;RY=.106;RZ=.111;HC=Vector((0,-.009,1.598))


def hairline(phi):
    front=(1+math.cos(phi))/2
    return 2.33-1.27*front**2


def scalp_point(theta,phi,raise_by=0):
    return HC+Vector(((RX+raise_by)*math.sin(theta)*math.sin(phi),-(RY+raise_by)*math.sin(theta)*math.cos(phi),(RZ+raise_by)*math.cos(theta)))


for j in range(49):
    for k in range(161):
        phi=math.tau*k/160;theta=.008+(hairline(phi)-.008)*j/48
        scalpverts.append(scalp_point(theta,phi,.0022))
for j in range(48):
    for k in range(160):
        a=j*161+k;scalpfaces.append((a,a+1,a+162,a+161))
scalp=mesh_object('Sculpted scalp volume',scalpverts,scalpfaces,hair_mat)
smooth_modifier(scalp,1)

groom=bpy.data.curves.new('Native fibres / layered side-part bob','CURVE')
groom.dimensions='3D';groom.bevel_depth=.00013;groom.bevel_resolution=1;groom.resolution_u=1
groom.materials.append(hair_mat)
groom_obj=bpy.data.objects.new('Groom / individual native strands',groom);bpy.context.collection.objects.link(groom_obj)
groom_obj['strand_count']=5200
groom_obj['construction']='Native three-dimensional fibres; no transparent photo planes'


def strand(points,width):
    sp=groom.splines.new('POLY');sp.points.add(len(points)-1)
    for k,(p,co) in enumerate(zip(sp.points,points)):
        p.co=(*co,1)
        t=k/(len(points)-1);p.radius=width*(.90+.10*math.sin(t*math.pi))*max(.04,(1-t)**.33)


# Side and back layers: the front opening stays clear of the eyes and cheeks.
for i in range(4400):
    phi=random.uniform(.73,math.tau-.73)
    start=random.uniform(.03,.78)
    bend=random.uniform(.0,.11)
    endz=(1.375 if not CG else 1.405)+random.uniform(-.023,.028)
    points=[]
    for k in range(22):
        t=k/21
        theta=start+(1.67-start)*min(t/.63,1)
        phase=phi+(.08 if phi<math.pi else -.08)*math.sin(t*math.pi)
        p=scalp_point(theta,phase,.003+random.random()*.002)
        if t>.63:
            u=(t-.63)/.37
            p.z=(1-u)*p.z+u*endz
            p.x*=1+.13*math.sin(u*math.pi/2)
            p.y+=.009*u*math.sin(phi)+.006*math.sin(u*math.pi)
        p.x+=.0010*math.sin(t*math.pi*2+phi*9)
        points.append(p)
    strand(points,random.uniform(.65,1.2))

# Swept crown fibres part to either side, following the cranial volume.
for i in range(800):
    sign=1 if i<535 else -1
    root_y=random.uniform(-.075,.065)
    frac=max(0,1-((root_y-HC.y)/RY)**2)
    root_z=HC.z+RZ*math.sqrt(frac)+random.uniform(.004,.010)
    root_x=-.016+random.uniform(-.004,.004)
    end_y=-.091 if root_y<-.035 else root_y+.012
    controls=[(root_x,root_y,root_z),(sign*.047,root_y-.005,root_z+.020),(sign*.097,end_y,1.640),(sign*.095,end_y,1.487+random.uniform(-.01,.02))]
    points=[bezier(controls,k/23) for k in range(24)]
    strand(points,random.uniform(.70,1.25))

# Larger solid locks establish silhouette beneath the fine fibres.
for i in range(70):
    phi=.76+(math.tau-1.52)*i/69
    vv=[];ff=[];halfwidth=.065
    endz=(1.378 if not CG else 1.409)+.014*math.sin(phi*8)
    for j in range(23):
        t=j/22;theta=.18+(1.67-.18)*min(t/.62,1)
        for k in range(5):
            a=phi+(k/4-.5)*halfwidth
            p=scalp_point(theta,a,.003)
            if t>.62:
                u=(t-.62)/.38;p.z=(1-u)*p.z+u*endz;p.x*=1+.12*math.sin(u*math.pi/2)
            # Convex cross section provides actual clump volume.
            p.x+=.0015*math.sin(k/4*math.pi)*math.sin(a)
            p.y-=.0015*math.sin(k/4*math.pi)*math.cos(a)
            vv.append(p)
    for j in range(22):
        for k in range(4):
            a=j*5+k;ff.append((a,a+1,a+6,a+5))
    lock=mesh_object('Sculpted hair lock %02d'%i,vv,ff,hair_mat)
    solid=lock.modifiers.new('Solid lock cross section','SOLIDIFY');solid.thickness=.0007
    smooth_modifier(lock,1)

# A few visible fine flyaways keep the silhouette from looking moulded.
for i in range(55):
    phi=random.uniform(.8,math.tau-.8);theta=random.uniform(.2,1.2)
    points=[]
    for k in range(17):
        t=k/16;p=scalp_point(theta+t*.55,phi,.008+.009*math.sin(t*math.pi));points.append(p)
    strand(points,.48)

# A compact, editable deformation rig is included for future work, not installed.
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
rig=bpy.context.object;rig.name='PortraitRig'
bones=rig.data.edit_bones
root=bones[0];root.name='Root';root.head=(0,0,1.135);root.tail=(0,0,1.25)
sp=bones.new('Spine');sp.head=(0,0,1.25);sp.tail=(0,-.012,1.415);sp.parent=root
neck=bones.new('Neck');neck.head=sp.tail;neck.tail=(0,-.036,1.5);neck.parent=sp
head=bones.new('Head');head.head=neck.tail;head.tail=(0,-.025,1.710);head.parent=neck
for name,cx in [('EyeL',.0302),('EyeR',-.0302)]:
    bone=bones.new(name);bone.head=(cx,-.1176,1.5815);bone.tail=(cx,-.153,1.5815);bone.parent=head
bpy.ops.object.mode_set(mode='OBJECT')
rig.show_in_front=True
rig['review_only']='Initial portrait deformation rig; expression and browser interaction require separate validation'
for obj in list(scene.objects):
    if obj.type!='MESH':continue
    names=['Spine','Neck','Head']
    vg={n:obj.vertex_groups.new(name=n) for n in names}
    if obj in eye_parts:
        bone='EyeL' if obj.name.endswith('L') else 'EyeR'
        group=obj.vertex_groups.new(name=bone);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    elif 'hair' in obj.name.lower() or 'scalp' in obj.name.lower() or 'brow' in obj.name.lower() or 'ear' in obj.name.lower():
        vg['Head'].add(list(range(len(obj.data.vertices))),1,'REPLACE')
    else:
        for v in obj.data.vertices:
            z=(obj.matrix_world @ v.co).z
            h=max(0,min(1,(z-1.435)/.065));s=max(0,min(1,(1.445-z)/.06));n=max(0,1-h-s)
            for name,w in [('Head',h),('Spine',s),('Neck',n)]:
                if w>0:vg[name].add([v.index],w,'REPLACE')
    mod=obj.modifiers.new('Portrait deformation','ARMATURE');mod.object=rig


def area(name,location,energy,color,size,target=(0,-.01,1.53)):
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=location
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj


area('Large soft key',(-.65,-.9,2.15),110,(1,.88,.75),.85)
area('Broad gentle fill',(.75,-.4,1.65),38,(.72,.82,1),.70)
area('Hair contour',(.38,.4,1.98),125,(.75,.85,1),.5)
area('Eye softbox',(-.12,-.8,1.74),9,(1,.97,.91),.24)
camera_data=bpy.data.cameras.new('Portrait camera / long lens')
camera=bpy.data.objects.new('Portrait camera / long lens',camera_data);scene.collection.objects.link(camera);scene.camera=camera
camera_data.type='ORTHO';camera_data.ortho_scale=.66
target=(0,-.01,1.485)
point_camera(camera,(.0,-2.6,1.54),target)
scene['group']=GROUP
scene['attempt_limit']=2
scene['construction']='Editable anatomical mesh, geometric groom, physical eyes and opaque tailored clothes; no reference-site asset reused'
scene['reference']='https://cyberfiction-five.vercel.app/ ; appearance quality reference only; site uses a 2D image sequence'

# Save native source before any actual render. Frames are views of this one group.
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'character.blend'))
stats={'group':GROUP,'blender':bpy.app.version_string,'source_anatomy':str(SOURCE),'native_file':str(OUT/'character.blend'),'groom_strands':len(groom.splines),'meshes':sum(o.type=='MESH' for o in scene.objects),'rig_bones':len(rig.data.bones),'views':[],'status':'rendering'}
(OUT/'status.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
for name,angle in [('front',0),('three-quarter',32),('profile',78)]:
    a=math.radians(angle);point_camera(camera,(2.6*math.sin(a),-2.6*math.cos(a),1.54),target)
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    stats['views'].append(name)
    (OUT/'status.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')

# Export an actual geometry preview. Preserve the richer native shaders in .blend.
point_camera(camera,(0,-2.6,1.54),target)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'character.blend'))
for obj in list(scene.objects):
    if obj.type=='CURVE':
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='DESELECT')
for obj in scene.objects:
    if obj.type in ('MESH','ARMATURE'):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'character-review.glb'),export_format='GLB',use_selection=True,export_animations=False,export_apply=True,export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_extras=True)
stats['status']='rendered_native_and_geometry_preview'
stats['glb_bytes']=(OUT/'character-review.glb').stat().st_size
(OUT/'status.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding='utf-8')
print('CHARACTER_REVIEW_COMPLETE',json.dumps(stats,ensure_ascii=False))
