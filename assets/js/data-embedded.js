/* 自动生成：由 tools/build-embedded.mjs 把 assets/data/*.json 内联为可用数据。
   用途：直接用 file:// 双击打开页面时，浏览器禁止 fetch 本地 JSON，
        这个文件就是它的替代数据源（内容与 JSON 完全一致）。
   注意：请勿手改。改内容请用 admin.html 保存，或改 assets/data/*.json 后重新生成。 */
window.IDR_EMBEDDED = {
  "site": {
    "_readme": "站点全局配置。可以直接改这个文件，也可以打开 admin.html 用可视化后台改（推荐）。",
    "version": 1,
    "brand": {
      "name": "IDR",
      "fullName": "Ide-Chen",
      "tagline": "开发者 / 工程师",
      "logoAccent": "#0ea5e9"
    },
    "hero": {
      "kicker": "HELLO, WORLD",
      "title": "我是 Ide-Chen，代号 IDR。",
      "subtitle": "写代码，也写点别的。这里放我做过的项目、踩过的坑，以及一些还在路上的想法。",
      "primaryCta": {
        "label": "看看我的作品",
        "href": "projects.html"
      },
      "secondaryCta": {
        "label": "关于我",
        "href": "about.html"
      },
      "stats": [
        {
          "value": "6",
          "label": "个项目收录"
        },
        {
          "value": "∞",
          "label": "仍在折腾"
        },
        {
          "value": "100%",
          "label": "手写的"
        }
      ]
    },
    "about": {
      "title": "关于我",
      "lead": "一个喜欢把想法做成东西的人。",
      "paragraphs": [
        "你好，我是 Ide-Chen，网上一般叫 IDR。目前主要做 Web 开发相关的事情，喜欢干净的结构、能跑起来的代码，和把事情做完的感觉。",
        "除了写代码，我也对设计、动效和工具的边界很感兴趣 —— 会花时间把一个按钮的圆角调到顺眼，也会为了少点两次鼠标去写个脚本。",
        "这个站点本身就是一个项目：纯静态、零依赖、欢迎右键查看源码。"
      ],
      "timeline": [
        {
          "period": "现在",
          "title": "持续构建中",
          "desc": "在做一些 Web 工具和交互实验，把想法变成能用的东西。"
        },
        {
          "period": "此前",
          "title": "前端与全栈",
          "desc": "参与过若干产品从零到一的过程，负责过界面、数据与部署。"
        },
        {
          "period": "起点",
          "title": "从好奇开始",
          "desc": "因为想让自己的页面动起来，开始学 HTML / CSS / JS，然后就一直写到了现在。"
        }
      ]
    },
    "skills": {
      "title": "技能与工具",
      "subtitle": "下面这些是我日常用得比较多的东西。",
      "groups": [
        {
          "name": "语言",
          "items": [
            "JavaScript",
            "TypeScript",
            "Python",
            "HTML / CSS",
            "SQL"
          ]
        },
        {
          "name": "前端",
          "items": [
            "React",
            "Vue",
            "Vite",
            "Tailwind CSS",
            "原生 Web API"
          ]
        },
        {
          "name": "后端与数据",
          "items": [
            "Node.js",
            "Express",
            "PostgreSQL",
            "REST API",
            "Redis"
          ]
        },
        {
          "name": "工程与其他",
          "items": [
            "Git",
            "Docker",
            "Linux",
            "Figma",
            "CI / CD"
          ]
        }
      ]
    },
    "contact": {
      "title": "联系我",
      "subtitle": "有项目想聊、有问题想问，或者只是想打个招呼，都可以找我。",
      "email": "hello@example.com",
      "location": "中国",
      "socials": []
    },
    "footer": {
      "copyright": "© 2025 Ide-Chen (IDR). All rights reserved.",
      "note": "Made with plain HTML, CSS and JavaScript.",
      "repoUrl": "https://github.com/IMCEZ"
    },
    "settings": {
      "worksPerPage": 9,
      "defaultTheme": "light",
      "allowThemeToggle": true,
      "adminPin": "idr",
      "siteUrl": "https://imcez.github.io/myweb/"
    }
  },
  "data": {
    "_readme": "作品数据。推荐用 admin.html 可视化编辑后一键保存，不用手写这个文件。",
    "version": 1,
    "updatedAt": "2026-09-12T00:00:00.000Z",
    "categories": [
      "游戏",
      "移动应用",
      "开源项目",
      "Web 应用",
      "界面设计",
      "工具脚本",
      "实验性作品"
    ],
    "projects": [
      {
        "id": "p1",
        "slug": "year-galgame",
        "title": "岁月 Y.E.A.R",
        "summary": "一款正在开发中的 galgame。未完待续，敬请期待。",
        "cover": "assets/img/covers/year.svg",
        "tags": [
          "游戏",
          "galgame",
          "开发中"
        ],
        "category": "游戏",
        "featured": true,
        "date": "2026-09-12",
        "status": "正在开发",
        "role": "",
        "duration": "",
        "links": [],
        "content": "## 未完待续\n\n这是一款正在开发中的 galgame。\n\n还没有能拿出来的东西，先占个位置。\n\n**敬请期待。**",
        "highlights": []
      },
      {
        "id": "p0",
        "slug": "meshchat",
        "title": "MeshChat",
        "summary": "去中心化 Mesh 网络的即时通讯应用，Android 端以 APK 分发。团队项目，我负责其中的整个前端。",
        "cover": "assets/img/covers/meshchat.svg",
        "tags": [
          "开源项目",
          "移动应用",
          "前端",
          "去中心化",
          "即时通讯"
        ],
        "category": "移动应用",
        "featured": true,
        "date": "2026-09-10",
        "status": "持续维护",
        "role": "前端开发（团队项目）",
        "duration": "",
        "links": [
          {
            "label": "项目仓库（Soodok/MeshChat）",
            "url": "https://github.com/Soodok/MeshChat",
            "type": "repo"
          },
          {
            "label": "下载 APK（Releases）",
            "url": "https://github.com/Soodok/MeshChat/releases",
            "type": "package"
          }
        ],
        "content": "## 这是什么\n\nMeshChat 是一个跑在**去中心化 Mesh 网络**上的即时通讯应用。它不依赖中心服务器来转发消息，通信发生在节点之间。\n\nAndroid 端以 **APK** 形式分发，可以在项目的 GitHub Releases 里下载安装。\n\n## 这是一个团队项目\n\n需要说明清楚分工，因为我只做了其中一部分：\n\n- **前端** —— 由我独立负责\n- **底层网络协议与核心** —— 由团队其他成员开发\n- **项目仓库** —— 由队友 [Soodok](https://github.com/Soodok) 维护，代码提交记录都在那里\n\n所以我这个作品集里展示的，是**界面这一层的工作**，不是整个软件。\n\n## 我具体做了什么\n\n底层能力已经有了，我的工作是把那些能力变成一个真正能用、也看得懂的界面：\n\n- 聊天会话与消息列表的界面\n- 联系人 / 节点的查看与管理\n- 连接状态、消息状态的可视化呈现\n- 亮暗主题与整体视觉规范\n\n## 关于技术栈\n\n这里就不写具体框架了 —— 项目有其他成员在持续增改，依赖一直在变，写死了反而容易过时。\n\n想了解实现细节，直接看项目仓库的代码更准确。",
        "highlights": [
          "团队项目，前端由我独立完成",
          "底层协议与核心由队友开发，仓库由队友维护",
          "去中心化通信，消息不经中心服务器",
          "Android 应用，GitHub Releases 可下载 APK"
        ]
      }
    ]
  },
  "generatedAt": "2026-09-12T00:00:00.000Z"
};
