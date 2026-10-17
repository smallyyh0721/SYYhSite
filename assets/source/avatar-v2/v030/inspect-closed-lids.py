import bpy
from pathlib import Path
out=Path(__file__).resolve().parent;bpy.ops.wm.open_mainfile(filepath=str(out/'visitor-source.blend'))
body=bpy.data.objects['VisitorBody'];body.data.shape_keys.key_blocks['Blink'].value=1
for o in bpy.context.scene.objects:
    if o.name.startswith(('EyeWhite','Iris','Pupil','EyeCatchlight')):o.hide_render=True
bpy.context.scene.render.filepath=str(out/'closed-lids-without-eyeballs.png');bpy.ops.render.render(write_still=True)
