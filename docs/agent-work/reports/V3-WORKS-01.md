# V3-WORKS-01 · 真实作品总览与详情

**status:** ready_for_review

**owner:** grok

**date:** 2026-10-16

**model:** Grok 4.7

**session:** `01a143ad-f4d6-7411-8e8b-7f9a929ea1f0`

**effort:** 会话里没有单独露出的 effort 设置

**baseline:** `fe36bf919a0c2a14d93885ae8e0c0aba308c7f65`（开始时 HEAD 一致）

## 范围

把作品列表从「四张浮岛图 × 三种裁切」换成契约里的两件真实作品。`/works/` 按 `works` 顺序显示两张独立卡片，封面用各自的衍生 WebP。四类筛选保留。Her、FFF 以及对应主题路由在没有作品时显示空状态。轻箱查看封面、标题、类别、简介，并可进入详情；保留历史返回、Escape、左右方向键、焦点和对话框语义。详情按 `media` 顺序放大查看。仪玄的 `processMedia` 作为过程材料。雾尽之处按静帧分镜展示，并写明成片尚未完成，不放播放器。

可写文件：`Gallery.tsx`、`galleryModel.ts`、`WorkDetail.tsx`、`Gallery.module.css`、`GalleryMedia.tsx`、`tests/v3-works.test.mjs`、本报告。未改共享契约、路由、锁文件，未部署，未写 `/datastore`。开始前工作区里已有的其他 dirty/untracked 原样保留。

## 实际完成

列表一项作品一张卡，id 用 slug，不再按裁切拆成多件。封面只读 `work.image`（`/media/v3/works/...`），日夜切换不换成四岛环境图。筛选为全部和四个主题，排序标签是「精选」。空状态文案是「Her 她的故事 还没有作品。」和「FFF 关于未来 还没有作品。」页面上不再出现布局占位、设计研究、待补、热度、点赞或观看量。

卡片本身不再是链接。封面载入后用 `GalleryMedia` 的 `onOpen` 打开轻箱；标题是独立链接，没有自定义 click/keydown。Ctrl、Meta、Shift、Alt 加点击或 Enter/Space 不拦截，子按钮上的事件也不会被当成打开轻箱。失败图的「重新加载」不在链接里面，Enter 只触发重试。

轻箱显示真实标题、类别、副标题、简介和「完整详情」。方向键在当前筛选结果的作品之间移动。浏览器返回会关掉轻箱并回到列表 URL。「完整详情」在修饰键点击时保留浏览器原行为。

详情页显示标题、类别、简介和有序图片说明。仪玄 8 张作品图加 2 张过程材料，单张说明仍用契约里的 caption。雾尽之处 10 镜按镜号排列，封面说明对应第 07 镜，文案是「本作展示十镜静帧与镜头方案，成片尚未完成。」单张可放大，左右键在同一组内切换。载入失败时隐藏图片，保留说明和「重新加载」。无脚本时 `<noscript>` 输出原图和 alt，不生成内联脚本。

## 首轮返修

按 `docs/agent-work/feedback/V3-WORKS-01-round-1.md` 改了四件事，仍只动原允许文件。

1. 打开轻箱的键盘和点击都走 `shouldOpenFromKey` / `shouldOpenFromClick`：先排除子按钮，再用 `plainActivation` 排除修饰键和非主键。
2. 作品卡改为非交互容器。封面与标题分开，重试按钮不再嵌在 `<a>` 里。
3. 总览介绍改为「人物、场景与还在延伸的想象」，排序改为「精选」。过程说明改为「这些是过程材料，用来对照画面，不是另一件作品。」标题改为「过程材料」。十镜静帧用反馈里的那句；其他静帧方案不写死「十镜」。
4. 图片状态从 `pending` 开始，服务端不写「正在载入」。`<noscript>` 使用原始 `src` 和 alt。脚本开启后仍先探测，再进入载入、成功或失败重试。

## 文件

| 路径 | 作用 |
|---|---|
| `src/features/content/galleryModel.ts` | 一件作品一条、筛选、封面、访客文案、打开条件、noscript 标记 |
| `src/features/content/Gallery.tsx` | 列表、筛选、轻箱、历史与键盘；标题链接与封面分开 |
| `src/features/content/WorkDetail.tsx` | 详情、分镜、过程材料和逐张查看 |
| `src/features/content/GalleryMedia.tsx` | 探测载入、失败重试，以及无脚本时的原图 |
| `src/features/content/Gallery.module.css` | 两列作品卡、手机单列、分镜与查看层 |
| `tests/v3-works.test.mjs` | 契约顺序、筛选、素材文件、文案、打开条件和 noscript 边界 |
| `docs/agent-work/reports/V3-WORKS-01.md` | 本报告 |

## 自测

首轮实现时跑过：

| 命令 | exit | 说明 |
|---|---:|---|
| `pnpm typecheck` | 0 | 首轮修复 `FilterId` 导入后 |
| `pnpm test` | 0 | 当时 15 项 |
| `pnpm build` | 1 | 静态页 15/15 已生成，随后 `EBUSY`，`rmdir out` |

那次 `pnpm build` 没有跑到 `normalize-static-prefetch.mjs`。`.next/server/app/` 里当时有两个详情 HTML，列表含两件标题，ancient 只有仪玄，home 只有雾尽之处，sky / apocalypse 有对应空状态。那些页面当时没有「布局占位」「设计研究」「待补」「热度」和 `<video>`。为重试构建曾清空被锁的 `out/` 内容，目录本身删不掉。该目录不能当作本模块的静态站点。

首轮浏览器检查用本机 `next dev`（`http://localhost:8916`，Edge headless），检查的是返修前的整卡链接。开发服务器已停。返修后没有再跑浏览器。

本轮返修实际跑过：

| 命令 | exit |
|---|---:|
| `pnpm typecheck` | 0 |
| `pnpm test` | 0（17 项，0 失败） |

没有为锁定的 `out/` 再跑 `pnpm build`，也没有清空或删除它。Codex 的隔离生产副本 `production-check-1792138893761` 已通过（15 页、13 个预取别名，两个详情路径存在）。那次结果不由本轮重建。

本轮测试覆盖契约顺序、一卡一件、封面路径、空主题、20 个衍生文件、修饰键和子按钮的打开判断、noscript 的原始地址/转义/不含 `<script`，以及访客文案。测试不再把源码里的 `Escape` 或 `pushHistory` 当成交互已经正确。

## 缺口

- 本轮没有浏览器验收。修饰键、重试按钮和 noscript 的页面行为留给 Codex。
- 本机 `out/` 仍不可用。公网和 Docker 没有更新。
- 未在真机、Firefox、Safari 上操作。
- 作品仍来自源码契约，不是上传或数据库。不能据此说动态入库已经实现。
- 未读取 `D:/social_impact` 原件。
