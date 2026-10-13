> 最新执行（2026-10-13）：第一版最后调整正在验证/发布。CONNECT呼吸闪烁；About真3D人物鼠标跟随；HELLO STRANGER禁用跟随，后续换伸手视频。背景本轮仅分析，补素材后的下一版才改进。以[P2当前交接](../agent-work/phases/P2/handoff.md)、[P2-09报告](../agent-work/reports/P2-09.md)、[下一版素材方案](../agent-work/background-next-version.md)为准。此前六项菱形/触摸/主题作品保留，P3–P5未启动。


# SYYH Signal · 完整设计与实施交接包

版本：2026-10-13 / handoff-v2（五阶段整合版，含P2迭代验收）。适用项目：`D:/dev/yyh_server/SYYhSite`。

本包汇总设计方案、第一版实施及验收，供后续 ChatGPT 与 Grok CLI 接续工作。**用户已授权P1/P2实施与云端draft，当前执行以P2交接为准。** 正式人物与真实内容等未定项继续记录为缺口，不阻塞已授权的第一版修正。

## 阅读顺序

**完整入口是 [complete-plan.md](complete-plan.md)**，已合并部署正文与五阶段计划。后续先看阶段目标与边界，再查对应技术细节；分册是同一内容的维护源，无需把部署视为另一个项目。

| 文件 | 用途 |
|---|---|
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
| [tasks.json](tasks.json) | 33项执行队列，含本次P2-06/07增量；记录实际验收状态 |
| [phases.json](phases.json) | 五阶段状态与输入/交接；P1已交付，P2待浏览反馈，P3–P5待执行 |
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
