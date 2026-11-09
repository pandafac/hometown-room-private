# 会客厅 · 家乡 AI 接待员

一个面向第一次独自到访游客的 AI 店铺接待员与独立商家工作台。

> 当前项目根目录：`D:\Guest's Home`。

> 接手或升级产品前，先读 [Demo 5.0 交接](docs/HANDOFF-DEMO4.md) 和 [产品上下文](docs/PRODUCT-CONTEXT.md)。当前最终产物与补丁构建链路以交接文档为准。

Demo 2.0 增加店铺今日营业、客流与售罄状态，补齐地区、小镇和开放店铺的整卡点击，并在封面与游客目录加入地区、小镇、店铺统一搜索。

当前对外分享文件以 **Demo 5.0** 为最终版本。它在 Demo 2.0 源码基线上调整了会客厅主次布局、AI 面板滚动定位、追问建议收起、回答中排队提问、联系方式缺口提示与小镇处境选择，并加入“直接问店”快速入口、小镇状态前置确认、状态驱动选店、复合意图补答、单小镇直达、店主资料默认入口、店主工作台统一排版、到店卡 PNG 保存和 170 条店主知识。完整接手说明见 [Demo 5.0 交接](docs/HANDOFF-DEMO4.md)。

公开页面标题统一为“会客厅”，不在浏览器标签中显示版本号。

## 运行

```powershell
npm install
npm run dev
```

- 前端：http://localhost:5173
- API：http://localhost:8787
- 生产演示：http://localhost:8787
- 服务端开发模式从 `.env.local` 读取 DeepSeek 密钥。
- 当前 Demo 5.0 按用户明确授权内嵌短期 DeepSeek 密钥，并允许在 key 于 2026-11-08 到期前临时公开到专用 GitHub Pages。key 失效后，公开站点会退回本地规则回答；需要继续实时 AI 时必须改为服务端代理。

## 页面层级

- `/`：封面，选择游客或店主身份。
- `/visit`：游客选择地区。
- `/visit/:regionId`：选择小镇。
- `/visit/:regionId/:townId`：桌面左侧确认今日状态、选择处境并整理问题，右侧直接选择店铺；也可通过“直接问店”跳过逐级浏览。
- `/room/:townId/:shopId`：游客 AI 会客厅。
- `/card/:townId/:shopId`：第一次到店卡与体验回声。
- `/merchant`：独立店主入口。
- `/merchant/:regionId/:townId/:shopId`：店主工作台，默认进入店主资料；`?view=output` 进入游客回声。

## 产品闭环

商家资料 -> AI 会客厅 -> 游客问题 -> 第一次到店卡 -> 体验回声 -> 商家回声板 -> 补充资料 / 生成内容

## Demo 数据

地区、小镇、五家店铺、店主、评论与体验回声都是虚构演示数据。五家店共包含 170 条店主确认知识。

- 开发服务端使用进程内存，重启 API 后恢复种子数据。
- 单文件版使用浏览器 `localStorage` 保存店主补录和体验反馈，刷新后仍保留。

## 单文件分享版

```powershell
npm run build:standalone
```

输出：

- `outputs/会客厅-Demo2.0.html`
- `outputs/会客厅-Demo2.0-产品介绍.html`
- `deliverables/会客厅-Demo2.0.html`
- `deliverables/会客厅-Demo2.0-产品介绍.html`
- `deliverables/会客厅-Demo2.0-可发送版.zip`
- `D:\会客厅-Demo2.0\`（桌面交付副本）
- `D:\会客厅-Demo2.0-可发送版.zip`

该命令只构建 Demo 2.0 源码版，不生成 Demo 5.0。

### 当前 Demo 5.0

Demo 5.0 是当前最终交付版，由 `node scripts/patch-demo3-ui.mjs` 从 `source-assets/会客厅Demo3.0-原始输入.html` 生成。脚本会同时写入：

- `outputs/会客厅Demo 5.0.html`
- `deliverables/会客厅Demo 5.0.html`
- `deploy/index.html`
- `deploy/.nojekyll`
- `deploy/chunks/<content-hash>/demo5-part-001.txt`

原分享文件不会被覆盖。脚本名保留历史命名，但当前产物是 Demo 5.0。不要用 `npm run build:standalone` 重建或覆盖 Demo 5.0。

补丁脚本会把 28 张内联图片转换成 WebP，并把 Demo 5.0 的 6 张水彩地方志插画用于封面、小镇、会客厅、到店卡和店主工作台。当前成品约 12.0 MB（原为约 46.2 MB）。静态部署使用轻量入口加载同目录下的版本化内容包。

> 原 GitHub Pages 公开入口已于 2026-11-09 下线；仓库已设为私有，`gh-pages` 分支已删除。当前不再提供公开访问地址。

### 受控部署

`deploy/` 目录可交给带登录、密码或其他访问控制的静态托管服务。由于 Demo 是浏览器端应用，任何拿到完整页面的访问者都可以查看其前端代码；新地址不能只依赖“链接不公开”来保密。

部署前应使用服务端代理保管模型密钥，不要继续把新 Key 注入公开前端。历史发布说明见 [部署记录](docs/DEPLOYMENT-PAGES.md)。

## 验证

```powershell
npm run validate:data
npm run build
npm run smoke
npm run test:e2e
npm run build:standalone
python scripts/verify-demo5-image-export.py
```

## 专题文档

- [产品上下文与升级交接](docs/PRODUCT-CONTEXT.md)
- [产品口径](docs/PRODUCT-SPEC.md)
- [数据集说明](docs/DATASET.md)
- [五分钟演示脚本](docs/DEMO-SCRIPT.md)
- [全产品视觉优化约束](docs/PRODUCT-VISUAL-CONSTRAINT.md)
