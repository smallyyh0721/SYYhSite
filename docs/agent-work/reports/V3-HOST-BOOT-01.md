# V3-HOST-BOOT-01 · 沿用现有 COS 挂载的启动保护

**status:** ready_for_review

**owner:** grok

**date:** 2026-10-17

**model:** Grok 4.6（`grok-4.6`）

**session:** `01a1497b-295c-77d1-9312-ca2413506547`

**effort:** `high`（session `summary.json` 的 `reasoning_effort`）

**baseline:** `dccaf2a28c125ee3819ccc9b46663852c6b8680d`（开始与结束时 HEAD 一致）

**fixed candidate:** `e4d11c0ef52740a3c8d9ff21612b70a86873fedd`（未改该应用镜像）

## 任务复述

用户取消 CAM，沿用轻量服务器已有 `/datastore`（`fuse.cosfs`，SOURCE=`cosfs`，桶内 `datastore/`，`SITE_ROOT=/datastore/syyh-site`）。rc-local 启动 cosfs，Docker 可能更早起来；绑定挂载在重挂后必须重建容器。本模块只提供主机开机保护：只读 guard、oneshot runtime unit、可替换 conf 示例和 unittest。不替换挂载、不执行 SSH/部署/真实数据操作、不改其他文件、不改依赖/锁文件。

## 实际完成

`deploy/existing-store-guard.py` 使用 Python3 标准库，CLI 为 `--root`、`--store-id`、可选 `--wait-seconds`（默认 0，最大 180）。检查顺序：root 必须是绝对路径；`root` 与 `root/derived` 经 `lstat` 确认为目录且不是 symlink；两边 `.syyh-store-id` 为普通文件且内容与 `--store-id` 一致；再用固定 argv `findmnt --json -T <path> -o TARGET,FSTYPE,SOURCE`（`shell=False`）确认两者都在同一 `fuse.cosfs` 挂载上。SOURCE 只做两端一致性比较，不要求桶名。普通宿主目录即使复制了正确 marker 也会因不是 `fuse.cosfs` 被拒绝。失败打印一句原因并退出非 0。等待有界，每次循环完整重查 findmnt 与 marker，不缓存单次结果。不写文件，不读、不打印环境或密钥。

`deploy/syyh-site-runtime.service` 为 oneshot + `RemainAfterExit=yes`：`Requires=docker.service`，`Wants=network-online.target`，`After=docker.service network-online.target rc-local.service`。`EnvironmentFile=/etc/syyh/site-runtime.conf`。`ExecStartPre` 固定调用 `/usr/local/libexec/syyh-existing-store-guard.py --root ${SYYH_SITE_ROOT} --store-id ${SYYH_STORE_ID} --wait-seconds 120`。`ExecStart` 为 `/usr/bin/docker compose --env-file ${SYYH_RELEASE_ENV} -f ${SYYH_COMPOSE_FILE} -p ${SYYH_PROJECT} up -d --no-build --force-recreate --wait`。`TimeoutStartSec=300`。没有 down、删卷、回滚或改挂载服务。未执行 enable/install。

`deploy/site-runtime.conf.example` 使用公开示例：`/datastore/syyh-site`、`syyh-site-20261016-01a144bb`、`/opt/website/syyh/current.env`、`/opt/website/syyh/repository/deploy/compose.yaml`、`syyh-draft`。文件内写明正式路径需 Codex 部署验证。

## 文件

| 路径 | 作用 |
|---|---|
| `deploy/existing-store-guard.py` | 只读 COS 挂载与 marker guard |
| `deploy/syyh-site-runtime.service` | 开机校验后 force-recreate 站点容器 |
| `deploy/site-runtime.conf.example` | `/etc/syyh/site-runtime.conf` 的公开示例 |
| `tests/existing-store-guard.test.py` | 临时目录 + 注入 findmnt 的行为测试 |
| `docs/agent-work/reports/V3-HOST-BOOT-01.md` | 本报告 |

原有 dirty / untracked 未改。未改 CAM 挂载 unit、compose、应用镜像或锁文件。

## 自测

在当前 Windows 工作区、Python 3.14.2、不触碰真实 `/datastore`、不安装软件：

```
python tests/existing-store-guard.test.py
```

退出码 0。`Ran 18 tests in 0.088s`，`OK`。覆盖：有效 FUSE；普通目录即使 marker 正确；root/derived marker 缺失与不符；root/derived/marker symlink；derived 落入不同挂载；findmnt 失败与异常/缺字段 JSON；`--wait-seconds` 每次重查 findmnt；`wait-seconds=0` 不 sleep；CLI 成功/失败退出、非法 wait、相对路径、缺参。findmnt 由测试注入，未调用本机 `findmnt`，未访问 `/datastore`。

Windows 无法创建真实 symlink 时，symlink 三项回退为受控 `lstat` 伪装；Linux 上仍优先走真实 symlink。连字符测试文件不能用 `python -m unittest tests/existing-store-guard.test.py` 当模块导入，需直接运行该文件。

未做 systemd 语法安装、未 SSH、未挂载、未 `docker compose`、未主机重启。本模块不声明已在真机开机通过。

## 建议安装步骤（未执行）

由 Codex 在 Linux 主机上核对后再做：

1. 把 `deploy/existing-store-guard.py` 安装为 `/usr/local/libexec/syyh-existing-store-guard.py`，`root:root`、模式 `0755`，保留 `#!/usr/bin/python3`。
2. 把 `deploy/site-runtime.conf.example` 复制为 `/etc/syyh/site-runtime.conf`，按部署核验后的路径填写，权限收紧（建议 `root:root` `0600`），不要把该文件提交进仓库。
3. 把 `deploy/syyh-site-runtime.service` 放到 `/etc/systemd/system/syyh-site-runtime.service`，`daemon-reload`。enable/start 与真实开机演练由 Codex 完成。
4. 不要改现有 rc-local/cosfs 挂载；不要对 unit 做 `compose down`、删卷或自动回滚。

## 限制

- 当前只交付 host 运维文件，不改变固定候选 `e4d11c0ef52740a3c8d9ff21612b70a86873fedd` 的应用镜像。
- 未在 Linux 上跑 `findmnt` 真命令，未验证 systemd 在目标机的单元加载结果。
- 未声明现有 `/datastore` 挂载已通过主机重启或云端验收。
- 未启用 CAM，也未修改 `deploy/syyh-cos-mount.service`。
