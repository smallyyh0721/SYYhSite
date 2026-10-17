# V3 Docker / 发布与恢复

当前生产仍为 V2；此文件说明 V3 操作。先看 [进度](../docs/agent-work/v3-progress.md)、[COS 前置配置](../docs/agent-work/v3-cos-access-setup.md) 和 [站主操作](../docs/agent-work/v3-owner-guide.md)。用户已授权完工后部署。现有匿名 HTTP COS 挂载未满足上线条件，不能跳过。

## 本机隔离联调

需要 Node24、pnpm10.32.1 与 Docker。`node scripts/prepare-v3-local-fixture.mjs` 创建本地测试目录/哈希；复制 `deploy/.env.example` 到 Git 忽略的 `.local/v3-qa.env`，将端口改为 18980/19443，三个卷改成 `syyh-v3-qa-*`。固定本地来源 `http://localhost:18980` 与 `ALLOW_INSECURE_DEV=1`；不要把测试哈希用于公网。

```powershell
docker compose --env-file .local/v3-qa.env -f deploy/compose.yaml -p syyh-v3-qa build
docker compose --env-file .local/v3-qa.env -f deploy/compose.yaml -p syyh-v3-qa up -d --wait
pnpm test
node scripts/check-v3-http-security.mjs http://localhost:18980
```

上传集成检查 `scripts/check-v3-local-content.mjs` 仅访问固定的 localhost:18980，并要求 `.local/imports/yixuan-football/01-cover.png` 与实际 ffmpeg 生成的 `.local/v3-video-fixture.mp4`。它会生成本地 QA 草稿、发布再撤下，并在 finally 恢复本地存储 marker。禁止改写成生产检查脚本。

## 生产前置条件

- COS 私有权限、受限身份、经过认证的 HTTPS 前缀挂载、真实对象持久化与重连核验。主机挂载目录 `/datastore/syyh-site`，marker `syyh-site-20261016-01a144bb`。COSfs 身份只在主机，不进入容器。
- `/opt/website/syyh/secrets/owner-password.hash` root:1000/640；正式哈希已配置，明文仅在本机 `.local/production-owner-credentials.txt`，不要打印/复制到日志。
- 受信任 IP 证书在 `/etc/letsencrypt/live/syyh-ip`，edge 只读副本在 `/opt/website/syyh/tls/edge`。续期 timer 每6小时检查，auth/cleanup/deploy hook 在主机；不用自签证书或关闭 TLS 验证。
- SFTP inbox `/var/lib/syyh-sftp/inbox`，UID/GID11002；worker 只读绑定并加入该组。
- 保留当前 V2 SHA `9f9764d7970999e6749ec0780e0b5b6794ef89f9` 的 Web/API 镜像、旧 env 和原留言卷。不得清理卷或使用 system prune。
- 本次从 V2 首次迁入 V3 才创建新的内容/上传卷。V3 后续更新必须继续使用当前 CONTENT_VOLUME / UPLOAD_VOLUME；不能因镜像 SHA 变化就改成空的新卷。

生产 env 放 checkout 外并限制权限，不写密钥。示例中的 SHA 是待替换字段：

```dotenv
RELEASE=FULL_40_CHAR_SHA
VCS_REF=FULL_40_CHAR_SHA
BIND_ADDRESS=0.0.0.0
HTTP_PORT=80
HTTPS_PORT=443
SYYH_TLS=on
PUBLIC_ORIGIN=https://124.220.190.120
ALLOW_INSECURE_DEV=0
STORE_ID=syyh-site-20261016-01a144bb
COS_SITE_ROOT=/datastore/syyh-site
TLS_EDGE_ROOT=/opt/website/syyh/tls/edge
ACME_ROOT=/opt/website/syyh/tls/acme
OWNER_SECRET_FILE=/opt/website/syyh/secrets/owner-password.hash
SFTP_INBOX_ROOT=/var/lib/syyh-sftp/inbox
DATA_VOLUME=syyh-draft-cloud-guestbook
CONTENT_VOLUME=syyh-v3-content-RELEASE_ID
UPLOAD_VOLUME=syyh-v3-uploads-RELEASE_ID
```

## 候选与切换顺序

1. 提交/推送固定源码，云端在干净 checkout 取同一完整 SHA。源码包只能含源码和公开网站资产，不能含 `.local`、原图库、数据库、密钥。历史 `cloud-release.sh` 不支持 V3，会明确拒绝。
2. 使用候选专用 env/项目名，绑定 `127.0.0.1:18898/18443`；来源仍是正式 HTTPS IP。内容/上传卷是将来要交付的 V3 新卷；留言使用原卷一致性备份的隔离副本，候选不写生产留言。
3. 限并发构建四个精确 SHA 镜像；启动并核验实际用户、只读根、API 衍生只读、worker 无网络、内存/日志限制。CLI 导入两组 SFTP 批次，只生成草稿，再通过受保护候选 API 预览、发布。
4. 使用 `curl --connect-to 124.220.190.120:443:127.0.0.1:18443 https://124.220.190.120/about/` 验证真实证书及候选；不使用 `-k`。管理 cookie 必须 Secure/HttpOnly/SameSite=Strict，Host/Origin 精确匹配。浏览器全站/手机/日夜/大图/视频/欢迎/减少动态及 About 无审核控制器最后检查。
5. 备份内容与原留言、导出资产清单并核对真实对象；取独立副本、独立恢复，演练 COS 重连。准备下面保持 TLS 的 V2 回滚并在隔离端口验证。
6. 候选通过后，停候选 API/worker，生产 env 复用验收过的 V3 内容/上传卷，并继续使用**原生产留言卷**。用精确镜像 `up -d --no-build --wait` 切换，公开 80/443；验证受信任 TLS、HTTP 跳转、所有深链/媒体/404、安全头、登录限流与留言隔离。通过后才记录 current-release 和 deployment-facts；失败执行已演练回滚。

## 保留 HTTPS 的 V2 回滚

不能直接用历史两容器 env 回退：那会丢失新的 443 入口。`compose.v2-rollback.yaml` 保留 V3 edge 和证书/ACME 绑定，只将 frontend/API 切回固定 V2 镜像；原留言卷继续使用，V3 内容/上传卷保留。

从**固定 V2 Web 镜像**导出 `/usr/share/nginx/html` 到私有准备目录，运行：

```sh
node scripts/create-v2-rollback-config.mjs EXPORTED_V2_HTML_ROOT NEW_PRIVATE_NGINX_CONFIG
```

它计算实际内联脚本 SHA-256 白名单，生成 V2 静态 frontend 的 Nginx 配置，不使用脚本 unsafe-inline/eval。旧 3D 解码器仅额外允许 `wasm-unsafe-eval`，纹理读取允许同页 blob；新 V3 页面不需要这些旧模型项。输出不覆盖已有文件。回滚 env 除端口/TLS/留言卷外还需：

```dotenv
EDGE_RELEASE=TESTED_V3_EDGE_SHA
ROLLBACK_RELEASE=9f9764d7970999e6749ec0780e0b5b6794ef89f9
ROLLBACK_NGINX_CONFIG=/opt/website/syyh/releases/PRIVATE_FIXED_V2_CONFIG.conf
```

切换前撤销 V3 全部会话并停 worker；使用同一生产项目名启动 rollback compose 的 web/frontend/api，禁止 `down -v`。确认旧站深链/脚本/留言正常、受信任 443 和证书续期保持、V3 原件/草稿仍不可匿名访问。恢复 V3 时复用其保留的内容/上传卷与 marker，再做回归。当前本地隔离 HTTP 三容器、15 深链及旧模型解码已通过，云端 TLS 回滚仍须实际测试后才能写为通过。

## 备份与运维

`api node content-cli.mjs backup --out /content/PRIVATE_BACKUP_DIR` 生成内容/留言 SQLite 副本和固定资产清单。用受控 `docker cp` 导出、限制权限并放独立位置；原图和衍生对象必须另保留。不要直接复制在线 WAL 主文件。`restore --backup ... --to NEWDB` 只写新库并撤销恢复会话；验证后才停服务切卷，不覆盖现有卷。

定期检查 TLS timer、剩余证书有效期、COS 挂载/对象访问、队列/staging 容量和备份完整性。IP 证书有效期短，续期失败须及时处理。正式域名以后补，不能把 IP 上的 HSTS 当作可靠的首次访问保护。
