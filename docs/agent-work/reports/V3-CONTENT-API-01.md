# V3-CONTENT-API-01 · 站主认证、作品库与私有媒体

**status:** ready_for_review

**owner:** grok

**date:** 2026-10-16

**model:** Grok 4.7

**session:** `01a144bb-6ddf-72d2-8755-e933d94e0346`

**effort:** 会话里没有单独露出的 effort 设置

**baseline:** `fe36bf919a0c2a14d93885ae8e0c0aba308c7f65`（开始时 HEAD 一致；工作区既有 dirty 未改）

## 范围

在留言服务上接入可选的内容模块：单站主 scrypt 口令、SQLite 会话、草稿/发布快照、上传队列、本地 staging，以及 worker 串行校验后写入限定前缀。公开接口只读衍生文件。未配置 `CONTENT_DB_PATH` 且未传入 `content` 时，留言行为保持原样。

可写文件：`services/guestbook/content-*.mjs`、`owner-*.mjs`、`media-worker.mjs`，`server.mjs` 只做接入，`tests/v3-content-api.test.mjs`，本报告。未改共享契约、依赖与 lockfile、前端、deploy。未部署，未写真实 datastore 或现有生产库，未安装软件。

本任务不包含 HTTPS 证书、Docker、首批真实内容入库和管理员界面。这些都没有做。

## 实际完成

`createServer({ content })` 接受可选内容配置。`content === false` 或未设置 `CONTENT_DB_PATH` 时不注册内容路由。显式传入 `content` 时按该对象启用。生产启用需要下列环境变量，代码里没有写死本机路径或口令。

| 变量 | 作用 |
|---|---|
| `CONTENT_DB_PATH` | 内容 SQLite。未设置且未传入 `content` 时模块关闭 |
| `PUBLIC_ORIGIN` | 仅来源，无路径、查询、用户信息。管理请求的 Host / Origin 必须与它一致。默认必须是 HTTPS |
| `ALLOW_INSECURE_DEV` | 值为 `1` 时，才允许 `localhost` / `127.0.0.1` / `::1` 的 HTTP 来源 |
| `OWNER_PASSWORD_FILE` | scrypt 哈希文件，模式 `0600`。明文只从 CLI stdin 读入 |
| `DERIVED_ROOT` | API 读取的衍生根。marker 为 `DERIVED_ROOT/.syyh-store-id` |
| `STORE_ID` | 4–128 位，字符集为字母、数字、`.`、`_`、`:`、`-` |
| `STAGING_ROOT` | 上传暂存。磁盘名是服务端随机 id，模式 `0600` |
| `COS_SITE_ROOT` | worker 写入根。核对 `COS_SITE_ROOT/.syyh-store-id` 与 `COS_SITE_ROOT/derived/.syyh-store-id` |
| `DB_PATH` | 可选。备份时若该留言库存在，另写一份留言备份 |
| `FFMPEG_PATH` / `FFPROBE_PATH` | 可选。缺省时在 `PATH` 查找，不使用 `.cmd` / `.bat` |
| `PORT` | 仅既有 `server.mjs` 监听，默认 3001。内容模块不读它 |

`createServer` 的 `content` 对象还可覆盖测试用数值：`maxUploadBytes`、`stagingQuotaBytes`、`queueLimit`、`maxSessions`、`loginIpLimit`、`loginGlobalLimit`、`loginWindowMs`、`sessionAbsoluteMs`、`sessionIdleMs`，以及 `now()`。省略时用契约默认值：上传 30MiB、边长 12000、像素 4000 万、衍生边长 1680、staging 2GiB、队列 100、视频时长 180 秒、会话绝对 8 小时 / 空闲 30 分钟、登录 5 次/来源与 30 次全局 / 15 分钟、并发会话 5、日备份 7、周备份 4。这些数值没有对应的环境变量。

口令使用 scrypt（N=131072，r=8，p=1），进程内同时只算一次。会话 id 只存 SHA-256。HTTPS 来源的 cookie 名是 `__Host-syyh_owner`，带 `Secure`。显式 loopback HTTP 开发来源使用没有前缀的 `syyh_owner`，不带 `Secure`。两者都是 `Path=/`、`HttpOnly`、`SameSite=Strict`，读取和撤销跟随 `PUBLIC_ORIGIN`。CSRF 单独保存，比较前先做 SHA-256。登录限流在 scrypt 之前用立即事务预留来源和全局名额，失败保留这两行，成功只删除该来源的记录和这一次成功尝试的全局预留。Fastify 5 的 `request.protocol` 不看 `X-Forwarded-Proto`，边界检查改为只接受单个非列表的 `x-forwarded-proto`，否则看 socket 是否加密。

作品 slug 创建后不可改。草稿可以没有简介、封面和媒体；发布才要求标题、简介、类别、一张 ready 图片封面，以及至少一条 ready 媒体。管理记录为 `{id, slug, revision, publishedRevision, status, draft, updatedAt}`。公开作品从发布快照和 ready 资产解析，`number` 由 `sortOrder` 补成两位。图片 kind 为 `image`，视频带 `poster`。修订冲突返回 409 `revision_conflict`。

上传只接受 `application/octet-stream`。HTTP 与 CLI 都走 `enqueueUpload`。图片接受 PNG、JPEG、WebP，拒绝多帧和伪类型；衍生 WebP 去掉 metadata，最长边不超过 1680。原件与衍生都是不可变随机键。worker 在数据库 ready 事务之后才对外可见，失败保留 staging。存储 marker 缺失或 I/O 失败时，公开作品记录仍可 GET，媒体、上传和发布返回 503；纯文本草稿和撤下不查存储。

`content-cli.mjs` 提供 `init-owner`、`rotate-owner`、`revoke-sessions`、`import`、`backup`、`restore`、`help`。导入示例：

```text
node content-cli.mjs import --inbox <目录> --manifest <清单文件名>
```

清单里的文件名必须落在 inbox 内。拒绝绝对路径、`..` 和符号链接。文件大小与 mtime 在读取前后要稳定，或带同名 `.complete` 标记。导入只创建草稿。同 slug 再次导入以退出码 2 拒绝，不改已有作品。备份使用 `node:sqlite` 的 `backup(源库, 目标路径)`，不覆盖已有文件。作品和资产清单在备份文件写完后从该副本的只读连接生成，不读已经继续变化的在线库，也不改副本或在线库。超过保留份数时只在 stderr 报告，`deleted` 为 false。恢复写到新文件，并只撤销该恢复目标里的会话。

`media-worker.mjs` 直接运行时循环调用 `runWorkerOnce`；同一数据库在进程内串行。挂载不可用时不领取队列，任务保持 queued。领取使用 `claim_token` 和 `lease_until`。租约 60 秒，处理期间每 15 秒续期。ffprobe、转码和海报的超时分别是 20 秒、120 秒和 30 秒，这些子进程等待期间事件循环仍会续租，所以一次正常转码不会被另一个进程抢走。只有 `lease_until` 为空或已经到期的 `processing` 行才会回到队列。崩溃的进程不再续租，其他进程最多等待 60 秒后回收。事件循环若被同步工作堵住超过 60 秒，活着的任务也可能被回收。

## 文件

| 路径 | 作用 |
|---|---|
| `services/guestbook/server.mjs` | 可选注册内容插件；留言错误文案在未启用或留言路径上保持原样 |
| `services/guestbook/content-config.mjs` | 环境变量与 `content` 对象归一 |
| `services/guestbook/content-store.mjs` | SQLite schema、WAL、立即事务 |
| `services/guestbook/content-errors.mjs` | 可暴露的内容错误 |
| `services/guestbook/owner-password.mjs` | scrypt 与口令文件 |
| `services/guestbook/owner-session.mjs` | cookie、CSRF、Host/Origin/TLS、登录限流 |
| `services/guestbook/content-works.mjs` | 草稿、快照、公开解析、发布前哈希复核 |
| `services/guestbook/content-media.mjs` | 上传、图片/视频校验、Range、重试 |
| `services/guestbook/content-storage.mjs` | marker、限定前缀、独占创建、回读 SHA |
| `services/guestbook/content-routes.mjs` | 契约中的内容 HTTP 路由 |
| `services/guestbook/content-import.mjs` | inbox manifest 导入 |
| `services/guestbook/content-backup.mjs` | 一致性备份、从备份副本只读生成清单、恢复、保留报告 |
| `services/guestbook/content-cli.mjs` | 站主与导入/备份命令 |
| `services/guestbook/media-worker.mjs` | 持续循环与 `runWorkerOnce` |
| `tests/v3-content-api.test.mjs` | 行为测试，各自使用系统临时目录 |
| `tests/v3-content-hardening.test.mjs` | 首轮返修的并发限流、开发 cookie、上传解析、租约和流式媒体测试 |
| `tests/v3-content-backup.test.mjs` | 清单与备份副本一致，在线晚写入不进入清单 |
| `docs/agent-work/reports/V3-CONTENT-API-01.md` | 本报告 |

## 自测

本机 `Get-Command ffmpeg` 与 `Get-Command ffprobe` 都没有结果。未安装这两个程序。

| 命令 | exit | 说明 |
|---|---:|---|
| `node --check tests/v3-content-api.test.mjs` | 0 | 修正会话测试后 |
| `cmd /c "node --test tests/guestbook.test.mjs tests/v3-content*.test.mjs"` | 1 | 13 项中 1 项失败。会话测试在空闲 1 秒的配置下把时钟一次拨过 3 秒，仍期望会话有效 |
| `cmd /c "node --test tests/guestbook.test.mjs tests/v3-content*.test.mjs"` | 0 | 修正后 13 项全过，`duration_ms` 11768.2021 |

第二次输出为 13 pass、0 fail、0 skipped。Node 打印了 SQLite `ExperimentalWarning`，以及 `NO_COLOR` 与 `FORCE_COLOR` 同时存在的警告。留言两项（隔离、幂等、限流、重启后审核可见性）通过。内容未配置时 `GET /api/works` 为 404，超长留言仍是 413「留言过长。」

失败的那一项已改成：在 1 秒空闲窗口内多次访问以刷新 `last_seen`，再把时钟拨到绝对 5 秒之后，此时会话必须失效。空闲超时、并发会话上限、删除 cookie 和撤销全部会话仍在同一测试里。

`node services/guestbook/content-cli.mjs help` 退出码 0。帮助文本如下：

```text
用法:
  node content-cli.mjs init-owner
  node content-cli.mjs rotate-owner
  node content-cli.mjs revoke-sessions
  node content-cli.mjs import --inbox <目录> --manifest <清单文件名>
  node content-cli.mjs backup --out <目录>
  node content-cli.mjs restore --backup <备份文件> --to <新数据库>
  node content-cli.mjs help

口令只从标准输入读取，不回显，也不写入日志。
init-owner / rotate-owner 需要 OWNER_PASSWORD_FILE。
rotate-owner 与 revoke-sessions 需要 CONTENT_DB_PATH，并撤销全部会话。
import 需要 CONTENT_DB_PATH、STAGING_ROOT、DERIVED_ROOT、STORE_ID、PUBLIC_ORIGIN、OWNER_PASSWORD_FILE、COS_SITE_ROOT。
清单路径必须位于 inbox 内，拒绝绝对路径、.. 和符号链接。导入只创建草稿，不会发布。
backup 需要 CONTENT_DB_PATH。若 DB_PATH 指向已有留言库，会另写一份留言备份。
备份不覆盖同名文件。超过 7 份日备份或 4 份周备份时只报告，不删除。
restore 写到新文件并撤销该副本里的会话，不会切换正在使用的数据库。
可选 FFMPEG_PATH / FFPROBE_PATH。ALLOW_INSECURE_DEV=1 只允许本机 HTTP 开发来源。
```

行为测试覆盖：未登录、伪 Origin、错误 Host、缺少转发协议、缺少或错误 CSRF、cookie 过期与撤销、重启后仍在的登录限流、草稿不出现在公开列表、上传到 ready 再到预览和发布、第二次发布前旧快照不变、撤下后匿名媒体 404、单 Range / HEAD / 不返回 304、猜 asset id、超限、伪 PNG、多帧、派生文件去掉注释、marker 丢失、重试、重启、CLI 越界与 junction、备份不撤销在线会话、恢复副本会话已撤销。临时目录前缀为 `syyh-`，测试 `finally` 中删除。复测后系统临时目录下没有残留的 `syyh-*` 目录。

实现阶段还用 `node --check` 检查过 `services/guestbook` 下的 `.mjs`。那次在测试文件写完之前，不是本报告表里的最终命令。

## 时间依据

会话目录创建于 2026-10-16 20:41:36（本机时间）。内容模块源文件的最后写入时间在 21:43–21:55，测试文件在 22:00 之后按失败结果改过一次。有效工作是这一次 CLI 会话里的实现和上面两次测试，没有使用 subagent。没有单独的 effort 计时器，因此不把墙钟折成一个精确分钟数。

## 缺口

- MP4 的成功转码没有测。本机没有 ffmpeg/ffprobe。测试只上传了一个假的 `ftyp` 盒，结果是 `error` 且错误文本匹配「视频」，状态不是 ready。有限资源的 ffmpeg/ffprobe 参数已按契约写好，`shell` 为 false。Linux 上的成功路径留给 Codex。
- 符号链接测试在本机用目录 junction。`lstat` 将其视为符号链接，导入被拒绝。当前 Windows 账户创建文件符号链接失败（权限不足），没有用真实文件 symlink 再跑一遍。
- 导入在校验循环里逐个入队。清单后部失败时，前面已经入队的资产会留下，但不会创建或发布作品。
- 没有生成一张 4000 万像素的图。边长 12001 的拒绝和默认上限常量有测试；sharp 的像素上限错误会映射为「图片尺寸或像素超过上限」。
- 未做证书、镜像、真实 COS、首批作品入库和管理界面。

## 首轮返修

对照 `docs/agent-work/feedback/V3-CONTENT-API-01-round-1.md`。没有修改 `tests/v3-content-security-lead.test.mjs`。没有操作浏览器、生产或真实 COS。

1. 登录在 scrypt 前用 `BEGIN IMMEDIATE` 同时写入来源行和全局行。名额已满则提交清理过期记录后返回 429，不再进入口令校验。错误口令保留预留。正确口令删除该来源的全部记录，并只删除这一次成功预留的全局行。意外校验错误会释放这次预留。
2. 生产 HTTPS 仍设置 `__Host-syyh_owner` 且带 `Secure`。`ALLOW_INSECURE_DEV` 的 loopback HTTP 改为 `syyh_owner`。会话读取、撤销和清除 cookie 都使用这个名字。
3. `POST /api/owner/uploads` 在 `onRequest` 里检查 Host、Origin、会话和 CSRF，未通过则不读 body。`application/octet-stream` 的原始解析器自己累计字节，超过 `maxUploadBytes` 只调用一次 callback，并在下一拍销毁连接。不依赖 Fastify 对未设置 `parseAs` 的解析器执行 `bodyLimit`。
4. worker 不再把所有 `processing` 重置为 `queued`。新列 `claim_token` 和 `lease_until` 由打开数据库时补上。完成或失败只更新仍持有同一 token 的行。`content-cli import` 与常驻 worker 同时调用 `runWorkerOnce` 时，未过期的任务不会被第二进程领走。
5. 公开媒体先按 64KiB 异步计算 SHA-256，尺寸或哈希不符则 503，响应里没有文件路径。通过后再用 `createReadStream` 发送全文或单个 Range。HEAD 只写长度，不写 body。

| 命令 | exit | 说明 |
|---|---:|---|
| `node --test tests/v3-content-hardening.test.mjs tests/v3-content-security-lead.test.mjs` | 0 | 返修中的定向检查。其中一次上传测试曾因测试客户端 keep-alive 在 `app.close()` 等待约 72 秒；请求改为 `agent: false` 后该测试约 0.5 秒 |
| `cmd /c "node --test tests/guestbook.test.mjs tests/v3-content*.test.mjs"` | 0 | 22 项全过，`duration_ms` 13660.7906。含留言 2 项、内容行为、返修和独立 lead 3 项 |

Node 仍打印 SQLite `ExperimentalWarning`，以及 `NO_COLOR` 与 `FORCE_COLOR` 同时存在的警告。MP4 成功转码仍然没有测。

## 第二轮返修

只改了 `content-backup.mjs`、新增 `tests/v3-content-backup.test.mjs` 和本报告。`createBackup` 在 `backup()` 完成后关闭在线连接，再用 `DatabaseSync(备份路径, { readOnly: true })` 读取作品和资产并写清单。清单生成不更新副本，也不撤销在线会话。恢复仍只撤销恢复目标里的会话。

回归在快照落盘之后、读取清单之前，用另一条连接写入新的作品和资产。清单与只读副本的行一致，且不含这次晚写入；在线库含有它。在线会话和备份副本里的会话都保持未撤销。恢复目标里的会话被撤销。CLI 不使用可选的 `afterSnapshot`，返回字段不变。

| 命令 | exit | 说明 |
|---|---:|---|
| `node --test tests/v3-content-backup.test.mjs` | 0 | 1 项通过，约 121ms |
| `cmd /c "node --test tests/guestbook.test.mjs tests/v3-content*.test.mjs"` | 0 | 23 项全过，`duration_ms` 16695.0713 |
