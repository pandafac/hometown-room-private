# 会客厅 Demo 5.0 · 新窗口交接

> 文件名保留为 `HANDOFF-DEMO4.md` 以兼容旧入口；当前内容已升级为 Demo 5.0。  
> 交接日期：2026-11-08  
> 项目根目录：`D:\Guest's Home`  
> 当前最终产物：`outputs/会客厅Demo 5.0.html` 与 `deliverables/会客厅Demo 5.0.html`

## 1. 先看这里

**Demo 5.0 是当前唯一有效的外部分享版本。**

- 权威工作产物：`outputs/会客厅Demo 5.0.html`
- 可发送副本：`deliverables/会客厅Demo 5.0.html`
- 公开入口：已于 2026-11-09 下线，不再提供公开链接
- 文件大小：12,028,815 bytes（约 12.0 MB；原 46.2 MB）
- 最近 SHA-256：`CF0D332CAF2152EADC8677006C29CC6B638865FEBD25ECE356DA609A19B67A33`
- 发布状态：原 GitHub Pages 已关闭；GitHub 仓库已设为私有，发布分支 `gh-pages` 已删除。

如果后续生成时间变化，以 `outputs/` 和 `deliverables/` 两个 Demo 5.0 文件哈希一致为准。

## 2. 最重要的构建约束

Demo 5.0 **不是**直接由当前 `src/` 构建出来的。

真实链路是：

```text
用户提供的 Demo 3.0 单文件 HTML
  -> scripts/patch-demo3-ui.mjs
  -> outputs/会客厅Demo 5.0.html
  -> deliverables/会客厅Demo 5.0.html
  -> deploy/index.html + deploy/chunks/<hash>/
```

项目内归档的输入文件：

```text
source-assets/会客厅Demo3.0-原始输入.html
```

原始微信缓存路径仅作为来源记录：`D:\xwechat_files\wxid_md493y21594722_8a8f\msg\file\2026-11\会客厅Demo 3.0-独立分享版(1).html`。不要删除当前本地归档。

继续修改 Demo 5.0 时，必须修改 `scripts/patch-demo3-ui.mjs`，然后运行：

```powershell
node scripts/patch-demo3-ui.mjs
```

该脚本会自动更新：

- `outputs/会客厅Demo 5.0.html`
- `deliverables/会客厅Demo 5.0.html`
- `deploy/index.html`
- `deploy/.nojekyll`
- `deploy/.gitattributes`
- `deploy/chunks/<content-hash>/demo5-part-001.txt`

### 禁止事项

- 不要直接手改生成 HTML；当前成品约 12.0 MB，源基线仍约 46 MB。
- 不要把 `npm run build:standalone` 当作 Demo 5.0 的重建命令。它会从当前 Demo 2.0 源码生成另一套视觉基线，可能覆盖或混淆最终版本。
- 不要覆盖用户提供的 Demo 3.0 输入文件。
- 2026-11-07 的短期公开部署例外：允许把含当前 API Key 的 Pages 内容包推送到专用 GitHub Pages 仓库，因为该 Key 将于 2026-11-08 到期。不得把 `.env.local` 或后续轮换后的新 Key 提交进仓库。

## 3. 当前成品能力

### 游客端

- 封面保持游客与店主两个独立入口。
- “直接问店”支持店名/小镇搜索，直接跳转到既有 AI 会客厅；最近访问店铺优先，支持 `Ctrl/⌘ + K`。
- 只有一个开放小镇的地区，地区卡直接进入该小镇，同时保留返回地区路径。
- 小镇页面采用左侧“今日状态 + 处境选择 + 问题草稿”、右侧店铺入口。
- 小镇主视觉使用虚构演示的地方氛围图；店铺卡顶部增加类型缩略图，帮助在进入 AI 会客厅前判断“这家店像不像我现在需要的”。
- 选择处境后会排序右侧店铺，并标记首位“更符合今天”；处境本身不直接打开店铺。
- 会客厅 AI 面板占桌面约 53%；滚动时固定在视口附近。
- 会客厅店铺头图使用对应店铺的氛围图，但不改变信息层级、联系方式缺口或 AI 正文阅读区。
- “你可能想问”支持收起/展开，并在首条游客问题后自动收起。
- AI 回答中可排队下一问，当前回答结束后按顺序自动发送。
- AI 支持复合问题补答，检查所有检测到的 intent，并补齐遗漏内容。
- 新增 `dietary` 意图，可处理香菜、葱、辣、素食、坚果、乳糖等忌口问题。
- 回答正文和来源标签会将内部字段路径转换为中文来源名称。
- 联系方式缺失时显示“店主尚未提供”，不生成虚构号码。
- 到店卡、体验反馈、打印/保存 PDF 流程保留。
- 到店卡增加“保存为图片”：内联 `html-to-image`，无需联网即可导出完整 PNG。
- 浏览器标题与页面元信息统一使用产品名“会客厅”，不显示 Demo 版本号。

### 店主端

- 工作台无 `view` 参数时默认进入“店主资料”；游客回声使用 `?view=output`。
- 店主资料页是左侧资料目录、右侧录入/回答操作。
- 最近确认资料与待补问题使用更大的分类、问题、回答字号；待补问题卡保留清晰可点击区域。
- 桌面端最近确认资料的左侧分类与右侧问题采用同一文字基线对齐。
- 游客回声页保留一套内容生成区域，旧重复内容工坊已隐藏。
- 经营概览、问题主题、优先补资料、覆盖率、反馈和最近资料更新使用统一分区布局。
- 店主新增资料后会立即进入本机 AI 上下文。

## 4. AI 与数据现状

### DeepSeek

- 模型：`deepseek-flash`
- Base URL：`https://api.deepseek.com`
- 配置来源：`.env.local`
- 补丁脚本会把 Key 注入单文件分享 HTML。
- 浏览器直连 DeepSeek 已实测返回 200。
- `deepseek-flash` 当前可用；空的 Key 是此前答非所问的根因。

**安全要求：**

- 不要在任何文档、日志、界面或最终回复中打印 Key。
- Demo 5.0 当前包含可提取的 Key；用户已明确接受它在 2026-11-08 到期前的公开暴露风险。
- 这把 Key 已经在对话中明文出现过；到期或演示结束后仍应轮换。
- 当前公开站点是临时例外。Key 失效后若仍需实时 AI，必须改为服务端代理或受限密钥方案。

### 店主知识

- 总知识量：170 条。
- 桥西茶寮：36 条。
- 阿沅面馆：36 条。
- 南栅竹编所：36 条。
- 半山豆腐坊：30 条。
- 松风茶屋：32 条。
- 基础资料：`server/data/owner-knowledge.json`
- 扩展资料：`server/data/owner-knowledge-extra.json`
- `server/runtime.js` 会合并并去重两组资料。
- Demo 5.0 通过内嵌扩展知识并在浏览器启动时合并，保持单文件与源码数据一致。

## 5. 最近完成的关键修复

1. 修复分享 HTML 中 DeepSeek Key 为空导致所有回答退化为通用兜底的问题。
2. 修复“我不吃香菜”等忌口问题识别不到的问题。
3. 修复复合问题只回答第一项的问题。
4. 修复 AI 输出内部字段路径到用户界面的问题。
5. 店主知识从 90 条扩充到 170 条。
6. 店主工作台默认进入“店主资料”，不再默认进入游客回声。
7. 修复资料分类目录旧胶囊样式与新网格冲突造成的错位。
8. 店主端隐藏重复内容生成区域，重排资料页与回声页。
9. 小镇页改为左侧状态与问题准备、右侧直接选店。
10. 状态选择现在会影响店铺排序并标记首位。

## 6. 验证命令

### Demo 5.0 浏览器回归

```powershell
$env:PYTHONIOENCODING='utf-8'
python scripts/verify-demo3-product-fixes.py
python scripts/verify-demo3-ui.py
python scripts/verify-demo3-planner.py
python scripts/verify-demo3-navigation.py
python scripts/verify-demo5-image-export.py
python scripts/audit-demo3-ai.py
python scripts/audit-demo3-loop.py
python scripts/audit-demo3-offline.py
python scripts/audit-deepseek-browser.py
```

这些脚本文件名保留了 `demo3` 历史前缀，但当前全部读取 `outputs/会客厅Demo 5.0.html`。

### 源码与数据

```powershell
npm run validate:data
npm run build
```

API smoke/E2E 需要先启动服务端：

```powershell
$server = Start-Process node -ArgumentList 'server/index.js' -PassThru -WindowStyle Hidden
Start-Sleep 2
npm run smoke
npm run test:e2e
Stop-Process -Id $server.Id
```

### 最近验证结论

- 数据校验：3 个地区、3 个小镇、5 家店、170 条店主知识。
- DeepSeek 浏览器请求：通过，返回 200。
- 复合问题：座位与电脑/设施同时回答。
- 忌口问题：“我不吃香菜”能够引用对应食材资料。
- 多轮排队问题：通过。
- 到店卡、反馈、内容生成：通过。
- 店主补资料闭环：通过。
- 离线本地回退：通过。
- 1440px 与 390px：无横向溢出。
- 浏览器：无应用级控制台错误。
- 内联图片：28 张转为 WebP，39.0 MB -> 8.3 MB，整页 46.2 MB -> 12.0 MB。
- Demo 5.0 水彩图：封面、云溪镇、桥西茶寮、松风茶屋、到店卡反馈区、店主资料概览各一张。
- 店主资料字号：分类 8 -> 11px，问题 12 -> 15px，回答 11 -> 13px；待补问题分类 8 -> 11px、问题 9 -> 13px。
- 队友 `3.0UI补全.html` 中采纳 7 张图（2 张小镇、5 张店铺）；没有采纳其三栏会客厅、3.6k 像素长页面和旧三套内容工坊。
- GitHub Pages：4 KB 入口 + 单个版本化内容包；VPN 开启、普通 Chromium 首次加载约 15 秒。
- GitHub Pages 实时 AI：`deepseek-flash` 返回 HTTP 200，排队追问回答正确。
- 到店卡图片导出：真实下载 1844×2668 PNG，468,261 bytes，状态显示“图片已保存”。
- 公网 Demo 5.0：约 11.46 秒加载，DeepSeek 返回 200，到店卡公开导出 1844×2658 PNG、476,981 bytes。
- 比例修正：到店卡主标题 69.12px -> 50.4px，正文 14px -> 15.5px；店主授权复选框 384×44px -> 18×18px。

## 7. 当前未解决/需要继续关注

1. **源码与 Demo 5.0 不完全同源。** Demo 5.0 依赖约 46 MB 的源基线加补丁脚本，当前 `src/` 仍是 Demo 2.0 基线；补丁后成品约 12.0 MB。
2. **Key 安全。** 当前公开 GitHub Pages 依赖一把将在 2026-11-08 到期的 Key；到期后实时 AI 会停止，必须换服务端代理或替换为受限方案。
3. **联系方式仍无结构化字段。** 当前能诚实显示缺失，但店主无法在专用表单中录入电话/预约方式。
4. **店主资料完整度指标需要重新定义。** 页面显示百分比，但开放资料缺口仍可能存在，语义上容易让人误解。
5. **店铺排序是本地规则映射。** 当前按处境与需要偏好排序店铺，后续应抽成可维护的标签/场景配置。
6. **收藏、价格筛选和完整标签筛选仍未实现。** 应等标签数据源稳定后再做。
7. **公开加载依赖临时 CDN 回退链。** 4 KB 入口通过 jsDelivr 加载内容包，失败时回退 `ghproxy.net`；正式产品应改为自有 CDN/服务端资源，不依赖第三方代理。

## 8. 建议的下一阶段优先级

1. 将 Demo 5.0 补丁层合并进正式 React 源码，建立唯一的 `build:standalone` 链路。
2. 取消前端 Key，改用服务端代理并轮换当前 Key。
3. 为联系方式、预约方式、发票规则增加结构化店主字段。
4. 把处境排序规则和数据标签抽成配置，而不是继续写在 DOM 补丁脚本里。
5. 扩充 AI 自动化评测，至少覆盖：
   - 排队追问
   - 多意图
   - 忌口与过敏
   - 联系方式/发票缺失
   - 店主补充后再次回答

## 9. 关键文件

| 文件 | 用途 |
| --- | --- |
| `outputs/会客厅Demo 5.0.html` | 当前权威产物 |
| `deliverables/会客厅Demo 5.0.html` | 最终可发送副本 |
| `deploy/index.html` | GitHub Pages 发布入口 |
| `deploy/chunks/<content-hash>/` | Pages 加载的版本化内容包 |
| `visual-assets/demo4/` | 小镇和店铺氛围图源文件 |
| `visual-assets/demo5/` | Demo 5.0 水彩地方志插画 |
| `scripts/patch-demo3-ui.mjs` | Demo 5.0 唯一补丁构建入口 |
| `server/data/owner-knowledge.json` | 90 条基础知识 |
| `server/data/owner-knowledge-extra.json` | 80 条扩展知识 |
| `server/runtime.js` | 知识合并与店主数据 |
| `server/quality.js` | intent 识别与回答校验 |
| `server/fallback.js` | 本地兜底 |
| `src/standalone/shim.js` | 单文件模拟 API |
| `src/pages/MerchantPage.jsx` | 店主默认视图逻辑 |
| `docs/PRODUCT-CONTEXT.md` | 产品单一事实来源 |
| `AGENTS.md` | 新窗口规则入口 |

## 10. Git 状态

当前仓库仍没有已提交的基线，全部项目文件在 Git 中显示为未跟踪。不要擅自 `git add .` 或提交；新窗口若需要整理 Git，应先明确哪些属于用户已有文件。
