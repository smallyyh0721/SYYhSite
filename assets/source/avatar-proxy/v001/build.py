"""Original draft mannequin; run in a NEW background Blender, never an existing session."""
import bpy, json, math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[4]
dest=Path(__file__).resolve().parent
print('BACKGROUND_INPUT',json.dumps({'file':bpy.data.filepath,'scene':bpy.context.scene.name,'objects':[o.name for o in bpy.context.scene.objects]}))
# This process owns its factory scene; it never reads or alters the interactive Blender file.
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name,color,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=.4
 return m
ivory=mat('Proxy porcelain',(.78,.83,.89));coat=mat('Signal graphite',(.065,.075,.11));blue=mat('Proxy blue',(.04,.26,.62));black=mat('Pupil',(.012,.018,.025));accent=mat('Signal green',(.55,.92,.04))
rig_data=bpy.data.armatures.new('VisitorRig');rig=bpy.data.objects.new('VisitorRig',rig_data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=rig_data.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=rig_data.edit_bones[parent]
bone('Spine',(0,0,1.25),(0,0,1.9))
bone('Head',(0,0,2.08),(0,0,2.65),'Spine')
bone('Eye.L',(-.16,-.365,2.56),(-.16,-.365,2.7),'Head')
bone('Eye.R',(.16,-.365,2.56),(.16,-.365,2.7),'Head')
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
def ellipsoid(name,loc,scale,material,weight='Spine'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=loc)
 o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 for p in o.data.polygons:p.use_smooth=True
 o.data.materials.append(material);g=o.vertex_groups.new(name=weight);g.add(list(range(len(o.data.vertices))),1,'REPLACE');mod=o.modifiers.new('Visitor skin','ARMATURE');mod.object=rig;o.parent=rig
 return o
ellipsoid('Torso',(0,0,1.52),(.56,.27,.6),coat)
ellipsoid('Collar',(0,0,2.01),(.21,.18,.24),ivory,'Head')
ellipsoid('HeadMesh',(0,-.015,2.55),(.39,.34,.49),ivory,'Head')
ellipsoid('HairCap',(0,.015,2.89),(.395,.335,.18),coat,'Head')
ellipsoid('Ear.L',(-.395,0,2.55),(.07,.095,.12),ivory,'Head')
ellipsoid('Ear.R',(.395,0,2.55),(.07,.095,.12),ivory,'Head')
ellipsoid('EyeWhite.L',(-.16,-.327,2.59),(.1,.045,.066),ivory,'Eye.L')
ellipsoid('EyeWhite.R',(.16,-.327,2.59),(.1,.045,.066),ivory,'Eye.R')
ellipsoid('Pupil.L',(-.16,-.367,2.59),(.039,.017,.045),black,'Eye.L')
ellipsoid('Pupil.R',(.16,-.367,2.59),(.039,.017,.045),black,'Eye.R')
ellipsoid('Nose',(0,-.352,2.46),(.052,.056,.08),ivory,'Head')
ellipsoid('Mouth',(0,-.326,2.33),(.09,.015,.011),coat,'Head')
for side in [-1,1]:
 ellipsoid('Sleeve.'+str(side),(side*.57,0,1.5),(.18,.22,.47),coat)
 ellipsoid('Hand.'+str(side),(side*.62,-.025,1.03),(.14,.15,.18),ivory)
 ellipsoid('Leg.'+str(side),(side*.21,.02,.57),(.21,.22,.55),coat)
 ellipsoid('Shoe.'+str(side),(side*.21,-.13,.12),(.22,.34,.12),blue)
ellipsoid('SignalBadge',(0,-.266,1.66),(.10,.015,.04),accent)
bpy.context.scene.world=bpy.data.worlds.new('Studio');bpy.context.scene.world.use_nodes=True;next(n for n in bpy.context.scene.world.node_tree.nodes if n.type=='BACKGROUND').inputs[0].default_value=(.08,.11,.19,1)
def light(name,loc,power,color,size):
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.8))-o.location).to_track_quat('-Z','Y').to_euler()
light('Key',(3,-4,5),550,(.73,.84,1),4);light('Fill',(-3,-3,3),400,(.9,1,.8),3);light('Rim',(0,2,4),650,(.25,.5,1),3)
cam=bpy.data.cameras.new('PosterCamera');obj=bpy.data.objects.new('PosterCamera',cam);bpy.context.collection.objects.link(obj);obj.location=(2.4,-7,3.05);obj.rotation_euler=(Vector((0,0,1.75))-obj.location).to_track_quat('-Z','Y').to_euler();cam.type='ORTHO';cam.ortho_scale=3.5;bpy.context.scene.camera=obj
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=600;scene.render.resolution_y=800;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
media=root/'public/media';media.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(dest/'avatar-proxy.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
 if o.type in ['MESH','ARMATURE']:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(media/'avatar-proxy.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True)
scene.render.filepath=str(media/'avatar-poster.png');bpy.ops.render.render(write_still=True)
(dest/'rig-map.json').write_text(json.dumps({'model':'/media/avatar-proxy.glb','bones':{'spine':'Spine','head':'Head','eyes':['Eye.L','Eye.R']},'kind':'original draft proxy, identity not final','limitsDegrees':{'headYaw':18,'headPitch':10,'spineYaw':4}},indent=2))
print('OUTPUT',json.dumps({'objects':len(scene.objects),'bones':[b.name for b in rig_data.bones],'glbBytes':(media/'avatar-proxy.glb').stat().st_size,'poster':str(media/'avatar-poster.png')}))
