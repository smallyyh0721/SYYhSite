# P4-12 第二次生产审查反馈

同一session，allowlist仍只有两个验证脚本/自身证据与报告，不修改产品。r1工作保留，Codex尚未最终接受。用户已授权持续第二版，当前转入真实Linux候选Nginx；生产跨SSH转发在localhost8897，独立data卷，没有写现网留言。P4-12原/r1 CLI均结束exit0；不恢复代码快照。

1. `lead-linux-candidate-v027/checks.json` 暴露脚本时序问题：背景img src已切Night但naturalWidth=0就在断言；`setTheme`在目标主题已经是night时click后dataset检查立即返回，不能证明JS已可交互。About切主题及CONNECT/skip也出现未hydration点击。Windows本地很快因而没暴露，不能默认服务器一样快。Codex刚给ThemeProvider增加真实useEffect标记 `html[data-client-ready=true]`，不改UI，可作为未来构建的明确接口。

2. 所有goto后且点击/按键/DOM依赖之前等待真实clientReady；图片须匹配当前主题并真实解码/naturalWidth>0，再读取背景与岛图。不要简单多睡几秒，更不能跳过失败或改成noted。marker是新源码，8897现在旧候选未包含它；lead随后重建Linux候选。自检先用正在HMR的localhost8895，或自己的fixture明确验证等待晚到的marker、图片。有已验证class/galleryReady等接口的场景也要确保最终交互就绪。还需处理back/forward新页面或navigation后source更新的合理等待。

3. 实际Linux候选文件访问、API健康、生产build均成功，浏览器错误要照实区分loader/hydration/网路慢与产品缺陷。28项不等于所有跨主题/横竖影片在浏览器实播；最终素材即将齐备，扩展真实日夜横竖播放选择/ended(或skip)/计数与不重播，既有ffmpeg解码仍独立。不拦截真素材换fixture。仅故障场景可刻意404。禁止POST现网。

4. reports/P4-12.md 补第二次返修情况，模型从既有end可核对grok-4.7-build，effort不能伪测。r2证据独立保存，首轮和r1不覆盖。图片与模型的造型修正归Codex，不作为Grok产品修改。

当前仍需真人物的少量视觉修正，图像全由GPT；素材未齐不妨碍工具等待逻辑完成，缺项继续pending。预算20分钟有效时间未测记未测，10分钟无进展检查实际log/files；一次CLI，禁止subagent/build/deploy。
