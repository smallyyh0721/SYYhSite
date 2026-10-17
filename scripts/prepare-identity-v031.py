from pathlib import Path
root=Path(__file__).resolve().parents[1];out=root/'assets/source/avatar-v2/v031';out.mkdir(exist_ok=True)
code=(out.parent/'v030/refine-identity.py').read_text(encoding='utf-8')
code=code.replace('floor=1.682-.10*distance','floor=1.679-.100*distance**1.7')
start=code.index("mix=nt.nodes.new('ShaderNodeMixRGB')")
extra="""
# Remove only photographic sclera brightness across the lid while preserving dark liner.
largeX=calc('DIVIDE',calc('SUBTRACT',calc('ABSOLUTE',x),.0302),.027)
largeZ=calc('DIVIDE',calc('SUBTRACT',z,1.5815),.014)
largeR=calc('ADD',calc('MULTIPLY',largeX,largeX),calc('MULTIPLY',largeZ,largeZ))
area=calc('MULTIPLY',calc('LESS_THAN',largeR,1.2),calc('LESS_THAN',y,-.09))
luma=nt.nodes.new('ShaderNodeRGBToBW');nt.links.new(tex.outputs['Color'],luma.inputs[0])
bright=calc('MINIMUM',1,calc('MAXIMUM',0,calc('MULTIPLY',calc('SUBTRACT',luma.outputs[0],.34),5)))
mask=calc('MAXIMUM',mask,calc('MULTIPLY',area,bright))
"""
code=code[:start]+extra+code[start:]
(out/'refine-identity.py').write_text(code,encoding='utf-8')
