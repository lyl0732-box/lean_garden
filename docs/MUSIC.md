# 场景背景音乐

七个场景各使用一首不同的 Kevin MacLeod 完整配器录音。所有音频均已存到 `public/assets/audio/`，由本机服务器提供；游戏运行时不访问音乐网站。

## 场景与选曲

| 场景键 | 游戏场景 | 曲目 | 配器与选曲定位 | 时长 | 文件大小 |
| --- | --- | --- | --- | --- | ---: |
| `home` | 主页 | [Carefree](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400037) | 尤克里里、吉他、马林巴、钟琴与打击乐，明快的花园欢迎曲 | 3:25 | 6,566,713 字节 |
| `map` | 选关、小游戏 | [Enchanted Valley](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200093) | 钢片琴、单簧管、长笛与弦乐，神秘的童话山谷 | 3:10 | 7,613,259 字节 |
| `garden` | 禅净花园 | [Wholesome](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1900022) | 大提琴、中提琴、马林巴与鼓，适合慢慢翻看图鉴 | 6:04 | 14,556,390 字节 |
| `n` | 自然数正赛 | [Life of Riley](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1400054) | 钟琴、尤克里里、吉他与打击乐，轻松的入门节奏 | 3:55 | 7,533,831 字节 |
| `l` | 逻辑正赛 | [Adventures in Adventureland](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2100029) | 竖琴、木管、钟琴、弦乐与打击乐，135 BPM 的轻快奇幻探索 | 4:21 | 5,227,256 字节 |
| `a` | 实分析正赛 | [Dream Culture](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300046) | 流动钢琴、打击乐与倒放音色，平缓的思考氛围 | 3:34 | 8,576,659 字节 |
| `t` | 数论正赛 | [Cipher](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844) | 合成器、电子钢琴、打击乐与弦乐，清晰的节奏与层次 | 3:51 | 9,252,699 字节 |

表中的配器来自作者元数据，场景定位是本项目的选曲判断。七首现用音频共 **59,326,807 字节（约 56.58 MiB）**。v0.7 将逻辑章节换成更明快的曲目；此前选关和逻辑章节的三个旧文件保留作历史资源，不参与场景播放。

## 署名与授权

七首作品的作者均为 **Kevin MacLeod (incompetech.com)**，作者官方曲目页面均标示 **Creative Commons Attribution 4.0（CC BY 4.0）**。[许可全文与摘要](https://creativecommons.org/licenses/by/4.0/)允许按署名等条件分享、再分发及改编，包括商业用途。

2026-10-28 核验原有曲目，2026-10-29 核验两首新增曲目，2026-10-30 核验 Adventures in Adventureland，并通过作者的 [pieces.json](https://incompetech.com/music/royalty-free/pieces.json) 核对曲名、文件名、ISRC、配器和时长。作者的[授权与署名页面](https://incompetech.com/music/royalty-free/licenses/)提供 CC BY 4.0 署名文本。游戏设置展示曲名、作者、原始出处和授权链接；分发游戏时保留本文件及 `public/assets/audio/LICENSE.txt`。

各首统一署名格式：

```text
“作品名称” — Kevin MacLeod (incompetech.com)
Licensed under Creative Commons: By Attribution 4.0 License
https://creativecommons.org/licenses/by/4.0/
```

本机保留作者原版 MP3。v0.9 另生成 128 kbps 清晰版与 64 kbps 省流版 MP3，用于预加载与播放；这些版本仅做码率转换，没有改变曲目结构。运行时可以调低音量、整曲循环，并在场景切换时做交叉淡入淡出。署名不表示作者认可或参与本游戏。

## 本地文件与原始下载

| 本地文件（均在 `public/assets/audio/`） | ISRC | 官方下载 |
| --- | --- | --- |
| `carefree-kevin-macleod.mp3` | USUAN1400037 | [Carefree.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3) |
| `enchanted-valley-kevin-macleod.mp3` | USUAN1200093 | [Enchanted Valley.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Enchanted%20Valley.mp3) |
| `wholesome-kevin-macleod.mp3` | USUAN1900022 | [Wholesome.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wholesome.mp3) |
| `life-of-riley-kevin-macleod.mp3` | USUAN1400054 | [Life of Riley.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Life%20of%20Riley.mp3) |
| `adventures-in-adventureland-kevin-macleod.mp3` | USUAN2100029 | [Adventures in Adventureland.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Adventures%20in%20Adventureland.mp3) |
| `dream-culture-kevin-macleod.mp3` | USUAN1300046 | [Dream Culture.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dream%20Culture.mp3) |
| `cipher-kevin-macleod.mp3` | USUAN1100844 | [Cipher2.mp3](https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher2.mp3) |

文件校验信息位于 `public/assets/audio/manifest.json`：包括现用每首 SHA-256、字节数、官方来源和下载地址、授权核验日期。保留的五首还包含此前逐帧扫描的时长、采样率及码率；后来添加的音频已校验字节数、哈希和浏览器播放，未做完整逐帧扫描。新逻辑曲 SHA-256 为 `13cf2a3bed4996331e8dcd8263cbb3a780475f0157889fb16b8e47220f453a2d`。`Cipher` 的官方文件名为 `Cipher2.mp3`，本地更名为 `cipher-kevin-macleod.mp3`，内容未改动。

## 程序清单与验证

`public/music-tracks.js` 导出 `musicTracks` 数组和 `musicTracksByScene` 映射。每项包含 `scene`、`id`、`title`、`artist`、`url`、`license`、`licenseUrl` 和本机 `src`。该文件只提供资源数据，不启动音频或改变用户偏好；实际场景切换由 `music.js` 与页面逻辑负责。

v0.6 对局音量系数降为 0.075，主页、选关和花园为 0.14；施法和领奖时进一步压低 BGM，突出分层合成的魔法音效。场景切换仍使用交叉淡入淡出。

历史七场景播放、淡入淡出、旧曲暂停及静音检查见 `artifacts/browser-v4-report.json`。v0.6 两首音频播放验证见 `artifacts/browser-v06-report.json`。v0.7 新逻辑曲本地播放、对局增益、拨轮与翻面音效检查见 `artifacts/browser-v07-report.json`。

历史保留曲目：`Monkeys Spinning Monkeys`（USUAN1400011）、`Investigations`（USUAN1100646）及 `Magic Forest`（USUAN1600044），作者和 CC BY 4.0 授权相同；完整署名继续保留在 `LICENSE.txt`。

## v0.9 预加载与转码资源

`scripts/build-media.mjs` 使用 FFmpeg / libmp3lame 生成 `public/assets/optimized/` 中的高低码率文件；文件名按曲目 ID 与 `high` / `low` 区分。每个文件的字节数和 SHA-256 写入 `public/assets/preload-manifest.json`。所有七首都会在启动时备齐，之后用 Blob 播放，浏览器已验证各首可解码、循环且不再发起媒体下载。

本机保留原曲与历史音频，云端精简源码包只分发实际播放的转码版本，并继续携带完整署名及本授权说明。不要把转码文件描述成未经处理的作者原版。
