from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
folder=root/'assets/source/avatar-v2/v008'
folder.mkdir(exist_ok=True)
code=(folder.parent/'v007/refine-character.py').read_text(encoding='utf-8')
code=code.replace("calc('SUBTRACT',z,1.281),.105", "calc('SUBTRACT',z,1.265),.127")
code=code.replace("calc('GREATER_THAN',z,1.197),calc('LESS_THAN',z,1.222)","calc('GREATER_THAN',z,1.153),calc('LESS_THAN',z,1.18)")
code=code.replace("top=calc('MAXIMUM',cup,band)","top=calc('MULTIPLY',calc('MAXIMUM',cup,band),calc('LESS_THAN',calc('ABSOLUTE',x),.205))")
code=code.replace("bottom=calc('MULTIPLY',calc('GREATER_THAN',z,lower),calc('LESS_THAN',z,1.006))", "bottom=calc('MULTIPLY',calc('MULTIPLY',calc('GREATER_THAN',z,lower),calc('LESS_THAN',z,1.006)),calc('LESS_THAN',calc('ABSOLUTE',x),.197))")
code=code.replace('sub.levels=0;sub.render_levels=0','sub.levels=1;sub.render_levels=1')
code=code.replace(".001*math.cos(u*math.pi)",".0003*math.sin(u*math.pi*9)")
code=code.replace("for i in range(6):", "for i in range(5):")
fringe="""
# Off-centre parted fringe follows the brow and opens above both eyes.
for i in range(7):
    x=.027-i*.010
    lock('Swept fringe %s'%i,[(x,-.065,1.707),(x-.063,-.149,1.684),(-.098-i*.002,-.158,1.617),(-.102-i*.003,-.125,1.50-i*.015)],.008)
for i in range(4):
    lock('Part right fringe %s'%i,[(.028+i*.012,-.064,1.707),(.089+i*.004,-.133,1.675),(.098+i*.005,-.15,1.59),(.116+i*.008,-.131,1.47-i*.023)],.006)
"""
code=code.replace('# Gentle smooth robe',fringe+'\n# Gentle smooth robe').replace('V007_REFINED','V008_REFINED')
(folder/'refine-character.py').write_text(code,encoding='utf-8')
