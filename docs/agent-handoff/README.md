# SYYH Signal · 完整设计与实施交接包

最新发布：2026-10-15用户已明确授权将当前版本发布正式环境。[正式站](http://124.220.190.120/)运行`9f9764d7970999e6749ec0780e0b5b6794ef89f9`，欢迎为原画动态图片。Linux候选/公网各24网站+6欢迎+3安全检查通过，34公网素材hash匹配，现有留言卷/数据保留且已备份。见[发布报告](../agent-work/reports/P4-06.md)与[部署事实](deployment-facts.json)。下方本地审核／未发布说明为此前历史。

2026-10-15最新修正：用户要求欢迎招呼放弃3D，使用已通过人物原画的动态图片。仅P5-06模块已获授权，当前实施/生产验收见[P5交接](../agent-work/phases/P5/handoff.md)。以下P4欢迎v037是历史工程记录，不代表用户接受其视觉效果；About本次保持现状，未发布公网。

当前交付（2026-10-15）：第二版所选P3/P4工作已完成并可审核。COSv003、日夜四岛/独立云层、v034真实人物和v037欢迎动画、正式画廊/全站视觉已接入；31素材严格检查及Windows/Linux各31回归通过。以[P4当前交接](../agent-work/phases/P4/handoff.md)、[完成报告](../agent-work/reports/v2-integration-complete.md)、[可编辑审核反馈](../agent-work/v2-integration-review.md)为准。

[本地生产审核站](http://localhost:8896/)；开发站8895与原素材预览8894保留。公开站仍是P2运行SHA e18816aa8195d77c47b1c46c52e438d6050e373a，未commit/push/public更新。P3/P4 ready_for_review，未自行启动P5。真实作品、个人/故事/联系方式及未选品牌/字体继续留白。

用户概念预览全部通过，包括“COS通过，按v003制作并接入”；正式模型/动作源可编辑，当前机器状态见tasks/phases/asset-manifest。Grok完成P4-08…12完整代码模块，Codex完成图像/Blender、集成、独立验收；当前没有活跃CLI，下一批最多2完整模块、默认1个CLI。

下方分册包含2026-10-12/13原五阶段方案及P1/P2历史基线，后续执行不能将旧“未启动/素材待制作”当当前状态。执行队列现为44项，仅新增明确请求的P5-06欢迎修正，不启动未授权发布或其他P5类别。

## 阅读顺序

**完整入口是 [complete-plan.md](complete-plan.md)**，已合并部署正文与五阶段计划。后续先看阶段目标与边界，再查对应技术细节；分册是同一内容的维护源，无需把部署视为另一个项目。

| 文件 | 用途 |
|---|---|
| [当前方案、素材缺口与下一版安全计划](../agent-work/current-baseline-next-version.md) | 2026-10-14实际代码/公网核对；下一版素材升级、安全加固、优先级与验收 |
| [第二版素材清单、四岛review与作品布局](../agent-work/v2-asset-gap-checklist.md) | 本轮最新美术方向、完整占位缺口、岛名候选、RyuSe1观察与新版布局 |
| [07-phased-plan.md](07-phased-plan.md) | 用户指定的五阶段：draft、修正、素材、正式建设、正式修补 |
| [01-design.md](01-design.md) | 全站设计、页面、日夜主题、四岛、交互与待定项 |
| [02-implementation.md](02-implementation.md) | 架构、技术选型、模块与接口、数据、性能及部署 |
| [03-assets.md](03-assets.md) | 全量素材清单、图片生成、Blender 制作、搜索与验收 |
| [04-collaboration.md](04-collaboration.md) | 两个 agent 的职责、文件归属、任务交接和本机工具 |
| [05-taskboard.md](05-taskboard.md) | 五阶段31项任务、依赖、完成定义与验收矩阵 |
| [06-development-deployment.md](06-development-deployment.md) | 已指定Ubuntu服务器、本机Linux容器验证、Git/镜像交付、Compose与回滚 |
| [deployment-facts.json](deployment-facts.json) | 最新本机/云端发布与验收事实，保留历史版本，区分已验证与未验证 |
| [complete-plan.md](complete-plan.md) | 以上全部正文的单文件合订本，便于连续阅读与交接 |
| [decisions.json](decisions.json) | 明确要求、建议方案及未定决定，便于 agent 读取 |
| [asset-manifest.json](asset-manifest.json) | 已有资产与拟制作资产的状态、用途、责任人与路径 |
| [tasks.json](tasks.json) | 44项执行队列，含P2/P3/P4增量及P5-06；以实际状态为准 |
| [phases.json](phases.json) | 五阶段状态与输入/交接；当前仅P5-06修正完成待视觉审核，其他P5未启动 |
| [prompts/chatgpt-lead.md](prompts/chatgpt-lead.md) | ChatGPT 统筹 agent 启动提示词 |
| [prompts/grok-research.md](prompts/grok-research.md) | Grok 首轮资料与素材研究提示词 |
| [prompts/grok-coding.md](prompts/grok-coding.md) | Grok 一般编码任务提示词 |

## 设计图入口

- [全站初稿画廊](../../design/review-v1/index.html)：入口、Hub、四频道、详情、手机与开场分镜。
- [Day / Night 与四岛画廊](../../design/review-v2/index.html)：双主题和四张岛屿概念图。
- [可视交接首页](index.html)：直接用浏览器打开，汇总文档与关键图片。

**阅读旧图时的修正：** VISITOR ACCESS 右侧线稿人物只是占位，正式需求为可跟随鼠标的真实 3D 人物，形象后续设计。Hub 四岛必须有四种指定风格，但完整 3D 世界仍是可选方案。旧图的示例作品、个人资料、账号和留言不代表用户事实。

## 当前可直接复用的成果

全站 1440px 设计图、390px 手机版关键视图、开场分镜；四岛各一张 Day/Night 双联概念图；候选双主题 tokens 与对比检查；图像生成提示词；品牌与组件设计资料；参考站研究记录；入口 3D 人物交互说明。详见素材清单，图片并不等于 GLB 或已实现交互。

参考站地址与研究状态见 [原研究报告](../reference-notes.md)。本包不把源码阅读当作已实测全部浏览器动画；Grok 任务包含补齐实际桌面/手机观察。

## 用户确定的工作分工

**ChatGPT：** 统筹、设计判断、图片生成、使用本机 Blender 做模型/渲染、核心代码、集成与最终验证。

**Grok CLI：** 搜集素材/信息、记录来源与使用条件、完成已划定接口的一般编码，并提交可复现的自检结果。

图片生成由 ChatGPT 完成，不把生成任务交给 Grok。已有 Blender 技术工作流原地复用，不复制 `D:/social_impact` 的人物、影片、凭据或完整资料库。

## 尚需输入或选择

| 项目 | 状态 | 影响 |
|---|---|---|
| 入口人物形象、服装、风格、半身/全身 | 待后续设计 | 暂不能制作正式角色；可先完成代理模型与控制器 |
| 四岛 → 四个主题作品 | 用户已在2026-10-13指定 | 已按themeId建立四个独立作品合集；About/Story/Board只在顶部菜单 |
| 四岛完整 3D / 2.5D | 未确定 | 先统一 WorldAdapter 接口；推荐先做 2.5D 可用基线，3D 经选择后增加 |
| 用户真实作品、简介、时间线、联系方式 | 未提供完整资料 | 页面结构可先做，生产发布需真实内容或诚实空状态 |
| Story 的具体故事 | 待设计 | 先实现关键帧阅读与播放器接口，不预制整套序列 |
| Docker部署目标 | 已指定 `ubuntu@124.220.190.120` / Ubuntu24.04 / linux/amd64 | 优先本机验证+Git固定输入+云端构建；镜像交付按带宽/构建实测选择，详见06 |
| 域名、镜像仓库、公开发布 | 未指定或未验证 | 可以准备本地构建与部署配置，实际发布另按用户指令 |

只有对应的最终素材或部署依赖这些决定；工程骨架、主题、导航、一般页面、接口及代理验证均可独立推进。

阶段1/2使用现有概念和明确的开发占位验证运行流程；阶段3集中补正式素材；阶段4完成正式集成与生产交付；阶段5处理当次补丁。启动指定阶段默认只执行该阶段，连续阶段按用户明确范围推进。P1已交付，当前按用户六项反馈完成P2增量；P3–P5未启动。

## 文档优先级与证据

用户最新明确指令 > 本包明确要求与决策状态 > `visitor-avatar-plan.md` > v2 增量 > v1 > 原始品牌/草稿。`docs/HANDOFF.md` 是历史云端交接，保留参考地址，其“从未读取参考站”已被后续研究部分更新。`prototype/` 是历史设计演示，不是正式实现。

本轮检查：Blender 可执行文件为 4.5.13 LTS；Grok CLI 为 1.0.46；已读本机 Blender skill 及早期验证 README。当前 Blender MCP 状态检查未连通，**不代表建模能力不存在**，也不是重新安装要求。下次建模先检查实际工程与插件连接。本轮未运行网站构建、浏览器验收或新模型验收。

部署补充：已读取引用服务器任务和 `D:/dev/yyh_server/server.md`，再次SSH只读确认云端Docker/Compose与空容器状态。本机WSL2 Ubuntu已存在，但Docker运行能力尚未验证；完整流程和边界见06。未安装或部署。

2026-10-13协作复盘：[实际模型与任务反馈](../agent-work/collaboration-review.md)；[新协作规则](04-collaboration.md)；[任务/反馈模板](prompts/task-assignment-template.md)。后续更多完整实现交Grok，Codex验收与反馈。

2026-10-14：[模块委派/评分/接管规则](../agent-work/grok-collaboration-rules.md) · [持续评分台账](../agent-work/grok-scorecard.md)。AGENTS.md/agent.md接入同一份操作规则；全局skill待项目证据达标后评估。
