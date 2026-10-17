# V3 COS 访问身份与私有权限配置

2026-10-17：用户已选择“绑定受限 CAM 角色”方案，尚未回复“已绑定”；再次核验角色端点仍 404、匿名桶根仍 200。当前阻止正式发布的外部配置项；不需要把任何密钥发到聊天。

## 核验事实

- 桶：`works-1396243701`；地域：`ap-shanghai`；本站前缀：`syyh-site/`。
- 现有 `/datastore` 为 `cosfs`，参数含 `public_bucket=1`，endpoint 为 HTTP。
- 匿名 HTTPS 请求桶根返回 200；新建 marker 对象匿名 GET 返回 403。前者说明存在匿名列举权限，不等于每个对象都能匿名下载。
- 没有发现可用的 cosfs 凭据文件或凭据环境变量；CVM CAM 角色名称元数据端点返回 404。不能把当前 FUSE 缓存中的写入、读回视为私有身份和持久化已经验证。
- 当前挂载顶层仅有本站 `syyh-site`。第二版容器不依赖该挂载。首发原图已在私有 SFTP 待导入区，未导入 COS、未公开。

## 用户在腾讯云控制台完成

建议角色名 `SYYhSiteCOS`，自定义策略名 `SYYhSiteCOSPrefix`。在 CAM 新建自定义策略，选择 JSON 编辑，使用仓库内 [前缀策略草案](../../deploy/cam-cos-prefix-policy.json)；创建云服务角色，信任 CVM，关联这份策略，然后在 CVM 控制台把角色绑定到公网 IP `124.220.190.120` 对应实例。该 JSON 不含秘密，限定上海桶和本站前缀；有一个仅用于判断该桶存在的 HeadBucket 例外，不授权读取其他前缀内容。尚未在真实 CAM/COS 上验证，绑定后由 Codex测试并按拒绝结果收敛，不应附加整桶全权解决 403。

1. 将桶访问权限设为私有读写，并检查桶策略和 ACL 中的匿名授权。清除匿名列举/读取/写入；不要为解决挂载失败重新开放匿名权限。单独检查对象 ACL，避免历史对象公开。
2. 推荐创建仅供本网站使用的 CAM 角色，并绑定到这台 CVM。信任实体为 CVM 服务；不要授予整账户 COS 全权。若采用子账号凭据，在服务器私有文件配置，文件仅 root 可读，不进入仓库或聊天。
3. 访问身份只需本站前缀的读、写、列举、必要的失败对象清理，以及 COSfs 实际需要的分块上传/终止权限。不给修改 ACL、桶策略、删桶、其他项目前缀或管理 CAM 的权限。
4. 配置完成后回复“已绑定”或“已配置”，由 Codex 在服务器核验实际身份、策略范围与 HTTPS 挂载。不要发送 SecretId、SecretKey、Token。

资源范围为 `qcs::cos:ap-shanghai:uid/1396243701:works-1396243701/syyh-site/*`（另含目录占位对象本身）。列举是桶级请求，需要单独使用 `cos:prefix` 条件约束到 `syyh-site/`；不能仅靠对象资源路径限制列举。腾讯云条件键文档要求 `/` 先 URL 编码，因此草案使用 `syyh-site%2F*`。具体 action 集合按已安装 COSfs 版本的实测最小集合收敛，未验证前不声称一份策略可直接满足挂载。

已安装 COSfs 1.0.21 的帮助显示默认写入 ACL 为 **public-read**，因此新的挂载必须显式设置 `-odefault_acl=private`；仅把传输改成 HTTPS 还不够。草案将 PutObject/初始化分块上传限制为私有 ACL，不含修改对象/桶 ACL 的权限。

## Codex 随后实施和验收

宿主机文件已准备：`deploy/cvm-cos-credentials.py`、`syyh-cos-credentials.service/.timer`、`syyh-cos-mount.service`。脚本从 CVM 元数据取临时身份，禁用代理/重定向，原子写入 root 600 的 `/run/syyh-cos/credentials`，每两分钟刷新；COSfs 用 STS 文件自动重新加载。不会输出凭据字段。挂载服务显式 HTTPS/private ACL，并只挂本站前缀。**这些新文件尚未安装/启用，也未改动现有挂载**；须在角色绑定、桶私有和目录下隐藏旧内容核对后执行，不能直接启动去覆盖现有 FUSE 挂载。

- 改为经过身份认证的 HTTPS 挂载，限定本站前缀；配置持久服务与临时凭据刷新，不把 COS 凭据注入 Web/API 容器。
- 实际绑定目录保持 `/datastore/syyh-site`，root/worker 身份与 marker 校验；API 只读 `derived`，worker 才可写原件和衍生。
- 从对象服务重新读取独立探针核对 SHA；清理缓存/重建受控挂载后再次读取，验证真实持久化。
- 匿名列举、原件、草稿、衍生均拒绝；认证身份访问本站前缀成功，访问相邻前缀和修改 ACL 被拒绝。
- 验证重启/重连。挂载失效时 API/worker 关闭上传、发布与供图，保留文本草稿和撤下能力；不往未挂载的空目录写作品。
- 完成后才导入首发原图、候选环境发布、备份恢复与回滚，再切换第三版生产应用。

依据：[腾讯云 COS 条件键：HTTPS 与前缀](https://cloud.tencent.com/document/product/436/71307)、[COSfs 官方说明](https://github.com/tencentyun/cosfs/blob/master/README.md)。操作时以已安装版本与实际 API 拒绝/允许结果为准。
