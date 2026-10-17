# V3-CONTENT-API-01 Codex 独立验收

2026-10-16；本地工程接受，附 Codex Linux 兼容修补。真实 COS 和生产发布尚未验收。

## 责任和返修

Grok `grok-4.7-build` / high，session `01a144bb-6ddf-72d2-8755-e933d94e0346`。首轮未接受：独立检查发现并发登录限流、开发 cookie、上传解析前认证/大小限制存在缺陷；审查补充跨进程 worker 租约和大媒体整块响应的问题。第一轮 Grok 修复后 22 项通过。第二轮修复备份后读取在线库生成清单的竞态；清单改读已固定的备份副本，新增受控写入回归。

第二轮 CLI 正常退出后，Codex 在 Linux 验证有效 MP4，发现 ffprobe 收到不支持的 `-nostdin`：容器实测输出 `Failed to set value '-v' for option 'nostdin': Option not found`。Codex 只从 ffprobe 参数移除此项（子进程 stdin 仍关闭），重新构建 API/worker/frontend，成功转码、海报和浏览器播放均通过。这一处不记为 Grok 独立完成。当前文件由 Codex 接续集成，无活跃 Grok CLI。

## 实际检查

- `node --test tests/guestbook.test.mjs tests/v3-content-api.test.mjs tests/v3-content-backup.test.mjs tests/v3-content-hardening.test.mjs tests/v3-content-security-lead.test.mjs tests/v3-works.test.mjs`：31/31，约 13.9 秒。覆盖留言兼容、权限、会话、上传、快照、媒体授权、租约、备份竞态。
- 完整 `pnpm test`：38/38，约 18.1 秒，包含已有岛屿交互回归。后来补的宿主机 CAM 凭据程序，Linux Python 3/3、systemd unit 语法检查通过；只在 /tmp 做隔离测试，尚未启用服务。
- Linux amd64 四镜像构建与四容器健康通过，隔离项目名 `syyh-v3-qa`，端口 localhost:18980，专用数据卷；未触碰历史本地或生产卷。
- `node scripts/check-v3-local-content.mjs`：10 个完整 HTTP 场景通过，含真正图片/MP4、预览、无需重建的新 URL、海报/HEAD/Range、草稿不覆盖快照、存储断开、撤下、退出。见 `linux-http.json`。
- `node scripts/check-v3-http-security.mjs http://localhost:18980`：13 路由/受限路径与 nonce/308 检查通过，见 `http-security.json`。生产构建 About 不显示范围滑块或序列审核控制器。
- CUA 真实浏览器：登录、新建、双文件上传、封面、草稿预览、发布、失败 MP4 重试；视频 readyState=4、duration=2，原生键盘播放后 currentTime=2/ended=true，无播放错误。大图下一张/Escape关闭，焦点回到原触发按钮；草稿预览地址保持 owner。
- CUA 320px：Story 三图均解码，管理编辑无横向溢出，About 人物载入且无审核控制器；日夜主题切换、全设备退出成功。见截图。
- SQLite 备份从 Linux 在线库生成，含内容/留言副本及资产清单；拷贝到本机独立位置，三个数据库 integrity_check 均 ok，恢复副本撤销会话而备份源保留会话。又用一个无网络、只读根的新容器将独立副本恢复到 tmpfs，实际 GET 作品/媒体/留言成功、管理必须认证。该备份验证数据为 2 个联调作品、4 个资产，先于真实 20 图导入，不能冒充生产数据备份。见 `backup-restore.json`。
- 两组真实首发 20 图在本地通过 CLI 同一处理队列导入/发布；公网列表准确为 2 件，8+2 与 10 的素材结构。四容器重启后元数据完全一致，两件详情和封面可读，见 `restart.json`。
- 容器 inspect：全部非 root/read_only/cap_drop ALL/no-new-privileges；API `/media` 与 secret 只读、无原件根；worker network=none、inbox 只读。瞬时内存约 edge 3.5MiB / frontend 73MiB / API 35MiB / worker 99MiB，只是一次样本，不是压力测试。
- 代理增加 Docker DNS 重新解析，强制把 frontend 原 IP 用隔离占位容器占住后重建 frontend，确认新 IP 不同，edge 容器未重启/替换仍恢复真实作品页；测试占位容器已移除，见 `docker-dns.json`。代理修改后 10 个 Linux HTTP 和 13 路由安全检查再次通过。
- 固定 V2 SHA 的 Web/API 镜像本地重建成功，配合 V3 edge 的回滚 compose 三容器健康。15 个旧版路由、精确内联脚本 SHA 白名单、留言只读、禁用新 owner API 通过，见 `v2-rollback.json`。旧 3D 的 WebAssembly 解码和 blob 纹理需特定 CSP 项，已在回滚配置中限定放行（JS eval 仍禁止）；修正后无 CSP/纹理错误，保留一条既有 THREE.Clock 弃用警告。此为隔离 HTTP 演练，**尚未执行云端受信任 TLS 的真实回滚**。
- `pnpm audit --prod`：当前零已知漏洞；未做完整镜像 CVE 扫描。

## 限制与发布条件

线上 COS 当前 HTTP 匿名挂载、桶根匿名 200、角色端点 404。尚未验证真实私有身份/持久化/重连，20 原图只在服务器 SFTP inbox。受信任 IP 证书和续期设施已配置，但公网 443 未启用。仍需认证 HTTPS COS 挂载、固定 SHA 云端候选、真实内容备份恢复、保持 TLS 的 V2 回滚演练及公网回归。用户已授权完成后部署，不需要新的发布许可。

评分 A3/B4/C未测/D5/E5 = 76.47 / 85%权重。A3 反映首轮多处安全缺陷、两轮返修及一处 Codex Linux 修补，最终通过不抹掉返工。功能架构大体符合要求故 B4；有效效率无独立计量。该身份/存储模块难度与既有展示模块不同，不硬拼滚动提升趋势；严重初验问题要求保持最低档 1 模块 / 默认 1 CLI，全局 skill 未达标。
