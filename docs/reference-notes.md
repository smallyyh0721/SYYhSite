# SYYH Signal · 参考研究与草稿差距

研究日期：2026-10-12。依据：README、HANDOFF、品牌规范、站点图、现有组件源码、线上 HTML，以及工作区 `../ref-study/` 已有截图和源码。此次浏览器连接失败（Chrome `nodeRepl.fetch request failed`，IAB timeout），所以没有完成新一轮 1440/390 实时截图、鼠标轨迹及逐帧实测；已有抓图不能冒充此次实测。详见 `design/review-v1/references/access-log.json`。以下区分可见事实、源码证据与本项目设计决定。

## 1. RIKKAzzz — 入口、空间感与访客引导

- URL：https://rikkazzz.com/ 。本次 HTTP 200，页面标题 `RIKKAzzz // Personal Reality`。
- 已有 1440 截图：`../ref-study/shots/rikkazzz-1440/settled.jpg`、`_sheet-click.jpg`；390：`../ref-study/shots/rikkazzz-390/after-click.jpg`。
- 可见事实：浅青入口、大量留白、坐标与细线、中央椭圆；点击后为多色放射视频，再进入蓝天浮空建筑与半透明身份面板。移动端有底部场景操作区。它不是当前草稿的黑底漫画风。
- 截图文件时间是录制经过时间，不能当成稳定的产品动画时长。已有点击图约 2.3–4.1 秒呈放射图像，约 5.3 秒已呈世界画面；仅描述该次录制。
- 已有源码及本次重新获取的 `app.js` / `styles.css` 一致显示：入口使用 video/audio；鼠标归一化 x/y，场景旋转约 ±1.2°/±1.6°，深度层位移约 `x*depth*30px` 和 `y*depth*20px`。CSS 位移过渡 240ms，立体透视 1200px。**这是场景视差证据，不能证明其用鼠标在四座岛间大范围飞行。**
- SYYH 决定：保留进入另一个世界的仪式、线条坐标、访客昵称及上下左右鼠标移动；采用自有夜色广播世界和 SVG 浮岛。飞行范围与吸附是按需求设计，不声称复制参考实测。

## 2. RyuSe1 — 主视觉、作品节奏

**2026-10-14复核与最新要求：** 已通过浏览器打开首页及 `#/gallery`。首页有主视觉轮播/暂停与精选作品；Gallery桌面截图为三列图片，提供分类与Newest/Popular控件；点击作品成功打开含大图、标题、日期、分类、序号及Close/Previous/Next按钮的dialog。本轮未可靠复核筛选/排序/相邻切换结果、键盘、手机和动效时长。用户现要求作品展示复刻其交互并保持本站配色，全站取消单线条与方框；因此下文旧“保留横向作品胶片”建议不再作为下一版方向。完整规划见[第二版素材清单](agent-work/v2-asset-gap-checklist.md)。

- URL：https://ryuse1-studio.com/ 。本次 HTTP 200。
- 已有 1440/390 `settled.jpg` 均可用：首页浅紫白底；左侧一句大标题、简介与 CTA，右侧角色主视觉；底部作品序号与轮播暂停按钮。手机改为文字在上、角色图在下，顶部折叠菜单。
- 已有 Gallery 抓图 `_top.jpg` 大面积空白且有失效图片，不作为有效布局证据；旧 `probe.json` 显示 61 个 img、40px Gallery 标题、Zen Maru Gothic。本次 `/gallery/` 返回 404，而首页源码内置 `galleryHTML`、`PAGES` 和 `openLightbox`：`.masonry` 为自适应三列图片网格，lightbox 有 dialog、关闭、前后切换和底部说明。它是源码中的内置页面，不能把错误子路径当成整站不可用。没有可靠的新打开行为实测，不能把 HANDOFF 的横向条带描述成参考站事实。
- SYYH 决定：作品先获得大面积主视觉，再给编号和简介。桌面保留自己的横向作品胶片；手机用竖排作品。详情提供独立 URL、关闭返回及完整作品说明。

## 3. Cyber Steffie — 人物与阅读

- URL：https://steffieharner.netlify.app/ 。本次 HTTP 200；另参考 `/about/`。
- 已有首页和 About 桌面/手机截图、`probe.json`：暗蓝背景、紫粉人物摄影、顶部导航、三张并排肖像、下方按年份叙述经历。About 是正常滚动阅读，没有大型场景导航。
- SYYH 决定：About 以一个真实的人为主角，主视觉与短自述之后接兴趣、工具与时间线；保持自然滚动与舒适行长，增加自有 Paper 阅读视图。职业、履历与工具尚未证实，设计图用明确示例，不将草稿经历当真实资料。

## 4. Cyberfiction — 滚动控制叙事

- URL：https://cyberfiction-five.vercel.app/ 。本次在线抓取失败；依据已有 `../ref-study/cyber/{index.html,script.js,style.css}`、`shots/cyber-scroll/_sheet.jpg`。
- 可见事实：白色背景，居中三维人物随滚动旋转，左右黑色大字按章节变化。
- 源码证据：Canvas 2D + 300 张图片 + GSAP ScrollTrigger + LocomotiveScroll；`scrub:0.15`，Canvas pin 区间到 `600% top`。这是该本地源码值；未经此次线上比对。图片函数含前导空行，不应照搬其下标逻辑。
- SYYH 决定：借用“滚动是剪辑台”的方式，拍一段自有浮城叙事，字幕和章节跟随进度；暂以三幅关键画面说明，不宣称已有影片。实现优先原生滚动 + GSAP，不引入第二套平滑滚动。不要直接一次解码 300 张大图。

## 5. 当前草稿的差距（源码审阅）

| 范围 | 当前情况 | 审核稿决定 |
|---|---|---|
| 入口 | 3:4 空槽，手机直接隐藏；长标题和控件层次需加强 | 自有线稿 KV；手机仍保留缩小的品牌视觉，游客按钮优先 |
| 世界 | 已有 pointer/wheel camera、340px 吸附、210px focus、650ms dive | 把“移动”和“进入”明确分离；鼠标不在 UI 上驱动相机；加入暂停视角、缩略图、方向键与触摸拖动 |
| 点击语义 | 未聚焦的岛点击会 `aimAt` 并移动相机 | 普通鼠标点击只进入已聚焦岛；未聚焦只显示提示。键盘/辅助导航可明确选择频道 |
| 作品 | 大多数为漫画音效占位，VIEW WORK 无动作 | 自有概念图展示视觉节奏；生产阶段替换真实作品、详情路由、焦点恢复 |
| About | 虚拟介绍、工具与时间线 | 标示为示例，审核后再录入真实信息；Night/Paper 两套可读设计 |
| Story | 三个框，没有序列帧播放 | 提供关键帧分镜与独立渲染模块方案 |
| Board | 链接为 #，留言只有说明 | 联系方式待录入；公开留言须服务端持久化和审核；不伪造留言 |
| 路由 | React 内部 screen 状态，无 deep link | 独立内容 URL，刷新/后退可用；客户端转场保持世界上下文 |
| 性能 | easing 按帧，RAF 一直跑 | 时间归一化 easing、不可见暂停、缓存帧、按路由懒加载 |

## 尚待复核

继续补齐：四站新的 1440/390 对照截图，RIKKA 入口视频时长与鼠标轨迹、RyuSe1 Gallery 筛选/排序/相邻切换结果与手机版/键盘/动效细节、Cyberfiction 手机版和序列帧加载。RyuSe1 的桌面 Gallery 与点击打开大图已在2026-10-14观察，见第2节增补；其余复核是研究遗留项，不应拿估计值标注“实测完成”。
