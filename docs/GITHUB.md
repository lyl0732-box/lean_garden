# GitHub 源码与构建

仓库：`git@github.com:lyl0732-box/lean_garden.git`。

本仓库采用“源码＋原始素材”方案，保留图片、卡片 SVG 和原版音乐，可以重新生成两档清晰度并打包客户端。音乐转载授权与署名见 [MUSIC.md](MUSIC.md) 和 `public/assets/audio/LICENSE.txt`；转码后仍应保留署名。

## 保留与忽略

| 上传 | 本机保留、Git 忽略 |
| --- | --- |
| `server/`、`public/` 源码、`lean/` 源码 | `data/`、`logs/`、`lean/.lake/`、`lean/.scratch/` |
| 原始 PNG、SVG、MP3 与授权说明 | `public/assets/optimized/`、资源清单、`clients/bundled/` |
| Android／Windows 客户端源码、Gradle wrapper JAR、锁文件 | npm 依赖、Gradle 缓存、SDK、编译输出 |
| 脚本、测试、文档、部署模板 | `artifacts/`、`dist/`、`public/downloads/`、任务清单 |
| 非私密配置及包管理锁文件 | `.env`、部署私钥、Android 签名、广告验证密钥 |

忽略文件仍在作者本机，整理仓库不会删除它们。不要为了打包或部署而把私钥加进版本控制。部署目标 JSON 中只有地址、用户名和本机密钥路径，不含私钥。

## 网页与 Windows

参见 README 首次运行步骤。构建素材使用 `npm ci` 安装固定版本的 sharp 和 FFmpeg；`npm run build:assets` 会生成所有图片／音乐变体、预加载清单与原生资源包。运行时服务器使用 Node 内置模块。

Windows：在根目录完成素材构建后，执行 `npm ci --prefix clients/windows`，再执行 `npm run build:windows`。安装包在 `dist/windows/`；该目录不上传 Git。

课程、仓库状态验证需要先安装 Lean 和 Mathlib。浏览器验收脚本沿用作者本机 Playwright 安装路径和专用 Chrome profile，换电脑时需调整路径。

## Android

Android 工程固定 compileSdk／targetSdk 36、buildTools 36.0.0、Gradle 8.11.1、JDK 21，SDK 依赖版本保存在 `app/gradle.lockfile`。根目录 `build:android` 使用作者本机 `artifacts/android-tools/` 中的工具配置；克隆仓库后该私有本机环境不会存在。

在新开发机可通过 Android Studio 配置 SDK／JDK，并为 `clients/android/local.properties` 写入自己的 SDK 路径。需要按 `app/build.gradle` 的 signingConfigs 约定，准备自己的 `clients/android/.signing/local.jks` 和 `local.json`（字段为 `password`、`alias`）。这些文件被 Git 忽略；使用新签名制作的 APK 不能覆盖作者原签名安装包。不要索要或公开作者的签名私钥。

在根目录运行 `npm run build:assets`、`node scripts/build-android.mjs --prepare-only` 后，进入 `clients/android`，通过 Android Studio 或 `gradlew.bat assembleRelease --no-daemon` 构建；APK 位于 `app/build/outputs/apk/release/`。`--prepare-only` 只准备内置资源，不需要作者的工具 JSON。

直发 Android 从 0.13.4 起移除友盟 Union 广告依赖和原生广告桥接，继续使用 U-App 统计和 U-APM 性能监控。旧广告密钥与数据仍按私密文件管理。

## 更新仓库与服务器

按用户要求，每次修正完成并通过相关验证后，都提交并推送到本仓库；项目协作规则记在根目录 [AGENTS.md](../AGENTS.md)。

默认构建 Windows、直发 Android 和网页版的无广告、无现金内购版本。TapTap APK 与小游戏使用单独的构建命令和下载目录，按用户的发布要求更新。[TapTap 两种包体](TAPTAP.md)

先运行相应验证，`git add` 后执行 `node scripts/check-git-export.mjs` 检查暂存区，再提交和推送。这个检查不会连接服务器或修改账号。上传 GitHub 不等于发布游戏；根目录的云端推送脚本另行部署代码，并排除数据库和私钥。
