# V3-WORKS-01 · 真实作品总览与详情

## 基线与归属

- 基线 HEAD：`fe36bf919a0c2a14d93885ae8e0c0aba308c7f65`。工作树已有大量历史 dirty/untracked，必须保留；不得 reset/clean/覆盖不在授权范围内的文件。
- Codex 已整理共享契约 `src/lib/contracts.ts`，其中 `works` 现有 2 件真实首发作品，`Work.media`/`processMedia` 定义了有序图片，四岛环境图独立于作品封面。20 张衍生 WebP 已在 `public/media/v3/works/`，原件和 SHA 台账在 `docs/agent-work/v3-first-works-media-manifest.json`。这些文件归 Codex，Grok 只读。
- Grok 可编辑：`src/features/content/Gallery.tsx`、`galleryModel.ts`、`WorkDetail.tsx`、`Gallery.module.css`、`GalleryMedia.tsx`，以及为该模块新增的 `tests/v3-works*.test.mjs`。其他文件只读。若必须改共享契约、路由或构建配置，先报告，不要双写。
- 预计有效开发 35–55 分钟；无可验证进展超过 10 分钟时 Codex 检查 CLI/session/文件。允许一个 Grok CLI 任务，无 subagents。

## 目标

把 V2 的“4 张浮岛图 × 3 裁切 = 12 个布局占位”替换为**两件真实作品**的可用展示模块：

1. `/works/` 两张独立作品卡，各用自己的真实封面，排序遵从 `works`；四类筛选仍在，Her/FFF 没有作品时给自然的空状态，不显示任何布局占位、设计研究、待补、假热度等字句。
2. `/works/themes/ancient/` 仅仪玄作品；`/works/themes/home/` 仅《雾尽之处》；另外两类空态准确。页面保持站点既有视觉语言与日夜适配、桌面/手机可用。
3. 列表轻箱可查看作品封面与真实标题/类别/简介，并能到完整详情；保留现有浏览器历史/返回、键盘 Escape/箭头、焦点管理与无障碍语义。不要把同一作品多张图片伪装成多件作品。
4. `/works/[slug]/` 详情显示真实标题、类别、描述、全部有序 `media` 大图及 captions。仪玄 `processMedia` 显示为参考/构图材料；《雾尽之处》十镜作为**静帧分镜**展示，明确没有已完成视频，不渲染视频播放器。图片可逐张放大/查看，手机可滚动，加载失败保留可读后备。
5. 文案尊重素材来源：仪玄为非官方同人；《雾尽之处》为短片方案/静帧，不声称已拍成影片。无日期、客户、观看量等未提供事实。

## 接口与素材例子

`works[0]`：`slug='yixuan-football'`，`themeId='ancient'`，`image='/media/v3/works/yixuan-football/01-cover.webp'`，8 张 `media`、2 张 `processMedia`。

`works[1]`：`slug='mist-exit-ten-shots'`，`themeId='home'`，封面第 07 镜，10 张有序 `media`，无 `processMedia`。

不得读取或复制原始 `D:/social_impact` 文件；公开仅引用已准备的衍生图。当前系统仍为静态导出；动态入库和上传属于后续模块，本任务不能宣称已实现。

## 启动、验证与交付

- 开始时简短复述理解与文件边界，随后自主实施。
- 至少执行 `pnpm typecheck`、`pnpm test`、`pnpm build`，记录 exit code；如单项失败判断是本任务还是基线问题。检查静态输出存在两个详情路径。
- 在 `docs/agent-work/reports/V3-WORKS-01.md` 写交付摘要、自测命令/结果、缺口、实际模型/effort/session（如可见）。该报告文件也是 Grok 授权可写。
- 不部署、不写 `/datastore`、不改共享契约/lockfile、不给虚假验收结论。Codex 做独立验收和评分。
