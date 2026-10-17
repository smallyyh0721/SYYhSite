import json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
def read(path): return json.loads((root/path).read_text(encoding='utf-8-sig'))
def save(path,data): (root/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
preview=read('design/v2-material-preview/v001/manifest.json')
cos=next(a for a in preview['assets'] if a['id']=='island-home')
cos.update(approvedByUser=True,reviewStatus='approved-concept',approvalSource='User chat 2026-10-14: 通过，按 v003 制作并接入')
preview.update(reviewStatus='all-concepts-approved-formal-production-started',formalIntegrationStarted=True)
save('design/v2-material-preview/v001/manifest.json',preview)
phases=read('docs/agent-handoff/phases.json')
phases['currentPhase']='P4';phases['nextPlannedPhase']='P5'
for phase in phases['phases']:
    if phase['id']=='P3':phase['executionOutcome']='All concepts accepted including COS v003. Day/night island images, portrait environments and separate cloud layers produced; formal avatar/animation in progress, not complete.'
    if phase['id']=='P4':
        phase.update(status='in_progress',executionOutcome='P4-08/09/10 engineering accepted with 9/22/14 independent browser checks and typecheck. Avatar first model requires visual refinement; real GLB/greeting films/production validation remain pending. Full user goal remains active.')
        for task in ['P4-08','P4-09','P4-10']:
            if task not in phase['tasks']:phase['tasks'].append(task)
save('docs/agent-handoff/phases.json',phases)
tasks=read('docs/agent-handoff/tasks.json')
for id,title,status in [('P4-08','正式网站画廊与大图浏览','accepted'),('P4-09','四岛分层世界与一次性招呼播放器','accepted'),('P4-10','全站圆润视觉与真实留白','accepted')]:
    current=next((t for t in tasks['tasks'] if t['id']==id),None)
    record={'id':id,'phaseId':'P4','title':title,'owner':'grok','status':status,'dependsOn':[],
        'inputGates':[],'optional':False,'conditionalDependsOn':[],
        'assignmentPath':f'docs/agent-work/assignments/{id}.md','reportPath':f'docs/agent-work/reports/{id}.md',
        'acceptance':'Complete module, actual-state browser validation and Codex independent review',
        'acceptanceReference':'docs/agent-work/v2-build-plan.md'}
    if current:current.update(record)
    else:tasks['tasks'].append(record)
save('docs/agent-handoff/tasks.json',tasks)
scores=read('docs/agent-work/grok-scorecard.json')
if not any(r['taskId']=='P4-08' for r in scores['records']):
    scores['records'].append({'taskId':'P4-08','kind':'programming-module','module':'Runtime gallery and shareable image viewer',
        'model':'grok-4.6-build','reasoningEffort':None,'sessionId':'01a139e9-0b6f-7432-83bb-efd56f85f252',
        'reviewedAt':'2026-10-14','retrospective':False,
        'ratings':{'correctness':5,'understanding':5,'efficiency':None,'cliWorkflow':4,'communication':5},
        'coverageWeight':85,'score':97.65,'trendEligible':True,'firstSubmissionAccepted':True,'repairRounds':0,
        'wallClockSeconds':1683,'effectiveCodingSeconds':None,'budgetSeconds':1500,
        'scoreStatus':'Actual-asset browser review complete; wall time includes testing/waits; effort unverified',
        'evidence':['reports/P4-08.md','evidence/P4-08/acceptance.md','evidence/P4-08/lead-live/checks.json'],
        'rationale':'Nine real-art browser checks passed including visible Forward restoration and refresh/detail/list context; no lead implementation patch. Test stale-asset assumption, lead script syntax and hydration timing excluded. Exact model from CLI end; report metadata incomplete.'})
scores['delegation']['availability']='P4-08, P4-09, P4-10 engineering accepted; no active Grok CLI'
scores['delegation']['lastDecision']='Keep standard two modules per batch and one active CLI. Only two same-model grok-4.6-build coding records; do not pool grok-4.7-build as a trend.'
save('docs/agent-work/grok-scorecard.json',scores)
decisions=read('docs/agent-handoff/decisions.json')
item=next(d for d in decisions['requirements'] if d['id']=='v2-user-authored-asset-directions-2026-10-14')
item['value']['islands']['home']='COS / COSPLAY / approved v003 half-cutaway floating Infinity Castle; formal runtime use authorized'
item['value']['acceptedConcepts']=[a['id'] for a in preview['assets']]
decisions['executionScope']='Complete approved second-version artwork, necessary model/animation and runtime integration; user missing content remains blank/placeholders. Continuous P3/P4 authorized by active goal.'
save('docs/agent-handoff/decisions.json',decisions)
print(json.dumps({'phase':phases['currentPhase'],'approvedConcepts':len(preview['assets']),
    'runtimeImages':len(read('assets/source/v2/v001/runtime-manifest.json')['assets']),
    'galleryChecks':len(read('docs/agent-work/evidence/P4-08/lead-live/checks.json')['checks'])}))
