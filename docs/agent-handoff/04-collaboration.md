# Codex × Grok CLI 协作方案

2026-10-14操作规则：以[模块委派、评分与接管规则](../agent-work/grok-collaboration-rules.md)和[评分台账](../agent-work/grok-scorecard.md)为准；按表现调整模块任务量，Grok无法响应/继续时Codex接管。下文保留分工和实际模型复盘。

更新：2026-10-13。用户要求框架完成后更多实现交Grok，Codex验收并给可复用反馈。本章替代此前Grok只做普通展示、核心代码一律Codex实现的固定分工。

当前P2网站已部署，运行SHA `e18816aa8195d77c47b1c46c52e438d6050e373a`，ready_for_review。此次仅复盘协作，不改线上、不启动P3–P5。见[P2交接](../agent-work/phases/P2/handoff.md)与[复盘反馈](../agent-work/collaboration-review.md)。

## 实际工作与模型

Codex完成架构/共享契约、路由/主题/History、入口/四岛/人物交互、图片/Blender代理、留言API/SQLite、Docker/Git/云端发布及独立生产/浏览器验收。

| Grok任务 | 实际成果 | 实际模型 | 推理 |
|---|---|---|---|
| P1-03 | Works、WorkDetail、About、Story及CSS | grok-4.6 | high |
| P2-02 | draft状态文案 | grok-4.7 | high |
| P2-06 | 四主题作品组件、入口及文案 | grok-4.7 | high |
| P2-08 | 背景原因、素材与伸手视频方案 | grok-4.7 | high |

来自实际会话summary/events。有效GROK_HOME是 `D:/dev/grok`，其config默认grok-4.7/high；不要误读用户目录~/.grok的配置。证据见[模型记录](../agent-work/evidence/collaboration-review-2026-10-13.json)。本机help支持--model、--reasoning-effort、--resume、--no-subagents。默认沿用用户有效配置，每次报告记录实际参数；需复现时显式传参，不擅自修改全局配置。当前没有模型能力不足的证据。

## 扩大后的职责

| 工作 | Grok主要负责 | Codex负责 |
|---|---|---|
| 功能 | 页面/组件、响应式、可访问性、内容、素材接入、播放器、限定修复 | 需求/设计、架构/接口、独立验收 |
| 已建核心 | 明确任务授权下的World/Avatar/状态逻辑、路由包装与自检 | 冻结约束、差异审查、跨模块集成 |
| 测试/工具 | 可复跑脚本、manifest校验、截图与实际报告 | 覆盖范围、关键流程复核、证据判断 |
| 研究/素材 | 来源/许可、技术方案与预算 | 图片生成、Blender模型/动作/渲染、视觉定稿 |
| 共享基础/发布 | 依赖/schema/配置变更建议 | 共享契约/全局状态、锁文件、数据库迁移/数据操作、Git/Docker/云端发布 |

新增编码默认先评估由Grok完整实现。World、Avatar、app路由不再按目录永久排除；assignment具体授权文件与行为。跨模块和共享基础由Codex统筹，小修不增加多余审批。

素材准备好后的候选：分层背景renderer及暂停/后台/reduce；GreetingVideo的poster/ended/skip/超时/失败；作品/故事展示；素材与行为校验。这里只规划，尚未启动。素材生产继续Codex负责。

## 交付闭环

1. Codex建立assignment：task-id、基线SHA、目标、allowlist、依赖/接口、正反例、检查脚本和证据目录。
2. Grok核对dirty，简短复述目标/约束/拟改文件；区分用户目标、源码快照、已验收事实。明确任务自主实施；仅关键缺口向lead澄清，继续独立工作。
3. Grok完成代码、自检与ready_for_review报告：基线/完成时SHA、session/model/effort、文件、可复跑命令、关键流程/主题/宽度矩阵、截图、失败/未验证。
4. Codex审diff并做必要独立验收。typecheck不替代交互，dev不替代生产，transform变化不替代肉眼可见动态，断言总数不替代流程覆盖。
5. 合格则更新队列/按授权交付；有问题给结构化反馈，Grok先自行修正并复测受影响行为。

用[任务书与反馈模板](prompts/task-assignment-template.md)建立后续任务。既有API handler/展示接入也可在冻结接口下明确委派；schema迁移和线上数据操作继续Codex负责。

一个文件同时仅一个owner。任务开放自己的组件/CSS、必要路由包装、报告和 `docs/agent-work/evidence/<task-id>/`；需要脚本则授权具体路径，避免临时证据不可复跑。共享CSS影响范围写清，新模块优先局部CSS。事实文案等核心依赖完成后核对，独立组件可先实现。

## 反馈方式

每条反馈写ID/严重程度、需求原文、观察/位置、复现证据、期望、建议和修复验收。区分bug/遗漏、任务书歧义、未授权部分、并发快照和新需求，不把lead问题归为Grok能力。

缺少证据目录仅影响该目录写入，不否定已运行检查、不阻塞独立实现；基线可从HEAD/dirty自行记录，真实接口或语义冲突才阻塞相关部分。通常最多两轮Grok修正；同类错误重复、共享基础必须调整或交付被阻塞时Codex接手，记录原因与最终差异。相关经验进入[反馈记录](../agent-work/collaboration-review.md)，新assignment只引用相关反馈ID。公共tasks/phases/decisions由Codex维护，Grok只写授权产物和报告。

## 调用

当前已核验配置的示例：

```powershell
$taskPromptText = Get-Content -LiteralPath 'docs/agent-work/assignments/<task-id>.md' -Raw -Encoding utf8
& 'C:/Users/yonghao.yu/.grok/bin/grok.exe' --cwd 'D:/dev/yyh_server/SYYhSite' --model grok-4.7 --reasoning-effort high --permission-mode auto --no-subagents -p $taskPromptText
```

返修使用实际session ID加--resume，不猜最近会话，不带--restore-code覆盖已有代码。模型/effort从有效配置和实际会话核验，认证不进入报告。

Blender前原地读 `D:/social_impact/mymovie/.agents/skills/blender-codex/SKILL.md` 并检查工程/连接。部署继续按[部署流程](06-development-deployment.md)与用户授权；委派扩大不自动启动下一阶段。
