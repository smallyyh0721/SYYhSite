# SYYH Signal agent 入口

先读 `docs/agent-handoff/README.md`、`complete-plan.md` 与 `07-phased-plan.md`，再按任务读取分册。用户最新明确指令优先；该包是2026-10-12五阶段整合基线，旧docs/HANDOFF.md与prototype是历史资料。

- 当前用户已批准v3设计并要求修改，已启动P2的入口/全屏四岛修正，本机Docker验证后更新已授权云端draft。以docs/agent-work/phases/P2/handoff.md为当前交接；P1事实保留。待定正式素材不阻塞draft；P3–P5未启动。
- 必须有全站Day蓝白/Night暗黑；WELCOME→CONNECT→HELLO STRANGER→Hub，入口无昵称。入口右侧真3D人物融入背景并看向鼠标，形象后续设计。四島全屏2.5D：鼠标进入图范围立即聚焦/点亮/居中，其他三岛灰；点击岛图进入频道，镜头移动本身不触发焦点切换。正式频道绑定与Hub完整3D方式未定。
- ChatGPT负责统筹、图片生成、Blender、核心代码与验证；Grok CLI负责研究/素材来源与明确分配的一般编码。遵循docs/agent-handoff/04-collaboration.md文件归属。
- Blender操作前读取 `D:/social_impact/mymovie/.agents/skills/blender-codex/SKILL.md`，保持原地引用和相对路径；先读当前工程/连接，再写本项目assets/source版本目录，不覆盖历史作品。
- Grok CLI入口为 `C:/Users/yonghao.yu/.grok/bin/grok.exe`；读取具体assignment后工作。不自行生成图片、改核心契约/lockfile，或把搜索结果当用户事实。
- 设计源图和旧组件原位保留；检查dirty状态，不覆盖用户修改，不reset/clean。未知素材许可只作候选，不能直接放入public。
- 核心行为包括真实URL/返回、悬停聚焦与整图点击、人物骨骼合成、主题持久化、留言审核隔离与幂等。用户新版要求替代旧双轴旅行/靠近才能进入；点击任意岛图直接进入，触摸不依赖悬停。每阶段报告实际验证与限制，未运行不得称通过。
- 更新公共tasks.json由ChatGPT进行；Grok写自己任务的报告，避免并发写同一文件。发布/推送/外部发送按用户当次授权执行。
- Docker部署已明确：目标 `ubuntu@124.220.190.120`，Linux镜像平台 `linux/amd64`；远程Docker用 `sudo -n`。本机Docker已运行并通过Linux生产镜像构建。读deploy/README.md与deployment-facts.json；登录细节在本机server.md。私钥不得进入Git、镜像或云端checkout。
- 用户指定五阶段：P1 draft第一版网站；P2 第一版网站修正和完善；P3 素材的完善和补充；P4 第一版正式网站建设；P5 第一版正式网站修正和补充。用户仅启动某阶段时不自行跨阶段。P1云端draft已明确授权，不能按旧计划再次要求部署许可。
- 执行队列已改为P1-01…P5-05共31项，取代旧T00–T18/四个里程碑。P1用同一可复用技术栈、现有概念与真3D代理，P3做正式资产，P4正式集成/生产验证/所授权部署。阶段状态在phases.json，收尾留下实际交接证据。
