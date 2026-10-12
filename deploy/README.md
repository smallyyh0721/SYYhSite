# Draft v1 Docker / 运维

目标为 Linux/amd64，开发系统是 Windows；生产环境全部在Linux容器中构建和运行。`Dockerfile`固定基础镜像digest，pnpm依赖用同一lockfile安装。Web为Next静态导出的Nginx镜像，API为Fastify/Node24内置SQLite，API端口不公开。

## 本机

PowerShell若Docker未在PATH，先仅为当前进程补路径：

```powershell
$env:PATH = 'C:\Users\yonghao.yu\AppData\Local\Programs\DockerDesktop\resources\bin;' + $env:PATH
docker compose --env-file deploy/.env.example -f deploy/compose.yaml build
docker compose --env-file deploy/.env.example -f deploy/compose.yaml up -d --wait
```

访问 `http://127.0.0.1:8080/`。本机默认数据卷 `syyh-draft-local-guestbook` 与云端独立。停止用 `docker compose -f deploy/compose.yaml down`，不要加 `-v`，保留数据。

普通前端开发 `pnpm install --frozen-lockfile` / `pnpm dev`；另开终端 `pnpm --filter @syyh/guestbook start`，服务监听3001。开发模式代理 `/api/` 到3001；生产只由Nginx代理。工程需Node24，Node内置SQLite仍带experimental警告，升级Node之前跑API测试。依赖变更由lead维护锁文件。

## 云端发布

1. 本机构建、测试候选；提交并推送 `codex/draft-v1`，取得完整SHA。
2. 通过已有服务器登录方式传 `cloud-release.sh` 或在SSH内运行其确定版本。私钥始终留在本机。
3. `bash cloud-release.sh FULL_SHA` 会在 `/opt/website/syyh/repository` 拉同一版本、按有限并发配置进行Linux构建、Compose运行，HTTP80。配置/日志在checkout外，云端卷 `syyh-draft-cloud-guestbook`。
4. 检查公网主页、全部深链、GLB、API、404，进行真实浏览器复核。IP HTTP是本阶段draft预览；域名与TLS留待后续正式建设。

云端使用 `sudo -n docker`。基础镜像在本次实测可通过现有daemon拉取；不需要修改Docker mirror或传整份生产镜像。Git/cloud npm具体耗时记录在本阶段报告。

若云端GitHub暂时超时，在已推送分支的本机执行 `git bundle create draft-v1.bundle codex/draft-v1`，记下SHA256，通过SCP传至云端，核对同一SHA256。用 `bash cloud-release.sh FULL_SHA /tmp/syyh-draft-v1.bundle` 从bundle恢复Git对象并保留GitHub origin。本机仍先验证同一提交的Linux镜像；云端照常从同一SHA构建，不传node_modules/数据库/密钥/整份镜像。已有cloud checkout不能含未提交修改；脚本会保留并停止。bundle传输耗时与构建耗时分开记录。

## 审核与备份

在cloud checkout内，替换 `RELEASE_ENV` 为 `/opt/website/syyh/releases/<完整SHA>.env`：

```bash
sudo -n docker compose --env-file RELEASE_ENV -f deploy/compose.yaml exec -T api node moderate.mjs list
sudo -n docker compose --env-file RELEASE_ENV -f deploy/compose.yaml exec -T api node moderate.mjs approve 123
sudo -n docker compose --env-file RELEASE_ENV -f deploy/compose.yaml exec -T api node moderate.mjs reject 123
sudo -n docker compose --env-file RELEASE_ENV -f deploy/compose.yaml exec -T api node moderate.mjs backup /data/backup-YYYYMMDD.sqlite
```

公开GET只返回approved；无公网管理接口。备份使用SQLite在线一致性快照，不直接复制有WAL的主文件。备份不会覆盖同名文件。用docker compose cp将备份导出到受控位置，备份含访客留言，不能提交Git。恢复时先停API，在独立新卷导入快照并验证；按验证结果切换DATA_VOLUME，保留原卷。阶段1验证使用本机测试数据与独立测试库；云端不放虚构已审核留言。

## 更新与回滚

每次先验证新候选再推送，用完整SHA执行release脚本。镜像tag为SHA，保留旧镜像及其env文件。回滚到已存在旧镜像：用旧env文件 `docker compose ... up -d --no-build --wait`；数据卷保持一致，先核对迁移兼容性。首次部署没有既存旧站，本版不声称实测过历史版本回滚。不要 `docker system prune` 或删除数据库卷来解决构建问题。

每个容器有健康检查、restart、内存上限及10MiB×3日志轮转。API输入4KiB上限、Unicode24/140、IP限流、持久化幂等和pending队列上限；单机内存限流计数重启会重置。重度公开使用的持久化限流/内容管理/监控在后续正式建设完善。
