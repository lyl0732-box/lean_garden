# Linux 实际运行说明

游戏入口：[https://162.14.77.140](https://162.14.77.140)。无需 Tailscale。网页、Windows、Android 连接这个地址并登录同一账号，即可继续同一份云端冒险。新安装包默认使用此地址；已有安装保留原先的手动地址，可在连接页更换。

v0.12.1 起，本机双击根目录 `管理用户与监控服务器.cmd` 可实时查看用户、在线状态、整机 CPU/内存，修改背包、账号角色与密码。管理接口只通过 SSH 和服务器本地私有 socket 访问，详见 [监控与用户管理说明](服务器监控与用户管理.md)。

2026-11-04 首次复制本机数据：2 个账号、40 个历史存档、65 条已完成证明。账号密码保持原样，原本机数据与备份保留。**此后本地与云端分别保存进度**；跨端游玩请统一使用云端。推送脚本只更新程序，不会把本地进度覆盖到云端。

## 后续更新

在本机完成修改后，双击项目根目录的 [推送到服务器.cmd](../推送到服务器.cmd)。需要保留本机已配置的 `deploy/.private/` 部署密钥；不需要在脚本中写 SSH 密码。这个目录已从 Git、Docker 构建和源码包中排除。

脚本先构建资源清单和 Garden，再比对文件内容哈希，只上传有变化的代码、媒体及本项目的编译模块。没有变化时上传 0 文件，已实测；一次小修补约 52 KB。服务器验证哈希后切换版本，再运行真实 Lean 健康检查；失败回退原版本。每次有实际更新时另外备份账号和进度，最多保留三个备份与三个代码版本。

普通界面和媒体更新无需重装客户端，登录页“检查更新”即可获取。修改原生登录窗口或系统功能时，需要重新打包安装。新加入的 Mathlib 依赖不在首次运行闭包中时，应先补齐云端运行库；健康检查不会把缺依赖的版本视为成功。

0.13.4 起为无广告、无现金内购版。直发 Android 用户可在连接页检查更新并覆盖安装，移除旧 APK 里的广告 SDK。云端增量发布会随 APK 更新清单发布对应的直发安装包。

## 运行位置

- 根目录：`/home/ubuntu/lean-garden/`。
- `current`：当前代码版本的符号链接；`releases/` 保存回退版本。
- `data/accounts.json` 与 `data/progress.json`：实际玩家数据，独立于代码更新。
- `runtime/lib/lean/`：按依赖闭包提取的 Lean 编译模块。
- `tools/`：独立的 Node 22、Linux Lean 4.34.0、证书工具，不替换系统 Node。
- `deploy/lean-env.json`：Lean 环境配置；`backups/` 为更新前存档备份。
- `tls/`：游戏自己的证书与续期配置；没有复用服务器其他网站的私钥。

Lean 运行依赖约 4.4 GiB，初次编译模块压缩包约 1.20 GiB。日常增量发布使用精选运行资源、转码音乐和新版本的直发 APK。小游戏与四章证明使用真实 Lean 内核。

## 服务与证书

游戏通过 `lean-garden.service` 开机启动，仅监听 `127.0.0.1:3211`，由 Nginx 对外提供 HTTPS。2026-11-16 已将云端 3210 迁至 3211，3210 可另作他用；公网地址和各客户端的服务器地址不变。本机开发服务仍使用 3210。小内存服务器将 Lean 验证并发设为 1，复杂题按实际验证耗时等待。其它网站的命名虚拟主机保留。

云端端口记在 `deploy/linux-target.json` 的 `port`，增量部署会用它进行真实 Lean 健康检查。systemd 通过 `/etc/systemd/system/lean-garden.service.d/20-port.conf` 持久设置端口，Nginx 的游戏配置位于 `/etc/nginx/sites-available/lean-garden`。迁移脚本 `deploy/move-linux-port.py` 会先检查目标端口、备份配置和数据，修改后验证内部与公网健康状态，失败则恢复原配置。迁移备份独立存放于云端 `config-backups/`，不会被普通代码版本清理。

公网 IP 使用 Let's Encrypt 的 IP 证书，`lean-garden-cert-renew.timer` 每天检查两次并在更新后重新加载 Nginx。IP 证书有效期较短，需要保留这个定时任务。[官方 IP 证书说明](https://letsencrypt.org/2026/03/11/shorter-certs-certbot)。

SSH 登录后常用命令：

```sh
sudo systemctl status lean-garden
sudo journalctl -u lean-garden -n 50 --no-pager
sudo systemctl restart lean-garden
systemctl list-timers lean-garden-cert-renew.timer
curl -fsS https://162.14.77.140/api/health
```

迁移或另做备份时同时保存两个数据文件。不要将玩家数据、部署私钥或 Android 签名目录作为安装包发送给玩家。当前服务器日常更新使用根目录的推送脚本；旧的通用 Docker 安装方式保留给其它新机器。
