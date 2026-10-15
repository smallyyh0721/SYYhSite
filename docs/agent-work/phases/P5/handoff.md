# 欢迎招呼原画修正 P5-06

最新发布：用户随后明确要求“先发布到正式环境”。第二版及本修正已上线[正式站](http://124.220.190.120/)，运行SHA9f9764d7970999e6749ec0780e0b5b6794ef89f9，已commit/push并验证。见[发布报告](../../reports/P4-06.md)。下方“未公网发布”仅描述本地交付时刻；当前不重复continue或恢复CLI。

2026-10-15。用户明确要求放弃欢迎界面3D展示，改用素材中的人物做动态图片。此指令覆盖P4旧欢迎影片方案；仅这个修正模块获授权，不自动执行其他P5任务或发布。

本次修正已完成并在[8896生产预览](http://localhost:8896/)独立验证，供用户视觉审核。Codex提供已有GPT原画的技术编码、共享契约和最终页面构图；Grok完成GreetingImage模块及一次具体反馈返修。无需再恢复CLI或启动Blender。

- 已通过原画：`design/v2-material-preview/v001/images/greeting-storyboard.png`、`character.png`。本次未重新生成或重画人物；保真原画副本和编码记录在`assets/source/greeting-image/v001/`。
- 活动运行资源：`/media/v2/greeting-image/storyboard-v001.webp`、`character-v001.webp`。`Gate`点击CONNECT后挂`GreetingImage`，WELCOME本身仍只有居中标题/CONNECT。Day/Night按原画上/下排，冷淡→微笑→伸手，3.5秒后一次进入四岛；保留skip/reduce/后台暂停/故障后备。
- About及其v034模型未在本次修改；旧v037影片保留为历史，不由欢迎流程请求。
- 开发站8895；用户审核入口8896已实际更新为原画版。生产clone为`logs/production-check-1792027377418`，17页面构建及15个RSC alias通过，相关源文件hash与工作树一致。
- 任务书`assignments/P5-06.md`，首轮`reports/P5-06.md`，反馈`feedback/P5-06-round-1.md`，lead脚本/截图`evidence/P5-06-lead/`。

CLI已结束：session `01a13d05-8e46-7283-b074-acac9590fb63`，两次end实际模型均为`grok-4.6-build`，均exit0；返修日志`logs/P5-06/round-1-events.jsonl`，初轮日志`events.jsonl`。旧句柄60264已结束，不恢复。8896当前PID35040/会话44034；保留所有dirty，不reset/clean/commit/push。

[独立验收](../../evidence/P5-06-lead/acceptance.md)：生产日夜6组画面与一次进入检查通过，另3项独立安全检查通过；开发自检22项。生产检查无pageerror、GLB/视频请求、横向溢出。`typecheck`通过，实际截图已更新至[可编辑审核文档](../../v2-integration-review.md)。lead在页面Gate.module.css另外加大人物并加宽顶部/两侧羽化，不记为Grok独立工作。

原画三姿态淡入不等于新逐帧肢体动画；指尖贴原画边缘的限制保留，未补画。视觉仍由用户审核。公网P2和旧私有Linux候选未更新，不宣称本次Linux/Safari/Firefox/真机验证；其余P5类别未执行。当前无需额度恢复或自动continue，等待用户反馈即可。
