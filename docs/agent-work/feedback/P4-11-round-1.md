# P4-11 首轮lead反馈

继续在原module与allowlist内返修，不改素材或其他模块。

F11-01 / P1：固定半身机位下界不符合从头到腰/上胯的要求。`rig.mjs:frameBust`用`box.min.y + height * 0.36`，对冻结1.7m人物得到0.612m，低到膝上，导致角色脸相对过小。正式角色放松手指最低约0.8m，腰/上胯约0.95m。请将下界调整为约0.47–0.49height，使用约2–3%安全余量保证头不裁切，并针对窄屏宽度优先fit保持脸可见。验证1.7m盒子/人体预期视窗下界约0.8m，保留完整头与放松双手，脚不入画；实际GLB最终由lead验收，不得把红杆fixture当真实半身通过。

F11-02 / 记录：首轮报告写“没有更细build标识”。Codex外层CLI日志`docs/agent-work/logs/P4-11/events.jsonl`的最后`type=end`包含`modelUsage`实际build key（与summary的模型族名分开）。请只读取该末行，精确model与已找到的`reasoning_effort=high`分别记录；墙钟不当有效编码时间。该项为元数据规范化，非代码缺陷。

保持父级轴/rest、闭眼morph、资源释放、首帧就绪/降级和About纸页不被破坏。原自检修复过程仍保留，追加返修结果/命令，不把它覆盖成“首轮完全通过”。准备lead独立fixture检查与稍后的真实GLB检查。
