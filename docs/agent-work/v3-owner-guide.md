# 第三版站主操作说明

状态（2026-10-17）：本地及云端 HTTPS 候选流程已验收，首发两件作品已入 COS。独立备份恢复与 HTTPS 回滚已通过；生产管理入口待公网 TCP443 放行后切换。当前 HTTP 公网仍是第二版。

## 日常浏览器上传

正式发布后使用受信任的 HTTPS 地址 `/owner/`。正式口令保存在本机 Git 忽略的 `.local/production-owner-credentials.txt`，不在聊天、报告或源码里展示。当前 `localhost:18980` 是隔离验收环境，仅使用本地测试口令；它和正式口令不同。

登录 → 新建作品 → 填标题、所属岛屿、作品地址、分类和简介 → 选择图片/MP4 → 等待“可以使用” → 设一张图片为封面 → 调整正文/过程素材和顺序 → 保存草稿 → 预览草稿 → 发布。

作品地址创建后固定。新增作品发布后立即形成详情地址，不需要重建网站。JPG/PNG/WebP/MP4 单文件上限 30MiB，视频最长 3 分钟。上传进度只表示传输；“等待处理/正在处理”仍未完成校验。处理失败可重试；类型或内容无效时需重新上传正确文件。图注可留空，画面说明建议填写有意义的文字。

保存草稿不会替换访客正在看的版本。准备好后点“发布更新”切换公开版本。点“撤下作品”后公开接口和素材停止提供；原件、草稿和历史对象保留。已被访客下载或截屏的文件无法撤回。

“退出登录”结束当前会话；“退出所有设备”撤销全部会话。遗失口令由服务器端 `rotate-owner` 从 stdin 更新哈希并撤销所有会话，不在命令参数或日志里传明文。管理容器的哈希挂载只读，轮换应在宿主机安全位置完成后重建 API 容器以切换文件绑定。

## 批量 SFTP

客户端连接 `syyh-upload@124.220.190.120`，端口 22，使用授权 SSH 密钥，并核对主机指纹。服务端账户仅能进入 `/inbox`，没有 shell、sudo 或 Docker 权限。私钥不传到服务器或仓库。

每个作品一个批次目录，文件全部传完再放 `.complete` 和 `manifest.json`。目前两组首发已到：

- `/inbox/yixuan-football`：8 张正文 + 2 张参考/过程。
- `/inbox/mist-exit-ten-shots`：10 镜静帧；不冒充已完成视频。

导入命令在受控 worker 中运行（部署 env/Compose 由运维指定）。先停止后台 worker，避免它与导入器竞争处理租约；导入成功或失败后都要重新启动后台 worker。批次目录权限应为 0750、文件 0640，所属组为 syyh-upload，使 worker 的附加组11002可读：

```sh
docker compose --env-file RELEASE.env -f deploy/compose.yaml stop worker
docker compose --env-file RELEASE.env -f deploy/compose.yaml run --rm --no-deps -T worker \
  node content-cli.mjs import --inbox /inbox/BATCH --manifest manifest.json
docker compose --env-file RELEASE.env -f deploy/compose.yaml up -d worker
```

导入仍需同样校验，只生成草稿；相同 slug 重复导入会拒绝，不覆盖既有作品。之后从管理界面预览并发布。SFTP 文件不会因为传到服务器就自动公开。

## 故障和备份

存储不可用时先不要反复重新上传。查看管理存储状态与处理队列，运维修复 COS 身份/挂载并重建相关绑定容器后再重试。文本草稿和撤下仍可操作。

内容数据库、会话和队列在本地持久卷；留言单独保留原卷。备份使用 CLI `backup --out` 创建 SQLite 一致性副本、资产哈希清单与留言副本，清单来自固定数据库副本。数据库文件含会话，应放私有目录和独立备份位置。恢复用 `restore --backup FILE --to NEWDB` 写新库并撤销其中会话；先在隔离环境验证，不覆盖在线库。资产对象与数据库须一起保留。

证书是自动续期的短期 IP 证书；证书签发和续期演练已完成，生产 HTTPS 监听随第三版发布启用。IP 地址的 HSTS 不能作为保护首次访问的保证。正式上线后收藏 HTTPS 地址；域名确定后再绑定域名、验证 HTTPS 跳转和 HSTS。
