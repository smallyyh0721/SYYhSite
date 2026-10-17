# ABOUT-SEQ-01 第一次浏览器验收反馈

2026-10-16。九帧、日夜/纸页保角度、播放/手动停止、部分帧失败保留正面及全失败空状态已实际通过。当前第一轮不接受以下问题，限小修，不改架构或重做素材。

1. P2：CharacterSequence根onKeyDown无修饰键判断。聚焦范围滑块或模式按钮后按Ctrl+Home/Ctrl+End，被当作单独Home/End并preventDefault，浏览器无法回到页首/页尾。实际Ctrl+Home把frame改为0但scrollY仍364.5。请在处理范围按键前忽略ctrlKey/metaKey/altKey，普通Home/End和方向键保持可用。
2. About页头p和heroCopy p都重复“I人，有点意思但不多。”，桌面分别在右上和左侧重复。保留heroCopy里的用户简介，删除页头重复p即可，不另造个人经历/新文案。
3. 无JS（本地CSP阻止脚本）时中心img确实可见，但About caption和组件note永久写“人物画面载入中”。SSR默认caption用中性“人物肖像。”，组件初始note设为空；JS加载effect开始时再setNote载入文案，或采用同样简洁的正确实现。不要给无JS长期显示加载中。后备img alt“人物正面”在选择侧面但Canvas不可用时也不准确，统一“人物肖像”。

仅修改CharacterSequence.tsx、About.tsx，更新本任务报告与grok/self-check.md；不动其他文件。所有浏览器仍由Codex负责，不启动浏览器；跑相关typecheck即可。请直接做小修，不重新阅读无关大文档。完成退出后Codex重建并复测受影响路径。
