# 第三版站主操作说明

状态（2026-10-17）：第三版已正式发布，首发两件作品已入COS并公开；独立备份恢复与HTTPS回滚已通过。正式管理入口为 https://124.220.190.120/owner/ ，HTTP会跳转HTTPS。

## 日常浏览器上传

使用受信任的正式入口 [站主管理](https://124.220.190.120/owner/)。正式口令保存在本机 Git 忽略的 `.local/production-owner-credentials.txt`，不在聊天、报告或源码里展示。`localhost:18980` 是隔离验收环境，仅使用本地测试口令；它和正式口令不同。

登录 → 新建作品 → 填标题、所属岛屿、作品地址、分类和简介 → 选择图片/MP4 → 等待“可以使用” → 设一张图片为封面 → 调整正文/过程素材和顺序 → 保存草稿 → 预览草稿 → 发布。

作品地址创建后固定。新增作品发布后立即形成详情地址，不需要重建网站。JPG/PNG/WebP/MP4 单文件上限 30MiB，视频最长 3 分钟。上传进度只表示传输；“等待处理/正在处理”仍未完成校验。处理失败可重试；类型或内容无效时需重新上传正确文件。图注可留空，画面说明建议填写有意义的文字。

保存草稿不会替换访客正在看的版本。准备好后点“发布更新”切换公开版本。点“撤下作品”后公开接口和素材停止提供；原件、草稿和历史对象保留。已被访客下载或截屏的文件无法撤回。

“退出登录”结束当前会话；“退出所有设备”撤销全部会话。遗失口令由服务器端 `rotate-owner` 从 stdin 更新哈希并撤销所有会话，不在命令参数或日志里传明文。管理容器的哈希挂载只读，轮换应在宿主机安全位置完成后重建 API 容器以切换文件绑定。

## 批量 SFTP

客户端连接 `syyh-upload@124.220.190.120`，端口 22，使用授权 SSH 密钥，并核对主机指纹。服务端账户仅能进入 `/inbox`，没有 shell、sudo 或 Docker 权限。私钥不传到服务器或仓库。

每个作品一个批次目录，文件全部传完再放 `.complete` 和 `manifest.json`。目前两组首发已到：

- `/inbox/yixuan-football`：8 张正文 + 2 张参考/过程。
- `/inbox/mist-exit-ten-shots`：10 镜静帧；不冒充已完成视频。
- `/inbox/zzz-cos-x-picks-2026`：25 张绝区零 cos 正文图。主题用 `home`（COS 次元冲突，说明是 COSPLAY）。见下文。

### 绝区零 cos 批次 `zzz-cos-x-picks-2026`

导入器已经能收多图作品，并给每张图写入 `alt` 和 `caption`（各最长 300 字）。没有单独的署名栏；原作者和帖子地址放进 `caption`，详情页图注会原样显示。本包最长的一条署名是 89 字，不需要改校验。

压缩包里的 `manifest.json` 是照片数组（`file` / `author` / `source` / `replies`），不是导入清单。直接把它当作 `--manifest` 会因缺少 `draft` 被拒绝。`replies` 没有对应字段，不入库。`urls.txt` 不要放进批次目录。

批次目录里只放 25 张 jpg 和下面这份导入清单，文件名与压缩包一致，不要分子目录：

```text
/inbox/zzz-cos-x-picks-2026/
  manifest.json
  01_sixtutu622_2114951763308781754.jpg
  …
  25_Rooh0728_2116040311260754180.jpg
```

目录 0750，文件 0640，组 `syyh-upload`。每张 jpg 的大小和 mtime 稳定后即可导入；只有文件还在写入时才需要同名的 `文件名.complete`。完整清单在 `docs/agent-work/inbox-examples/zzz-cos-x-picks-2026.manifest.json`。形状如下，`cover: true` 只标一张，并且必须是 jpg/png/webp：

```json
{
  "draft": {
    "slug": "zzz-cos-x-picks-2026",
    "themeId": "home",
    "title": "绝区零｜Cos 精选",
    "subtitle": "2026 · 二十五帧",
    "category": "COSPLAY · 非官方",
    "description": "2026 年从 X 整理的 25 张绝区零 cos 照片。图注写明画面标题、原作者和帖子地址。本组是同人摄影整理，与游戏官方无关。",
    "sortOrder": 3
  },
  "files": [
    {
      "filename": "01_sixtutu622_2114951763308781754.jpg",
      "role": "media",
      "alt": "六二二同学 · ZZZ cos（@sixtutu622）",
      "caption": "六二二同学 · ZZZ cos · @sixtutu622 · https://x.com/sixtutu622/status/2114951763308781754",
      "cover": true
    }
  ]
}
```

`sortOrder` 为 3 时排在现有两件作品之后；发布前可以在管理页改。导入命令仍是：

```sh
node content-cli.mjs import --inbox /inbox/zzz-cos-x-picks-2026 --manifest manifest.json
```

导入只生成草稿，不发布。相同 slug 再导入会被拒绝。

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

证书是自动续期的短期IP证书；签发、续期演练已完成，生产HTTPS监听和续期timer已启用，公网证书验证通过。IP地址的HSTS不能作为保护首次访问的保证。请收藏HTTPS地址；域名确定后再绑定域名、验证HTTPS跳转和HSTS。
