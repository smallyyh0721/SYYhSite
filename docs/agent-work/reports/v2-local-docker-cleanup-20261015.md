# 第二版收尾：本地Docker旧版本清理

2026-10-15（北京时间）。用户确认第二版完成，授权清理此前版本的本地Docker镜像。第三版仅制定目标，未开始实施。

## 实际完成

- 本机`desktop-linux`引擎原先不可连接，Docker Desktop进程仍在、WSL发行版已停止。经一次Docker Desktop停止/重新启动恢复引擎；启动后旧第一版测试容器自动恢复，随后在核对项目路径、Compose标签与旧revision后停止并移除这两个旧容器。
- 移除14个SYYhSite旧镜像：`syyh-web`/`syyh-api`的draft-v1、p2-r3-candidate以及58a2932/e590059/36d125f/6f45e73/e18816a版本。当前第二版生产镜像在服务器，本机没有9f9764d版本镜像。
- 基于本项目Dockerfile的`services/guestbook`、`@syyh/guestbook`、design/tokens及配置路径等特征，沿缓存父子关系选择114个关联缓存记录；先以只读过滤验证精确ID集合，再执行该集合的prune。Buildx报告回收 **4.006GB**。
- Docker镜像由15个降至1个（保留共享Node基础镜像）；构建缓存由4.434GB降至427.3MB，保留16个基础/上下文或归属不明确的记录。没有执行全局system prune或volume prune。
- 三个本地卷`devimage`、`syyh-draft-guestbook`、`syyh-draft-local-guestbook`全部保留；移除容器时未使用删除卷参数。网站源文件、原画、Blender工程和用户填写稿保持原样。
- 对已核对的Docker数据盘挂载点`/mnt/docker-desktop-disk`执行fstrim，报告4148510720B已trim。Windows C盘自由空间快照没有立即增加同等空间，VHDX没有做离线压缩；这里的4.006GB指Docker报告的缓存回收量。

仅操作本机Docker。未连接服务器做清理，正式站9f9764d及服务器回滚镜像/留言卷保持原样。当前本地Docker无容器运行；8896等Node预览服务未由本次停止。

原始清单、精确缓存ID、清理输出、前后空间和卷保留记录在`docs/agent-work/logs/local-docker-cleanup-20261015/`。该日志目录按既有规则不进Git。

## 第三版规划

[第三版目标](../v3-goals.md)与[版本路线](../version-roadmap.json)已保存，三个目标为整体设计与真实素材收尾、作品上传管理、去除公开draft痕迹并交付正式版本。状态明确为`planned_not_started`，`implementationAuthorized=false`；等待后续明确开始指令。本次没有业务编码、素材制作、Grok/Blender任务或网站部署。
