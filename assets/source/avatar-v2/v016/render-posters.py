import bpy,json
from pathlib import Path
from mathutils import Vector
out=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(out/'visitor-source.blend'))
scene=bpy.context.scene;body=bpy.data.objects['VisitorBody'];rig=bpy.data.objects['VisitorRig']
code=(out/'finish-source.py').read_text(encoding='utf-8');exec(compile(code[code.index('# Actual poster render'):],str(out/'finish-source.py'),'exec'))
