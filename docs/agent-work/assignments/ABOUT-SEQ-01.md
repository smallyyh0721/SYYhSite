# ABOUT-SEQ-01：已通过V领人物序列接入About

日期2026-10-16；Owner Grok CLI实施，Codex独立验收。用户最新原文“采用新版，开始执行”，上下文为已review的v002 V领九帧独立预览。明确授权现在接入本地网站About；不启动第三版上传/安全等26项主体或公网发布。

## 目标与边界

将About当前动态导入的实时3D Avatar替换为原生Canvas 2D人物图片序列，采用用户已确认的`assets/source/about-sequence/v002`。沿用独立预览`design/about-sequence-preview/v002`的九帧及指针/拖动、逐帧滑块/键盘、随滚动、自动往返播放；显示精细图像本身，无假3D、插帧、镜像、缩放模拟转头。

Codex负责安装9帧和manifest到`public/media/v3/about-sequence/v002/`，并保留全部历史源和旧模型；Grok只读该契约，不改素材。九帧命名frame-001.webp到009，各418×418。公开清单在该目录的manifest.json，字段`frames[].url`相对目录为`./frames/frame-001.webp`，Codex会按同层frames子目录复制。总235988字节。默认正面index4。不要加载原GLB、PosterFallback或greeting素材作替代。

允许修改只有：
- `src/features/avatar/CharacterSequence.tsx`（新文件）
- `src/features/avatar/CharacterSequence.module.css`（新文件）
- `src/features/content/About.tsx`
- `src/features/content/Content.module.css`，仅About选择器/必要阶段尺寸，不改变Story等共享外观
- `docs/agent-work/reports/ABOUT-SEQ-01.md`
- `docs/agent-work/evidence/ABOUT-SEQ-01/grok/`下报告/自检记录

Codex同时负责public安装、文档/scorecard、构建与独立浏览器验收，禁止双写。源代码已dirty（欢迎和命名补丁），不reset/clean，不覆盖其他文件。不提交、push、部署，不启动Blender/Grok子代理，不安装依赖。

## 具体产品行为

1. 默认展示正面，无自动播放。加载中心帧后即显示；其余加载成功后启用全部操作。控件有中文可访问名称，方向键/Home/End可逐帧；移动端左右拖动，保留纵向滚动。控件不能被aria-hidden祖先隐藏。
2. 默认指针随人物区域左右位置选择对应角度。滚动模式以About内容/页面有效滚动范围映射0～8，不能为此给全站添加多屏空白；自动播放有暂停，手动操作结束自动播放。不要用连续RAF常驻空转；只有播放需要RAF。
3. `prefers-reduced-motion`默认静态中心帧，禁用自动播放和指针/滚动驱动，仍允许滑块手动选择；运行中切换减少动态应立即暂停；重新开启由用户操作恢复。后台/离屏停止播放，不自动重播，卸载清理全部监听/observer/RAF。若使用IntersectionObserver，避免布局判断导致正常首屏不能播放。
4. 日夜主题与纸页切换无需重复下载或初始化图片，不切换用户已选角度。人物使用自带浅蓝背景完整矩形图面，避免羽化导致人物背景不一致；不通过CSS滤镜改色。不修改全站其他背景。
5. SSR/无JS/Canvas不可用时可见的中心帧img后备。中心帧成功但其他帧失败：保留同一人物静帧，给明确简短状态，不显示无关3D旧poster；所有图片不可用则有可理解空状态。不要未捕获promise rejection。
6. 避免拉伸人物；按原图比例绘制，头顶和脸不遮挡，小屏320/390无溢出；保留About纸页阅读/留言入口。可使用局部独立CSS实现控件布局。
7. About已有用户确认信息可填入：简介“I人，有点意思但不多。”，兴趣“动漫喜欢但是没空看。”，工具“AIGC/Agent技术懂点也不通。”；不编造经历。其余About功能和其他页面保持。
8. 根元素提供可检查的data属性：`data-character-sequence="v002"`、`data-sequence-state`（loading/ready/poster/empty）、`data-frame-index`（0～8）、`data-frame-count="9"`、`data-sequence-mode`、`data-sequence-playing`；实际状态对应实际解码/播放，不虚标ready。可通过onView回调更新figure caption，文案服务用户，不暴露内部工程细节。

## 检查与交付

当前基线自行读git rev-parse HEAD和dirty。先简短说明理解、文件与执行方案，然后自主完成。可运行`pnpm typecheck`/静态检查。**本轮所有浏览器操作由Codex经cua_repl完成，不准从shell/Playwright/Puppeteer启动或驱动浏览器。** 不运行旧全站脚本里的已过时3D断言；报告明确浏览器待lead验证，不伪造截图。

无需复刻实现的单元测试。交付报告记录文件、行为、检查结果、未测项、已知九帧步进限制、实际CLI模型/effort若可得。完成状态ready_for_review。预计有效编码10～15分钟，默认无进展阈值10分钟，外部网络失败明确报告；不要求等待外部服务阻塞用户任务。当前委派标准档2模块，本次仅1个完整功能。
