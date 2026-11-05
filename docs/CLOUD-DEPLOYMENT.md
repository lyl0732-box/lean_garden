# 将证明花园部署到朋友的云服务器

适用项目：Lean Garden v0.8。核对日期：2026-11-02。下面以 Ubuntu 24.04 x86_64、有 sudo 权限、部署在独立子域名为例。尚未连接或测试朋友的服务器。

## 先确认这些信息

- 操作系统、CPU 架构、CPU 核数、可用内存、可用磁盘。
- 是否有公网 IP，是否能使用一个子域名，例如 game.example.com。
- 服务器现有的网站、Nginx、进程管理方式，以及可供本游戏使用的端口。
- SSH 登录方式或由朋友本人执行命令。

少量朋友试玩，可先按为本游戏预留 4 核 CPU、8 GB 内存、30 GB 可用磁盘规划，再根据实际负载调整。这是资源预算，不是经过云端压测的容量保证；不需要 GPU。本机 Mathlib 构建缓存约 7.53 GiB，Linux 上还需工具链和下载临时空间。

## 运行结构

浏览器通过 HTTPS 访问独立子域名；Nginx 将请求转给 127.0.0.1:3210 的单个 Node 进程；Node 调用本服务器上的 Lean。安装完成后，正常游玩不需要访问本人的电脑。

项目需要 Node.js 22.x 的当前补丁版本、Lean 4.34.0、项目锁定的 Mathlib v4.34.0。Node 22 下载见 [Node 官方页面](https://nodejs.org/en/download/archive/v22)；Lean 安装与已有项目构建流程见 [Lean 官方说明](https://lean-lang.org/install/manual/)。

## 1. 准备运行用户与目录

由有 sudo 权限的管理员执行。下面假定 garden 是为本游戏新建的用户；若服务器已有合适的部署用户，可统一替换。

```bash
sudo apt-get update
sudo apt-get install -y curl git build-essential zstd
sudo useradd --create-home --shell /bin/bash garden
sudo install -d -o garden -g garden /srv/lean-garden
sudo install -d -o garden -g garden /var/lib/lean-garden
```

管理员另行安装 Node.js 22.x 当前补丁版本，确保 garden 用户可以从 /usr/local/bin 或 /usr/bin 运行 node。确认 `node --version` 输出 v22.x。项目没有 npm 运行依赖，无需先执行 npm install。

## 2. 上传游戏源文件

将本机项目里的以下内容上传到 /srv/lean-garden，保留目录结构：

```text
package.json
public/                  含 assets/ 下的图片与本地音频
server/                  含 legacy-v*.json 等服务端数据
lean/Garden.lean
lean/Garden/              本项目的 Lean 源文件
lean/lean-toolchain
lean/lakefile.toml
lean/lake-manifest.json
```

Windows 下的 lean/.lake、lean/.scratch 和 .elan 工具链不作为 Linux 安装使用；在服务器重新下载构建。artifacts、logs、tests 和浏览器脚本不是运行必需内容。

默认让朋友从新存档开始，不上传本人的 data/。如果以后需要迁移旧进度，应单独处理存档文件与浏览器身份，不能只复制数据文件就期待新域名自动识别本人。

上传完成后，由管理员确认项目目录归 garden 用户所有。不要把整个项目目录直接作为 Nginx 的静态站点根目录；静态资源由应用的 public/ 路径提供。

## 3. 安装并构建 Lean 环境

切换到 garden 用户：

```bash
sudo -iu garden
```

在该用户的 shell 中执行：

```bash
curl -sSf https://elan.lean-lang.org/elan-init.sh -o /tmp/lean-garden-elan-init.sh
sh /tmp/lean-garden-elan-init.sh -y --default-toolchain none
source "$HOME/.elan/env"
cd /srv/lean-garden/lean
lake --version
lake exe cache get
lake build Garden
```

保留上传的 lean-toolchain 和 lake-manifest.json；项目使用固定版本，不要替换成最新 Lean 或 Mathlib。首次执行 lake 时，elan 按项目文件安装指定工具链。Mathlib 缓存下载说明见 [官方缓存文档](https://github.com/leanprover-community/mathlib4/blob/master/Cache/README.md)。

## 4. 在服务器上试运行

仍使用 garden 用户：

```bash
cd /srv/lean-garden
HOST=127.0.0.1 PORT=3210 GARDEN_DATA_DIR=/var/lib/lean-garden node server/index.mjs
```

另开一个 SSH 终端检查：

```bash
curl http://127.0.0.1:3210/api/health
```

应返回 JSON，包含 `"ready":true`。仅网页能打开不代表 Lean 已经可用；后续还要实际完成第一关，并在第二关提交一次 rw。若 3210 已被占用，选取空闲端口，并在后面的进程和 Nginx 配置中统一替换。

试运行完成后，在前台运行 Node 的终端按 Ctrl+C，再交给后台服务管理。

## 5. 配置后台运行与开机启动

若服务器使用 systemd，管理员新建 /etc/systemd/system/lean-garden.service：

```ini
[Unit]
Description=Lean Garden
After=network.target

[Service]
Type=simple
User=garden
Group=garden
WorkingDirectory=/srv/lean-garden
Environment=HOST=127.0.0.1
Environment=PORT=3210
Environment=GARDEN_DATA_DIR=/var/lib/lean-garden
Environment=PATH=/home/garden/.elan/bin:/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/env node /srv/lean-garden/server/index.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

若 Node 安装在其他位置，必须相应修改 PATH。Lean 安装用户和服务运行用户保持一致。项目目录需要允许该用户写入 lean/.scratch。

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lean-garden
sudo systemctl status lean-garden
sudo journalctl -u lean-garden -n 100 --no-pager
```

systemd 的重启设置见 [官方文档](https://www.freedesktop.org/software/systemd/man/254/systemd.service.html#Restart=)。

## 6. 接入域名和 HTTPS

将 game.example.com 解析到服务器公网 IP，在现有 Nginx 中增加一个独立站点。以下是申请 HTTPS 前的 HTTP 配置示例；不要覆盖朋友已有的站点配置：

```nginx
server {
    listen 80;
    server_name game.example.com;

    location / {
        proxy_pass http://127.0.0.1:3210;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
    }
}
```

Host 必须保留浏览器请求的域名和端口：游戏接口会比较 Origin 与 Host，代理默认改成内部地址会导致操作被拒绝。NGINX 的默认代理 Host 行为和上述配置见 [官方说明](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_set_header)。较长的读取超时用于容纳 Lean 核验和少量排队，不代表所有请求都会耗时这么久。

由管理员检查 Nginx 配置，再按服务器现有方式签发并安装 HTTPS 证书，测试通过后将 HTTP 重定向至 HTTPS。云安全组与主机防火墙允许网站所用的 80/443 端口；Node 继续仅监听回环地址。若暂时没有域名，可以先通过 SSH 端口转发访问进行验收。

## 7. 存档、备份和使用人数

- 当前以账号区分玩家。存档目录同时包含 `progress.json` 和 `accounts.json`，更新必须保留并一起备份；后者含密码哈希和会话摘要，不要放进源码包或发给玩家。程序自带的 `.bak` 只是最近一次写入备份，不替代独立备份。
- 同一服务器内登录同一个账号可跨网页、Windows、安卓继续游戏。首次登录尚未绑定的账号可接续当前设备旧 Cookie 对应的成绩；换一台服务器不会自动搬迁账号，须迁移完整数据目录。首次云端管理员需通过标准输入运行 `scripts/create-admin.mjs` 创建，不在镜像中预置密码。
- 只运行一个 Node 实例。存档和锁保存在单进程中，不使用多进程集群，也不让多个容器共同写这个 JSON 文件。
- 当前最多同时执行两个 Lean 任务，其余请求排队。先给少量朋友试玩；面向更多玩家前，结合服务器现有 Nginx 配置加入请求限流，并做实际负载测试。

## 8. 上线验收

用最终 HTTPS 地址检查序章、前三关教学、分类切换、第三关反向 rw、领奖、音效和图片。刷新后应恢复同一浏览器的进度；不同浏览器之间不串档。重启 lean-garden 服务后，原进度仍应存在。

日常更新时只替换应用源文件；涉及 Lean 源文件时重新执行 `lake build Garden`，然后重启 lean-garden 服务。保留 data 目录对应的实际持久化位置 /var/lib/lean-garden，不将本机测试存档覆盖到服务器。
