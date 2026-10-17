# 第二版集成完成与审核交付

2026-10-15。已完成用户所选第二版设计、素材、必要模型/动作及运行网站接入，本地生产预览可审核。COS v003按明确通过内容应用；所有原始填写稿、反馈、源图、探索模型和旧证据原位保留。

## 当前交付

- 四岛日夜8张透明图：Her天空城、ZZZ亚特兰蒂斯、FFF破碎机械星球、COS半壳半无限城内景；保持2.5D菱形轨道、悬停延迟/弧线、手机先选后进和稳定URL。
- 日夜横竖4张环境和近远4张云，地平线固定、独立云运动、暂停/后台/减少动态。八图合计883558B，运行编码与母版分开。
- 成人黑长直人物v034，可编辑Blender、163骨骼、Blink/Smile、真实头眼及轻微上身跟随。网页GLB4236232B，Meshopt解码，日夜半身海报及故障降级；模型不在WELCOME挂载。
- 同人物v037，固定POV海边清晨/夜晚、冷淡→微笑前倾伸手，4种独立半身构图×MP4/WebM，84帧/24fps/3.5秒。全8容器1578107B，海报各<150KB；真实ended/skip/reduce/error/timeout路径可进入Hub，欢迎不跟随指针。
- 画廊沿RyuSe1浏览方式和本站主题配色：错落比例、筛选、大图dialog/前后/说明/键盘/触摸、真实详情URL与返回恢复。12格仍为4组素材的3种比例占位，非12件个人作品。
- 全站移除装饰单线条/直角框：Gate、Hub、导航、作品、About/Story、Board、404和状态采用圆润控件、留白、实色色块与柔和阴影。
- 真实作品、个人事实、Story、联系方式、品牌与字体未填写部分保持诚实留白。没有编造日期/客户/点赞/经历/账号或把岛图当故事成片。

## 证据与边界

typecheck、Node九项API/世界测试、Avatar九项姿态/半身/释放测试通过。Windows生产17路由构建及Linux/amd64镜像构建通过。严格31素材检查通过，Windows生产与Linux候选各31站点回归通过；四种实际WebM后备播放和独立测试库的pending留言提交通过。详见[P4-12独立验收](../evidence/P4-12/acceptance.md)。

Windows生产静态RSC段路径别名问题由Codex修复，导出规范化脚本进入构建与Dockerfile。Linux候选使用同一源码归档、固定lockfile/基础镜像；源归档SHA256为63f5059df47c59a5729c0e16a923dc3819920e64575ba08cd85c1c2d8ed72279，远端校验一致。镜像标签是worktree验证身份，不冒充Git发布SHA。

本机Docker引擎不可连接，实际Linux验证是在远程独立网络/容器/数据库卷上完成。公开HTTP站仍运行e18816aa8195d77c47b1c46c52e438d6050e373a；此次交付为本地审核和私有Linux验证，没有commit/push/public更新。域名、TLS和正式发布仍属后续发布范围。用户下一轮视觉反馈可在审核文档填写，未自行启动P5。

## 可编辑成果

- [审核反馈文档](../v2-integration-review.md)
- [素材/模型来源说明](../../../assets/source/avatar-v2/README.md)
- 人物：`assets/source/avatar-v2/v034/visitor-source.blend`，海报：`about-source.blend`；欢迎动作：`v037/greeting-source.blend`。纹理已pack。
- 人物原生工程/运行媒体/人物与海边提示词/CC0许可源码包：`docs/agent-work/logs/artifacts/v2-editable-source-20261015.zip`，90723129B，SHA256d28be35aa1d6c810e51b0f31d84b67cb5872185854e5ef42c56cbe0bcd0cd65a。79文件，不含历史候选、逐帧序列、依赖、密钥或数据库；本地绝对路径可从审核文档打开。

审核站为http://localhost:8896/。开发站8895、旧概念预览8894原位保留；Linux候选通过本机SSH转发8897访问，仅绑定远程loopback18896。

四岛/环境PNG母版和生成记录原位保留`assets/source/v2/v001/`，编码记录v002；人物ZIP包含运行图，静态母版另从该源目录读取。
