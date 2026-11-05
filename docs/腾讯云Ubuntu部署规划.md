# 证明花园：腾讯云 Ubuntu 部署与 233 乐园发布规划

日期：2026-11-04；当前版本：v0.12.0。Linux 已实际部署，入口和日常推送以 [实际运行说明](LINUX-LIVE.md) 为准。以下 Docker 方案保留为其它新机器的备选安装方式，不用于覆盖当前借用服务器的已有网站。普通商城商品用钻石兑换，免广告券现金专购 ¥2／10 张；现金支付、钻石充值与广告 SDK 尚未开放。

## 当前可以直接使用的交付物

- Windows 安装包：[LeanGarden-Setup-0.11.1.exe](../dist/windows/LeanGarden-Setup-0.11.1.exe)。包含 Chromium 和 Node 运行时，玩家不需要安装开发环境。
- Android 安装包：[LeanGarden-0.11.1-local.apk](../dist/android/LeanGarden-0.11.1-local.apk)。使用系统 WebView，本地测试签名，最低 Android 8；尚未做真机验收或接入广告 SDK。
- 云端源码包：[lean-garden-cloud-0.11.1.tar.gz](../dist/deploy/lean-garden-cloud-0.11.1.tar.gz)。没有本机存档、Cookie、签名私钥、Windows Mathlib 缓存或开发工具。
- [一键上传部署脚本](../deploy/Upload-Deploy.ps1)、[服务器安装脚本](../deploy/install.sh)、[Dockerfile](../deploy/Dockerfile)、[Compose](../deploy/compose.yaml) 与 [Caddy 配置](../deploy/Caddyfile)。

两个客户端默认连接 `http://100.83.142.93:3210`，可在连接页换成将来的云端 HTTPS 地址。233 的公开用户应访问公共云端域名，不能依赖加入你的私人 Tailscale 网络。

各端默认最高画质，只保留手动最高／流畅两档。Windows 按钮控制原生全屏，安卓维持沉浸全屏。v0.11.1 客户端内置两档媒体及界面资源，连接时先比较服务器 `client-manifest.json`，只下载变动文件并保存到私有目录；先覆盖安装一次本版，之后普通资源更新不必重装。活跃度、背包、经验及更新验收见 [v0.11.1](../revisions/v0111.md)。

## 体积与环境决策

本机实测 Mathlib/Lake 目录约 7.535 GiB，Lean 工具链约 3.023 GiB，合计约 10.56 GiB。单看当前实际导入模块的必要编译产物也约 3.779 GiB，尚未加原生运行库。因此本轮按「超过 1 GB 就做联网客户端」的要求交付；这不是断言所有未来的离线移植都不可能进一步压缩。数据见 [完整测量](../artifacts/runtime-size-v09.json) 和 [依赖闭包](../artifacts/runtime-closure-v09.json)。

固定环境为 **Ubuntu 24.04 x86_64、Node 22.22.3、Lean 4.34.0、Mathlib v4.34.0**。Lean 和 Mathlib 还由 `lean-toolchain`、`lakefile.toml` 和 `lake-manifest.json` 锁定。Docker 在服务器上准备环境，不要求宿主机单独安装 Node、elan、Lean、Mathlib。自动安装 Docker 的流程采用其 [Ubuntu 官方 apt 仓库方法](https://docs.docker.com/engine/install/ubuntu/)。

建议起步预算为 4 核 CPU、8 GB 内存和 80 GB 系统盘，并留至少 40 GB 空闲用于首次构建、旧镜像和缓存。这是按两个并行 Lean 任务与构建中间层估算的容量，不是已经在腾讯云压测得到的承载量；无需 GPU，实际流量增长后再调整。

## Mathlib 如何减小并避免重复下载

1. **不上传 `.lake`。** Windows 本机缓存不作为 Linux 运行环境。源码包携带锁文件，服务器下载对应平台的官方缓存。
2. **只拉本游戏入口的依赖。** 使用 `lake exe cache get Mathlib.Tactic …` 指定六个入口，自动取得它们的依赖，避免无参数下载整套 Mathlib。该用法由 Mathlib 自带的 [Cache README](../lean/.lake/packages/mathlib/Cache/README.md) 说明。
3. **构建与运行分层。** 第一层准备工具链和 Mathlib 缓存；后续修改图片或网页不重走这一层。BuildKit 保留缓存下载目录。
4. **按真实导入关系提取运行闭包。** 当前得到 5015 个模块；运行镜像去掉 Git 历史、下载压缩包、源文件、C 对象、静态归档、Lake 构建工具及 `.ilean` 元数据，保留原生共享库和必要的 Lean 编译文件。
5. **保留必要伴随文件。** 对 4.34.0，不能只复制 `.olean`；本轮测试确认 `.olean.private`、`.olean.server`、`.ir`、`.ir.sig` 也应随所需模块保留。删掉必要文件会出现导入失败或解释器找不到声明。
6. **在裁剪后再验收。** Dockerfile 会在精简镜像中重新编译 113 个标准证明并检查第 13 关替代解法。不能只在完整构建层通过后就假设精简镜像可用。

本机 Windows 上的同一依赖闭包已经在独立精简环境完成上述验证，见 [精简运行时报告](../artifacts/reduced-runtime-v09.json)。Linux 的最终镜像大小以实际构建输出和 `/opt/garden/deploy/runtime-size.json` 为准，不能把 Windows 数值当成 Linux 实测值。

首次构建仍需下载约 580 MB 的 Linux Lean 发布包和所需 Mathlib 缓存。若服务器到 GitHub 或缓存源速度不佳，先在可访问这些来源的 Linux 构建机生成镜像，再推到自己的腾讯云 TCR，后续部署使用 `--image` 拉取成品。腾讯云的 Docker 镜像加速源仅能在其内网使用，见 [官方说明](https://cloud.tencent.com/document/product/1207/45596)；不要把该地址当成家用电脑的通用加速源。

## 一键上传并部署

先准备 Ubuntu 24.04 x86_64 服务器、公网 IP，以及可以 SSH 登录并执行 sudo 的用户。使用域名时，把域名解析到服务器，放行安全组的 SSH、80 和 443 端口；应用自身的 3210 不对公网开放。

在本机项目目录运行：

```powershell
.\deploy\Upload-Deploy.ps1 -Server 你的服务器IP -User ubuntu -Domain game.example.com -IdentityFile C:\路径\服务器密钥.pem
```

脚本会重新生成小型源码包，上传并解压到 `/opt/lean-garden`，安装 Docker，构建、验证并启动服务。首次连接需要正常确认 SSH 主机指纹；如果使用密码登录，可省略 `-IdentityFile`。

也可以手动上传源码包后，在服务器执行：

```bash
sudo mkdir -p /opt/lean-garden
sudo tar -xzf lean-garden-cloud-0.11.1.tar.gz -C /opt/lean-garden
cd /opt/lean-garden
sudo bash deploy/install.sh --domain game.example.com
```

只做 IP 内部试运行时可以不传 `--domain`；指定其他 HTTP 端口可用 `--http-port 8080`，并对应调整安全组。正式域名配置使用 Caddy 自动申请和续期证书，要求 DNS 与验证端口可达，依据 [Caddy 自动 HTTPS 文档](https://caddyserver.com/docs/automatic-https)。

已有自己构建并上传的 Linux 镜像时：

```bash
sudo bash deploy/install.sh --domain game.example.com --image 你的TCR地址/lean-garden:0.11.1
```

私有 TCR 的登录凭据在服务器上通过 Docker 正常配置，不写入源码包。

## 网页资源与弱网

客户端不再从服务器反复下载全部媒体；仍须联网检查更新、访问存档和 Lean。发布界面变动后执行 `npm run build:manifest` 并一并上传 `client-manifest.json`、`assets/preload-manifest.json` 和对应资源。当前没有自动更新原生壳或广告 SDK 的机制，这类变动仍需安装包更新。

启动时下载并缓存所有对局使用的卡片图、背景、代码与七首 BGM；图片在进入前预解码。清晰版约 27.4 MiB，流畅版约 13.9 MiB。默认使用清晰 WebP 和 128 kbps MP3；卡顿时可手动选择较小的 WebP 背景及 64 kbps MP3。矢量知识卡保持清楚；音频不会全部展开成数百 MB 的 PCM 常驻内存。

支持 Cache Storage 的来源使用持久缓存；不支持的 HTTP 来源仍使用浏览器缓存和本次会话的 Blob 资源。加载失败可以重试或手动选择流畅，不会自动降档。当前客户端及网页的后续对局、花园和 BGM 切换已经验证不再下载图片或音频。海报等仅供主动下载的文件不计入启动预加载。

后续若采用 CDN，只迁移公开静态资源，API 继续同源反代，避免破坏 Cookie 与来源校验。先保留当前同源方案，减少首次部署的配置量。

## 存档、更新与运营

进度放在独立 Docker volume，容器更新不清空。安装脚本在替换现有实例前保留一份磁盘存档备份。证书也使用独立 volume。不要用 `docker compose down -v` 做普通更新。

查看服务：

```bash
cd /opt/lean-garden
sudo docker compose --project-name lean-garden --env-file deploy/.env -f deploy/compose.yaml ps
sudo docker compose --project-name lean-garden --env-file deploy/.env -f deploy/compose.yaml logs --tail=100 app
```

普通更新重新运行同一个上传脚本；构建失败时不会先停止旧实例。应另外保存可回退的镜像标签，并定期把存档备份下载到另一位置。

当前为单进程 JSON 存档，`progress.json` 保存冒险和钱包，`accounts.json` 保存账号、密码哈希与会话摘要，两者必须一起备份／迁移。首次登录可接续当前设备未绑定的旧存档；换设备登录同一服务器账号可继续冒险。新云端实例需通过标准输入运行 `scripts/create-admin.mjs` 创建管理员，源码包和镜像不预置任何账号密码。公开流量上线前需要实际压测、入口限流与监控；若多实例运行，应先把存档改为共享数据库，并统一编译队列，不能简单复制多个写同一 JSON 的实例。

## 233 乐园与广告收入

服务器部署成功、APK 能打开游戏，与平台广告接入是两件分别需要完成的工作。当前 APK 是联机试玩包，**没有接入广告 SDK，也没有广告收入功能**。

233 的[广告联运流程](https://doc.233leyuan.com/advertise/Advertising_process.html)包含企业认证、创建联运游戏、接入 SDK 和自测；具体资质及适用发布形式以开发者后台和对接审核结果为准。[广告位申请](https://doc.233leyuan.com/advertise/Advertising_application.html)提供广告位参数及游戏关联步骤。不要先假设普通网页链接或未经平台接入的 WebView APK 就能直接分成。

发布阶段建议依次完成：

1. 在平台确认本游戏采用 Android 联运包还是其支持的小游戏形式，取得应用与广告位参数。
2. 确定正式包名和长期保管的发布签名，替换本轮的本地测试签名；Windows 发行也应使用自己的代码签名身份。
3. 依据 [官方广告 SDK 文档](https://doc.233leyuan.com/SDK/advertising_SDK.html)接入 SDK 和其隐私告知／同意流程，在平台自测工具与真实 Android 设备中验证广告及奖励回调。
4. 广告优先用于玩家自愿领取的花园装饰或额外提示，保留基础课程的正常进入与真实 Lean 验证。
5. 对照[审核标准](https://doc.233leyuan.com/operate/audit_standard.html)准备图标、截图、介绍和所需材料；不把本轮试玩包直接标记为已经具备广告联运条件。

如网站／APP 托管在腾讯云中国大陆服务器，按其[备案流程](https://cloud.tencent.com/document/product/243/18909)完成适用的首次、接入或新增服务备案，并在平台核对其他发行资质要求。这里不代替平台或主管部门判断具体材料。

## 已验证与待验证

已完成 39 项自动测试、113 个标准证明、227 个选择状态与提示检查；浏览器实际完成前三关和第 9／13 关回归。打包后的 Windows EXE 已隐藏启动、连接、预加载并完成真实证明；Android APK 已编译并验证 v2／v3 签名。部署脚本通过 Bash／PowerShell 语法与 dry-run 检查，Compose YAML 已解析，官方 Node／Lean 下载地址返回正常，约 45 MiB 的源码包已生成。

本机没有可用的 Linux Docker 守护进程，因此没有声称已经构建 Linux 镜像或部署到腾讯云；Dockerfile 在真实构建时会自动运行完整与精简层验收。Android 尚未连接真机，233 认证、广告 SDK、域名和云端账号也尚未配置。相关验证报告与本轮范围见 [v0.9 修改记录](../revisions/v09.md)。
