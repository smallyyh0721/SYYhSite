# V3 正式发布

2026-10-17（北京时间）。第三版已正式部署到 **https://124.220.190.120/**，HTTP 自动跳转 HTTPS。用户确认放行轻量实例 TCP443 后，公网 TLS 预检通过，再执行生产切换；不是把预检容器当作最终生产。

## 运行与内容

- 应用镜像源码：`e4d11c0ef52740a3c8d9ff21612b70a86873fedd`；四个实际运行镜像 revision 一致，容器全部 healthy、非 root、只读根、cap_drop ALL。主机启动保护模块源码来自另一次运维提交 `4ac028a`，后续报告提交不代表重新构建应用。
- 正式入口：[首页](https://124.220.190.120/)、[作品](https://124.220.190.120/works/)、[About](https://124.220.190.120/about/)、[Story](https://124.220.190.120/story/)、[站主管理](https://124.220.190.120/owner/)。
- 首发：仪玄8张正文+2张过程参考；《雾尽之处》10镜静帧。没有冒充成片。两件已发布、20个真实资产，上传验证用草稿及资产已清理。
- Welcome原画背景、四岛正式名、Story三章三图/小红书链接、About九帧V领序列接入；生产About响应无审核控制器。
- 保留原生产留言卷 `syyh-draft-cloud-guestbook`；内容/上传卷复用已验收候选的 `syyh-v3-content-e4d11c0ef52740a3c8d9ff21612b70a86873fedd` 和 `syyh-v3-uploads-e4d11c0ef52740a3c8d9ff21612b70a86873fedd`。以后更新必须继续复用，不能因SHA变化创建空内容卷。
- 现有 `/datastore/syyh-site` 挂载继续使用，实际桶内前缀 `datastore/syyh-site/`；沿用既有访问方式，HTTPS/private默认ACL，不新增CAM身份。API只读派生，worker读写本站目录，无整个/datastore公网映射。

## 实际验收

- 公网18组检查通过：11个页面的HTML与nonce CSP、nonce逐请求变化、真实404/受限路径、旧draft跳转、HTTP→受信任HTTPS、2作品详情及20图GET/HEAD/哈希、留言读取、站主安全cookie登录/存储available/两件已发布记录、CSRF与Origin拒绝、退出会话，以及COS原件/派生外部直接访问拒绝。
- 候选HTTPS上传→worker→草稿→发布→撤下检查已完成；正式环境只做读取及登录/退出等必要检查，没有重复创建公开测试作品，也没有写测试留言。
- Windows/Linux挂载保护各18测试、真实挂载guard、候选和生产两次systemd容器重建通过。`syyh-site-runtime.service` 已启用开机启动；没有执行整机重启，不声称全机重启已验。
- 证书续期timer已启用，既有续期dry-run/deploy-hook证据保留；生产实际受信任TLS通过。域名尚未配置，可后补，不把IP的HSTS作为首次访问保证。
- 真实独立恢复：2作品/20图/留言GET/活跃会话0；独立TLS V2回滚15路由通过。原V2镜像/卷和隔离恢复卷保留，未执行清理。

## 备份与回退

切换前最终备份：`/opt/website/syyh/backups/v3-final-20261017T114753Z`，含20资产/2作品的内容库、媒体归档与最新原生产留言一致性备份。另有此前独立恢复验证用快照。

本机独立副本：Git忽略目录 `.local/production-backups/syyh-v3-final-independent-backup-20261017T114753Z.tar`，54,794,240字节，SHA256 `b2dc94f1e91f8a42dfce68f205f73410df2a48c2b56a570adbc7e02a041af4ec`，已核对；Windows目录权限已收紧。数据库/原图/口令不进入仓库。

主机 `current.env` 指向正式V3 env，`current-release` 在公网回归通过后记为应用SHA。回退配置为 `/opt/website/syyh/releases/v2-tls-production-rollback-20261017.env`，需先停worker/撤销会话，使用已演练compose保留HTTPS和原留言卷；具体见deploy/V3-README.md。回退时必须同步启动保护配置，避免下次开机启动错误版本。

## 交付及限制

站主管理已启用，口令仅在本机 `.local/production-owner-credentials.txt`，由用户自行读取。日常HTTPS上传；批量SFTP及导入步骤见 `v3-owner-guide.md`。站主独立完成一次操作仍待用户体验，不将Codex代验冒充站主验收。

本轮CUA浏览器页签/截图调用超时，未取得新的公网视觉截图；沿用此前同一候选的本地浏览器桌面/320px、日夜及真实媒体交互证据。本轮公网HTML/API/20图哈希可用性已独立通过，不把HTTP成功等同于重新完成浏览器视觉验收。没有真机移动端、全浏览器兼容或压力测试声明。

证据：[生产运行](../evidence/V3-DEPLOY-20261017/production-runtime.json)、[公网检查](../evidence/V3-DEPLOY-20261017/public-review.json)、[最终备份](../evidence/V3-DEPLOY-20261017/final-backup.json)、[此前沿用挂载验收](v3-existing-mount-20261017.md)。
