# SYYH Signal · 日夜与四岛审核 v2

打开 `index.html`；无需安装依赖。PNG 是交付图，主题图还提供 SVG。仅为静态设计，未搭建生产网站。

- `theme-comparison.png`、`theme-day.png`、`theme-night.png`：全站颜色与控制的布局示意；不是已经运行的主题功能。
- `islands/01-sky-city.png`：天空之城 Day / Night。
- `islands/02-ancient-landform.png`：远古地貌 Day / Night。
- `islands/03-apocalypse-planet.png`：末日星球 Day / Night。
- `islands/04-anime-home.png`：二次元宅岛 Day / Night。
- `theme-proposal.json`：候选 theme token，尚未合并到原有 tokens。
- `contrast-check.json`：候选正文、次要文字、按钮和控件边框的对比检查；hairline 仅为装饰。
- `image-prompts.json`：本轮所有最终提示词。内置 image_gen 模式；无 CLI 或 API key 路径。
- `../../docs/design-proposal-v2.md`：v2 设计决定。
- `../../docs/implementation-plan-v2.md`：真实 3D、鼠标镜头、进入/返回与性能方案。
- `../../docs/visitor-avatar-plan.md`：已澄清的入口右侧 3D 人物、视线/头部/上身跟随方案，具体形象后续设计。四岛完整 3D 尚为可选项。

所有概念图是光照与建模参考，尚非 GLB 模型。四岛共享视角语言，最终模型使用相同几何切换日夜；概念图左右侧细节可能有小差异。
