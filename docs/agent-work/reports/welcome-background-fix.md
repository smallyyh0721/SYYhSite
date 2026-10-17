# 欢迎全屏原画与四岛正式命名修正

日期：2026-10-15（北京时间）。本轮为用户明确要求的局部补丁；第三版 26 项主体任务仍未启动。交付为本地生产预览，未 commit、push 或发布线上。

## 完成内容

- CONNECT 后的人物招呼画面，使用原画单格及原画环境不透明铺满屏幕，按比例 cover 裁切；移除局部人物框、羽化和模糊天空叠层。此阶段不再挂载原先 GateSky 背景。
- 保留三姿态淡入、日夜排选择、3.5 秒一次进入、跳过、减少动态、后台暂停及加载失败后备。后备人物原图同样铺满，横屏从顶部取景，竖屏放大上半身以避开顶栏遮脸。
- WELCOME / CONNECT 首屏继续使用原背景。其他页面环境与素材未改，About 人物与留言数据未改。
- 四岛、作品分类 / 筛选、占位作品标题、详情导航与静态页面标题采用正式名称：**Her 她的故事 / ZZZ 绝区零二 / FFF 关于未来 / COS 次元冲突**。沿用原稳定 ID 和深链接。
- 手机岛屿切换按钮改为两列，说明区域上移，避免完整名称增加宽度后遮挡说明。320 / 390 宽度按钮区与说明区间隔均为 22px，无横向溢出。
- 用户填写的第三版输入原样保留。计划与 agent 入口补充本轮授权边界、新名称及后续仍需细化的内容；本地确认所给作品样本路径存在，但没有导入或发布该作品。

## 验证证据

本地生产预览：[http://localhost:8896/](http://localhost:8896/)，点击 CONNECT 查看人物招呼。使用当前工作树的独立生产副本构建，路径见 `docs/agent-work/logs/current-production-check.json`；本轮六份运行源码与副本 SHA256 一致。

| 检查 | 实际结果 |
|---|---|
| `pnpm typecheck` | 通过；最终生产构建也通过 TypeScript 检查 |
| 生产构建 | 17 个静态页面、15 个预取数据别名生成成功 |
| 原画流程 | 6 组通过：日夜 1440×900、日夜 390×844、Day 320×568、Night 320×844；冷淡→微笑→伸手，只进入 Hub 一次；无页面错误、GLB 或影片请求 |
| 跳过 / 动态 / 故障安全 | 3 项通过：运行中切换减少动态并后台暂停、双图失败后进入、图片加载期间可立即跳过 |
| 网站回归 | 23 项通过、0 失败、1 待验证；四主题进入、分类筛选、大图 URL / 返回、About、Story、手机两次点按、320 / 390 布局、无 API 写入等通过 |
| 全屏与命名布局 | 1920×1080 原画、横竖后备画面的边界覆盖视口；招呼阶段 GateSky / wash 数量为 0，mask 为 none；首屏 GateSky 为 1。320 / 390 Hub 正式名称均完整，说明与按钮不重叠 |

网站回归中的 **1 项待验证为本地留言只读 API**：本轮本地 API 未启动，返回 502，脚本按 `--allow-pending` 记录；未将其算作通过，未提交留言或接触真实数据。本轮没有改动留言服务。

证据目录：

- [原画六组流程与截图](../evidence/welcome-background-fix/greeting/)
- [三项安全路径](../evidence/welcome-background-fix/safety/checks.json)
- [最终网站回归](../evidence/welcome-background-fix/site-final/checks.json)
- [全屏边界与手机命名布局记录](../evidence/welcome-background-fix/layout/inspection.json)
- [后备画面最终取景记录](../evidence/welcome-background-fix/layout/fallback-final.json)

## 文件与限制

运行修改：`src/features/gate/Gate.tsx`、`Gate.module.css`、`GreetingImage.tsx`、`GreetingImage.module.css`、`src/features/world/World.module.css`、`src/lib/contracts.ts`。回归脚本 `scripts/check-v2-site.mjs` 同步正式名称断言。原画及其他背景文件没有改动。

本轮没有制作新图。现有分镜单格为方幅，铺满横竖屏时会裁切并放大；不是新的逐帧动画或更高分辨率素材。已实际查看桌面、手机、后备及正式名称截图；未做 Safari、Firefox 或真机检查。公网未更新，正式域名 / HTTPS 与上传管理仍属于后续第三版范围。
