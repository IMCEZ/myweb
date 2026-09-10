/* ==========================================================================
   IDR · 通用 UI 层
   - 主题（亮 / 暗）初始化与切换，无闪烁
   - 导航栏 / 页脚 / Logo 注入
   - 项目卡片渲染
   - 滚动揭示动画
   ========================================================================== */
(function (global) {
  'use strict';

  const THEME_KEY = 'idr.theme';

  /* ------------------------------ 图标 ------------------------------ */
  const ICON = {
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="11" r="2.6"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3A5 5 0 0 0 13.4 3.4l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3A5 5 0 0 0 10.6 20.6l1.7-1.7"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.4 9.4 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>',
    twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-6.8 7.8L22.8 22h-6.3l-4.4-6.2L6.7 22H3.6l7.2-8.2L1.6 2h6.4l4.1 5.8L18.9 2zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20z"/></svg>',
    wechat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 4C4.9 4 1.6 6.8 1.6 10.2c0 2 1.1 3.7 2.9 4.9l-.7 2.1 2.4-1.2c.9.2 1.8.4 2.8.4h.6a5.6 5.6 0 0 1-.2-1.5c0-3.2 3.1-5.8 7-5.8h.6C16.2 6 12.9 4 9 4zm-2.6 3.4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5.2 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/><path d="M22.4 14.6c0-2.7-2.8-4.9-6.2-4.9s-6.2 2.2-6.2 4.9 2.8 4.9 6.2 4.9c.8 0 1.5-.1 2.2-.3l1.9 1-.5-1.7c1.6-.9 2.6-2.3 2.6-3.9zm-8.2-1.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm4 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"/></svg>',
    mail2: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5v-11zm2.2-.5 7.8 5.6L19.8 6H4.2z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>',
    link2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M9 15l6-6"/><path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1M13 18l-1 1a4 4 0 0 1-6-6l1-1"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10 8.5l6 3.5-6 3.5z"/></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
    search2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
  };

  const SOCIAL_ICON = {
    github: ICON.github, twitter: ICON.twitter, x: ICON.twitter,
    wechat: ICON.wechat, email: ICON.mail2, mail: ICON.mail2,
    website: ICON.globe, blog: ICON.globe, link: ICON.link2,
    juejin: ICON.file, zhihu: ICON.file, bilibili: ICON.play,
    npm: ICON.box
  };

  const LINK_TYPE_ICON = {
    demo: ICON.arrowUpRight, repo: ICON.github, docs: ICON.file,
    package: ICON.box, article: ICON.file, video: ICON.play, default: ICON.link2
  };

  /* ------------------------------ 主题 ------------------------------ */
  function systemTheme() {
    try {
      return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) { return 'light'; }
  }

  function readTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
    } catch (e) {}
    return null;
  }

  function applyTheme(theme, animate) {
    const root = document.documentElement;
    if (animate) {
      root.classList.add('theme-transitioning');
      global.setTimeout(function () { root.classList.remove('theme-transitioning'); }, 60);
    }
    root.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#020617' : '#ffffff');
    return theme;
  }

  function setTheme(theme, remember) {
    applyTheme(theme, true);
    if (remember !== false) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    }
    global.dispatchEvent(new CustomEvent('idr:themechange', { detail: { theme: theme } }));
  }

  function toggleTheme() {
    const now = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(now, true);
  }

  /* ------------------------------ Logo SVG ------------------------------ */
  const DRAW_GEOM = [
    { d: '<line x1="28" y1="24" x2="28" y2="48"/>', len: 24 },
    { d: '<line x1="56" y1="24" x2="56" y2="48"/>', len: 24 },
    { d: '<path d="M56 24 H76 C90 24 100 30.5 100 36 C100 41.5 90 48 76 48 H56"/>', len: 114 },
    { d: '<line x1="128" y1="24" x2="128" y2="48"/>', len: 24 },
    { d: '<path d="M128 24 H148 C158 24 164 27 164 32 C164 37 158 40 148 40 H128"/>', len: 72 },
    { d: '<line x1="146" y1="40" x2="164" y2="48"/>', len: 21 }
  ];

  function logoSVG(opts) {
    const o = opts || {};
    const uid = 'idrg' + Math.random().toString(36).slice(2, 8);
    const h = o.height || 72;
    const w = Math.round(h * 208 / 72);
    const draw = !!o.draw;
    const title = o.title || 'IDR — Ide-Chen';
    const stops = o.dark
      ? ['#7dd3fc', '#38bdf8', '#0ea5e9']
      : ['#38bdf8', '#0ea5e9', '#0369a1'];

    const body = DRAW_GEOM.map(function (g, i) {
      const idx = String(i + 1);
      const style = draw ? ' style="--len:' + g.len + '"' : '';
      return g.d.replace('/>', (draw ? ' data-draw="' + idx + '"' : '') + style + '/>');
    }).join('');

    return '<svg viewBox="0 0 208 72" width="' + w + '" height="' + h + '" role="img" aria-label="' + title + '"' +
      (o.className ? ' class="' + o.className + '"' : '') + '>' +
      '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="208" y2="72" gradientUnits="userSpaceOnUse">' +
      '<stop offset="0" stop-color="' + stops[0] + '"/>' +
      '<stop offset="0.55" stop-color="' + stops[1] + '"/>' +
      '<stop offset="1" stop-color="' + stops[2] + '"/>' +
      '</linearGradient></defs>' +
      '<g fill="none" stroke="url(#' + uid + ')" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">' +
      body + '</g>' +
      '<circle cx="180" cy="45" r="4.5" fill="url(#' + uid + ')"' + (draw ? ' data-dot' : '') + '/>' +
      '</svg>';
  }

  /* ------------------------------ 导航栏 ------------------------------ */
  const NAV_ITEMS = [
    { href: 'index.html', label: '首页', match: ['index.html', ''] },
    { href: 'projects.html', label: '作品', match: ['projects.html'] },
    { href: 'about.html', label: '关于', match: ['about.html'] },
    { href: 'index.html#contact', label: '联系', match: [] }
  ];

  function currentPage() {
    const path = global.location.pathname.split('/').pop() || 'index.html';
    return path || 'index.html';
  }

  function renderNav(site) {
    const holder = document.querySelector('[data-idr-nav]');
    if (!holder) return;
    const page = currentPage();
    const brand = (site && site.brand) || {};
    const allowToggle = !(site && site.settings && site.settings.allowThemeToggle === false);

    const links = NAV_ITEMS.map(function (item) {
      const active = item.match.indexOf(page) >= 0;
      return '<a class="nav__link' + (active ? ' is-active' : '') + '" href="' + item.href + '"' +
        (active ? ' aria-current="page"' : '') + '>' + item.label + '</a>';
    }).join('');

    holder.className = 'nav';
    holder.innerHTML =
      '<div class="nav__inner">' +
        '<a class="brand" href="index.html" aria-label="回到首页">' +
          '<span class="brand__mark">' + logoSVG({ height: 30, title: 'IDR' }) + '</span>' +
          '<span class="brand__name">' + escapeHtml(brand.name || 'IDR') + '</span>' +
          '<span class="brand__sub">' + escapeHtml(brand.fullName || '') + '</span>' +
        '</a>' +
        '<nav class="nav__links" id="idrNavLinks" aria-label="主导航">' + links + '</nav>' +
        '<div class="nav__actions">' +
          (allowToggle
            ? '<button class="theme-toggle" type="button" data-theme-toggle aria-label="切换深浅色主题" title="切换主题">' +
                '<span class="icon-sun">' + ICON.sun + '</span>' +
                '<span class="icon-moon">' + ICON.moon + '</span>' +
              '</button>'
            : '') +
          '<button class="nav__burger" type="button" data-nav-burger aria-label="打开菜单" aria-expanded="false">' +
            ICON.menu +
          '</button>' +
        '</div>' +
      '</div>';

    // 滚动阴影
    const onScroll = function () {
      holder.classList.toggle('is-scrolled', global.scrollY > 8);
    };
    onScroll();
    global.addEventListener('scroll', onScroll, { passive: true });

    // 移动端菜单
    const burger = holder.querySelector('[data-nav-burger]');
    const menu = holder.querySelector('#idrNavLinks');
    if (burger && menu) {
      burger.addEventListener('click', function () {
        const open = menu.classList.toggle('is-open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          menu.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('click', function (e) {
        if (!holder.contains(e.target) && menu.classList.contains('is-open')) {
          menu.classList.remove('is-open');
          burger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 主题按钮
    const toggle = holder.querySelector('[data-theme-toggle]');
    if (toggle) toggle.addEventListener('click', function () { toggleTheme(); });
  }

  /* ------------------------------ 页脚 ------------------------------ */
  function renderFooter(site) {
    const holder = document.querySelector('[data-idr-footer]');
    if (!holder) return;
    const brand = (site && site.brand) || {};
    const footer = (site && site.footer) || {};
    const socials = ((site && site.contact && site.contact.socials) || []).filter(function (s) { return s && s.url; });
    // 页脚「源码」链接：可在「站点设置 → 页脚与设置 → 源码仓库地址」配置；留空则不显示
    const repoUrl = String((footer && footer.repoUrl) || '').trim();

    const year = new Date().getFullYear();
    let copyright = footer.copyright || ('© ' + year + ' ' + (brand.fullName || 'Ide-Chen') + ' (' + (brand.name || 'IDR') + ').');

    holder.className = 'footer';
    holder.innerHTML =
      '<div class="container footer__inner">' +
        '<div class="footer__brand">' +
          logoSVG({ height: 26, title: 'IDR' }) +
          '<div>' +
            '<div>' + escapeHtml(brand.fullName || 'Ide-Chen') + ' · ' + escapeHtml(brand.name || 'IDR') + '</div>' +
            '<div class="footer__note">' + escapeHtml(footer.note || '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="footer__links">' +
          (socials.length
            ? socials.map(function (s) {
                return '<a href="' + escapeAttr(s.url) + '" target="_blank" rel="noopener noreferrer">' +
                  escapeHtml(s.label || s.type || '链接') + '</a>';
              }).join('')
            : '<a href="index.html">首页</a><a href="projects.html">作品</a><a href="about.html">关于</a>') +
          // 「源码」链接：指向仓库。刻意不链接 admin.html ——
          // 那个文件是本地创作工具，部署时会被排除，链过去就是死链。
          // 地址在「站点设置 → 页脚与设置 → 源码仓库地址」里配置。
          (repoUrl
            ? '<a href="' + escapeAttr(repoUrl) + '" target="_blank" rel="noopener noreferrer">源码</a>'
            : '') +
        '</div>' +
      '</div>' +
      '<div class="container" style="padding-bottom:var(--space-5)"><div class="footer__note">' +
        escapeHtml(copyright) +
      '</div></div>';
  }

  /* ------------------------------ 揭示动画 ------------------------------ */
  function initReveal(root) {
    const scope = root || document;
    const nodes = Array.prototype.slice.call(scope.querySelectorAll('[data-reveal]:not(.is-visible)'));
    if (!nodes.length) return;

    if (!('IntersectionObserver' in global)) {
      nodes.forEach(function (n) { n.classList.add('is-visible'); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = Number(el.getAttribute('data-reveal-delay') || 0);
          global.setTimeout(function () { el.classList.add('is-visible'); }, delay);
          io.unobserve(el);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    nodes.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------ 工具 ------------------------------ */
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(str) { return escapeHtml(str); }

  function projectUrl(p) {
    return 'project.html?id=' + encodeURIComponent(p.slug || p.id);
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function coverOf(p) {
    if (p && p.cover) return p.cover;
    return 'assets/img/covers/aurora.svg';
  }

  /* 项目卡片 */
  function projectCard(p, opts) {
    const o = opts || {};
    const badge = p.category || (p.tags && p.tags[0]) || '';
    const date = formatDate(p.date);
    return '<article class="card" data-reveal' + (o.delay ? ' data-reveal-delay="' + o.delay + '"' : '') + '>' +
      '<a class="card__media" href="' + projectUrl(p) + '" aria-label="查看 ' + escapeAttr(p.title) + ' 详情">' +
        '<img src="' + escapeAttr(coverOf(p)) + '" alt="' + escapeAttr(p.title) + ' 封面" loading="lazy" decoding="async">' +
        (badge ? '<span class="card__badge">' + escapeHtml(badge) + '</span>' : '') +
      '</a>' +
      '<div class="card__body">' +
        '<h3 class="card__title"><a href="' + projectUrl(p) + '" style="color:inherit">' + escapeHtml(p.title || '未命名') + '</a></h3>' +
        '<p class="card__excerpt">' + escapeHtml(p.summary || global.IDR.markdown.excerpt(p.content, 110)) + '</p>' +
        ((p.tags && p.tags.length)
          ? '<div class="tags">' + p.tags.slice(0, 3).map(function (t) {
              return '<span class="tag">' + escapeHtml(t) + '</span>';
            }).join('') + '</div>'
          : '') +
        '<div class="card__foot">' +
          '<span>' + escapeHtml(date) + (p.status ? ' · ' + escapeHtml(p.status) : '') + '</span>' +
          '<a class="card__more" href="' + projectUrl(p) + '">详情' + ICON.arrowRight + '</a>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /* ------------------------------ 一次性启动 ------------------------------ */
  function mount(site) {
    renderNav(site);
    renderFooter(site);
    initReveal();
  }

  global.IDR = global.IDR || {};
  global.IDR.ui = {
    ICON: ICON,
    SOCIAL_ICON: SOCIAL_ICON,
    LINK_TYPE_ICON: LINK_TYPE_ICON,
    logoSVG: logoSVG,
    renderNav: renderNav,
    renderFooter: renderFooter,
    mount: mount,
    initReveal: initReveal,
    projectCard: projectCard,
    projectUrl: projectUrl,
    coverOf: coverOf,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    readTheme: readTheme,
    systemTheme: systemTheme,
    applyTheme: applyTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    THEME_KEY: THEME_KEY
  };
})(window);
