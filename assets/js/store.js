/* ==========================================================================
   IDR 站点数据层
   - fetch 读取 assets/data/*.json
   - file:// 协议下 fetch 会被浏览器拦截，自动回退到 data-embedded.js
   - 提供统一的 IDR.store API 给所有页面使用
   ========================================================================== */
(function (global) {
  'use strict';

  const PATHS = {
    site: 'assets/data/site.json',
    data: 'assets/data/data.json',
    embedded: 'assets/js/data-embedded.js'
  };

  const CACHE_KEY = 'idr.cache.v1';
  const PROTO = global.location.protocol;

  let _site = null;
  let _data = null;
  let _source = 'unknown'; // 'json' | 'embedded' | 'cache' | 'default'
  let _ready = null;

  /* ---------------------------- 内置兜底数据 ---------------------------- */
  const FALLBACK_SITE = {
    version: 1,
    brand: { name: 'IDR', fullName: 'Ide-Chen', tagline: '开发者 / 工程师', logoAccent: '#0ea5e9' },
    hero: {
      kicker: 'HELLO, WORLD',
      title: '我是 Ide-Chen，代号 IDR。',
      subtitle: '这里放我做过的项目、踩过的坑，以及一些还在路上的想法。',
      primaryCta: { label: '看看我的作品', href: 'projects.html' },
      secondaryCta: { label: '关于我', href: 'about.html' },
      stats: []
    },
    about: { title: '关于我', lead: '', paragraphs: [], timeline: [] },
    skills: { title: '技能与工具', subtitle: '', groups: [] },
    contact: { title: '联系我', subtitle: '', email: '', location: '', socials: [] },
    footer: { copyright: '', note: '' },
    settings: { worksPerPage: 9, defaultTheme: 'light', allowThemeToggle: true, adminPin: '', siteUrl: '' }
  };

  const FALLBACK_DATA = { version: 1, categories: [], projects: [] };

  /* ---------------------------- 深拷贝小工具 ---------------------------- */
  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); }
    catch (e) { return value; }
  }

  /* ---------------------------- 加载单个 JSON ---------------------------- */
  async function fetchJSON(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status + ' · ' + path);
    return res.json();
  }

  /* 动态注入 data-embedded.js（file:// 场景专用） */
  function loadEmbeddedScript() {
    return new Promise(function (resolve, reject) {
      if (global.IDR_EMBEDDED) return resolve(global.IDR_EMBEDDED);
      const existing = document.querySelector('script[data-idr-embedded]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(global.IDR_EMBEDDED || null); });
        existing.addEventListener('error', function () { reject(new Error('embedded 脚本加载失败')); });
        return;
      }
      const s = document.createElement('script');
      s.src = PATHS.embedded;
      s.async = false;
      s.setAttribute('data-idr-embedded', '');
      s.onload = function () { resolve(global.IDR_EMBEDDED || null); };
      s.onerror = function () { reject(new Error('embedded 脚本加载失败')); };
      document.head.appendChild(s);
    });
  }

  /* ---------------------------- 主加载流程 ---------------------------- */
  async function load() {
    // 1) 优先尝试真正的 JSON 文件（http/https 或支持 file:// fetch 的浏览器）
    if (PROTO !== 'file:') {
      try {
        const pair = await Promise.all([fetchJSON(PATHS.site), fetchJSON(PATHS.data)]);
        _site = pair[0];
        _data = pair[1];
        _source = 'json';
        cacheToLocal();
        return { site: _site, data: _data, source: _source };
      } catch (err) {
        console.warn('[IDR.store] 读取 JSON 失败，回退到内嵌数据：', err.message);
      }
    }

    // 2) 回退：内嵌数据（由 admin.html 导出，file:// 下也能工作）
    try {
      const embedded = await loadEmbeddedScript();
      const payload = embedded && (embedded.site || embedded.data) ? embedded : null;
      if (payload) {
        _site = payload.site || clone(FALLBACK_SITE);
        _data = payload.data || clone(FALLBACK_DATA);
        _source = 'embedded';
        cacheToLocal();
        return { site: _site, data: _data, source: _source };
      }
    } catch (err) {
      console.warn('[IDR.store] 内嵌数据不可用：', err.message);
    }

    // 3) 回退：上一次成功加载的本地缓存
    const cached = readLocalCache();
    if (cached) {
      _site = cached.site;
      _data = cached.data;
      _source = 'cache';
      return { site: _site, data: _data, source: _source };
    }

    // 4) 最后兜底
    _site = clone(FALLBACK_SITE);
    _data = clone(FALLBACK_DATA);
    _source = 'default';
    return { site: _site, data: _data, source: _source };
  }

  function cacheToLocal() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        at: Date.now(),
        site: _site,
        data: _data
      }));
    } catch (e) { /* 容量超限时忽略 */ }
  }

  function readLocalCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.site || !parsed.data) return null;
      return parsed;
    } catch (e) { return null; }
  }

  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }

  /* ---------------------------- 查询工具 ---------------------------- */
  function projects() {
    const list = (_data && Array.isArray(_data.projects)) ? _data.projects.slice() : [];
    return list.sort(function (a, b) {
      const da = a.date || '';
      const db = b.date || '';
      if (da === db) return (a.title || '').localeCompare(b.title || '', 'zh');
      return db.localeCompare(da); // 新的在前
    });
  }

  function featured() {
    const list = projects().filter(function (p) { return p.featured; });
    return list.length ? list : projects().slice(0, 3);
  }

  function getProject(key) {
    if (!key) return null;
    const all = projects();
    return all.find(function (p) { return p.slug === key; }) ||
           all.find(function (p) { return p.id === key; }) ||
           null;
  }

  function neighbors(key) {
    const all = projects();
    const i = all.findIndex(function (p) { return p.slug === key || p.id === key; });
    if (i < 0) return { prev: null, next: null };
    return {
      prev: i > 0 ? all[i - 1] : null,
      next: i < all.length - 1 ? all[i + 1] : null
    };
  }

  function categories() {
    const declared = (_data && Array.isArray(_data.categories)) ? _data.categories : [];
    const used = [];
    projects().forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (used.indexOf(t) < 0) used.push(t); });
      if (p.category && used.indexOf(p.category) < 0) used.push(p.category);
    });
    // 声明的分类排前面，其次按出现顺序补上实际用到的分类
    // 过滤掉只剩空白的项，避免生成空按钮
    return declared.concat(used.filter(function (t) { return declared.indexOf(t) < 0; }))
      .map(function (t) { return typeof t === 'string' ? t.trim() : t; })
      .filter(function (t) { return t; });
  }

  function tags() {
    const out = [];
    projects().forEach(function (p) {
      (p.tags || []).forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); });
    });
    return out;
  }

  function search(keyword, filters) {
    const kw = (keyword || '').trim().toLowerCase();
    const f = filters || {};
    return projects().filter(function (p) {
      if (f.tag && f.tag !== '__all__') {
        const hay = (p.tags || []).concat([p.category || '']);
        if (hay.indexOf(f.tag) < 0) return false;
      }
      if (f.year && String(p.date || '').slice(0, 4) !== String(f.year)) return false;
      if (!kw) return true;
      const blob = [p.title, p.summary, p.category, (p.tags || []).join(' '), p.role, p.content]
        .filter(Boolean).join(' ').toLowerCase();
      return blob.indexOf(kw) >= 0;
    });
  }

  function site() { return _site || clone(FALLBACK_SITE); }
  function raw() { return _data || clone(FALLBACK_DATA); }
  function source() { return _source; }

  async function ready() {
    if (!_ready) _ready = load();
    return _ready;
  }

  global.IDR = global.IDR || {};
  global.IDR.store = {
    ready: ready,
    site: site,
    data: raw,
    raw: raw,          // 与 data 等价，两个名字都留着，避免调用方踩空
    projects: projects,
    featured: featured,
    getProject: getProject,
    neighbors: neighbors,
    categories: categories,
    tags: tags,
    search: search,
    source: source,
    clearCache: clearCache,
    paths: PATHS
  };
})(window);
