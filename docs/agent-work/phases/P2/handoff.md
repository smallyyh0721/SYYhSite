# P2 / 新版入口与全屏四岛修正

状态：2026-10-12进行中。用户已批准v3方向并明确要求开始修改；延续本机开发、GitHub交付与云端draft Docker部署的授权。

已实现候选：WELCOME→CONNECT→HELLO STRANGER→Hub，无入口昵称；透明3D代理融入背景；四岛全屏2.5D，图片范围即时悬停聚焦点亮、约750ms居中，其他岛灰色，整图点击进入对应真实频道。移动场景经过静止指针不会重新选择；保存active岛返回，键盘/触摸入口及减少动态。

素材：ChatGPT内置imagegen生成四岛透明draft前景和两个无岛环境图。源图、提示词、alpha/尺寸/SHA记录在 `assets/source/world-v3/v001/`，运行WebP在 `public/media/world-v3/`。日夜共享四岛轮廓；正式双光照、分层、最终人物与完整3D岛仍待P3，不把本次draft衍生物当正式资产。

实际验证：pnpm typecheck退出0，pnpm test六项通过；Linux/amd64 Docker生产构建与Compose健康通过，11内容路由、真实404、API、GLB及六张新WebP通过HTTP检查。本机浏览器确认欢迎→招呼→自动Hub/SKIP、图范围聚焦/唯一彩色、非文字图片点击About/Board、键盘Enter进入Story、Back/刷新恢复active、Day持久化与暂停漂浮；3D姿态实测0.797,-0.160。320/390/768/1440宽无横向溢出，截图在evidence/P2，最终手机欢迎图为welcome-final-390.png；控制台error为空。首次CSS Modules构建问题已修正。GitHub/云端发布待固定提交后执行，当前云端仍是P1的 e590059ca96620aab024f4bcee27005633e3db08。

后续从此状态继续提交推送、云端固定SHA部署与复核，再填写确切结果。不删除留言卷或覆盖未提交资料；不读取/上传私钥。物理触屏、系统减少动态开关和强制WebGL失败未实测；正式人物/精细双光照分层/真实内容/域名HTTPS仍缺。20:00一次性任务检查已实际触发，任务当时继续运行，未因额度暂停。
