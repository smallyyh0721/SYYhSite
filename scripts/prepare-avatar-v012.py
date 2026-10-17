from pathlib import Path
root=Path(__file__).resolve().parents[1];folder=root/'assets/source/avatar-v2/v012';folder.mkdir(exist_ok=True)
code=(folder.parent/'v011/fix-lid-albedo.py').read_text(encoding='utf-8').replace('(.64,.49,.43,1)','(.38,.26,.22,1)').replace('V011','V012')
(folder/'fix-lid-albedo.py').write_text(code,encoding='utf-8')
