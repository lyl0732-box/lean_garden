# 美术资源

v0.6 新增 AI 序章全景 `public/assets/story/prologue-v06.png`，1536 × 1024，已本地保存；生成方式与提示词见 [v06-image-prompts.md](../revisions/v06-image-prompts.md)。开场文字使用 HTML 排版，事实署名和发布原文链接可点击。

本版新增分类木架、木框挑战牌、三阶段翻卡与芽芽魔杖 SVG。施法由 Canvas / Web Animations 表现水流、紫色爆弹、金光与绿色折射闪电；素材均为本项目代码绘制，匹配现有图标系统。

v0.5 新增成品海报 `public/assets/promo/lean-garden-poster-v05.png`（竖版）与视频封面 `public/assets/promo/lean-garden-cover-v05.png`（横版），使用内置 image_gen 生成并保存到项目。封面的三张技能卡统一为绿色；完整提示词与修订提示见 [v05-image-prompts.md](../revisions/v05-image-prompts.md)。设置中有下载入口。

地图和正赛增加四章 SVG 场景与独立最终首领徽章（`public/scenery.js`）；飞卡、定理召唤、闪电链由 Web Animations 与 Canvas 绘制（`public/effects.js`）。数字 1 的卡图已改成只有一级台阶，生成源位于 `scripts/generate-card-art.mjs`。

本版使用 imagegen 技能的内置 `image_gen` 工具生成主视觉，随后复制到项目中；运行游戏不需要在线图片服务。

循环 BGM 使用七首 Kevin MacLeod 作品，按场景切换、本地整曲循环。署名、来源、授权和文件校验见 [音乐说明](MUSIC.md)。出招、领奖和错误音效由本机振荡器生成。

新知识卡使用独立原创 SVG 卡通场景，见 [卡牌美术](CARD_ART.md)。通关掉落、点击放大由 `public/app.js` 的 Web Animations 与 `public/battle-v3.css` 配合播放，包含全屏放射光、柔和光晕和星光，支持减少动画设置。简明介绍位于 `public/card-guides.js`。

- 文件：`public/assets/garden-world.png`
- 原始分辨率：1536 × 1024
- 用途：首页花园与四个世界的背景。
- 图标、favicon 和界面中的简单芽芽 SVG 由代码绘制；不包含游戏厂商的角色、Logo 或提取素材。
- 风格方向：明亮的卡通花园、圆润植物、云上浮岛、厚实的按钮与技能卡。v0.5 在共享主视觉上叠加四章独立 SVG 场景；尚未制作完整角色动画。

内置工具的完整提示词：

> Use case: stylized-concept. Asset type: landscape background illustration for a polished mobile mathematics adventure game, 1536 by 1024 landscape. Create an original cheerful hand-painted 2D cartoon garden adventure island with the rich, playful rendering and chunky organic shapes of a premium casual tower-defense mobile game. A winding golden dirt footpath from bottom center into the middle distance across fresh grassy platforms, rounded turquoise trees with thick trunks, whimsical mushrooms, tiny flowers, a little round garden gate and a cozy greenhouse. On the far background horizon, floating blue sky islands hint at four worlds: green meadow, violet fantasy forest, blue waterfalls, amber stone ruins. Sunny cream sky, puffy clouds, beautiful warm daylight, rich tactile painted shading, crisp silhouettes. In lower right, a cute ORIGINAL round pale green sprout creature with two leaves on head, tiny dark oval eyes, peach cheeks and stubby feet, carrying a tiny tan backpack. Keep left half of composition open with quiet grassy sky areas suitable for overlaying title and buttons. Entire image full bleed, no UI elements, no words, no text, no letters, no logos, no watermark, no existing franchise characters. This is actual finished game background artwork, not a wireframe.
