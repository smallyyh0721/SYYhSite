# 阶段1 draft 执行交接

2026-10-12：本机实施与验收完成，GitHub推送及云端发布正在执行。用户明确授权本机开发、GitHub交付和云端Docker部署；P2–P5未启动。云端实际结果会追加到本文，未完成前不称部署通过。

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

待填：完整运行SHA、GitHub分支、云端构建耗时/最低观测可用内存、容器/镜像/公开URL、公网HTTP与浏览器验收结果。
