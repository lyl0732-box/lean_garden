# 开发说明

## v0.12.0

[本轮完整变更](../revisions/v012.md)；[Linux 实际部署](LINUX-LIVE.md)。管理员权益由服务端角色附加为不可枚举状态，练习档继承权益但不污染库存。网页记住登录使用独立的哈希随机凭据，原生密码使用系统加密；登录更新按钮无需认证。`推送到服务器.cmd` 比较内容哈希，原子切换代码版本，Lean 健康检查失败即回退，玩家数据独立保留。无变化时沿用资源清单的时间戳，避免无意义上传。

## v0.11.1 界面与形态

`yaya-forms.js` 定义八级同一物种的渐进形态，原图目录为 `assets/yaya-v0111/`，`build-media.mjs` 读取同一份形态列表生成两档 WebP。经验条用独立 `div`，不再继承 `.home-companion span` 的对白气泡内边距；`experience-v111.css` 定义实际填充、加宽的全屏按钮与单行文字。升级节点和所有后端经济／证明规则沿用 v0.11.0。见 [本轮验收](../revisions/v0111.md)。

## v0.11.0 当前行为

本版完整规则见 [v011.md](../revisions/v011.md)。`accounts.mjs` 负责 30 字节用户名、scrypt 密码哈希、30 天服务器会话和旧设备进度接续；HTTP 默认要求登录。`createServer({allowGuestForTests:true})` 只供隔离测试调用，启动服务不接受这个开关。管理员通过 `scripts/create-admin.mjs` 的标准输入创建；密码不写进源码或命令文件。

`economy.mjs` 负责活跃度、钻石、物品、经验、选关计时和旧礼包迁移。`commerce.mjs` 保留需服务端核验的支付／广告适配器；普通商品用钻石，免广告券只能现金购买（¥2／10 张），支付与充值默认禁用。广告奖励须验证服务端签名凭据及本账号未过期广告会话，每日最多 10 次，每次 50 钻石。`garden-quiz.mjs` 每 5 小时只为主线拥有的卡片生成最多 3 道单选题；正确答案留在服务器，不随题目或导出存档返回，答对奖励 10—50 钻石且幂等。

主线与自由练习共用 owner 背包，存档锁内扣费／发奖。新局扣 5 活跃度，续玩不重复扣；每局经验只发一次。初始提示 5、答案 0，内测券一次 3 张、选关试玩一次 10 分钟。开启选关计时，关闭／退出账号暂停，到期保留当前未完成局。导出版本 9；备份同时保留 `data/progress.json` 和 `data/accounts.json`。

`clients/windows/resource-cache.cjs` 与 Android `ResourceCache.java` 在连接时检查 `client-manifest.json`，从安装包／私有缓存读取一致的 SHA-256 资源，只下载变更文件，全部校验后启用。原生包必须先更新到本版；普通界面和媒体更新只需更新服务器资源并执行 `npm run build:manifest`，该命令同时生成两份资源清单。Lean 和玩家存档接口始终访问服务器。

以下 v0.9.2 的窗口、画质及教程规则继续有效。

见 [v092.md](../revisions/v092.md)。安卓允许背景绘制到刘海区域，原生只把安全距离交给网页控件，WebView 不加顶部 padding；`native-window.css` 处理安全区与按钮空间。`client-mode.js` 区分安卓客户端与普通浏览器，前者不创建全屏按钮。Windows 通过只含状态／切换／通知的 `gardenWindow` 桥接控制原生窗口，主进程核验可信主框架；网页继续使用标准 Fullscreen API。

画质从本版开始默认 high，仅 high／low 两档，旧 auto 映射 high；没有网络自动选择或失败降档。手动 low 保留。以下上一版的取消下载、加载中选择和连接偏好交接机制继续使用。

清晰度与客户端全屏更新见 [v091.md](../revisions/v091.md)。`quality.js` 统一偏好，`boot.js` 加载中保留可操作的下拉框并用 AbortController 取消旧批次，打开选择器时暂停自动进入。手动档位不受自动检测或失败回退覆盖；设置先保存、按按钮后在原路由重新加载。客户端在连接前传入一次性参数并由启动代码清理；连接设置与网页偏好同步，远程网页继续没有 Node 或任意原生调用权限。

新版本修改记录统一写入 `revisions/v0x.md`。本次详见 [v09.md](../revisions/v09.md)。`spell-flow.js` 以 draw / prepare / target 三阶段管理 rw 和 apply；抽卡与翻面不发起 Lean 请求，最后点击命题才提交。成功后清空准备状态并收起控制区，失败保留参数。`card-wheel.js` 提供四类并排入口和五张可见卡的转轮；准备阶段改为全屏模糊背景上的弹窗，光芒由独立裁切层承载，不能扩大滚动内容。rw 界面默认 all；nth 提供固定 1—10 多选。旧 once API 留作存档/验证兼容，界面用仅勾选第 1 处表达相同行为。

`revision9.mjs` 将自然数第九关 n06 的目标改为 a+0=succ b，保留条件与关卡 ID；参考解补充 add_one_eq_succ。旧工作尝试归档到 legacyLevelsV8.n06，成绩保留，当前尝试重开；curriculumVersion=9 保证主档与练习档只迁移一次。严格 rfl 在检查等式前只做 headBeta 与元数据处理，修复 apply-at-h 后反向 rw 得到 a=a 的合法解；不展开加法或数字定义。

`boot.js` 在动态导入游戏前调用 `asset-cache.js`，按清单下载代码、全部卡图、背景和七首 BGM，预解码图片并显示真实字节进度。默认使用 128 kbps MP3 与清晰 WebP；手动选择流畅后使用 64 kbps MP3 与低分辨率背景。图片和音频通过预加载 Blob 使用；Cache Storage 不可用时退回 HTTP 缓存。CSP 只为图片与音频补充 blob:。修改 public 代码后执行 `npm run build:manifest`，变更媒体后执行 `npm run build:assets`。

`experience-v9.css` 恢复教程命题轻抖动，并将三个模式外层背景宽度设为 100%，内容区保留阅读宽度。Windows 客户端位于 clients/windows，Android 位于 clients/android；均连接可配置的 HTTP(S) 服务，默认使用本机 Tailscale。证明环境超过 1 GB，因此没有把 Lean/Mathlib 打入客户端。构建和安装说明见 [交付物说明](../dist/使用说明.md)。

`deploy/runtime-closure.mjs` 按 Lean 模块头递归提取依赖，保留必要 .olean 及伴随编译文件。Windows 和 Linux 的精简环境均已验证；本轮实际 Linux 部署使用 systemd + Nginx 直接运行，配置见 [LINUX-LIVE.md](LINUX-LIVE.md)。Dockerfile 保留为其它机器的备选安装方式。广告 SDK 尚未接入。

`witness.mjs` 用词法和递归下降分析解析受限表达式，数字、实际上下文中的变量及少量已授权函数可组成见证；生成完全括号化的表达式，拼入服务端固定的 use 命令。禁用旧 use 动作 ID 的新提交，但回放旧存档仍识别原代码。HTTP 请求不能携带任意 Lean tactic。当前课程 40 次 use 参考构造均通过这一解析器编译验证。

`onboarding.js` 提供三页序章，完成/跳过保存在 owner.prologueSeen。前三关默认不启动教程，`offersTutorial` 判断可求助关卡，`#tutorial-helper` 在左下角显示跳动的芽芽与「不会就点我」。点击设置本局 state.tutorialActive=true，`tutorialStep` 才返回蒙版计划；刷新或重新进关恢复自由操作，已有教学记录不阻止再次求助。求助不清空未完成的证明，另一路线由教程给出显式重来按钮；完成后重看会重新开始本关，保留成绩。只有教程开启时完成关卡才写 owner.guidedTutorials，旧 owner.tutorials 保留兼容。

开始和每个后续教学阶段都等待 0.75 秒，再渐入蒙版；等待期间不能提前点击教学操作，全屏按钮不受影响。仓库初始 category='theorem'、source='warehouse'，直接展示定理卡轮与原有四类标签；定理组为空时也不自动切换。第二、三关通过本局 categoryChosen 确保亲手切换到「已知命题」或「定义」；第三关先翻到 backward，将目标反向改写成 1 = 1。对白固定左下角，窄屏自动把目标移到对白上方。点击空白／蒙版或按 Escape 打开独立的 #tutorial-exit 询问层，不替换底下抽卡或翻面弹窗；取消继续，确认仅停用教程，保留证明、选择参数与原弹窗。主线、练习档行为一致，减少动画设置可停止芽芽跳动。导出版本 7、数据库结构 1、证明规则 4 保持不变。

`revision6.mjs` 移除三张不再展示的皮亚诺公理卡并更新课堂用语，随后 `revision5.mjs` 重新计算固定展示顺序。`revision7.mjs` 仅替换重复的 m02 小游戏为双数列归纳挑战，其余关卡保留；主档与 practice 中旧 m02 成绩和尝试归档到各自的 legacyChallengesV6.m02，challengeVersion=7 保证迁移幂等。`freeplay.mjs` 把练习档放在原 profile 的 practice 中；练习借用前置知识，自己的待证结论仍不可选。API 请求携带 practice 标记，模式在其它页切换时拒绝旧请求。

转场先打开地图缓存或关卡准备页，再等待数据；叶片开启时移除中央星芒，最迟由 watchdog 打开。`effects.js` 的动画有独立定时清理，网络与动画并行，不增加动画时长与 Lean 用时之和。定义、定理、公理施法时先从杖尖连到知识卡，再连到作用命题；每帧读取杖尖和卡片的实际位置，避免挥杖时法链脱离。分别沿用蓝、紫、金色和原来的命中特效；已知命题继续使用绿色折射闪电。错误反馈与成功动画区分，并遵守音效、动画及系统减少动态效果设置。

## 关卡与按钮

`server/hints.mjs` 将下一步参考操作映射为当前卡组中可选择的证据、参数与中文步骤。只在实际证明前缀匹配时建议参考操作；不同路线使用目标说明，写法完全相同的等式可提示 rfl。第一次提示讲思路，后续才提供可准备的参数；准备参数不调用出招接口。`verify-repository.mjs` 同时检查 227 个状态的提示与真实按钮生成代码一致。

`public/routes.js` 解析 `#battle/关卡ID` 与 `#adventure/章节ID`。前端使用 History API 记录页面；刷新重新请求服务端保存的尝试，前进后退恢复页面，服务端仍检查关卡解锁与 revision。`public/learning.js` 负责分支说明和当前符号释义；查阅不会增加提示次数。

`add(chapter, title, statement, goal, lesson, skills, actions, solution, options)` 定义关卡。`statement` 是 Lean 定理的参数和结论，`goal` 是面向玩家的题意，`lesson` 是本关说明。`skills` 是本关所需的新卡，在上一关完成时解锁；`reward` 在本关完成时解锁。首关自带 rfl。

每张按钮动作包含 `skill`、`label`、实际 Lean `code`、依赖的定理卡 `uses`。`solution` 是自动测试用的参考步骤，前端 API 不会下发；服务器根据实际 Lean 状态判定，允许其他合法解。

内容依次经过 `lessons.mjs`、`experience.mjs`、`revision4.mjs` 覆盖层；`advanced-v4.mjs` 补充高级证明工坊。最后一层把教学改写转换为 `garden_strict_rw`，rfl 转为 `garden_strict_rfl`。这些 tactic 构造证明后仍由 Lean 内核检查，不自动计算数字，不自动自反收尾。自然数关卡的 apply 还会检查等式结论的可见形状，防止借助定义化简跳过步骤。

`server/rewrite.mjs` 构建仓库：已解锁规则白名单、本关已授权的带参数实例、Lean 当前分支的真实命题。`garden_state` 输出 `isProp`、`isEquality` 与 `isNat`。rw 客户端提交仓库条目、方向、目标 ID、mode（once/nth/all）及 occurrences 数组；服务器重新核验。`/api/level/rewrite-preview` 调用同一严格匹配器列出实际位置，跳过数字实现和隐式类型参数。已知命题可以作为作用位置，数据变量不能作为 at 命题。

新卡在通关后领取，`/api/cards/learn` 保存阅读记录。`pendingCards` 支持首页续领，对局中的 `introductions` 与其对应。首关 rfl 由课堂内说明介绍。进入下一关不自动弹窗；未读奖励显示可点击提示，读完才能出招。先掉落小卡片，点击后播放全屏光芒与缓慢放大，再展示 `public/card-guides.js` 中的简短规则。温习不改变进度，动画支持减少动态效果。

`public/battle.js` 用独立左侧列显示技能，不覆盖证明区域。rw/apply 从四类证据卡组抽卡、在准备弹窗确认，再回主屏选择作用位置。apply 作用于目标生成 `apply term`；作用于假设 h 生成 `replace h := (term) h`，表示向前推导。归纳变量来自当前 isNat 上下文，使用专门的变量卡弹窗，其他带参数的技能通过本关授权动作的选择框使用。

`garden_repeat_rewrite` 反复调用单条严格改写，不自动 rfl。遇到循环或超过 64 次时整体失败、保留原进度，首次无匹配也会报错。指定多处时按编号倒序生成多条 `garden_strict_rw (occs := [n])`；每条独立实例化参数，整个操作作为一步提交，任意失败均保留原进度。

`scripts/verify-repository.mjs` 检查 227 个改写、apply 和 induction 前的实际状态，确认解锁进度、证据与参数能重建标准证明，并由 Lean 检查白名单定理名称。接口与选择器测试还覆盖严格匹配、数字的可见位置、多处改写、循环拒绝、非法变量、迁移、音频 Range、重启与导出；使用独立数据目录。

旧存档通过 `server/legacy-v1.json`、`legacy-v2.json`、`legacy-v3.json` 恢复动作与原始命题。规则版本为 4，保留成绩、星星和旧证明，归档旧尝试。定理必须有对应关卡的 v4 完成记录才解锁，迁移关卡显示“重证领奖”；其他类型可以作为下一关的准备卡。原关卡 ID 保留，新增关卡插入后顺延显示序号；m02 在 v0.7 更换命题，n06 在 v0.9 更换结论，分别保留旧记录。

多目标策略遵循 Lean 的当前第一个目标。`constructor`、`rcases` 和归纳会产生分支；界面会显示当前分支和剩余分支。归纳代码采用 `induction n using Nat.rec with | zero | succ k ih`，保留后继写法及未解决目标，并给归纳假设稳定命名。

`use` 是 Mathlib 的构造见证策略，会尝试自动处理剩余目标；课程里少数关卡因此会提前结束，这是实际 Lean 行为。编写参考解时应运行验证脚本，避免在证明完成后再添加卡牌。

证明引擎启动时通过 Lake 读取固定项目环境，之后直接运行该版本的 Lean；精简容器设置 GARDEN_LEAN_ENV 指向构建时导出的 JSON（LEAN_PATH / LEAN_SYSROOT），运行时不再依赖 Lake。这样超时可以直接终止拥有的 Lean 进程。最多两个编译任务并发，单次限时 45 秒；按完整生成源码缓存结果。修改 Lean 支持库后应先构建，再重启服务以清空旧缓存。

## 数学边界

- 自然数使用标准 `Nat`。皮亚诺的零、后继、后继单射、递归和归纳均有教学；部分成熟代数定理使用已验证的库定理卡。
- `Garden.EpsilonLimit` 是实数的去心 ε–δ 极限定义，不是占位命题。
- 导数与积分直接使用 Mathlib 的 `HasDerivAt`、`deriv` 和区间积分。
- Mathlib 把不可导点的 `deriv` 定义为零。罗尔教学题额外保留传统的可导条件，避免把这一总函数约定误认为通常数学里的可导性结论。
- `Garden.Congruent m x a` 定义为 `m ∣ x-a`，与整数同余等价；这一形式便于按钮式构造整除见证。CRT 结论包含存在性；前一关验证互素情形下模乘积的唯一性。
- `Garden.crossing` 是分析第 21 关的辅助分点引理，源文件里有完整证明。第 22 关是在这个已经学过的结果上组合两次中值定理。

## 迁移到抖音/微信的下一阶段

本版 UI 使用 DOM 和 SVG，不能直接当作平台原生小程序上传。后续应选择平台/开发框架，把界面移植为对应组件，复用 HTTP 契约及课程数据。Lean 编译继续运行在服务器端；小程序端只提交卡牌 ID、显示目标和动画。

当前额外配置了 Tailscale 私有网络 TCP 转发，Node 仍监听 localhost。启动入口和路径均相对脚本目录，整个项目位于桌面。此方式只解决自有设备访问，本身不提供跨浏览器进度同步。

公开上线之前还需要：真实支付与广告适配器、编译任务队列、服务隔离、部署证书与平台域名配置、远程持久化和异常监测。账号鉴权及登录限流已在 v0.11.0 加入；这里没有部署或申请云端资源。

建议先做真人试玩，重点观察：第一轮归纳是否太陡、`use` 的自动收尾是否容易误解、复杂数学符号在手机上是否要增加中文解释、哪些高阶大按钮应进一步拆分为子技能。再增加剧情、战斗动画、独立章节美术和题库支线。

## 参考文档

- [Lean tactic reference](https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Tactic-Reference)
- [Theorem Proving in Lean 4：Tactics](https://lean-lang.org/theorem_proving_in_lean4/Tactics/)
- [Mathlib 源码](https://github.com/leanprover-community/mathlib4/tree/v4.34.0)

实际定理名称和签名以本机固定的 v4.34.0 源码与编译结果为准，不依赖在线最新版的接口。
