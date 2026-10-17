from pathlib import Path
import json, shutil
root=Path(__file__).resolve().parents[1]
folder=root/'assets/source/avatar-v2'
dest=folder/'v003';dest.mkdir(parents=True,exist_ok=True)
source=(folder/'v002/build-character.py').read_text(encoding='utf-8')
def replace(old,new):
    global source
    assert old in source, old[:80]
    source=source.replace(old,new,1)
replace("v002.blend", "v003.blend")
replace("if (output/'visitor-work-v003.blend').exists():raise RuntimeError('Choose a new revision instead of overwriting this modelling pass')", "if (output/'visitor-work-v003.blend').exists():raise RuntimeError('Choose a new revision instead of overwriting this modelling pass')")
replace("hit,normal,_,_=bvh.ray_cast(Vector((0,0,z))+direction, -direction,2)","hit,normal,_,_=bvh.ray_cast(Vector((0,0,z)), direction,1)")
replace("cup=mesh('Tailored swimwear cup'+str(side),vs,fs,navy)","cup=mesh('Tailored swimwear cup'+str(side),vs,fs,navy,'Spine')")
replace("bottomz=.951-.123*abs(math.cos(a))**1.7", "bottomz=.937-.157*abs(math.cos(a))**1.7")
replace("mesh('Tailored high waist swimwear',vs,fs,navy)","mesh('Tailored high waist swimwear',vs,fs,navy,'pelvis')")
replace("(side*.158,-.070,1.43),(side*.16,.065,1.43)","(side*.158,-.020,1.386),(side*.16,.055,1.37)")
replace("if frontlock and 1.05<p.z<1.48:p.y=min(p.y,front(p.x,p.z,.010).y)","# The smooth hair control cage stays in front of the chest; no discontinuous ray clamping.")
replace("(side*(.022+i*.006),-.116,1.696),(side*.073,-.135,1.57),(x,-.155,1.33),(x*1.38,-.127,.96+.025*i)","(side*(.018+i*.006),-.035,1.705),(side*(.065+i*.008),-.205,1.56),(x,-.330,1.30),(x*1.38,-.185,.96+.025*i)")
replace("mesh('Flowing gauze robe'+str(side),vs,fs,robe)","robeobj=mesh('Flowing gauze robe'+str(side),vs,fs,robe,'Spine'); smooth=robeobj.modifiers.new('Soft cloth drape','SUBSURF');smooth.levels=1;smooth.render_levels=1")
replace("z=1.435-t*.88", "z=1.387-t*.84")
replace("mesh('Airy short robe sleeve'+str(side),vs,fs,robe)","sleeveobj=mesh('Airy short robe sleeve'+str(side),vs,fs,robe,'upperarm01.'+('L' if side>0 else 'R'));smooth=sleeveobj.modifiers.new('Soft sleeve edge','SUBSURF');smooth.levels=1;smooth.render_levels=1")
source='\n'.join(line for line in source.splitlines() if "curve('Mature eyebrow'" not in line and "curve('Defined upper eyelash'" not in line)+'\n'
replace("if abs(p.x)<.026 and abs(p.z-1.522)<.006 and p.y<-.112:poly.material_index=1", "poly.material_index=0")
replace("scene=bpy.context.scene;scene.world=", """# GPT-produced face albedo is projected onto actual deforming head topology.
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
        opaque=haircard.copy();opaque.name='Crown black fibres';p=opaque.node_tree.nodes.get('Principled BSDF')
        for link in list(opaque.node_tree.links):
            if link.to_socket==p.inputs['Alpha']:opaque.node_tree.links.remove(link)
        p.inputs['Alpha'].default_value=1;obj.data.materials.clear();obj.data.materials.append(opaque)
        for loop in obj.data.loops:
            i=loop.vertex_index;uv.data[loop.index].uv=((i%72)/72*3,(i//72)/17*.70+.20)
    else:
        obj.data.materials.clear();obj.data.materials.append(haircard)
        for loop in obj.data.loops:
            i=loop.vertex_index;uv.data[loop.index].uv=((i%5)/4,(1-(i//5)/31)*.94+.02)
scene=bpy.context.scene;scene.world=""")
source=source.replace("visitor-work-v002.blend","visitor-work-v003.blend").replace("V002_RENDERED","V003_RENDERED")
(dest/'build-character.py').write_text(source,encoding='utf-8')
print('Prepared v003 with corrected torso-only fit and GPT material maps')
