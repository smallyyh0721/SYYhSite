> 当前执行（2026-10-12）：P1已交付；用户已批准v3并要求开始P2入口/全屏四岛修正，延续GitHub交付和云端draft Docker更新。当前事实与缺口见 [P2交接](../agent-work/phases/P2/handoff.md)。P3–P5未启动；下文未同步部分为原规划，当前代码/交接和最新用户要求优先。

# ChatGPT × Grok CLI 协作方案

Docker与服务器工作沿用相同分工：ChatGPT维护Dockerfile/Compose、生产镜像验证、版本与回滚、SSH部署和最终复核；Grok负责研究与已分配的一般模块。部署流程见 [06-development-deployment.md](06-development-deployment.md)。本轮未启动这两位agent执行实施。

按 [五阶段计划](07-phased-plan.md) 分配工作：P1/P2先draft与修正，P3集中素材，P4正式集成和所授权部署，P5具体补丁。当前阶段未启动。用户只启动一个阶段时不自动执行后续阶段；授权连续阶段则按其范围推进。

## 两个主要 agent

| 工作 | ChatGPT / lead | Grok CLI |
|---|---|---|
| 统筹与设计 | 决策状态、任务拆分、接口冻结、视觉定稿 | 研究记录与建议，不自动覆盖已定需求 |
| 图片 | 全部图片生成、修改与实际成图检查 | 搜索参考/可用辅助素材，不接图片生成 |
| Blender | 连接检查、模型、绑定、渲染、GLB、网页检验 | 资料/许可/建模参考搜集，必要的非核心处理脚本 |
| 核心代码 | 架构、路由/History、theme、旅行、人物控制、播放器缓存、API/DB | 按冻结契约开发普通展示组件与页面内容 |
| 验证 | 集成、浏览器、性能、降级、数据持久化和最终验收 | 对自己任务做类型/样例/必要行为自检并记录 |
| 交付 | 合并/接受任务、完整预览、构建与上线配置 | 文件清单、命令/输出、来源和遗留问题 |

ChatGPT对最终结果负责；Grok的“完成”表示等待lead复核，不能自动当成合格。可在两份任务互不依赖时并行开展，核心接口有变化则先记录并交接。

## 文件归属与并发

ChatGPT专属共享文件：根package.json、pnpm-lock.yaml、workspace配置、next/ts配置、tokens及generator、app路由、src/state、src/lib/contracts、核心world/avatar/sequence、API/DB/deploy。Grok不为一个页面自行修改这些文件或加依赖，需要时在交接中列出建议，由lead执行。

Grok任务限定文件集，例如 `src/features/works/**` 与其局部CSS；UI与About可独立成任务。禁止两个agent同时改同一个文件。任务开始前记录owner、allowlist、接口版本；完成后释放归属。

优先在同一仓库以不重叠文件合作，便于现有本机工具使用。需要完全隔离时由lead建立合适Git worktree并明确路径/基线；当前不是新增worktree要求。先检查已有dirty文件，保留用户修改；不执行reset/clean、覆盖原型或批量删除历史资产。提交/推送/发布根据当次用户指令，不凭任务模板推定授权。

## 任务状态

`pending → assigned → in_progress → ready_for_review → accepted`；确实等待用户素材为 `waiting_input`，失败为 `needs_fix`。初始化队列见 [tasks.json](tasks.json)，本轮没有任务进入实施状态。

**lead单独维护公共tasks.json。** Grok在 `docs/agent-work/reports/<task-id>.md` 提交状态与报告，避免并发改队列。每次分配写 `docs/agent-work/assignments/<task-id>.md`，至少包含：目标、owner、依赖、输入、允许修改的绝对/项目相对路径、禁止改动的共享接口、验收条件、当前contract版本。

报告格式：实际完成内容；文件列表；实际运行命令和结果；输入事实/来源；视觉或运行证据路径；未完成/失败；接口或依赖变更建议。没有运行就写未运行，不能写“理论上通过”。lead接收后审差异、跑必要集成测试、更新tasks与资产状态。修复只重跑受影响验证。

## 本机工具

| 工具 | 已检查状态 / 用法 |
|---|---|
| Grok | `C:/Users/yonghao.yu/.grok/bin/grok.exe`，1.0.46；已读取 `--help` 与 `agent --help` |
| Grok单任务 | 顶层 `--cwd`、`-p/--single`、`--output-format`、`--no-subagents` 在本机帮助中存在；非交互prompt用顶层 `-p`，不虚构 `grok agent --prompt` |
| Blender | `C:/Program Files/Blender Foundation/Blender 4.5/blender.exe`，4.5.13 LTS；不在PATH仍可用绝对路径 |
| Blender skill | `D:/social_impact/mymovie/.agents/skills/blender-codex/SKILL.md`，原地读取；技术验证目录为previs_test / previs_walk_3s / previs_walk_15s |
| Blender MCP | 工具已暴露；本轮addon状态检查未连通。建模启动时检查运行中的Blender插件与当前工程 |

本轮只确认CLI可执行和help，不代表Grok登录、搜索网络或编码任务已经实际验收。运行时若认证或网络失败，记录实际错误，保留其他可继续任务；不重新安装已可用工具来代替诊断。

### 启动Grok研究任务

用户发起后续实施/研究时，可使用以下PowerShell命令。提示词文件是UTF-8，多行作为一个参数传入，无需拼shell字符串：

阶段内先由lead写明当前phase/task-id的研究assignment，再启动下述命令；用户明确要求独立研究时按其范围执行。研究模板不能自动接管五个阶段或提前做所有素材。

```powershell
$taskPromptPath = 'D:\dev\yyh_server\SYYhSite\docs\agent-handoff\prompts\grok-research.md'
$taskPromptText = Get-Content -LiteralPath $taskPromptPath -Raw -Encoding utf8
& 'C:\Users\yonghao.yu\.grok\bin\grok.exe' --cwd 'D:\dev\yyh_server\SYYhSite' --no-subagents -p $taskPromptText
```

一般编码同理换 `grok-coding.md`，但必须先存在lead的任务assignment，不能让Grok自行接管全部代码。交互模式可直接启动 `grok --cwd ...` 并输入同一提示词。单次模式的输出是任务结果，不应假设它会持续守候新任务；后续通过新调用或已确认的resume方式接续。

不固定Grok模型ID或reasoning选项，沿用用户配置；不读取或输出认证凭据。模型/CLI能力以当前help为准。两个主agent是本项目协作安排，本包未实际启动任何额外agent。

## Grok按阶段研究内容

1. P1-03/P2：访问四参考站，按1440/390截图与实际可操作内容记录入口、旅行、作品、阅读和滚动；失败如实记录，不拿HTTP200当动画验收。
2. 对照现有 `docs/reference-notes.md` 补研究缺口，不再次无条件照搬旧“云端全被阻止”状态。
3. P3-05：从作者/官方源搜字体、必要HDRI/纹理/短音效，输出可用候选与许可原文地址；未分配P3时不自动开展大批正式素材任务。
4. 查本机所选前端/模型压缩工具兼容文档，给出依赖建议；不为研究任务安装全套生产依赖。
5. P3-06及后续内容补丁：用户真实资料只做结构化整理；缺少就列缺口，不网上拼凑用户身份。

## 变更与风险处理

主题、四岛绑定、人物、world renderer等决定分别记录。已确认的选择不重复请求；未定资产只影响其正式制作，其他任务继续。用户新指令优先，lead同步docs/decisions与对应任务，不让Grok继续按旧接口返工。

发现重大设计/数据/资源问题由Grok交给lead，lead修正方案或具体实现并提供可审查结果。核心行为不靠“先做完后再猜”：未聚焦点击、主题闪烁、History返回、骨骼叠加、留言审核隔离、资源生命周期均在早期验证。
