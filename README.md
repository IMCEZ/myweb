# Ide-Chen (IDR) · 个人网站

纯静态个人作品集网站。零依赖、零构建、零服务器 —— 双击 `index.html` 就能看。
主色天蓝，简约风，亮 / 暗双主题，带一个可视化内容管理后台。

---

## 快速开始

**最快的方式**：直接双击 `index.html`。

**推荐的方式**（本地预览，功能最全；也是手机调试的前提）：

```powershell
# 在本目录下任选一种
npx serve .
# 或
python -m http.server 8080
```

然后打开 <http://localhost:8080>。

> 为什么推荐起个小服务？用 `file://` 直接打开时，浏览器出于安全策略会禁止页面
> 读取本地 JSON 文件。站点为此做了兜底（见「数据是怎么存的」），功能都正常，
> 但用 HTTP 访问是最接近真实上线的状态。

**用手机看效果**：把服务绑到所有网卡，手机连同一个 Wi-Fi：

```powershell
npx serve . -l tcp://0.0.0.0:8080
# 然后手机访问 http://<你电脑的局域网IP>:8080/
# 查 IP：ipconfig  → 找 WLAN 的 IPv4 地址
```

如果手机打不开，通常是 Windows 防火墙拦了入站。放行一次即可：
「Windows 安全中心 → 防火墙和网络保护 → 允许应用通过防火墙」勾上 Node.js
（或允许 `python`）。本机首次监听网络时，Windows 一般会弹窗询问，选「允许」就行。

---

## 目录结构

```
.
├── index.html                 首页（首屏 / 精选作品 / 技能 / 关于 / 联系）
├── projects.html              全部作品（标签筛选 + 关键词搜索）
├── project.html               作品详情（project.html?id=xxx，可直接分享）
├── about.html                 关于我（简介 / 经历时间线 / 技能 / 联系方式）
├── 404.html                   找不到页面
├── admin.html                 内容管理后台  ← 只放本地，不要发布（见「部署」）
│
├── assets/
│   ├── css/
│   │   ├── main.css           设计系统（色彩 / 排版 / 组件 / 亮暗主题）
│   │   └── admin.css          后台专用样式
│   ├── js/
│   │   ├── theme-init.js      主题预置（防首屏闪烁，必须放 <head>）
│   │   ├── store.js           数据层（读 JSON + file:// 兜底）
│   │   ├── markdown.js        自研 Markdown 渲染器（约 6KB，含代码高亮）
│   │   ├── ui.js              导航 / 页脚 / Logo / 卡片 / 揭示动画
│   │   ├── boot.js            页面启动器
│   │   ├── page-home.js       首页逻辑（含 Logo 描边绘制动画）
│   │   ├── page-projects.js   列表页逻辑（筛选 / 搜索 / URL 同步）
│   │   ├── page-project.js    详情页逻辑
│   │   ├── page-about.js      关于页逻辑
│   │   ├── admin.js           后台逻辑
│   │   ├── admin-draft.js     草稿恢复提示条
│   │   └── data-embedded.js   ← 自动生成，请勿手改
│   ├── data/
│   │   ├── data.json          作品数据（内容主体）
│   │   └── site.json          站点配置（站名 / 首屏文案 / 关于我 / 技能 / 联系方式）
│   └── img/
│       ├── logo.svg           IDR 字母组合标志（天蓝渐变）
│       ├── logo-dark.svg      深色底版本
│       ├── logo-wordmark.svg  横版字标
│       ├── favicon.svg        站点图标
│       └── covers/            作品封面（SVG，可换成自己的图）
│
├── tools/
│   └── build-embedded.mjs     把 data/*.json 内联进 data-embedded.js
│
├── vercel.json                Vercel 部署配置（缓存头 / 重定向策略）
├── .vercelignore              Vercel 部署排除清单
├── .gitignore                 Git 排除清单（含 admin.html）
├── .nojekyll                  GitHub Pages 用，禁掉 Jekyll 处理
└── .github/workflows/deploy.yml  GitHub Pages 自动部署
```

---

## 怎么发布作品（管理后台）

打开 `admin.html`，默认口令 **`idr`**（可在「站点设置 → 安全」里改）。

1. **绑定站点文件夹**（只需做一次，强烈推荐）
   左侧点「数据与备份」→「选择站点文件夹」→ 选中包含 `index.html` 的**这个目录**。
   绑定后，点「保存」会一次性写入三个文件，不用手动拷贝任何东西。

2. **新建作品**
   「作品管理」→「新建作品」，填写：
   - **标题 / 一句话简介**：卡片上显示的内容
   - **正文**：支持 Markdown（`##` 标题、`**粗体**`、`- 列表`、` ```代码块``` `、`> 引用`、表格）
   - **封面**：上传本地图片（自动压缩到 1600px 内），或直接填图片网址
   - **分类 / 标签 / 日期 / 状态 / 角色 / 周期**：用于筛选和详情页侧栏
   - **相关链接**：演示地址、源码、下载等，会按类型显示不同图标
   - **亮点**：详情页侧栏的要点列表
   - **设为精选**：勾上之后就出现在首页

3. **保存**
   右上角「保存」。绑定了文件夹 → 直接写入；没绑定 → 自动下载三个文件，你放回对应目录。

4. **改站点信息**
   「站点设置」里可以改站名、首屏文案、关于我、技能分组、联系方式、社交链接、页脚、默认主题、后台口令。

后台还支持：拖动排序、复制作品、删除作品、导出/导入 JSON 备份、未保存内容自动存草稿（下次进入会提示恢复）。

---

## 数据是怎么存的（重要）

站点是纯静态的，没有服务器，所以数据用**双文件**方案：

| 文件 | 作用 |
|---|---|
| `assets/data/data.json`、`site.json` | 真实数据源。用 HTTP 访问（含线上托管）时读这个。 |
| `assets/js/data-embedded.js` | 同样数据的**内联副本**。双击 `file://` 打开时读这个。 |

后台「保存」时会同步更新这两份，所以你不用操心它们不一致。

> 为什么要两份？因为 `file://` 协议下浏览器会拦截 `fetch()` 本地文件。
> 有了内联副本，你的站点既能直接双击打开看效果，也能正常部署到服务器。
> 如果你只手动改了 `assets/data/*.json`，记得跑一次
> `node tools/build-embedded.mjs` 重新生成副本。

### 图片怎么放（线上托管时值得注意）

后台「上传图片」会把图片**压缩后以 base64 内嵌进 JSON**。好处是「一个 `data.json` 走天下」，
换电脑、备份、搬家都不会丢图。

代价：JSON 会变大。Git 仓库里每次改内容，图片数据都会跟着重新提交一遍。

所以建议：

- **少量图片 / 图很小** → 直接内嵌，最省事
- **图片多或很大（想让仓库保持轻量）** → 把图片放进 `assets/img/`，在作品的
  「封面」字段里填相对路径（例如 `assets/img/my-work.png`），或填图床 / GitHub 上的 https 链接

---

## 部署

这是纯静态站点，任何静态托管都能直接放。已内置 **GitHub Pages** 与 **Vercel** 的配置。

### ⚠️ 部署前必读：不要发布 admin.html

`admin.html` 是**本地创作工具**，不适合公开：

- 它的访问口令是纯前端的，任何人查看网页源码都能读到
- 它包含「读取 / 写入你本地文件」的能力

已经帮你排除了：

- `.gitignore` 里排除了 `admin.html`（不会进 Git 仓库）
- `.vercelignore` 里也排除了它

所以 **admin.html 只留在你电脑上**。发布内容时，只需要提交
`assets/data/` 和 `assets/js/data-embedded.js`。

### 方式一：GitHub Pages（推荐，免费且最省事）

**本站的仓库是 `IMCEZ/myweb`**，所以站点地址会是
<https://imcez.github.io/myweb/>

1. 把本站推到 `IMCEZ/myweb` 的 `main` 分支
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**
3. 再推一次（或手动触发工作流），`.github/workflows/deploy.yml` 会自动发布

> `.nojekyll` 已就位，避免 Jekyll 处理下划线开头的文件。
> 如果以后想换成根路径地址（`https://imcez.github.io/`），
> 需要新建一个名为 `IMCEZ.github.io` 的仓库放本站。

### 方式二：Vercel

在 Vercel 里导入仓库即可，**不需要填任何构建命令**（框架选 Other，输出目录留默认根目录）。
`vercel.json` 已配好缓存头；`.vercelignore` 会自动排除 `admin.html`、`tools/` 和文档。

也可以用命令行：

```powershell
npx vercel        # 预览部署
npx vercel --prod # 正式部署
```

### 方式三：Netlify

把**整个文件夹拖到** <https://app.netlify.com/drop> 即可。
拖拽前请先**手动删掉或移出 `admin.html`**（Netlify 拖拽不读 `.gitignore`）。

或者连仓库：构建命令留空，发布目录填 `.`。

### 方式四：自己的服务器

把文件放进网站根目录。Nginx 建议加一条 404 兜底：

```nginx
location / {
    try_files $uri $uri/ /404.html;
}
```

### 日常更新流程

改完内容后：

```powershell
git add assets/data assets/js/data-embedded.js
git commit -m "更新作品"
git push
```

推送后平台会自动重新部署（GitHub Pages / Vercel 通常 1 分钟内生效）。

---

## 部署后的检查清单

- [ ] 首页能打开，Logo 描边动画正常
- [ ] 点作品卡片能进详情页，地址栏是 `project.html?id=...`
- [ ] 详情页正文、封面、侧栏链接都正常
- [ ] 右上角主题切换可用（亮 / 暗）
- [ ] 手机浏览器打开，导航收成汉堡菜单、卡片单列
- [ ] 随便访问一个不存在的地址，出现自定义 404 页
- [ ] `https://<你的站点>/admin.html` 返回 404（说明后台没被发布出去）✔ 必须确认这条

---

## 定制建议

- **换主色**：`assets/css/main.css` 顶部 `--sky-500` 改一个值，全站跟着变（亮暗两套映射都在那里）。
- **换 Logo**：替换 `assets/img/logo.svg`、`favicon.svg`；页面上内联的 Logo 由
  `assets/js/ui.js` 里的 `logoSVG()` 生成，改那个函数即可。
- **换封面**：替换 `assets/img/covers/` 里的图片，或在后台上传。
- **加页面**：复制一份 `about.html`，改内容，新建 `assets/js/page-xxx.js` 并导出
  `window.IDR_PAGE`，在页面底部引入即可。

---

## 浏览器支持

Chrome / Edge / Firefox / Safari 近两年版本均可。

后台的「直接写入文件」依赖 File System Access API：

- **Chrome / Edge / Opera**：支持，可一键保存
- **Firefox / Safari**：不支持，会自动改用下载方式（功能不缺，只是多一步拖文件）

---

## 许可

示例文案、示例作品数据都是占位内容，请替换成你自己的。
