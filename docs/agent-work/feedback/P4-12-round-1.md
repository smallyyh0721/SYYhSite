# P4-12 第一次独立审查反馈

继续同一session，文件allowlist不变，不改产品/素材/公共台账。已有脚本保留。不要重复build，Codex仍在渲染人物影片。

1. 原任务明确允许只有ffmpeg，实际 `decodeVideo` 却要求ffprobe与ffmpeg同时存在，否则直接pending。读 `assignments/P4-12-live-state.md`：lead已把真实FFmpeg7.1安装在ignored项目目录。为工具添加 `--ffmpeg` 显式路径或FFMPEG_PATH，并发现该项目路径；本机只有ffmpeg也要真正解码PNG帧并用sharp检查尺寸，必要时读取ffmpeg stderr/progress的时长/帧数/codec。ffprobe可以加精确信息，但不能成为单独硬门槛。保留无工具pending场景，给真实短测试影片做工具自测但明确fixture，不放public；不能把任意头部算可播。实际影片尚缺不妨碍把工具路径与能力落实。

2. 站点API服务不可读时目前仅noted，全部影片到位后可能acceptance通过但留言API根本未验。缺API应作为明确pending功能场景（严格退出2，allow-pending仍清楚缺项），或者服务实际有错误则失败；不能把不可读API算完整生产验收通过。仅GET，禁止POST现网。测试隔离本机API或mock故障时写清场景。

3. 原CLI已实查结束exit0，end模型键为grok-4.7-build，session01a13bbd-8363-7552-abf6-70e824d6d9e5；原events最后行可以核对，报告补充。素材快照还在变，报告按真实采样时间，不冒认所有影片/海报齐全。工程代码完成不等于全部正式艺术素材已通过。

自检修复后ready_for_review，使用独立r1证据不覆盖首轮，lead会再独立运行素材检查与浏览器。有效编码时间未测继续记未测。
