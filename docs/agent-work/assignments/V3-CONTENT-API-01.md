# V3-CONTENT-API-01 · 站主认证、作品库与私有媒体完整后端

## 基线、归属与预算

HEAD `fe36bf919a0c2a14d93885ae8e0c0aba308c7f65`，工作树大量既存dirty，必须保留。共享架构与接口由Codex写在`docs/agent-work/v3-implementation-contract.md`，请完整读后实施；本任务是一个可用的内容后端功能，不是研究报告。

允许编辑/新增：`services/guestbook/content-*.mjs`、`services/guestbook/owner-*.mjs`、`services/guestbook/media-worker.mjs`；`services/guestbook/server.mjs`仅接入内容插件/配置并保持留言行为；`tests/v3-content*.test.mjs`；`docs/agent-work/reports/V3-CONTENT-API-01.md`。共享contracts、依赖/lockfile、前端、deploy文件由Codex负责，不改。

Codex已给service增加sharp prod依赖并更新lockfile；依赖审计后统一升级到**0.35.5**修复libvips/libheif/librsvg通告。Fastify 5.12.5、Node24内置SQLite可用，ffprobe/ffmpeg将由Codex加入Linux worker镜像；本机可先检查有无可用程序，无则如实记录未测视频转码，不安装软件/改系统。

预算有效开发80–110分钟，无进展阈值10分钟；按功能完整推进，一次CLI，不使用subagents。启动先简短复述目标/文件边界。

## 必须形成的功能

1. 完整实现契约所列API：单站主口令/scrypt、SQLite随机会话/CSRF/Origin/Host/TLS/登录限流、作品草稿/发布快照与revision冲突、公开列表/详情、受保护预览、上传队列/资产状态/重试、发布引用检查、撤下后媒体拒绝、Range/HEAD、存储健康状态。
2. 存储本地SQLite与staging；worker串行校验/派生/写COS限定前缀/readback SHA验证。API只读derived，原件无公网路径。挂载marker缺失或I/O失败fail closed，不能发布半成品或回落至源码假作品。
3. 图片PNG/JPEG/WebP≤30MiB、40M像素、12000边、拒多帧和伪类型；原件保留私有，派生WebP去metadata。MP4验证和有限资源ffmpeg/ffprobe处理按契约实现，不能shell拼接。所有派生和原件都是不可变随机键，不覆盖旧对象。
4. `content-cli.mjs`提供：初始化/轮换站主口令哈希(从stdin读取、不回显明文)、撤销全部会话；从本地SFTP inbox manifest导入草稿（调用相同上传/校验服务、不直接发布、拒symlink/越界）；一致性数据库backup+资产清单。`media-worker.mjs`既能持续运行也导出`runWorkerOnce`供测试/导入验证。
5. 留言原有隔离/幂等/限流保持，既有测试不能因内容未配置而失败。createServer新增`content`可选配置；默认只有显式`CONTENT_DB_PATH`/传入content时启用内容模块，未启用时保持旧留言服务。生产需要PUBLIC_ORIGIN/OWNER_PASSWORD_FILE/DERIVED_ROOT/STORE_ID等配置，所有配置在报告列明；不能写死本机路径或凭据。

## 接口澄清（以此覆盖契约中潜在歧义）

- 草稿允许空description、coverAssetId=null、空media数组，以便保存未完成稿；publish才要求完整标题/简介/封面/至少一张ready媒体。title仍1–100字，slug创建后不可改，避免破坏公开URL。
- coverAssetId必须是ready图片且属于media/processMedia集合。sortOrder允许0–9999。数组去重/顺序保留；assetId必须严格格式。
- 管理API记录形状：`{id,slug,revision,publishedRevision:null|number,status:'draft'|'published',draft,updatedAt}`；draft是管理字段，公开Work从快照+ready资产解析，number可按sortOrder格式化；公开media kind默认为image，视频含poster。
- API raw上传仅application/octet-stream；文件名仅用作显示和扩展验证，磁盘名只用server随机ID。HTTP上传和CLI都调用`enqueueUpload`等共享函数，worker输出要在数据库ready事务后可见。
- marker API在`DERIVED_ROOT/.syyh-store-id`读取；worker在`COS_SITE_ROOT/.syyh-store-id`与`COS_SITE_ROOT/derived/.syyh-store-id`核对同一STORE_ID。测试使用独立临时文件夹和同样marker，不接真实COS。
- storage不可用时GET公开作品记录可仍返回，具体媒体503；上传/发布503。撤下和保存纯文本草稿不应被存储中断卡住。
- 本任务不负责HTTPS证书、Docker配置、首批真实内容入库、前端管理员界面；不要报告这些已完成。

## CLI导入格式

命令示例`node content-cli.mjs import --inbox /inbox/batch01 --manifest manifest.json`；CLI按配置打开content DB和staging，不直接信任manifest绝对路径。

```json
{
  "draft": {"slug":"test-work","title":"测试作品","themeId":"sky","subtitle":"","category":"图片","description":"简介","sortOrder":1},
  "files": [
    {"filename":"image01.png","role":"media","alt":"图像说明","caption":"第一张","cover":true},
    {"filename":"process.png","role":"process","alt":"参考图","caption":"参考"}
  ]
}
```

导入将文件复制到本地staging并入队，创建引用这些assetId的草稿；不能自动发布。文件需已关闭且大小/mtime在读前后稳定（或明确完成标记），拒symlink、`../`、绝对路径。重复导入同slug应明确冲突，不偷偷覆盖公开作品。

## 验证与交付

- 必须有行为级测试：未登录/伪Origin/缺CSRF、cookie/超时/撤销、持久限流、草稿隔离、上传→worker→ready→preview→publish→edit不影响旧快照→publish→unpublish、猜asset ID/HEAD/Range、超大小/伪图/挂载丢失/重试、重启保留、CLI越界/符号链接/备份。
- 执行`node --test tests/guestbook.test.mjs tests/v3-content*.test.mjs`，记录实际exit。为敏感功能写可复跑行为测试，避免仅匹配源代码字符串的测试。
- 报告实际命令/结果、模型/effort/session（可查时）、有效时间依据、已知限制、配置项和CLI帮助。缺外部视频程序时明确标未测，Codex将做Linux独立验证。
- 不部署，不碰真实/datastore和现有生产数据库，不打印口令/session/secret；原始临时测试文件在系统临时目录内安全清理。
