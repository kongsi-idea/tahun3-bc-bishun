# tahun3-bc-bishun · 三年级写字（笔顺描红）

**状态**：✅ **已上线**（`https://tahun3-bc-bishun.vercel.app`），已上架课堂点子铺。**v1.3**。
**最后更新**：2026-09-11（Claude Sonnet 5）

## v1.3（2026-09-11）修多音字读错音 + 加拼音标注
老师回报：字音朗读有些字听起来是错的。**根因**：`speechSynthesis` 读孤立的单个汉字，
遇到多音字（如「系」「卷」「省」）引擎会猜一个读音，常常不是课本这一课教的那个。

**修法**（跟 tahun1/tahun2-bc-bishun 同一套，三个工具一起修）：
1. **新增 `js/pinyin-data.js`**：165 字逐个配 `{py, word}`。154 字单音字，`pypinyin` 默认读音
   直接可信；7 字课本原文里真的出现过不同读音，逐个对照课本原句人工核定——其中「系」
   原本自动候选给了「关系」xì，但对照课本原句「这条路，把我们和学校**系**在一起」是
   「连接」的意思，改判定为 jì、词「系鞋带」；4 字课本查无退通用词典。每条都跑过校验：
   word 含 ch、`pypinyin(word)` 在该位置算出的读音等于存的 py。
2. **画面显示拼音**：三步（看一看/描一描/写一写）+ 小考都在田字格上方标"字 拼音"小标签，
   跟星星娃娃的金画框皮肤统一视觉。图缺失或查无这个字时标签自动隐藏。
3. **朗读改读「字，词」**：听读音 + 自动读音都从读孤字改成读"字，词"（如"试卷""北斗"），
   词的上下文强制引擎读对音。

⚠️「卷」「省」课本本身有意教「一字两读」（"卷起来 改试卷 省钱 反省……都是多音字"），
只能收录一种，已选更贴近这个年龄段常见语境的那个（试卷/省钱）。

## v1.2（2026-09-10，加原创星星娃娃角色）
Codex（`xx` 帐号，14:54 额度 refresh 后）用它自己的 OpenAI 生图能力生了 3 张原创星星娃娃
（1024²→缩到 560² RGBA 透明 PNG，存 `assets/`，`build-data.mjs` 不碰它们）：
- `star-cheer.png`（举星欢呼）→ 写对一个字 / 小考答对时从田字格**左下角**蹦出来一下再退回，**不挡字**
- `star-read.png`（坐云看书）→ 首页/各页**左下角**静态布景，opacity .78
- `star-peek.png`（云后探头挥手）→ **右上角**静态布景，opacity .6，手机端隐藏
所有角色都是原创（胖幼儿 + 星形帽连体衣的通用形象），不是那套盲盒角色的复制。
⚠️ CSS 里图片路径是 `url("../assets/...")`（相对 `css/` 目录，不是 `assets/`，第一次写错踩过）。
移除角色：删 `assets/star-*.png` + `.reward-buddy`/`.scene-buddy` 的 background-image + index.html 两个 `scene-buddy` div。

## v1.1（2026-09-10，学生用之前，安全）
老师反馈「背景很空」「奖励动画不要挡住写好的字」。
- **金星「棒」章移到田字格右上角外侧** —— 像盖在纸角的印章，只有一点点压到格子空白处，
  写好的字完整露出来（旧版是 46% 大小盖在正中，把字挡住了）
- **背景加厚**：垂吊金星 5→8 颗（远近大小不一）、多一层云、加了一层细小闪烁星点（很淡）
- **奖励星星娃娃弹入机制已接好但没图**：`#rewardBuddy` 元素 + `popBuddy()` 逻辑写好了，
  写对一个字 / 小考答对会从田字格左下角蹦出来一下再退回去、不挡字；
  但**没有角色图**（见下），现在是隐形空壳，不影响任何功能、无 console 报错
- **静态星星娃娃布景**（坐在云上看书 / 云后探头）CSS 已备好、注释起来了，等图片就绪接回

### ⚠️ 星星小人角色 —— 两条生图路都断了（2026-09-10 13:xx）
1. `~/.openai.env` 的 OpenAI API key：`no credits remaining`
2. Codex `xx` 帐号：`xx-limit.sh --gate` = STOP，ChatGPT/Codex 用量上限（"try again at 2:52 PM"）

→ **v1.2 待办**（任一条路通了就做）：生 3 张原创星星娃娃透明 PNG 存 `assets/`：
   `star-cheer.png`（举星欢呼，奖励弹入用）/ `star-read.png`（坐云看书，布景）/ `star-peek.png`（云后探头，布景）。
   角色设定：胖幼儿、桃色皮肤、圆红脸颊、圆点眼、奶油黄星形帽连体衣、暖金梦幻水粉风、**原创不抄盲盒**。
   放进去只要：① `css/style.css` 里 `.reward-buddy` 的 `background-image` 取消注释；
   ② 那段注释掉的 `.scene-buddy` CSS 接回 + `index.html` 放回 `sb-read`/`sb-peek` 两个 div。
   然后 `vercel deploy --prod`。

## 这是什么
照 `tahun1-bc-bishun` / `tahun2-bc-bishun` 的架构做的三年级版：换数据（三年级习写生字）+ 换皮。
逻辑原样搬：看一看（笔顺动画 + 自动读字音）→ 描一描 → 写一写（凭记忆，写对得 ★），
每单元「小考」随机抽最多 8 字，全单元写完盖金星「棒」章。

- **20 单元 / 165 习写格**（三年级没有识字单元）
- 纯前端无 build。`js/char-data.js`（165 字笔画，440KB）由 `node build-data.mjs` 从
  `hanzi-writer-data@2.0.1` 打包，离线可用。**缺字 0**。
- 笔画引擎 Hanzi Writer 3.7.0（`vendor/`，MIT）；声音 WebAudio + 读字音 `speechSynthesis`

## 视觉皮肤：We are Twinkle Twinkle · 暖调梦幻绘本
老师给的参考图（"we are twinkle twinkle" 盲盒系列）。**不是夜空**，是蜂蜜金晨光。
- 蜂蜜金渐层底 + 蓬松奶油云 + 从顶端垂吊的金色剪纸星星（会轻轻摆）+ 朦胧晨光
- **华丽金色画框**围住整个视口（双线金边 + 四角卷草 SVG）—— 这套的招牌
- 田字格外裹一圈小金框，呼应大画框
- 金星「棒」章（星形 clip-path）、梦幻蓝主按钮、嫩叶绿进度、暖赭橘错误提示
- 字体 ZCOOL KuaiLe 标题 + Noto Serif SC 生字 + Fredoka/Baloo 拉丁数字
- 配色 token 全在 `css/style.css` 顶部 `:root`
- ⚠️ **没有星星小人角色**：`~/.openai.env` 的 API key 生图时报「no credits remaining」，
  `draw` skill 生不了。原创星星娃娃留作 v1.1（老师充值 key，或派 codex 用它自己的生图能力）。
  目前靠画框 + 垂星 + 云 + 暖光把梦幻绘本感做出来，跑起来是够的

## 与 tahun1/2 版的差异（除皮肤和数据）
- `SLUG` = `tahun3-bc-bishun`；localStorage key 前缀 `bishun3_`（跟一二年级隔离）
- Supabase：表 `tahun3_bc_bishun_progress` + RPC `submit_tahun3_bc_bishun_progress`
- Hanzi Writer 描红配色：暖棕墨 + 柔金描线 + 蓝运笔 + 绿高亮

## 上线事实（2026-09-10）
- 工具 repo：`github.com/kongsi-idea/tahun3-bc-bishun`（first commit）
- Vercel 项目 `tahun3-bc-bishun`（scope kongsi-idea），`vercel deploy --prod` 部署
  ⚠️ Vercel↔GitHub 自动部署没接上（跟 tahun2 一样）→ 改工具要 `npx vercel deploy --prod --yes --scope kongsi-idea`
- Hub：`kongsi-idea` commit（app.js TOOLS + 4 缩略图 + coverage 矩阵）；
  `kongsi-idea.vercel.app` alias 手动补指
- **线上 E2E 实测**（生产 URL，headless 真实鼠标）：20 单元 / 165 格 / HW_DATA 165 字；
  选名字→选单元→看一看→写一写，脚本真实描完整个「巨」字触发盖章「写好了！得到一颗 ★」；
  console 0 error（3 次连续 load 无 4xx）。手机 390 宽 2 列正常

## ⚠️ 上线时没做、老师要补的
1. **生字表核对**（`核对清单.md`）—— 提取很干净，只有 3 个跨课复现字（十二「骨」/十八「序」/二十「网」）
   建议顺手确认。改 `units.js` 一行 → `node build-data.mjs` → `vercel deploy --prod`。热更新安全
2. **Supabase migration 没跑**：`kongsi-idea/supabase/migration-2026-09-10-tahun3-bc-bishun-progress.sql`
   没跑之前进度只存 localStorage（电脑室一人一机够用），跑了之后跨电脑接续生效
3. **kelasku 里没有三年级班级**：只有 `JBC1037-1I` / `JBC1037-1G`。`?code=` 名单功能要先建三年级班
4. **真机实测**：学校 Windows+Chrome+学校鼠标实走一遍，看笔顺判定松紧对三年级合不合适
5. **（可选）星星小人角色**：充值 OpenAI key 后我用 `draw` 生一个原创星星娃娃放在「写对了」时刻

## 回滚
- 工具：`cd teaching-tools/tahun3-bc-bishun && git revert HEAD && git push` →
  `npx vercel deploy --prod --yes --scope kongsi-idea`（首版一个 commit，真下架直接删 Vercel 项目 + repo）
- Hub 下架：`kongsi-idea/app.js` 删 `tahun3-bc-bishun` 条目 → commit/push →
  `npx vercel deploy --prod --yes --scope kongsi-idea` → `npx vercel alias set <新url> kongsi-idea.vercel.app --scope kongsi-idea`
- DB（跑了 migration 之后要撤）：
  `drop table public.tahun3_bc_bishun_progress cascade;`
  `drop function public.submit_tahun3_bc_bishun_progress(text,text,text,jsonb);`

## 教学依据
- DSKP：3.1（应用铅笔写字、笔画笔顺）、5.1（汉字基本知识）—— 跟一二年级同条，三年级字形更复杂继续练
- 生字来源：三年级华文课本第 153-154 页习写生字表（提取重建，见 `核对清单.md`）
- 马来文 DSKP 官方单元名称未查证 → 没进 `kongsi-idea/data/dskp-index.js`，coverage 备注已标
