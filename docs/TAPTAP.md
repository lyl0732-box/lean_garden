# TapTap 两种包体

产物统一放在 `dist/taptap/`。本次版本为 `0.13.2`，原网页、网盘分发渠道与服务器数据没有被覆盖。

## 本次可交付文件

| 上传类型 | 文件 | 当前状态 |
| --- | --- | --- |
| Android APK | `LeanGarden-0.13.2-taptap.apk` | 已签名、无广告、无现金内购的买断版自测包；尚未配置正版验证，不能当作已完成正式售卖接入 |
| TapTap 小游戏 | `LeanGarden-0.13.2-taptap-minigame.zip` | 真正的 Canvas/tap API 包，入口在 ZIP 根目录，不是 H5 网页压缩包；约 33 MB |

两端均连接 `https://162.14.77.140/`，使用原账号登录，进度保存在服务器。Lean 验证必须联网，不包含手机上独立运行的 Lean/Mathlib。保留 107 个冒险关卡和 6 个小游戏副本，共 113 关。

两个包均移除了友盟广告。Android 自测包同时移除友盟 U-App、U-APM、Union、APM Gradle 插件及其 Application/广告桥接；小游戏没有任何这些 SDK。原网盘渠道的 `clients/android/` 保留，以免覆盖其它渠道。

## APK 上传及买断售卖

1. 在 APK 包体管理中选择 `.apk` 文件上传自测，包名为 `cn.leangarden.client`，版本名 `0.13.2`，versionCode `21`。保留原签名，便于覆盖安装。
2. 这是买断版的**自测包**。按用户确认，目前游戏服务尚未开通，因此没有伪造 Client ID/Client Token，也没有声称完成购买校验。不要将自测包直接作为已启用正版验证的正式付费包上线。
3. 商店资料审核与服务开通后，在“游戏服务 → 正版验证”和“商店 → 买断制游戏”配置付费下载、价格及自测白名单。
4. 复制 `clients/taptap-android/license.example.json` 为同目录 `license.json`，填写游戏服务的 `clientId`、`clientToken`。不填写 Server Secret。
5. 执行 `node scripts/build-taptap-android.mjs --store`。这会加入 TapTap 官方 `tap-core:4.11.0` 和 `tap-license:4.11.0`，初始化成功后检查正版购买资格；仅在授权成功后显示游戏连接界面。缺配置时会拒绝生成正式包。没有加入 TapTap 广告或内购 SDK。
6. 用后台白名单和 TapTap 客户端自测购买/未购买状态。真实付费、正版验证成功/失败、退款后的行为均尚未在真机验证。

已完成正版验证 Java 代码的真实 SDK 编译检查，记录在 `artifacts/taptap-license-sdk-check.json`，但编译通过不代表已开通后台或已验证购买。

APK 固定使用安装包中的前端代码与媒体；不再从原网盘渠道的 `client-manifest.json` 更新代码或下载原 APK。后续更新需重新构建 TapTap 包并在 TapTap 发布，防止无广告版更新回友盟渠道。网络 API 和账号进度仍连接原服务器。

自测版保留原服务器的钻石问答、活跃度、提示和自由选关额度规则；“活力券”对应原账号的 `adSkips`，不重置余额或赋予管理员权限。**正式买断版是否取消活跃度/提示/选关额度限制尚未另行约定，本次没有把“界面隐藏现金购买”当作服务器无限资源实现。**

## 小游戏上传及官方广告

1. 在 TapTap“小游戏管理 → 包体管理”上传 `LeanGarden-0.13.2-taptap-minigame.zip`，直接上传整个 ZIP。里面的 `game.js`、`game.json`、`project.config.json` 已位于根目录。
2. `V-20261105` 是现有版本标记，不作为游戏 ID 写入代码。当前项目配置没有虚构 appId。后续使用官方 VS Code 调试插件时，填写后台“开放能力 → 小游戏基本信息”显示的小游戏 ID。
3. 需要允许访问游戏服务器 `https://162.14.77.140`。请在后台核对网络访问配置，并使用自测二维码验证服务器 HTTPS 证书和 IP 地址能否被当前小游戏环境接受；本次未获得后台域名配置，不能保证平台允许直接用 IP。若后台要求域名，给服务器绑定可用 HTTPS 域名后修改 `clients/taptap-minigame/config.js` 的 `server` 并重新打包。
4. 使用有自测权限的 TapTap 账号扫码。已完成无 DOM 虚拟机启动、浏览器 tap API 适配测试和前三关真实 Lean 证明，尚未在真实 TapTap 容器测试。

小游戏保留的是 **TapTap 官方激励视频接口**：

- `tap.createRewardedVideoAd({adUnitId})`，单实例、按玩家点击初始化。
- `show()` 失败时 `load()` 后重试，处理 `onLoad`、`onError`、`onClose`。
- 仅 `res.isEnded === true` 才返回“完整观看”；提前关闭、异常回调、加载成功都不算完成。
- 防止并发播放，移除监听，重复关闭不会重复完成。

当前尚未开通广告位，所以 `config.js` 中 `rewardedVideoAdUnitId` 留空，入口显示待开通且不会创建广告实例。开通后填入 **TapTap adUnitId** 并重新构建即可启用官方播放接口。当前没有为 TapTap 广告接入服务器奖励结算，因此即使完整观看也不会发放钻石/活跃度；不要调用原友盟的 `/api/ads/*` 结算接口。后续需要配置广告位并单独接通奖励结算，再做真实广告验证。

## 构建和验证

```powershell
npm run build:taptap:android
npm run build:taptap:minigame
node --test tests/taptap.test.mjs
python scripts/verify-taptap-packages.py
node scripts/verify-taptap.mjs
```

需要现有本机 Android/Java/Gradle 工具链、原签名和已生成的 `public/assets/optimized` 资源。首次从源码恢复先运行 `npm ci` 与 `npm run build:assets`，Android 私有工具链配置和签名按项目原说明准备。浏览器验证脚本沿用本机 Playwright 安装路径，创建独立数据目录，不改正式玩家进度。

## 参考文档

- [APK 打包规范：64 位支持](https://developer.taptap.cn/docs/store/release/publish/bundle/)
- [小游戏开发概览：无 DOM/BOM、三个入口配置文件、整包上限 60M](https://developer.taptap.cn/minigameapidoc/dev/tutorial/overview/)
- [小游戏官方激励视频广告](https://developer.taptap.cn/minigameapidoc/dev/tutorial/open-capabilities/ad/rewarded-video-ad/)
- [小游戏真机调试与测试权限](https://developer.taptap.cn/minigameapidoc/dev/dev-support/debugging/)
- [买断制游戏介绍](https://developer.taptap.cn/docs/store/operation/buyout/copyright-verification/)
- [Android 正版验证 SDK](https://developer.taptap.cn/docs/sdk/copyright-verification/development-guide/android-native/)
- [Android SDK 初始化](https://developer.taptap.cn/docs/sdk/integration-guides/android/)

音乐保留 Kevin MacLeod / CC BY 4.0 署名和来源，小游戏包内含 `MUSIC-CREDITS.txt`。

## 小游戏与 APK 的美术统一

小游戏直接复用 APK 的标题字、三块木牌入口、圆形徽章、图标、章节插画和八阶法杖；相关资源保存在 `clients/taptap-minigame/art/`，通过 `scripts/export-taptap-ui.mjs` 从项目原有 CSS/SVG 导出。普通小游戏构建直接使用已保存的资源，无需运行浏览器导出。

首页保留一套冒险、小游戏和花园入口，统一了背景氛围、芽芽、按钮、知识卡边框；选关页采用花径地图与首领徽章。手机、平板及横屏排版已检查，证明按钮与真实 Lean 验证流程已复测。尚未在真实 TapTap 容器中验证。

`dist/taptap/` 中的小游戏 ZIP、AI 声明截图已同步更新，并提供首页、选关、图鉴及对战四张预览。复核截图可运行 `node scripts/capture-taptap-ai.mjs --art-review`。

## AI 内容声明与证明截图

两个版本首页已加入可见的“AI 合成内容：部分美术素材由 AI 辅助生成”标识，设置中有完整说明，且已重新打包。

- `AI声明证明截图_APK.png`：APK 内置同版前端运行截图。
- `AI声明证明截图_小游戏.png`：小游戏上传包在本地 tap API 适配环境的运行截图。

两张均为 780×1688 PNG，存放在 `dist/taptap/`。未在真实安卓手机或 TapTap 容器中截屏。可用 `node scripts/capture-taptap-ai.mjs` 重新截取，检查记录在 `artifacts/taptap-ai-screenshot-report.json`。
