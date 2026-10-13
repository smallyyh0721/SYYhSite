# SYYH Signal agent 入口

先读 `docs/agent-handoff/README.md`、`complete-plan.md` 与 `07-phased-plan.md`，再按任务读取分册。用户最新明确指令优先；该包是2026-10-12五阶段整合基线，旧docs/HANDOFF.md与prototype是历史资料。

- 2026-10-13第一版最后调整已完成并云端部署，运行SHA `e18816aa8195d77c47b1c46c52e438d6050e373a`，P2 ready_for_review。本机Docker与公网各10项新增/15项回归通过。CONNECT呼吸闪烁；About真3D鼠标跟随；招呼不跟随，后续伸手视频；背景本輪仅分析，下一版补素材再改进。以docs/agent-work/phases/P2/handoff.md为当前交接；正式素材不阻塞draft，P3–P5未启动。
- 必须有全站Day蓝白/Night暗黑；WELCOME与CONNECT居中，欢迎屏不显示/挂载人物；CONNECT缓慢闪烁；HELLO STRANGER显示不跟随鼠标的代理，后续换一次性伸手视频，再进入Hub；鼠标视线跟随仅在About真3D人物。四岛全屏2.5D菱形轨道：鼠标停留260ms后聚焦，1.35s弧线运动到中央前景，其他三岛灰；移动经过静止指针不重新选择。手机先点选居中、第二次点击该岛才进入；动态背景支持暂停与减少动态。四島均进入独立主题作品页，About/Story/Board保留顶部菜单；完整3D岛仍待选。
- ChatGPT负责统筹、图片生成、Blender、核心代码与验证；Grok CLI负责研究/素材来源与明确分配的一般编码。遵循docs/agent-handoff/04-collaboration.md文件归属。
- Blender操作前读取 `D:/social_impact/mymovie/.agents/skills/blender-codex/SKILL.md`，保持原地引用和相对路径；先读当前工程/连接，再写本项目assets/source版本目录，不覆盖历史作品。
- Grok CLI入口为 `C:/Users/yonghao.yu/.grok/bin/grok.exe`；读取具体assignment后工作。不自行生成图片、改核心契约/lockfile，或把搜索结果当用户事实。
- 设计源图和旧组件原位保留；检查dirty状态，不覆盖用户修改，不reset/clean。未知素材许可只作候选，不能直接放入public。
- 核心行为包括真实URL/返回、延迟悬停与整图点击、移动端两次点按、人物骨骼合成、主题持久化、留言审核隔离与幂等。最新六项改动替代v3即时悬停和手机一次直达；桌面整图点击可直接进入对应主题作品。每阶段报告实际验证与限制，未运行不得称通过。
- 更新公共tasks.json由ChatGPT进行；Grok写自己任务的报告，避免并发写同一文件。发布/推送/外部发送按用户当次授权执行。
- Docker部署已明确：目标 `ubuntu@124.220.190.120`，Linux镜像平台 `linux/amd64`；远程Docker用 `sudo -n`。本机Docker已运行并通过Linux生产镜像构建。读deploy/README.md与deployment-facts.json；登录细节在本机server.md。私钥不得进入Git、镜像或云端checkout。
- 用户指定五阶段：P1 draft第一版网站；P2 第一版网站修正和完善；P3 素材的完善和补充；P4 第一版正式网站建设；P5 第一版正式网站修正和补充。用户仅启动某阶段时不自行跨阶段。P1云端draft已明确授权，不能按旧计划再次要求部署许可。
- 执行队列基础为P1-01…P5-05共31项，追加P2-06…09后共35项，取代旧T00–T18/四个里程碑。P1用同一可复用技术栈、现有概念与真3D代理，P3做正式资产，P4正式集成/生产验证/所授权部署。阶段状态在phases.json，收尾留下实际交接证据。
