import bpy
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Preserve revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v024/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];hair=bpy.data.objects['LongBlackHair']
bpy.ops.object.select_all(action='DESELECT');hair.select_set(True);bpy.context.view_layer.objects.active=hair
m=hair.modifiers.new('Straight hair surface resolution','SUBSURF');m.subdivision_type='SIMPLE';m.levels=2;m.render_levels=2;bpy.ops.object.modifier_apply(modifier=m.name)
bpy.context.view_layer.update();deps=bpy.context.evaluated_depsgraph_get();evaluated=body.evaluated_get(deps)
surface=BVHTree.FromPolygons([v.co for v in evaluated.data.vertices],[list(p.vertices) for p in evaluated.data.polygons])
for v in hair.data.vertices:
    p=v.co
    if p.z<1.52 and p.y<-.015:
        hit,normal,face,distance=surface.ray_cast(Vector((p.x,-1,p.z)),Vector((0,1,0)),2)
        if hit:p.y=min(p.y,hit.y-.018)
hair.data.update();mat=hair.data.materials[0];nt=mat.node_tree;nt.nodes.clear();p=nt.nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.60;p.inputs['Specular IOR Level'].default_value=.10
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(out/'hair-atlas.png'));tex.image.pack();nt.links.new(tex.outputs['Color'],p.inputs['Base Color']);nt.links.new(tex.outputs['Alpha'],p.inputs['Alpha']);dest=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(p.outputs[0],dest.inputs[0]);mat.surface_render_method='DITHERED';mat.use_transparency_overlap=False
scene.eevee.taa_render_samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
scene.render.filepath=str(out/'about-day.png');bpy.ops.render.render(write_still=True)
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.035,.05,.085,1)
for o in scene.objects:
    if o.type!='LIGHT':continue
    if 'key' in o.name:o.data.color=(.52,.68,1);o.data.energy=100
    elif 'fill' in o.name:o.data.color=(.35,.50,.83);o.data.energy=45
    else:o.data.color=(.70,.83,1);o.data.energy=95
scene.render.filepath=str(out/'about-night.png');bpy.ops.render.render(write_still=True)
print('STRAIGHT_HAIR_TEXTURE_SOURCE_READY')
