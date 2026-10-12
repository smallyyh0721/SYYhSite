# 阶段1 draft 执行交接

2026-10-12：本机实施、GitHub推送和云端Docker发布完成；P1处于ready_for_review，等待用户设计反馈。用户明确授权本阶段公开draft；P2–P5未启动。公网HTTP/API/资源复核通过，公网浏览器工具读取超时的限制单列如下。

## 交付内容

Next静态导出、React/TypeScript、Three/R3F人物、GSAP入口；Fastify独立API、Node24内置SQLite；Nginx同源代理；pnpm workspace/锁文件、固定Linux基础镜像digest、Compose。主站为app/src，历史prototype和设计源图保留。

- 路由：Gate、Hub、Works及4个详情、About、Story、Board、素材缺口页、真实404。全局Day蓝白/Night暗黑，主题刷新后保持；About Paper仅局部阅读模式。
- 3D代理：原创Blender工程/生成脚本、真实骨骼GLB（727424B）、透明海报（322204B）。固定镜头，眼睛/头/上身分别限幅跟随、眨眼、呼吸、回正。移动端待机、reduce-motion静态、WebGL失败降级路径。
- 四岛：复用原ChatGPT生成日夜概念双联，WebP总约1.07MB。二维图置于可旅行2.5D空间；x/y鼠标、滚轮、触摸/键盘代码就绪，聚焦才进入，退出/Back恢复相机。Sky→Works/Ancient→About/Apocalypse→Story/Home→Board为临时契约配置。
- 留言：真实POST进入pending，公开GET只返回approved；Unicode24/140、纯文本、限流、持久化幂等、错误/重试/超时反馈。SQLite Docker数据卷；审核/备份CLI，无公网管理接口。

## 前置条件与本机实际验收

GitHub本机read/push dry-run通过；Windows默认Git schannel握手失败，以每条Git命令 `-c http.sslBackend=openssl` 成功访问，证书验证保持开启。Docker Desktop已运行Linux/amd64，Docker实际路径详见deployment-facts.json；Ubuntu SSH、sudo Docker、Git读取、固定Node/Nginx镜像拉取通过。

- `pnpm typecheck`通过；4个Node测试通过：API审核隔离、Unicode、幂等冲突/限流、文件库重启持久化；旅行滞回与平滑/大dt限幅。
- 本机Linux Docker生产构建通过，两个容器healthy；只公开本机127.0.0.1:8080。Web镜像99.9MB，API347MB（含Node基础层，不含Next）。运行时观测Web14.48MiB、API26.8MiB；均为某时点读数。
- `node scripts/smoke-http.mjs http://127.0.0.1:8080/`通过：11内容路由、404真实HTTP404、API健康/读取、GLB骨骼与响应头。
- 浏览器320/390/768/1440，每宽7页，共28组合，均无横向溢出/按钮高度小于44px，见[布局检查JSON](layout-checks.json)及[screens](screens/)。图片已人工查看。
- 真3D加载、鼠标位置变化产生限幅姿态；Day刷新持久化；Sky抵达/Enter进入/Back恢复相机(-360,-125)；暂停总览后远岛点击留在Hub，相机未跳；Works详情返回恢复scrollY522及原链接焦点；About局部Paper不改全局Night。
- Board真实浏览器提交显示pending且公开为空；本机CLIapprove后公开出现，API容器重启后仍存在。SQLite在线备份复制到本机并以独立read-only库打开，id1 approved可读取；随后reject测试id1，公开列表重新为空。测试数据库/备份不进Git、不传云端。

## 协作

真实Grok CLI 1.0.46执行P1-03限定内容组件任务，产出Works/详情/About/Story及CSS。ChatGPT已复核并完成路由集成、版式/文案/无障碍补充和真实浏览器验证；任务技术复核通过，见[报告](../../reports/P1-03.md)。核心、媒体、Docker、API、验收由ChatGPT完成。

## 素材与内容缺口（允许进入draft）

1. 最终3D人物身份、多角度造型、正式拓扑/材质/表情。当前代理不代表最终形象。
2. 四岛同一机位/比例、透明前中后分层、统一日夜光照的正式图；是否全3D、最终频道绑定仍待P2冻结。
3. 真实作品封面、详情、过程图与作者资料。当前4条是本站设计概念，明确标记draft。
4. 真实个人简介、技能/经历与有效联系方式；不杜撰用户履历。
5. 正式Story文本与关键帧；当前3章是原创概念试读，不是用户经历。
6. 正式品牌字体授权、纹理/HDRI、音效（需决定是否启用）、favicon/OG分享图完善。
7. 域名与TLS、正式分享/搜索配置。P1使用IP HTTP草稿预览及noindex。

## 已知验证边界与后续输入

桌面浏览器的屏宽模拟不等同实体触屏。移动端coarse pointer与reduce-motion代码存在，但本轮未用真实手机或系统偏好切换验收；WebGL失败曾实际触发并显示海报，未专门禁用WebGL验收。首次部署没有旧站，未声称完成历史版本回滚。限流计数为进程内存，重启重置；公开大规模使用的管理/监控能力留后续。

P2输入是本运行draft、以上证据及用户反馈；P2尚未启动。正式图片仍由ChatGPT imagegen，Blender技能原地引用，Grok做来源/许可研究和限定普通编码。

## 发布记录

- 公开草稿：[http://124.220.190.120/](http://124.220.190.120/)。本机仍为http://127.0.0.1:8080/；目前IP HTTP/noindex，域名/TLS未配置。
- GitHub：[codex/draft-v1](https://github.com/smallyyh0721/SYYhSite/tree/codex/draft-v1)。运行SHA：`e590059ca96620aab024f4bcee27005633e3db08`（同输入已在本机Linux容器构建、运行并HTTP复核）。后续交接文档提交不改本次运行SHA。
- 云端GitHub读取曾在前置检查通过，但正式clone期间连接github.com:443超时，3分钟没有传输进度，已终止本次clone并由Git清理其部分checkout。npm正常。不修改现有mirror/证书/防火墙；不据此推断Docker Hub不能拉常用镜像。
- 改传Git bundle：15,565,955B（约14.84MiB），本次SCP含连接开销2.227秒，实际约6.67MiB/s；速度仅代表本次网络。SHA256 `4ad1f5597fdf92811e185466339037469ddd730d75dc94487a22e422eaeeaaaa` 本机与云端核对一致。bundle恢复Git对象，origin仍为GitHub，checkout固定到运行SHA；未传整份镜像/Windows依赖/本机数据库。
- 云端从该SHA构建，基础Node/Nginx已在前置检查拉取。应用首次依赖安装/生产构建共71秒（不含之前镜像pull、Git超时与容器健康等待）；pnpm安装33.5秒，Next build28.4秒。设置Compose并发限制和Next1worker/Node2GB堆上限；Bake仍可交错处理目标，不能把日志称为完全串行。
- 每秒采样最低MemAvailable 2,356,704KiB≈2.25GiB，swap未使用；这是最低观测可用内存，非精确进程峰值。镜像Web99.9MB/API347MB；云端稳定时观测Web3.52MiB/API24.29MiB，CPU各0%。
- `/opt/website/syyh/repository` detached HEAD=运行SHA，工作树干净；env/config与current-release在checkout外；生产卷`syyh-draft-cloud-guestbook`。两个容器OCI revision标签=运行SHA，均healthy；仅Web公开0.0.0.0:80，API3001不公开。
- 本机向公网执行`smoke-http.mjs`：11内容路由200、真实404、API/GLB1skin/nosniff通过；另检查22个实际引用的JS/CSS及四岛WebP/海报均200，见[cloud-assets-check.json](cloud-assets-check.json)。80端口已从公网验证，未更改云安全组/系统防火墙。
- 公网API真实POST=201 pending，同一key重试=200 duplicate/id一致，公开列表不含测试项；API容器重启后CLI仍读到pending id1，随后reject本次验收项，公开列表仍为空，见[cloud-api-check.json](cloud-api-check.json)。云端未放入已审核假留言。
- 公网可视复核限制：内置浏览器导航首页/作品页后，AX、截图、DOM读取连续超时；恢复连接和新标签仍未能读取。不能声称云端浏览器交互/截图已通过。保存的screens来自本机生产容器；云端同SHA的HTML、JS/CSS/媒体/接口与容器事实已验证。后续优先由用户正常浏览器或工具恢复后补这项检查。

首次发布已具备版本env/镜像tag、健康检查、日志轮转和不删卷的更新/回滚操作说明，见[运维](../../../../deploy/README.md)。没有旧版本回滚演练，证据不扩张到正式生产完备性。
