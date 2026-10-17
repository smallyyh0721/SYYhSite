# V3-HOST-BOOT-01：沿用现有 COS 挂载的启动保护

基线 dccaf2a28c125ee3819ccc9b46663852c6b8680d，应用固定候选 e4d11c0ef52740a3c8d9ff21612b70a86873fedd。用户授权继续开发/部署，取消 CAM，直接使用轻量服务器已有 /datastore 挂载。原有 dirty 全部保留。

允许新增且仅限：deploy/existing-store-guard.py、deploy/syyh-site-runtime.service、deploy/site-runtime.conf.example、tests/existing-store-guard.test.py、docs/agent-work/reports/V3-HOST-BOOT-01.md。报告和代码由 Grok 独占这些文件，其他文件不改；不执行 SSH、部署、挂载或真实数据操作。不创建 subagents。不修改全局配置/依赖/锁文件。

目标为完整的主机开机保护模块，预算 20–30 分钟，无进展检查阈值 10 分钟。先简述理解后实现。沿用有效 Grok 模型配置，记录实际 model/effort/session。

## 实际事实与边界

已有 rc-local.service 启动 cosfs，Docker 可能更早启动；容器绑定挂载在重新挂载后不保证自动跟随，必须重新创建。应用 API/worker 已有 store marker 失败关闭逻辑。宿主 /datastore 为 fuse.cosfs、SOURCE=cosfs，桶内映射 datastore/，SITE_ROOT=/datastore/syyh-site。已验证 UID1000 容器写入、COS 独立读回 SHA、两次全新只读 HTTPS 挂载后相同 SHA。既有挂载无需 CAM；不自行替换挂载。不要假设 findmnt SOURCE 显示桶名。

## 交付

1. Python3 标准库只读 guard，CLI 参数 --root、--store-id、可选 --wait-seconds（默认0，最大180）。必须确认 root 是绝对路径、目录和 root/derived 都不是 symlink；root 和 derived 中 .syyh-store-id 为普通文件且匹配；拒绝缺失、错误 marker、非 fuse.cosfs 的普通宿主目录（即使复制了 marker），I/O错误；使用 subprocess 固定 argv 调 findmnt --json -T ... -o TARGET,FSTYPE,SOURCE。校验 root 和 derived 均落在同一真实 COS 挂载上，避免嵌套本地挂载。禁止 shell=True；不改文件，不扫描/打印环境或密钥。失败退出非0，输出简短明确原因。等待有界，稳定判断必须每次重查，而非单次缓存。
2. systemd oneshot RemainAfterExit 的 syyh-site-runtime.service：Requires=docker.service；Wants=network-online.target；After=docker.service network-online.target rc-local.service。EnvironmentFile=/etc/syyh/site-runtime.conf，由 root 配置下面可信值：SYYH_SITE_ROOT、SYYH_STORE_ID、SYYH_RELEASE_ENV、SYYH_COMPOSE_FILE、SYYH_PROJECT。ExecStartPre 固定 /usr/local/libexec/syyh-existing-store-guard.py 带参数和 --wait-seconds 120；ExecStart=/usr/bin/docker compose --env-file ${SYYH_RELEASE_ENV} -f ${SYYH_COMPOSE_FILE} -p ${SYYH_PROJECT} up -d --no-build --force-recreate --wait。TimeoutStartSec=300。不 down、不删卷、不自动回滚、不更改挂载服务、不打印 env，不自动 enable/install。
3. conf.example 写公开可替换示例，COS根/datastore/syyh-site、STORE_ID=syyh-site-20261016-01a144bb、env /opt/website/syyh/current.env、compose /opt/website/syyh/repository/deploy/compose.yaml、project syyh-draft。警告正式路径需 Codex 部署验证，本模块不声明已主机重启通过。
4. Python unittest 行为测试：有效FUSE；普通目录即使marker正确拒绝；root/derived marker缺失/不符；symlink；derived落入不同挂载拒绝；findmnt失败/异常JSON拒绝。使用临时目录和受控 findmnt 调用依赖，避免触碰真实 /datastore，不安装软件。可用 importlib 加载连字符文件。验证 CLI 基本参数/失败退出，不写冗余镜像实现的断言。
5. 报告运行命令与结果、限制、安装步骤建议、model/effort/session（可查则记录），不冒充已部署/真机重启/云端验收。

Codex 将在 Linux 独立测试、审查 service，安装与真实启动由 Codex 完成。当前文件仅 host 运维模块，不改变固定候选应用镜像。
