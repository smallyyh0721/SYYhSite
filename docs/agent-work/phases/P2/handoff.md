# P2当前交接 / 2026-10-13

状态：六项修正已完成并部署，ready_for_review，等待用户浏览反馈。WELCOME与CONNECT居中，欢迎屏无人物，连接后的HELLO STRANGER才显示3D代理；260ms悬停、1.35s弧线菱形轨道；手机先选居中、第二次点击进入；云雾/星光动态背景可暂停；四島均进入独立主题作品，关于/故事/留言保留顶部菜单。Day/Night及留言服务保留。P3–P5未启动。

公开预览 [http://124.220.190.120/](http://124.220.190.120/)，[GitHub分支](https://github.com/smallyyh0721/SYYhSite/tree/codex/draft-v1)，应用运行SHA `6f45e735fabf1a92a486db3759bb1f33732a790b`。本机Linux Docker验证后，Git推送、SHA256校验bundle交付、云端从相同SHA/Dockerfile/lockfile构建；最后的验收文档提交不改变应用运行SHA。

实测：typecheck退出0、九项Node测试通过，本机与云端两容器healthy且revision一致。两端分别完成15项独立无头Edge交互检查，包括桌面与320/390/768浏览器模拟原生触摸；欢迎/招呼、短悬停取消、弧线运动、静止指针稳定、整图主题跳转、Back恢复、背景移动/暂停、Day持久化、减少动态/键盘均通过，无pageerror。公网15内容路由、404、API、GLB和六WebP通过。已查看公网桌面/手机截图，证据见 [公网验收](../../evidence/P2-r2/cloud/checks.json)、[公网截图目录](../../evidence/P2-r2/cloud/)、[本机验收](../../evidence/P2-r2/local/checks.json) 和 [完整修正报告](../../reports/P2-07.md)。

交付测量：54,786,726B代码包与小型脚本SCP上传5.56秒，两端SHA256一致；云端增量构建32秒，最低可用内存2,234,392KiB，web105MB/API347MB。保留 `syyh-draft-cloud-guestbook`，checkout无dirty。详见 [发布事实](../../evidence/P2-r2/release.json) 与 [部署事实](../../../agent-handoff/deployment-facts.json)。

待补素材与边界：最终人物、正式日夜分层与精细光照、用户真实作品/简介/故事/联系方式、品牌字体/音效、域名HTTPS继续记录为后续缺口；本版使用有标记的设计研究与3D代理。物理手机、系统级减少动态开关、强制WebGL失败、负载和实际回滚演练未执行。上一版 `36d125f83134ba16b348f568fbf4741a371b7d1b` 镜像/env仍保留，可按deploy/README.md同卷回滚；不得删除数据卷或上传私钥。继续时先核对最新用户反馈与dirty状态。

---

## 2026-10-12发布历史

# P2 / 新版入口与全屏四岛修正

状态：2026-10-12技术实施与云端draft更新完成，ready_for_review，等待用户浏览反馈。用户已批准v3方向并明确要求开始修改；本轮延续本机开发、GitHub交付与云端draft Docker部署的授权。P3–P5未启动。

已实现并部署：WELCOME→CONNECT→HELLO STRANGER→Hub，无入口昵称；透明3D代理融入背景；四岛全屏2.5D，图片范围即时悬停聚焦点亮、约750ms居中，其他岛灰色，整图点击进入对应真实频道。移动场景经过静止指针不会重新选择；保存active岛返回，键盘/触摸入口及减少动态。

素材：ChatGPT内置imagegen生成四岛透明draft前景和两个无岛环境图。源图、提示词、alpha/尺寸/SHA记录在 `assets/source/world-v3/v001/`，运行WebP在 `public/media/world-v3/`。日夜共享四岛轮廓；正式双光照、分层、最终人物与完整3D岛仍待P3，不把本次draft衍生物当正式资产。

实际验证：pnpm typecheck退出0，pnpm test六项通过；Linux/amd64 Docker生产构建与Compose健康通过。本机浏览器确认欢迎→招呼→自动Hub/SKIP、图范围聚焦/唯一彩色、非文字图片点击About/Board、键盘Enter进入Story、Back/刷新恢复active、Day持久化与暂停漂浮；3D姿态实测0.797,-0.160。320/390/768/1440宽无横向溢出，截图在evidence/P2，最终手机欢迎图为welcome-final-390.png；控制台error为空。首次CSS Modules构建问题已修正。

发布：GitHub [codex/draft-v1](https://github.com/smallyyh0721/SYYhSite/tree/codex/draft-v1)，应用运行SHA `36d125f83134ba16b348f568fbf4741a371b7d1b`，公开预览 [http://124.220.190.120/](http://124.220.190.120/)，本机Docker `http://127.0.0.1:8080/`。最后的验收文档提交不改变这份应用运行SHA。本机与云端分别从同一固定源码、Dockerfile、lockfile构建Linux镜像，并非传送同一镜像文件。

实际云端交付：42,579,247B Git bundle及约2KB发布脚本SCP合计4.625秒（包含SSH建立），两端SHA256相同；云端增量构建30秒，最低MemAvailable 2,326,872KiB，web104MB/API347MB。两容器healthy，revision标签均为上述SHA，现有 `syyh-draft-cloud-guestbook` 留言卷保留，checkout无dirty。公网11内容路由、真实404、API健康/留言GET、GLB、六张WebP通过；六张图的公网与本机内容SHA256全部符合源manifest。见 [云端HTTP](../../evidence/P2/cloud-http.json)、[素材交付校验](../../evidence/P2/asset-delivery.json)、[发布事实](../../evidence/P2/release.json)、[完整验收报告](../../reports/P2-05.md)。

限制与后续：公网浏览器本轮打开35秒超时并重置工具，无法完成公网视觉交互实测；线上HTTP检查及本机浏览器实测分开记录。物理触屏、系统减少动态开关和强制WebGL失败未实测；正式人物/精细双光照分层/真实内容/域名HTTPS仍缺。本次仅将必要draft素材接入，未启动正式素材阶段。20:00一次性任务检查已实际触发，任务当时继续运行，未因额度暂停，也未重复启动任务。

回滚准备：旧运行SHA `e590059ca96620aab024f4bcee27005633e3db08` 的镜像和 `/opt/website/syyh/releases/<旧SHA>.env` 已保留；可按deploy/README.md以旧env运行 `up -d --no-build --wait`，数据卷不变。本次未进行历史版本回滚演练，不声称通过。继续工作时先核对用户反馈与当前dirty；不得删除留言卷、重置用户资料或上传私钥。
