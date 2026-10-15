# 第二版P4交付记录

后续正式发布已完成：用户明确授权后，将含P5-06原画欢迎的当前版本发布至http://124.220.190.120/，运行SHA9f9764d7970999e6749ec0780e0b5b6794ef89f9。候选与公网各24网站+6欢迎+3安全检查通过，原留言卷/数据保持。见[发布报告](../../reports/P4-06.md)。以下P4本地交付及“未发布”是历史快照。

最新用户修正：欢迎人物放弃3D展示，改用已通过原画动态图片，当前状态以[P5-06交接](../P5/handoff.md)为准。以下v037与31项视频回归为P4历史工程记录，不代表用户认可3D造型，不能用于恢复旧欢迎影片。

2026-10-15。用户所选第二版P3素材/P4集成工作已完成，可审核；不退回旧v001建模或重新运行已结束CLI。当前工程与素材真实存在，不用概念/代理/stub替代。原用户填写稿与反馈保持原样。

## 当前交付

[生产审核站](http://localhost:8896/) · [可编辑审核文档](../../v2-integration-review.md) · [集成完成报告](../../reports/v2-integration-complete.md)。开发8895与原概念8894保留。

- COS按用户已通过v003，半壳/半无限城内景；Her/ZZZ/FFF/COS日夜8前景已应用。横竖环境与近远云另8图，共16张静态图；暂停/后台/reduce与稳定地平线验证。八环境图883558B，原图/提示词v001保留，运行预算重编码v002，public manifest版本3。
- 人物v034：原生visitor-source.blend与about-source.blend，成人黑长直/深色泳装/薄纱/金饰，163关节、Blink/Smile；About真实头眼/轻微上身跟随，半身取景和日夜灯光。实际GLB4236232B，sha256936b08fae61562d895cf0523b37d8213b5e10ed2851adcbb96a37f684d847adf，MeshoptDecoder已接入，GLB读取的rig-map.json已交付。CC0核心/直发许可与GPT贴图记录齐全；旧budgetProposal不是用户冻结合同，实际网格/bytes在manifest中明示，不伪称FPS或提议预算达成。
- 同人物v037：固定POV海边清晨/夜晚、半身、冷淡→微笑前倾伸手，原生骨骼/形态/发丝微风；84帧、24fps、3.5秒。四种独立构图各MP4/WebM，8容器1578107B，海报各<150KB。影片铺满屏幕、文字置底，脸和手清晰。v028旧运行片、v035宽构图未采用片、v036仅相机预览保留，不混用其帧冒充v037。
- 画廊和全站视觉由Grok模块接入，保留筛选/dialog前后/键盘/触摸/真实URL/返回，圆润控件、留白和阴影，无装饰单线/直角框。12格为4素材×3比例，未把占位当真实作品。About/Story/Board缺失简介、故事、账号、作品及未选品牌字体均诚实留白。

## 最后真实验收

- typecheck通过；Node九项API/世界测试与Avatar九项姿态/半身/资源释放测试通过。旧avatar-unit.test.mjs保留原0.47构图契约；lead的avatar-v034-unit.test.mjs对应实际头到腰构图。
- 严格31素材检查pass，所有8成片另经FFmpeg全片decode；Windows生产和Linux/amd64候选各31站点检查pass，无fail/pending/noted/pageerror。4种真实MP4各1次play/ended无重播，skip/reduce/fault、320/390、GLB和所有页面实际验证。
- Linux候选的4种真实WebM后备在只404 MP4时均播放/ended；1条明确验收pending留言仅写新建独立测试卷，UI→Nginx→API→SQLite返回201，公开列表仍空。没写公网、真实卷或开发DB测试留言。
- Windows17路由构建通过，normalize-static-prefetch添加15个同bytes RSC路径alias；Linux正常路径不变。最终clone logs/production-check-1792014662221，最后编码媒体已同步其public/out；当前8896指向此clone。
- Linux源归档SHA25663f5059df47c59a5729c0e16a923dc3819920e64575ba08cd85c1c2d8ed72279，远端一致。镜像syyh-web:v2-review-20261015，实际IDsha256:91e74803285b1f93af599eddf61e9521ccf07739cfdf92266b436bd2afc46c31，label worktree-v2-review-20261015（不是Git发布SHA）。模型/四MP4远端hash与本地一致。当前独立两容器healthy。
- 全部详细证据见[P4-12独立验收](../../evidence/P4-12/acceptance.md)。Windows Edge/headless与模拟触摸，不声称Safari/Firefox/真机通过；本机Docker引擎不可连接，实际Linux验证在远程独立候选完成。

## 编辑源与后续范围

人物源v034、欢迎动作源v037、实际runtime-manifest/rig-map/许可/提示词及可编辑source zip均已提供，入口在审核文档。逐帧PNG和工具依赖为ignored验证数据，不进发布包；全历史源版本保留，未知许可候选不进入当前运行资产。

HEAD仍7bb7b9e9048f79977a620743a2d1aaa5eef46345，保留全部dirty，未commit/push/public更新。公网站仍运行e18816aa8195d77c47b1c46c52e438d6050e373a，真实云端卷原样保留。此次为本地审核/私有Linux验证交付，公开更新/域名TLS为后续发布范围；P4-06在当前交付中not_applicable，P3/P4 ready_for_review，未自行启动P5。

Grok P4-08…12全部结束并接受，P4-12两次返修和1处lead预算表解析兼容修补有记录。最近同模型窗口89.02比93.34下降4.32，当前每批最多2完整模块，默认1CLI；效率未实测、全局skill未达标。没有活跃CLI/Blender/构建/测试，不恢复旧句柄重复工作。

仍在运行供审核的服务：dev8895（23322）、旧素材8894（86649）、独立API3001（68983）、生产8896（8707）、私有LinuxSSH tunnel8897（2747）。必须实查进程而非凭句柄推断。Linux目录/tmp/syyh-v2-verify.5lUNbf，私有web绑定127.0.0.1:18896，network syyh-v2-verify-20261015，独立data卷syyh-v2-verify-data-20261015含1条pending测试数据，不是用户留言。

01-00 heartbeat在05:53实际到达并核对任务持续运行，无明确额度中断，未重复continue/启动。19-30 heartbeat在06:54实际到达：先前目标已明确complete，交接确认建设完成，没有Grok/Blender继续运行，未重复continue/启动。两项均为COUNT1一次性计划，实际队列到达时间与计划时刻分开记录。当前实施目标收尾完成，下一步为用户审核/补真实内容或明确新的修正/发布范围。
