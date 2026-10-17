"""Refine the same adult identity: swept part and preserved eye makeup.
The previous production candidate stays intact until the rendered revision is reviewed.
"""
import bpy,json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
if (out/'visitor-source.blend').exists():raise RuntimeError('Keep revision')
bpy.ops.wm.open_mainfile(filepath=str(out.parent/'v027/visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];hair=bpy.data.objects['LongBlackHair']
for v in hair.data.vertices:
    p=v.co
    if p.y<-.075 and 1.57<p.z<1.72 and abs(p.x)<.080:
        distance=min(1,abs(p.x+.012)/.092);floor=1.682-.10*distance
        if p.z<floor:p.z=floor
hair.data.update()
# Preserve the illustrated brows/liner rather than erasing a wide ellipse around the eye.
skin=body.data.materials[0];nt=skin.node_tree;nt.nodes.clear();p=nt.nodes.new('ShaderNodeBsdfPrincipled');p.inputs['Roughness'].default_value=.56;p.inputs['Subsurface Weight'].default_value=.06
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(out.parent/'v008/skin-atlas.png'));tex.image.pack();uv=nt.nodes.new('ShaderNodeUVMap');uv.uv_map='MakeHuman CC0 UV';nt.links.new(uv.outputs['UV'],tex.inputs['Vector'])
pos=nt.nodes.new('ShaderNodeNewGeometry');xyz=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(pos.outputs['Position'],xyz.inputs[0])
def calc(op,a,b=None):
    n=nt.nodes.new('ShaderNodeMath');n.operation=op
    for i,v in enumerate([a,b] if b is not None else [a]):
        if isinstance(v,(int,float)):n.inputs[i].default_value=v
        else:nt.links.new(v,n.inputs[i])
    return n.outputs[0]
x,y,z=[xyz.outputs[i] for i in range(3)]
xx=calc('DIVIDE',calc('SUBTRACT',calc('ABSOLUTE',x),.0302),.0145);zz=calc('DIVIDE',calc('SUBTRACT',z,1.5815),.0065)
rad=calc('ADD',calc('MULTIPLY',xx,xx),calc('MULTIPLY',zz,zz));mask=calc('MULTIPLY',calc('MINIMUM',1,calc('MAXIMUM',0,calc('MULTIPLY',calc('SUBTRACT',1.3,rad),2))),calc('LESS_THAN',y,-.09))
mix=nt.nodes.new('ShaderNodeMixRGB');nt.links.new(mask,mix.inputs[0]);nt.links.new(tex.outputs['Color'],mix.inputs[1]);mix.inputs[2].default_value=(.38,.26,.22,1);nt.links.new(mix.outputs[0],p.inputs['Base Color']);dest=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(p.outputs[0],dest.inputs[0])
atlas=bpy.data.images.new('Refined visitor albedo',width=2048,height=2048,alpha=False);n=nt.nodes.new('ShaderNodeTexImage');n.image=atlas;nt.nodes.active=n
scene.render.engine='CYCLES';scene.cycles.samples=1;scene.render.bake.use_pass_direct=False;scene.render.bake.use_pass_indirect=False;scene.render.bake.use_pass_color=True
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.object.bake(type='DIFFUSE');atlas.filepath_raw=str(out/'skin-atlas.png');atlas.file_format='PNG';atlas.save();atlas.pack();nt.links.new(uv.outputs['UV'],n.inputs['Vector']);nt.links.new(n.outputs['Color'],p.inputs['Base Color'])
scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=96
bpy.ops.wm.save_as_mainfile(filepath=str(out/'visitor-source.blend'))
for blink in [0,1]:
    body.data.shape_keys.key_blocks['Blink'].value=blink;scene.render.filepath=str(out/('face-%s.png'%blink));bpy.ops.render.render(write_still=True)
print('IDENTITY_REFINEMENT_RENDERED')
