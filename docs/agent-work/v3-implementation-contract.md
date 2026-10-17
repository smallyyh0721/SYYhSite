# V3实施契约 · 2026-10-16

本文件由Codex定义共享接口，供后续完整模块任务采用。既有目录/代码在迁移验收前保留；不要把本方案状态写成已交付。

## 运行边界

- Nginx边缘(80/443) → Next运行服务(内部3000) + Fastify内容/留言API(内部3001)。Next采用standalone，不再依赖静态详情路径。
- `CONTENT_API_URL`仅服务端使用。生产作品页面必须读API已发布记录，不能在API失败或撤下时回退源码种子；本地设计预览可明确使用seed模式。
- 本地SQLite分别保留现有留言卷和新增content卷，队列/会话不放COS。独立单并发media worker共享content SQLite与暂存卷。
- API仅只读挂载本站`derived`，不挂原件、不持有COS写凭据。worker仅可写新建的本站前缀，不能挂整个`/datastore`。Next无作品磁盘权限。
- 初次使用`/datastore/syyh-site/`，先确认它不存在并核验真实cosfs挂载；专属标记`.syyh-store-id`必须匹配预期。路径不存在、标记不符、I/O失败必须停止上传/发布，不能退回宿主空目录。重挂后重建相关容器并验证，不声称Docker自动跟随。
- 当前无对象API身份，采用挂载兼容写入：本地校验 → 不可变UUID对象键 → close → 从挂载重新读回并校验SHA/长度 → 标记ready。没有COS原子rename假设，不能覆盖旧对象；故障与重连必须实测。

## 公开Work形状

沿用`src/lib/contracts.ts`的Work：themeId(`sky|ancient|apocalypse|home`)、slug、number、title、subtitle、image、category、description、media[]、processMedia?[]。media条目有src/alt/caption，可增加kind(`image|video`,默认image)、poster、assetId。公开URL只由已授权的asset ID生成，客户端不能传磁盘路径。

管理草稿字段：slug、themeId、title、subtitle、category、description、sortOrder、coverAssetId、media[{assetId,alt,caption}]、processMedia[{assetId,alt,caption}]。限制：slug为2–80个小写英文/数字/连字符且不能是themes/view/owner等保留名；标题1–100字，简介1–2000字，正文图片最多60项、过程最多20项，文本是纯文本。封面必须为ready图片且在作品资产集合内。

数据库保存草稿和已发布快照，编辑草稿不能改变当前公开内容；乐观revision防止两个标签页覆盖。发布时原子切换完整快照，撤下清空公开指针且文件保留。sortOrder在快照中生效。

## API契约

所有错误`{error: 可理解的中文, code?: 稳定标识}`；管理与媒体`Cache-Control:no-store`。公开作品也先no-store，避免撤下后缓存继续提供。

| 方法/路径 | 输入/输出 |
|---|---|
| GET `/api/works` | `{works: Work[]}`，只返回已发布，按sortOrder/id排序 |
| GET `/api/works/:slug` | `{work: Work}`或404 |
| POST `/api/owner/session` | JSON `{password}`；准确Origin+Host、TLS、限流；成功设置host-only HttpOnly Secure SameSite=Strict `__Host-syyh_owner`并返回`{authenticated:true,csrfToken,expiresAt}` |
| GET `/api/owner/session` | 未登录`{authenticated:false}`；已登录返回csrfToken和expiresAt；不返回session token |
| DELETE `/api/owner/session` | CSRF与Origin，撤销当前session、清cookie |
| POST `/api/owner/revoke-sessions` | CSRF与Origin，注销所有设备 |
| GET `/api/owner/works` | `{works:[{id,slug,revision,publishedRevision,status,draft,updatedAt}]}` |
| POST `/api/owner/works` | `{draft}`，创建草稿，返回`{work:管理记录}` |
| GET `/api/owner/works/:id` | `{work:管理记录}` |
| PUT `/api/owner/works/:id` | `{revision,draft}`，版本冲突409，返回新记录 |
| POST `/api/owner/works/:id/publish` | `{revision}`，全部资产ready且存储可用才发布；返回记录 |
| POST `/api/owner/works/:id/unpublish` | `{revision}`，撤下不删除文件；返回记录 |
| GET `/api/owner/works/:id/preview` | `{work: Work}`，受保护的当前草稿预览 |
| POST `/api/owner/uploads?filename=...` | raw `application/octet-stream`，单文件≤30MiB；认证、CSRF、Origin；保存本地随机名并排队，202 `{asset:{id,status:'queued'}}` |
| GET `/api/owner/assets` | `{assets:[{id,status,filename,kind,error?,src?,poster?,bytes,createdAt}]}`；限最近500 |
| GET `/api/owner/assets/:id` | `{asset:...}`，用于轮询处理状态 |
| POST `/api/owner/assets/:id/retry` | 失败资产从保留暂存重新排队；CSRF/Origin |
| GET/HEAD `/api/media/:id` | 先查已发布快照引用；否则仅登录站主可读；只返回ready派生文件，原件没有公网路径；支持单段Range/416/HEAD，每次授权，无304绕过 |
| GET/HEAD `/api/media/:id/poster` | 同上，仅视频poster |
| GET `/api/owner/storage` | 受保护的可用性/队列状态，不返回桶凭据或全路径 |

状态接口pending/ready/error要清楚；上传传完不等于ready。API全局body仍小，仅上传route放宽。所有非GET/HEAD管理路由须CSRF头`X-CSRF-Token`（登录例外但仍须Origin、JSON），不开放CORS。

## 安全实现参数

- 口令用Node异步scrypt：N=131072,r=8,p=1，16字节以上盐，32字节key，timingSafeEqual；哈希文件通过secret bind供API读取，口令不进Git/env日志。恢复/改口令CLI写新哈希并撤销所有会话。最多一个并发scrypt。
- 服务端session随机32字节，仅SHA256存SQLite；独立CSRF随机token；8小时绝对、30分钟空闲有效期。登录轮换并限制同时会话数；cookie不存localStorage。
- 登录持久限流：每来源5次/15分钟，整体30次/15分钟；正常成功清该来源失败计数。API信任单个内部代理，边缘覆盖X-Forwarded-*，配置PUBLIC_ORIGIN精确匹配Host/Origin。生产必须HTTPS，开发仅显式allowInsecureDev且origin为loopback时可用非Secure开发cookie。
- 文件仅PNG/JPEG/WebP与MP4；扩展名、签名和完整解码都验证；拒绝SVG/HTML/ZIP/GIF与伪类型。30MiB、最多40M像素、边长12000，拒绝多帧图片。worker去元数据生成max1680 WebP；原件仅私有COS。
- MP4先ffprobe校验单视频流，时长≤180秒，分辨率≤3840×2160；ffmpeg单线程、有限timeout、仅file/pipe协议、H264/AAC网页版本max1280×720/30fps，移除metadata/字幕/数据流并生成poster。派生物大小也有上限，失败保留原暂存供重试。
- 不在API执行任意shell；ffprobe/ffmpeg使用spawn固定argv，无shell；输入目录排除符号链接。staging本地总配额2GiB/队列上限100，串行处理，错误不记录token/口令。
- 图片派生/视频/原件都SHA+长度记录并读回；发布事务验证所有引用与ready状态。挂载异常不改已发布快照，不把作品库当空。

## CLI与备份

同一导入服务供HTTPS与SFTP使用，不能另写绕过验证的导入器。SFTP上传到本地专用inbox；显式导入manifest生成草稿，never auto publish，拒绝symlink/path traversal/仍在写入文件。首批作品须用这套流程入库，再走受保护预览与发布。

SQLite在线backup产生不覆盖同名的一致快照，包含作品/资产/会话和留言的独立备份（恢复时会话应撤销）。输出媒体清单、对象哈希与版本；归档COS副本外再取本机独立副本。恢复至独立目录/卷核验后才可切换。默认保留7份日备份+4份周备份，超出先报告配额，不自动永久删除COS原件。
