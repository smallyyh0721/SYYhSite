# ABOUT-SEQ-01 已通过 V 领人物序列接入 About

**status:** ready_for_review

**owner:** grok

**date:** 2026-10-16

**model:** Grok 4.6

**session:** `01a1428d-fab0-7913-853f-16634efffc36`

**effort:** 未单独设置

**end:** 2026-10-16 10:44:34 +08:00

**repair:** 2026-10-16 第一轮浏览器验收小修（修饰键、页头重复简介、无 JS 文案）

**baseline:** `fe36bf919a0c2a14d93885ae8e0c0aba308c7f65`（结束时 HEAD 仍是这一提交；工作区原已 dirty，未 reset/clean）

**efficiency:** 未测（未单独计时）

**browser:** 待 Codex 复测受影响路径（cua_repl）；本轮未开浏览器

## 任务复述

用户确认采用 v002 V 领九帧，授权将本地网站 About 的实时 3D Avatar 换成原生 Canvas 2D 人物图片序列。沿用独立预览的指针/拖动、逐帧滑块与键盘、随滚动、自动往返播放。不启动第三版上传/安全主体，不公网发布，不改素材，不提交。

## 实际完成内容

About 去掉动态 `Avatar`、`PosterFallback` 和全窗指针跟踪，改为静态接入 `CharacterSequence`。组件读取 Codex 安装的 `public/media/v3/about-sequence/v002/manifest.json`，`frames[].url` 相对目录解析为 `./frames/frame-00N.webp`。先解码正面 index 4 并显示，其余八帧成功后才标 `ready` 并打开全部操作；默认不自动播放。

绘制按原图 1:1 contain，填充色 `#e8edf1` 与人物自带浅蓝矩形一致，无滤镜、无插帧、无镜像、无缩放伪转头。Canvas 不可用或尚未画上时保留中心帧 `img` 后备。中心成功而其余失败为 `poster` 静帧；全部失败为可理解空状态。`decode()` 与 `fetch` 均捕获，无未处理 rejection。

指针模式按人物区域左右位置选帧；触屏需按下后左右拖动，`touch-action: pan-y` 保留纵向滚动。滚动模式映射页面现有 `scrollHeight - clientHeight` 到 0～8，页面不可滚则保持当前帧，未增加空白。自动播放为余弦往返，仅播放时申请 RAF；滑块、键盘、指针按下、切模式会停止播放。`prefers-reduced-motion` 默认静正面、禁自动播放与指针/滚动驱动，滑块仍可用；运行中打开减少动态立即暂停，关闭后不自动重播。后台与真正离屏停止播放，不自动重播。IntersectionObserver 只用 20% rootMargin 判断离屏停播，不作为起播条件。

日夜与纸页不重新下载或初始化图片，不改已选角度。简介只写在 heroCopy；页头不再重复该句。兴趣/工具填入用户原文；经历仍为「还没有提供。」纸页阅读与去留言保留。

第一轮验收小修：根键盘在 ctrl/meta/alt 时不处理、不 preventDefault，普通方向键与 Home/End 仍逐帧。无 JS 时 caption 为「人物肖像。」，组件初始 note 为空，加载 effect 开始后再写载入文案。后备 img alt 统一「人物肖像」。

可验接口：根元素 `data-character-sequence="v002"`、`data-sequence-state`（loading/ready/poster/empty）、`data-frame-index`（0～8）、`data-frame-count="9"`、`data-sequence-mode`、`data-sequence-playing`。`onView` 更新 figure caption，不暴露工程细节。

## 文件列表

| 路径 | 作用 |
|---|---|
| `src/features/avatar/CharacterSequence.tsx` | 新：九帧加载、Canvas 绘制、指针/滚动/播放/减少动态 |
| `src/features/avatar/CharacterSequence.module.css` | 新：方形图面与控件局部布局 |
| `src/features/content/About.tsx` | 替换 3D Avatar，填入已确认文案，去掉 aria-hidden 舞台 |
| `src/features/content/Content.module.css` | 仅 About 选择器与阶段尺寸 |
| `docs/agent-work/reports/ABOUT-SEQ-01.md` | 本报告 |
| `docs/agent-work/evidence/ABOUT-SEQ-01/grok/self-check.md` | 静态自检 |

未改 public 素材、Avatar/PosterFallback 源、Story `.frame`、锁文件、其他页面。未 commit/push/deploy，未开浏览器，未开 subagent，未装依赖。

## 命令

```
git rev-parse HEAD
pnpm typecheck
```

HEAD `fe36bf919a0c2a14d93885ae8e0c0aba308c7f65`。`pnpm typecheck` 退出码 0。

## 已测

| 检查 | 结果 |
|---|---|
| TypeScript | `tsc --noEmit` 通过（初交与第一轮小修后均 0） |
| 禁止替代素材 | CharacterSequence/About 无 GLB、poster、greeting、R3F 引用 |
| Story 共享外观 | `.frame` 仍为 16/9，未改章节布局 |
| 数据属性与状态机 | 源码按解码结果写 loading/ready/poster/empty，不预先标 ready |

## 未测 / 限制

- **浏览器待 Codex/lead 经 cua_repl 验证。** 本轮未启动或驱动浏览器，无截图。
- 真机触屏、Firefox、Safari、生产 build、操作系统级减少动态开关
- 中心帧成功/其余失败、全部失败的网络拦截路径只有代码，未在浏览器注入故障
- 有效编码耗时未单独计时

**已知九帧步进限制：** 素材是 9 张 AI 关键帧，不是连续 300 帧。直接切真实帧，发丝/身份/光照可能在相邻帧间跳动；`yawTargetDegrees` 是提示目标，不是标定相机角。要更连续需要更多一致素材，增加播放器逻辑不会改善画质。

## 产品行为对照

1. 默认正面、无自动播放；中心帧显示后加载其余；齐套后启用指针/滚动/播放/滑块。控件中文名称；普通方向键/Home/End 逐帧，Ctrl/Meta/Alt 组合不拦截页首页尾。触屏左右拖、纵向可滚。控件不在 aria-hidden 祖先内。
2. 默认指针映射人物左右；滚动用页面有效滚动范围；播放可暂停，手动即停。仅播放使用 RAF。
3. 减少动态：静帧 + 滑块；切换到 reduce 立即停播；恢复不自动重播。hidden/离屏停播。IO 不起播。
4. 主题/纸页不重新拉图，不改角度。人物浅蓝矩形图面，无滤镜。
5. SSR/无 JS/无 Canvas：中心帧 img，caption「人物肖像。」，note 为空；JS 开始加载后再出现载入文案。部分失败保留同一人物静帧。空状态可理解。
6. contain 原比，头顶不盖控件。About 纸页与留言保留。
7. 简介只在 heroCopy；经历未编造。
8. 根元素 data 属性与真实状态一致。
