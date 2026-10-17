# V3-CONTENT-API-01 首轮独立安全验收反馈

请在原后端allowlist内修复以下问题，预算25–45分钟。`tests/v3-content-security-lead.test.mjs`由Codex独立编写，**仅可读/执行，不可修改**；其他原允许测试可补充。Codex的前端、共享类型、Docker与依赖已继续推进，不改它们。Sharp由Codex升级到0.35.5，当前`pnpm audit --prod`零已知告警。

## 三项已实际复现

运行`node --test tests/v3-content-security-lead.test.mjs`，exit1，3项全失败：

1. **并发限流。** 配置每来源2次，6个并发错误口令全为401，期望2次401+4次429。`assertLoginAllowed`在await scrypt前只查，失败计数却在await后写；并发请求先穿过检查再无限排队。请在耗时校验前用SQLite事务原子预留尝试名额（来源和全局），保证队列有界，持久化与成功清理语义正确。补并发/多来源全局测试。
2. **HTTP开发Cookie。** 显式loopback开发模式返回`__Host-syyh_owner`但没有Secure，浏览器会拒收。生产保留Secure __Host-cookie；开发用独立非前缀cookie名，所有读取/撤销路径跟随配置。不能靠inject手工塞Cookie冒充浏览器接受。
3. **上传鉴权过晚。** 实际HTTP只发header声明1MB、暂不发body，未登录请求1秒内未被拒绝；handler里的guard在body parser之后才执行。请在onRequest等解析前阶段验证会话、Origin、CSRF，未授权立即401/403。raw自定义stream parser还需自行严格统计字节并只完成一次callback；不能假定未设置parseAs时Fastify替你统计bodyLimit。补超限分块、断流与未登录不读body测试。

## 两项代码审查缺陷

4. **worker跨进程抢占。** claim每次把全部processing重置queued。即使只配置一个常驻worker，`content-cli import`自己调用runWorkerOnce时也会形成第二个进程；它能把常驻worker正在处理的任务重新领取。请使用数据库租约/可过期的claim，不能回收尚未过期的活跃任务；恢复只回收超过有界时限的任务。补两个独立进程/连接不重复处理和过期恢复测试。报告说明租约和超时关系。
5. **媒体内存与阻塞。** serveMedia在每次GET/HEAD同步readFileSyncHash整文件，返回整文件Buffer切片。30MiB视频×公开并发会超过512MiB API内存并阻塞Node。请用异步、内存有界的完整性验证与Range流式发送；可以两遍流式hash+发送以保留损坏检测，但不要每次把整文件读进Buffer。HEAD/Range/撤下/错误和hash校验测试都须保留。避免真实路径进入错误响应。

## 交付

先简短复述，随后自主修复。运行原留言+全部v3-content行为测试并记录真实结果；不要跑浏览器、生产或真实COS。CLI网络500错误已自行恢复并形成报告，属于可用性事件，不按代码缺陷扣分；如果服务再次连续失败无法继续，Codex将按规则接管。
