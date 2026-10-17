import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
path=root/'docs/agent-work/grok-scorecard.json';data=json.loads(path.read_text(encoding='utf-8'))
if not any(r['taskId']=='P4-11' for r in data['records']):
    data['records'].append({'taskId':'P4-11','kind':'programming-module','module':'Real avatar consumer and truthful fallback','model':'grok-4.7-build','reasoningEffort':None,'sessionId':'01a13b0b-ebce-7db0-813c-ebc90c0d0178','reviewedAt':'2026-10-15','retrospective':False,'ratings':{'correctness':4,'understanding':4,'efficiency':None,'cliWorkflow':5,'communication':5},'coverageWeight':85,'score':84.71,'trendEligible':True,'firstSubmissionAccepted':False,'repairRounds':1,'effectiveCodingSeconds':None,'budgetSeconds':1500,'evidence':['reports/P4-11.md','evidence/P4-11/acceptance.md','evidence/P4-11/lead/checks.json'],'rationale':'30 independent fixture/fallback browser checks,9 unit tests,typecheck pass; framing required one local repair. Actual character art acceptance remains separate; no lead product patch.'})
data['updatedAt']='2026-10-15'
data['delegation'].update(level=3,name='expanded',modulesPerBatch=3,availability='P4-08 through P4-11 engineering accepted; real avatar media still owned Codex',lastDecision='First complete same-model grok-4.7-build window P4-09/10/11: 93.34 at identical 85% rated weight. First-window >=90 raises batch maximum 2 to3; default remains one active CLI. Efficiency unmeasured and global skill still unqualified.')
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
path=root/'docs/agent-handoff/tasks.json';data=json.loads(path.read_text(encoding='utf-8'))
key=next(k for k,v in data.items() if isinstance(v,list) and any(isinstance(t,dict) and t.get('id')=='P4-10' for t in v))
if not any(t.get('id')=='P4-11' for t in data[key]):data[key].append({'id':'P4-11','phaseId':'P4','title':'正式人物实时展示与真实降级','owner':'grok','status':'accepted','dependsOn':[],'inputGates':[],'optional':False,'conditionalDependsOn':[],'assignmentPath':'docs/agent-work/assignments/P4-11.md','reportPath':'docs/agent-work/reports/P4-11.md','acceptance':'Engineering consumer accepted with fixtures; actual source model visual acceptance pending','acceptanceReference':'docs/agent-work/evidence/P4-11/acceptance.md'})
path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
