/* ==========================================================================
   IDR · 内容管理后台
   功能：作品增删改 / 站点信息编辑 / 图片压缩内嵌 / 直接写入 data.json
   ========================================================================== */
(function () {
  'use strict';

  var IDR = window.IDR;
  var ui = IDR.ui;
  var md = IDR.markdown;

  var DRAFT_KEY = 'idr.admin.draft';
  var UNLOCK_KEY = 'idr.admin.unlocked';

  /* 界面版本号：改动后台时递增。
     侧栏底部会显示它，用来一眼判断浏览器跑的是不是最新代码。
     如果你看到的不是这个数字，说明浏览器缓存了旧的 JS —— 按 Ctrl+F5 强制刷新。
     变更记录：
       v3 草稿恢复改用页面内提示条；弹窗加兜底关闭
       v4 彻底删除模态弹窗，所有确认/输入改为内联操作
       v5 编辑页右栏改为独立滚动侧栏；闸门补上滚动出口 */
  var ADMIN_VERSION = 'v5';

  /* ------------------------------ 状态 ------------------------------ */
  var state = {
    site: null,
    data: null,
    source: 'unknown',
    view: 'dashboard',
    editingId: null,
    dirty: false,
    handle: null,        // FileSystemFileHandle（data.json）
    dirHandle: null,     // 目录句柄（用于写 data-embedded.js）
    projQuery: ''
  };

  var el = {};
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  /* ------------------------------ 工具 ------------------------------ */
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function toast(message, type, timeout) {
    var icons = {
      ok: ui.ICON.check, warn: ui.ICON.link, err: ui.ICON.link, info: ui.ICON.link
    };
    var node = document.createElement('div');
    node.className = 'toast toast--' + (type || 'info');
    node.innerHTML = (icons[type] || icons.info) + '<div>' + message + '</div>';
    el.toastStack.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 240);
    }, timeout || 3000);
  }

  /* ==========================================================================
     内联确认 / 输入 —— 取代原先的模态弹窗
     ---------------------------------------------------------------------------
     为什么删掉弹窗：它出过两次故障（正文渲染不出来变成空窗、按钮因事件未绑定
     而点不掉），而且浮层一旦出问题用户就完全无法操作。
     现在的做法是在被操作的元素旁边插入一段普通的行内提示条，
     它就在页面流里，没有 fixed 定位、没有 z-index、没有遮罩，
     结构上不可能出现"点不掉"的情况。

     askInline(opts) -> Promise
       opts.message   提示文字（必填，为空则直接返回 false）
       opts.okText    确认按钮文字
       opts.cancelText 取消按钮文字
       opts.danger    是否危险操作（红色）
       opts.withInput 为 true 时额外渲染一个输入框，resolve 输入值
       opts.placeholder 输入框占位文字
       opts.value     输入框初始值
     返回：确认 -> true（或输入框的值）；取消 -> false（或 null）
     ========================================================================== */
  function askInline(opts) {
    var o = opts || {};
    var host = o.host || el.adminScroll || document.body;

    // 同一时间只允许一个内联确认，避免堆叠
    closeInlineAsk();

    if (!String(o.message || '').trim()) {
      console.error('[IDR.admin] askInline 缺少提示文字，已跳过。调用来源：',
        new Error('askInline call site').stack);
      return Promise.resolve(false);
    }

    return new Promise(function (resolve) {
      var node = document.createElement('div');
      node.className = 'inline-ask' + (o.danger ? ' inline-ask--danger' : '');
      node.innerHTML =
        '<div class="inline-ask__text">' + o.message + '</div>' +
        (o.withInput
          ? '<div class="cover-url-row" style="flex:1;min-width:220px;margin:0">' +
              '<input type="text" value="' + ui.escapeAttr(o.value || '') + '" placeholder="' +
                ui.escapeAttr(o.placeholder || '') + '">' +
            '</div>'
          : '') +
        '<div class="inline-ask__actions">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-ask="cancel">' +
            ui.escapeHtml(o.cancelText || '取消') + '</button>' +
          '<button class="btn btn--sm ' + (o.danger ? 'btn--danger' : 'btn--primary') +
            '" type="button" data-ask="ok">' + ui.escapeHtml(o.okText || '确定') + '</button>' +
        '</div>';

      var input = node.querySelector('input');
      var settled = false;

      function settle(value) {
        if (settled) return;
        settled = true;
        node.remove();
        inlineAskNode = null;
        resolve(value);
      }

      node.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-ask]');
        if (!btn) return;
        if (btn.getAttribute('data-ask') === 'ok') {
          settle(o.withInput ? (input ? input.value.trim() : '') : true);
        } else {
          settle(o.withInput ? null : false);
        }
      });

      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            settle(input.value.trim());
          } else if (e.key === 'Escape') {
            settle(null);
          }
        });
      }

      // 插到目标元素后面；找不到就退回插到主区顶部
      if (o.anchor && o.anchor.parentNode) {
        o.anchor.parentNode.insertBefore(node, o.anchor.nextSibling);
      } else {
        host.insertBefore(node, host.firstChild);
      }

      inlineAskNode = { node: node, settle: settle };

      // 自动滚入视野并聚焦，确保用户一定看得到
      try { node.scrollIntoView({ block: 'nearest' }); } catch (e) {}
      if (input) setTimeout(function () { input.focus(); input.select(); }, 30);
    });
  }

  var inlineAskNode = null;

  function closeInlineAsk() {
    if (inlineAskNode) {
      var n = inlineAskNode;
      inlineAskNode = null;
      try { n.settle(false); } catch (e) {}
    }
  }

  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* 由标题生成 slug；中文标题回退为 pinyin 无序的短哈希 + 序号 */
  function slugify(title) {
    var base = String(title || '').trim().toLowerCase();
    var ascii = base
      .replace(/[\u4e00-\u9fa5]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (ascii.length >= 2) return ascii.slice(0, 60);
    // 纯中文标题：用时间戳保证唯一且可读性尚可
    var d = new Date();
    var stamp = String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, '0') +
      String(d.getDate()).padStart(2, '0') + '-' +
      Math.random().toString(36).slice(2, 6);
    return 'work-' + stamp;
  }

  function uniqueSlug(slug, ignoreId) {
    var used = (state.data.projects || [])
      .filter(function (p) { return p.id !== ignoreId; })
      .map(function (p) { return p.slug; });
    if (used.indexOf(slug) < 0) return slug;
    var i = 2;
    while (used.indexOf(slug + '-' + i) >= 0) i++;
    return slug + '-' + i;
  }

  /* ------------------------------ 脏标记 ------------------------------ */
  function markDirty(on) {
    state.dirty = on !== false;
    el.dirtyFlag.hidden = !state.dirty;
    saveDraft();
  }

  var draftTimer = null;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(function () {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          at: Date.now(),
          site: state.site,
          data: state.data
        }));
      } catch (e) { /* 数据太大时忽略 */ }
    }, 400);
  }

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  }

  /* ==========================================================================
     登录闸门
     ========================================================================== */
  function initGate() {
    el.gateLogo.innerHTML = ui.logoSVG({ height: 132, title: 'IDR' });

    el.gateForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var pin = String(el.gatePin.value || '').trim();
      var expect = String((state.site && state.site.settings && state.site.settings.adminPin) || '').trim();
      if (!expect || pin === expect) {
        try { sessionStorage.setItem(UNLOCK_KEY, '1'); } catch (err) {}
        openAdmin();
      } else {
        el.gateError.hidden = false;
        el.gatePin.value = '';
        el.gatePin.focus();
      }
    });

    var unlocked = false;
    try { unlocked = sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) {}
    if (unlocked) openAdmin();
  }

  function openAdmin() {
    el.gate.hidden = true;
    el.admin.hidden = false;
    renderAll();
  }

  function lockAdmin() {
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch (e) {}
    el.admin.hidden = true;
    el.gate.hidden = false;
    el.gatePin.value = '';
    el.gateError.hidden = true;
  }

  /* ==========================================================================
     导航 / 视图
     ========================================================================== */
  var VIEW_TITLES = {
    dashboard: '仪表盘',
    projects: '作品管理',
    editor: '编辑作品',
    site: '站点设置',
    data: '数据与备份'
  };

  function setView(view) {
    state.view = view;
    $$('.admin__nav-item').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-view') === view ||
        (view === 'editor' && b.getAttribute('data-view') === 'projects'));
    });
    $$('[data-view-panel]').forEach(function (p) {
      p.hidden = p.getAttribute('data-view-panel') !== view;
    });
    el.viewTitle.textContent = VIEW_TITLES[view] || '';
    el.adminScroll.scrollTop = 0;

    if (view === 'dashboard') renderDashboard();
    if (view === 'projects') renderProjectList();
    if (view === 'data') renderDataView();
  }

  function initNavIcons() {
    var icons = {
      dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="11" width="7" height="10" rx="2"/><rect x="3" y="15" width="7" height="6" rx="2"/></svg>',
      projects: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>',
      site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18"/></svg>',
      data: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
      eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
      theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" fill-opacity="0.18"/></svg>',
      lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
      save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
      download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></svg>',
      upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/></svg>',
      trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
      draft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
    };
    $$('[data-nav-icon]').forEach(function (n) {
      n.innerHTML = icons[n.getAttribute('data-nav-icon')] || '';
    });
    $$('[data-quick-icon]').forEach(function (n) {
      n.innerHTML = icons[n.getAttribute('data-quick-icon')] || '';
    });
    $$('[data-icon]').forEach(function (n) {
      n.innerHTML = icons[n.getAttribute('data-icon')] || '';
    });
    el.sideLogo.innerHTML = ui.logoSVG({ height: 54, title: 'IDR' });
  }

  function refreshCounts() {
    el.navProjectCount.textContent = String((state.data.projects || []).length);
  }

  /* ==========================================================================
     渲染：仪表盘
     ========================================================================== */
  function renderDashStats() {
    var projects = state.data.projects || [];
    var featured = projects.filter(function (p) { return p.featured; }).length;
    var tags = {};
    projects.forEach(function (p) { (p.tags || []).forEach(function (t) { tags[t] = 1; }); });
    var latest = projects.slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    })[0];

    var cards = [
      { value: projects.length, label: '作品总数' },
      { value: featured, label: '首页精选' },
      { value: Object.keys(tags).length, label: '使用中的标签' },
      { value: latest ? ui.formatDate(latest.date) : '—', label: '最近更新时间' }
    ];
    el.dashStats.innerHTML = cards.map(function (c) {
      return '<div class="stat-card"><div class="stat-card__value">' + ui.escapeHtml(String(c.value)) +
        '</div><div class="stat-card__label">' + ui.escapeHtml(c.label) + '</div></div>';
    }).join('');
  }

  function renderDashboard() {
    refreshCounts();
    renderDashStats();
    var list = (state.data.projects || []).slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    }).slice(0, 5);

    if (!list.length) {
      el.dashRecent.innerHTML = '<p class="field__hint">还没有作品。点「新建作品」开始吧。</p>';
      return;
    }
    el.dashRecent.innerHTML = list.map(function (p) {
      return '<div class="mini-item">' +
        '<div class="mini-item__thumb"><img src="' + ui.escapeAttr(p.cover || 'assets/img/covers/aurora.svg') + '" alt=""></div>' +
        '<div class="mini-item__main">' +
          '<div class="mini-item__title">' + ui.escapeHtml(p.title || '未命名') + '</div>' +
          '<div class="mini-item__meta">' + ui.escapeHtml(ui.formatDate(p.date)) +
            (p.category ? ' · ' + ui.escapeHtml(p.category) : '') +
            (p.featured ? ' · 精选' : '') + '</div>' +
        '</div>' +
        '<div class="mini-item__actions">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-mini-edit="' + ui.escapeAttr(p.id) + '">编辑</button>' +
          '<a class="btn btn--ghost btn--sm" href="project.html?id=' + encodeURIComponent(p.slug || p.id) + '" target="_blank" rel="noopener">查看</a>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  /* ==========================================================================
     渲染：作品列表
     ========================================================================== */
  function renderProjectList() {
    var all = state.data.projects || [];
    var q = state.projQuery.trim().toLowerCase();
    var list = all.filter(function (p) {
      if (!q) return true;
      var blob = [p.title, p.slug, p.summary, p.category, (p.tags || []).join(' ')].filter(Boolean).join(' ').toLowerCase();
      return blob.indexOf(q) >= 0;
    });

    el.projCount.textContent = '（' + list.length + ' / ' + all.length + '）';

    if (!list.length) {
      el.projList.innerHTML = '<p class="field__hint">' +
        (all.length ? '没有匹配的作品。' : '还没有作品，点右上角「新建作品」。') + '</p>';
      return;
    }

    el.projList.innerHTML = '<div class="proj-table" id="projTable">' + list.map(function (p, i) {
      return '<div class="proj-row" draggable="true" data-id="' + ui.escapeAttr(p.id) + '">' +
        '<div class="proj-row__handle" title="拖动排序">⠿</div>' +
        '<div class="proj-row__thumb"><img src="' + ui.escapeAttr(p.cover || 'assets/img/covers/aurora.svg') + '" alt=""></div>' +
        '<div class="proj-row__main">' +
          '<div class="proj-row__title">' + ui.escapeHtml(p.title || '未命名') +
            (p.featured ? '<span class="feat">精选</span>' : '') + '</div>' +
          '<div class="proj-row__meta">' +
            '<span>' + ui.escapeHtml(p.slug || '') + '</span>' +
            '<span>' + ui.escapeHtml(ui.formatDate(p.date) || '无日期') + '</span>' +
            (p.category ? '<span>' + ui.escapeHtml(p.category) + '</span>' : '') +
            '<span>' + ((p.tags || []).length) + ' 个标签</span>' +
          '</div>' +
        '</div>' +
        '<div class="proj-row__actions">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-edit="' + ui.escapeAttr(p.id) + '">编辑</button>' +
          '<a class="btn btn--ghost btn--sm" href="project.html?id=' + encodeURIComponent(p.slug || p.id) + '" target="_blank" rel="noopener">预览</a>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-dup="' + ui.escapeAttr(p.id) + '">复制</button>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-del="' + ui.escapeAttr(p.id) + '" style="color:#ef4444">删除</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    initDragSort();
  }

  function initDragSort() {
    var table = document.getElementById('projTable');
    if (!table) return;
    var dragEl = null;

    table.addEventListener('dragstart', function (e) {
      var row = e.target.closest('.proj-row');
      if (!row) return;
      dragEl = row;
      row.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', row.getAttribute('data-id')); } catch (err) {}
    });

    table.addEventListener('dragover', function (e) {
      e.preventDefault();
      var row = e.target.closest('.proj-row');
      if (!row || row === dragEl) return;
      $$('.proj-row').forEach(function (r) { r.classList.remove('is-over'); });
      row.classList.add('is-over');
    });

    table.addEventListener('dragleave', function (e) {
      var row = e.target.closest('.proj-row');
      if (row) row.classList.remove('is-over');
    });

    table.addEventListener('drop', function (e) {
      e.preventDefault();
      var target = e.target.closest('.proj-row');
      if (!target || !dragEl || target === dragEl) return;
      target.classList.remove('is-over');

      var fromId = dragEl.getAttribute('data-id');
      var toId = target.getAttribute('data-id');
      var projects = state.data.projects;
      var fromIdx = projects.findIndex(function (p) { return p.id === fromId; });
      var toIdx = projects.findIndex(function (p) { return p.id === toId; });
      if (fromIdx < 0 || toIdx < 0) return;

      var moved = projects.splice(fromIdx, 1)[0];
      projects.splice(toIdx, 0, moved);
      markDirty(true);
      renderProjectList();
      toast('顺序已调整，记得点保存。', 'info');
    });

    table.addEventListener('dragend', function () {
      $$('.proj-row').forEach(function (r) { r.classList.remove('is-dragging', 'is-over'); });
      dragEl = null;
    });
  }

  /* ==========================================================================
     编辑：作品
     ========================================================================== */
  var tagBuffer = [];
  var linkBuffer = [];
  var coverBuffer = '';

  function emptyProject() {
    return {
      id: uid(),
      slug: '',
      title: '',
      summary: '',
      cover: '',
      tags: [],
      category: '',
      featured: false,
      date: new Date().toISOString().slice(0, 10),
      status: '已发布',
      role: '',
      duration: '',
      links: [],
      content: '',
      highlights: []
    };
  }

  function renderTags() {
    el.tagList.innerHTML = tagBuffer.map(function (t, i) {
      return '<span class="tag-pill">' + ui.escapeHtml(t) +
        '<button type="button" data-tag-remove="' + i + '" aria-label="删除标签">×</button></span>';
    }).join('');
  }

  function renderLinks() {
    var types = ['demo', 'repo', 'docs', 'package', 'article', 'video', 'link'];
    var typeNames = { demo: '演示', repo: '源码', docs: '文档', package: '包', article: '文章', video: '视频', link: '其他' };
    el.linkList.innerHTML = linkBuffer.map(function (l, i) {
      return '<div class="repeat-item">' +
        '<select data-link-type="' + i + '">' +
          types.map(function (t) {
            return '<option value="' + t + '"' + (l.type === t ? ' selected' : '') + '>' + typeNames[t] + '</option>';
          }).join('') +
        '</select>' +
        '<input type="text" data-link-url="' + i + '" value="' + ui.escapeAttr(l.url || '') + '" placeholder="https://… 或 mailto:…">' +
        '<button class="remove" type="button" data-link-remove="' + i + '" aria-label="删除链接">×</button>' +
      '</div>' +
      '<div style="margin:-8px 0 var(--space-2)"><input type="text" data-link-label="' + i + '" value="' +
        ui.escapeAttr(l.label || '') + '" placeholder="显示名称（例如：在线演示）" style="width:100%;padding:8px 11px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-subtle);font-size:13.5px"></div>';
    }).join('') || '<p class="field__hint">还没有链接。</p>';
  }

  function setCover(value) {
    coverBuffer = value || '';
    if (coverBuffer) {
      el.coverPreview.src = coverBuffer;
      el.coverBox.classList.add('has-image');
    } else {
      el.coverPreview.removeAttribute('src');
      el.coverBox.classList.remove('has-image');
    }
  }

  function fillEditor(p) {
    el.f_title.value = p.title || '';
    el.f_summary.value = p.summary || '';
    el.f_content.value = p.content || '';
    el.f_slug.value = p.slug || '';
    el.f_category.value = p.category || '';
    el.f_date.value = p.date || '';
    el.f_status.value = p.status || '';
    el.f_role.value = p.role || '';
    el.f_duration.value = p.duration || '';
    el.f_featured.checked = !!p.featured;
    el.f_highlights.value = (p.highlights || []).join('\n');
    tagBuffer = (p.tags || []).slice();
    linkBuffer = clone(p.links || []);
    renderTags();
    renderLinks();
    setCover(p.cover || '');
    updateSlugPreview();
    switchMdTab('write');
  }

  function openEditor(id) {
    var p;
    if (id) {
      p = (state.data.projects || []).find(function (x) { return x.id === id; });
      if (!p) { toast('找不到这个作品。', 'err'); return; }
      state.editingId = id;
      el.editorTitle.textContent = '编辑作品';
    } else {
      p = emptyProject();
      state.editingId = null;
      state.pendingNew = true;
      el.editorTitle.textContent = '新建作品';
    }
    state.editBuffer = clone(p);
    fillEditor(p);
    el.coverHint.textContent = p.cover && /^https?:/i.test(p.cover)
      ? '当前用的是图片链接，可以直接改或换成上传。'
      : '上传的图片会自动压缩并内嵌进数据文件，方便一键搬家（单张建议 500KB 以内）。';
    setView('editor');
  }

  function collectProject() {
    var p = clone(state.editBuffer || emptyProject());
    p.title = el.f_title.value.trim();
    p.summary = el.f_summary.value.trim();
    p.content = el.f_content.value;
    p.category = el.f_category.value.trim();
    p.date = el.f_date.value;
    p.status = el.f_status.value.trim();
    p.role = el.f_role.value.trim();
    p.duration = el.f_duration.value.trim();
    p.featured = el.f_featured.checked;
    p.tags = tagBuffer.slice();
    p.links = clone(linkBuffer);
    p.highlights = el.f_highlights.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    p.cover = coverBuffer;
    var slug = el.f_slug.value.trim() || slugify(p.title);
    p.slug = uniqueSlug(slug, p.id);
    if (!p.title) p.title = '未命名作品';
    return p;
  }

  function updateSlugPreview() {
    var s = el.f_slug.value.trim();
    if (!s) {
      el.slugPreview.textContent = '留空会自动生成。详情页地址：project.html?id=…';
      return;
    }
    el.slugPreview.innerHTML = '详情页地址：<code>project.html?id=' + ui.escapeHtml(s) + '</code>';
  }

  function applyProject() {
    var p = collectProject();
    var projects = state.data.projects || (state.data.projects = []);
    var idx = projects.findIndex(function (x) { return x.id === p.id; });
    if (idx >= 0) projects[idx] = p;
    else projects.unshift(p);

    markDirty(true);
    renderProjectList();
    renderDashboard();
    toast('已保存到后台：「' + ui.escapeHtml(p.title) + '」。别忘了点右上角「保存」写入文件。', 'ok', 4200);
    setView('projects');
  }

  /* ------------------------------ 图片处理 ------------------------------ */
  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('读取文件失败')); };
      fr.readAsDataURL(file);
    });
  }

  function compressImage(dataUrl, maxSide, quality) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, maxSide / Math.max(w, h));
        var tw = Math.max(1, Math.round(w * scale));
        var th = Math.max(1, Math.round(h * scale));
        var canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, tw, th);

        var isPng = /^data:image\/png/i.test(dataUrl);
        var hasAlpha = false;
        if (isPng && tw * th < 2400 * 2400) {
          try {
            var d = ctx.getImageData(0, 0, tw, th).data;
            for (var i = 3; i < d.length; i += 4 * 37) {
              if (d[i] < 250) { hasAlpha = true; break; }
            }
          } catch (e) { hasAlpha = false; }
        }
        var mime = hasAlpha ? 'image/png' : 'image/jpeg';
        var out = canvas.toDataURL(mime, quality || 0.82);
        // 若压缩后反而更大，用原图
        if (out.length > dataUrl.length && scale === 1) out = dataUrl;
        resolve({ dataUrl: out, width: tw, height: th, mime: mime });
      };
      img.onerror = function () { resolve({ dataUrl: dataUrl, width: 0, height: 0, mime: '' }); };
      img.src = dataUrl;
    });
  }

  function initCover() {
    el.coverFile.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { toast('请选择图片文件。', 'err'); return; }
      readFileAsDataURL(file).then(function (raw) {
        return compressImage(raw, 1600, 0.82);
      }).then(function (res) {
        setCover(res.dataUrl);
        var kb = Math.round(res.dataUrl.length * 0.75 / 1024);
        toast('图片已压缩：' + res.width + '×' + res.height + '，约 ' + kb + ' KB。', 'ok');
      }).catch(function (err) {
        toast('图片处理失败：' + ui.escapeHtml(err.message), 'err');
      });
      e.target.value = '';
    });

    /* 图片链接：内联展开一行输入框，不再弹窗 */
    function showCoverUrlRow(show) {
      if (!el.coverUrlRow) return;
      el.coverUrlRow.hidden = !show;
      if (show) {
        el.coverUrlInput.value = /^https?:/i.test(coverBuffer) ? coverBuffer : '';
        setTimeout(function () { el.coverUrlInput.focus(); el.coverUrlInput.select(); }, 20);
      }
    }

    function applyCoverUrl() {
      var v = (el.coverUrlInput.value || '').trim();
      if (!v) {
        toast('请先填入图片网址。', 'warn');
        el.coverUrlInput.focus();
        return;
      }
      if (!/^(https?:|\.?\/|assets\/)/i.test(v)) {
        toast('网址需要以 http:// 或 https:// 开头（也可以填站点内的相对路径，如 assets/img/x.png）。', 'warn', 5000);
        return;
      }
      setCover(v);
      showCoverUrlRow(false);
      toast('封面已设为该链接。', 'ok');
    }

    el.coverUrlBtn.addEventListener('click', function () {
      showCoverUrlRow(el.coverUrlRow.hidden);
    });
    el.coverUrlApply.addEventListener('click', applyCoverUrl);
    el.coverUrlCancel.addEventListener('click', function () { showCoverUrlRow(false); });
    el.coverUrlInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCoverUrl(); }
      else if (e.key === 'Escape') { showCoverUrlRow(false); }
    });

    el.coverClear.addEventListener('click', function () { setCover(''); showCoverUrlRow(false); });
  }

  function initTagEditor() {
    el.tagInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
        e.preventDefault();
        var v = el.tagInput.value.trim().replace(/,$/, '');
        if (v && tagBuffer.indexOf(v) < 0) {
          tagBuffer.push(v);
          renderTags();
        }
        el.tagInput.value = '';
      } else if (e.key === 'Backspace' && !el.tagInput.value && tagBuffer.length) {
        tagBuffer.pop();
        renderTags();
      }
    });
    el.tagList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tag-remove]');
      if (!btn) return;
      tagBuffer.splice(Number(btn.getAttribute('data-tag-remove')), 1);
      renderTags();
    });
  }

  function initLinkEditor() {
    el.addLink.addEventListener('click', function () {
      linkBuffer.push({ label: '', url: '', type: 'demo' });
      renderLinks();
    });

    el.linkList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-link-remove]');
      if (!btn) return;
      linkBuffer.splice(Number(btn.getAttribute('data-link-remove')), 1);
      renderLinks();
    });

    el.linkList.addEventListener('input', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-link-url')) linkBuffer[Number(t.getAttribute('data-link-url'))].url = t.value;
      if (t.hasAttribute('data-link-label')) linkBuffer[Number(t.getAttribute('data-link-label'))].label = t.value;
    });

    el.linkList.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-link-type')) linkBuffer[Number(t.getAttribute('data-link-type'))].type = t.value;
    });
  }

  function switchMdTab(tab) {
    $$('.editor-tab').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-md-tab') === tab);
    });
    if (tab === 'preview') {
      el.mdPreview.innerHTML = md.toHTML(el.f_content.value || '');
      el.mdPreview.hidden = false;
      el.f_content.hidden = true;
    } else {
      el.mdPreview.hidden = true;
      el.f_content.hidden = false;
    }
  }

  /* ==========================================================================
     站点设置表单
     ========================================================================== */
  function fillSiteForm() {
    var s = state.site;
    var hero = s.hero || {};
    var about = s.about || {};
    var skills = s.skills || {};
    var contact = s.contact || {};
    var settings = s.settings || {};

    el.s_name.value = (s.brand && s.brand.name) || '';
    el.s_fullName.value = (s.brand && s.brand.fullName) || '';
    el.s_tagline.value = (s.brand && s.brand.tagline) || '';

    el.s_heroKicker.value = hero.kicker || '';
    el.s_heroTitle.value = hero.title || '';
    el.s_heroSubtitle.value = hero.subtitle || '';
    el.s_cta1Label.value = (hero.primaryCta && hero.primaryCta.label) || '';
    el.s_cta1Href.value = (hero.primaryCta && hero.primaryCta.href) || '';
    el.s_cta2Label.value = (hero.secondaryCta && hero.secondaryCta.label) || '';
    el.s_cta2Href.value = (hero.secondaryCta && hero.secondaryCta.href) || '';
    el.s_stats.value = (hero.stats || []).map(function (x) { return (x.value || '') + ' | ' + (x.label || ''); }).join('\n');

    el.s_aboutLead.value = about.lead || '';
    el.s_aboutParagraphs.value = (about.paragraphs || []).join('\n\n');
    el.s_timeline.value = (about.timeline || []).map(function (t) {
      return [t.period || '', t.title || '', t.desc || ''].join(' | ');
    }).join('\n');

    el.s_skillsTitle.value = skills.title || '';
    el.s_skillsSubtitle.value = skills.subtitle || '';
    el.s_skills.value = (skills.groups || []).map(function (g) {
      return (g.name || '') + ' | ' + (g.items || []).join(', ');
    }).join('\n');

    el.s_contactTitle.value = contact.title || '';
    el.s_contactSubtitle.value = contact.subtitle || '';
    el.s_contactEmail.value = contact.email || '';
    el.s_contactLocation.value = contact.location || '';
    el.s_socials.value = (contact.socials || []).map(function (x) {
      return [x.type || '', x.label || '', x.url || ''].join(' | ');
    }).join('\n');

    el.s_footerNote.value = (s.footer && s.footer.note) || '';
    el.s_footerCopyright.value = (s.footer && s.footer.copyright) || '';
    el.s_footerRepoUrl.value = (s.footer && s.footer.repoUrl) || '';
    el.s_defaultTheme.value = settings.defaultTheme === 'dark' ? 'dark' : 'light';
    el.s_allowThemeToggle.checked = settings.allowThemeToggle !== false;
    el.s_adminPin.value = settings.adminPin || '';
  }

  function splitLines(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  }

  function collectSite() {
    var s = clone(state.site);
    s.brand = s.brand || {};
    s.hero = s.hero || {};
    s.about = s.about || {};
    s.skills = s.skills || {};
    s.contact = s.contact || {};
    s.footer = s.footer || {};
    s.settings = s.settings || {};

    s.brand.name = el.s_name.value.trim();
    s.brand.fullName = el.s_fullName.value.trim();
    s.brand.tagline = el.s_tagline.value.trim();

    s.hero.kicker = el.s_heroKicker.value.trim();
    s.hero.title = el.s_heroTitle.value.trim();
    s.hero.subtitle = el.s_heroSubtitle.value.trim();
    s.hero.primaryCta = { label: el.s_cta1Label.value.trim(), href: el.s_cta1Href.value.trim() || 'projects.html' };
    s.hero.secondaryCta = { label: el.s_cta2Label.value.trim(), href: el.s_cta2Href.value.trim() || 'about.html' };
    s.hero.stats = splitLines(el.s_stats.value).map(function (line) {
      var parts = line.split('|');
      return { value: (parts[0] || '').trim(), label: (parts[1] || '').trim() };
    }).filter(function (x) { return x.value || x.label; });

    s.about.lead = el.s_aboutLead.value.trim();
    s.about.paragraphs = String(el.s_aboutParagraphs.value || '')
      .split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
    s.about.timeline = splitLines(el.s_timeline.value).map(function (line) {
      var p = line.split('|');
      return { period: (p[0] || '').trim(), title: (p[1] || '').trim(), desc: (p[2] || '').trim() };
    }).filter(function (x) { return x.title || x.period; });

    s.skills.title = el.s_skillsTitle.value.trim();
    s.skills.subtitle = el.s_skillsSubtitle.value.trim();
    s.skills.groups = splitLines(el.s_skills.value).map(function (line) {
      var p = line.split('|');
      var items = (p[1] || '').split(/[,，]/).map(function (x) { return x.trim(); }).filter(Boolean);
      return { name: (p[0] || '').trim(), items: items };
    }).filter(function (g) { return g.name || g.items.length; });

    s.contact.title = el.s_contactTitle.value.trim();
    s.contact.subtitle = el.s_contactSubtitle.value.trim();
    s.contact.email = el.s_contactEmail.value.trim();
    s.contact.location = el.s_contactLocation.value.trim();
    s.contact.socials = splitLines(el.s_socials.value).map(function (line) {
      var p = line.split('|');
      return { type: (p[0] || '').trim(), label: (p[1] || '').trim(), url: (p[2] || '').trim() };
    }).filter(function (x) { return x.url; });

    s.footer.note = el.s_footerNote.value.trim();
    s.footer.copyright = el.s_footerCopyright.value.trim();
    s.footer.repoUrl = el.s_footerRepoUrl.value.trim();
    s.settings.defaultTheme = el.s_defaultTheme.value;
    s.settings.allowThemeToggle = el.s_allowThemeToggle.checked;
    s.settings.adminPin = el.s_adminPin.value.trim();

    return s;
  }

  /* ==========================================================================
     数据与备份
     ========================================================================== */
  function renderDataView() {
    var bound = !!(state.dirHandle || state.handle);
    el.bindRow.classList.toggle('is-bound', bound);

    if (state.dirHandle) {
      el.bindTitle.textContent = '已绑定站点文件夹：' + state.dirHandle.name;
      el.bindSub.textContent = '「保存」会一次写入 assets/data/data.json 与 assets/js/data-embedded.js，完全自动。';
    } else if (state.handle) {
      el.bindTitle.textContent = '已绑定数据文件：' + state.handle.name;
      el.bindSub.textContent = '「保存」会写入这个文件；data-embedded.js 会改为下载，需要你放回 assets/js/。';
    } else {
      el.bindTitle.textContent = '还没有绑定站点文件夹';
      el.bindSub.textContent = '绑定站点根目录后，点「保存」会直接写入 data.json 与 data-embedded.js，不用手动拷贝。';
    }
    el.unbindBtn.hidden = !bound;
    el.bindDirBtn.hidden = !!state.dirHandle;
    el.bindBtn.hidden = !!state.dirHandle;

    el.rawPreview.textContent = JSON.stringify({
      site: state.site,
      data: { version: state.data.version, categories: state.data.categories, projects: (state.data.projects || []).map(function (p) {
        return { id: p.id, slug: p.slug, title: p.title, date: p.date, featured: !!p.featured, tags: p.tags };
      }) }
    }, null, 2);
  }

  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function payloadJSON() { return JSON.stringify(state.data, null, 2) + '\n'; }
  function siteJSON() { return JSON.stringify(state.site, null, 2) + '\n'; }

  function embeddedJS() {
    var payload = { site: state.site, data: state.data, generatedAt: new Date().toISOString() };
    var body = JSON.stringify(payload, null, 2)
      .replace(/<\/(script)/gi, '<\\/$1');
    return '/* 由 admin.html 自动生成：把 assets/data/*.json 内联为可用数据。\n' +
      '   用途：直接用 file:// 双击打开页面时，浏览器禁止 fetch 本地 JSON，\n' +
      '        这个文件就是它的替代数据源（内容与 JSON 完全一致）。 */\n' +
      'window.IDR_EMBEDDED = ' + body + ';\n';
  }

  /* 绑定站点根目录（推荐）：可同时写入两个文件 */
  async function bindDir() {
    if (!window.showDirectoryPicker) {
      toast('这个浏览器不支持直接写文件，请用「导出 JSON」然后手动覆盖。', 'warn', 5500);
      return;
    }
    try {
      var dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'idr-site-root' });
      if (!dir) return;
      var perm = await dir.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') { toast('没有拿到写入权限。', 'warn'); return; }
      // 校验一下选的是不是站点根目录
      try {
        await dir.getDirectoryHandle('assets');
      } catch (e) {
        var go = await askInline({
          message: '在「' + ui.escapeHtml(dir.name) + '」里没找到 <code>assets</code> 文件夹。' +
                   '通常应该选包含 index.html 和 assets 的那个目录。仍然要用这个文件夹吗？',
          okText: '仍然使用',
          anchor: el.bindRow
        });
        if (!go) return;
      }
      state.dirHandle = dir;
      state.handle = null;
      renderDataView();
      toast('已绑定站点文件夹「' + ui.escapeHtml(dir.name) + '」。现在点「保存」就是真·一键。', 'ok', 4500);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      toast('绑定失败：' + ui.escapeHtml(err.message || String(err)), 'err');
    }
  }

  /* 只绑定 data.json */
  async function bindFile() {
    if (!window.showOpenFilePicker) {
      toast('这个浏览器不支持直接写文件，请用「导出 JSON」然后手动覆盖。', 'warn', 5500);
      return;
    }
    try {
      var handles = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'JSON 数据文件', accept: { 'application/json': ['.json'] } }]
      });
      var handle = handles[0];
      if (!handle) return;
      state.handle = handle;
      state.dirHandle = null;
      var perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') toast('没有拿到写入权限，可以稍后重试。', 'warn');
      renderDataView();
      toast('已绑定 ' + ui.escapeHtml(handle.name) + '。现在点「保存」就会直接写入。', 'ok', 4200);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      toast('绑定失败：' + ui.escapeHtml(err.message || String(err)), 'err');
    }
  }

  async function writeFileToHandle(handle, text) {
    var perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      perm = await handle.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') throw new Error('没有写入权限');
    var w = await handle.createWritable();
    await w.write(text);
    await w.close();
  }

  /* 把两份数据写进站点目录 */
  async function writeSiteDir() {
    var assetsDir = await state.dirHandle.getDirectoryHandle('assets');
    var dataDir = await assetsDir.getDirectoryHandle('data');
    var jsDir = await assetsDir.getDirectoryHandle('js');

    var dataFile = await dataDir.getFileHandle('data.json', { create: true });
    await writeFileToHandle(dataFile, payloadJSON());

    var siteFile = await dataDir.getFileHandle('site.json', { create: true });
    await writeFileToHandle(siteFile, siteJSON());

    var embedFile = await jsDir.getFileHandle('data-embedded.js', { create: true });
    await writeFileToHandle(embedFile, embeddedJS());
  }

  async function saveAll() {
    // 先把表单当前值收进内存，避免用户改完没点「保存这个作品」
    if (state.view === 'editor') {
      // 自动应用正在编辑的作品
      applyProjectQuiet();
    }
    if (state.view === 'site') {
      state.site = collectSite();
    }

    state.data.updatedAt = new Date().toISOString();

    /* 情况一：绑定了站点文件夹 —— 一次写三个文件，最省事 */
    if (state.dirHandle) {
      try {
        await writeSiteDir();
        markDirty(false);
        clearDraft();
        toast('已写入 <code>data.json</code>、<code>site.json</code> 与 <code>data-embedded.js</code>。刷新网站即可看到新内容。', 'ok', 5200);
        return;
      } catch (err) {
        toast('写入文件夹失败：' + ui.escapeHtml(err.message || String(err)) + '，改用下载方式。', 'err', 6000);
      }
    }

    /* 情况二：只绑定了 data.json */
    if (state.handle) {
      try {
        await writeFileToHandle(state.handle, payloadJSON());
        download('data-embedded.js', embeddedJS());
        markDirty(false);
        clearDraft();
        toast('data.json 已写入。同时下载了 data-embedded.js，请把它放回 <code>assets/js/</code>（或者改用「选择站点文件夹」免去这一步）。', 'warn', 8000);
        return;
      } catch (err) {
        toast('写入文件失败：' + ui.escapeHtml(err.message || String(err)) + '，改用下载方式。', 'err', 6000);
      }
    }

    /* 情况三：未绑定 —— 全部走下载 */
    download('data.json', payloadJSON());
    setTimeout(function () { download('site.json', siteJSON()); }, 400);
    setTimeout(function () { download('data-embedded.js', embeddedJS()); }, 800);
    markDirty(false);
    clearDraft();
    toast('已下载 3 个文件，请分别放回 <code>assets/data/</code> 与 <code>assets/js/</code>。想省掉这一步就点「选择站点文件夹」。', 'info', 9000);
  }

  function applyProjectQuiet() {
    var p = collectProject();
    var projects = state.data.projects || (state.data.projects = []);
    var idx = projects.findIndex(function (x) { return x.id === p.id; });
    if (idx >= 0) projects[idx] = p;
    else projects.unshift(p);
    state.editBuffer = clone(p);
    renderProjectList();
    return p;
  }

  /* ==========================================================================
     事件绑定
     ========================================================================== */
  function bindEvents() {
    /* 关键节点缺失就直接返回：宁可少绑一些，也不要在中途抛错 */
    var critical = ['adminNav', 'themeBtn', 'lockBtn', 'saveBtn', 'exportBtn', 'adminScroll'];
    var missing = critical.filter(function (k) { return !el[k]; });
    if (missing.length) {
      console.error('[IDR.admin] 缺少关键节点，事件绑定跳过：' + missing.join(', '));
      return;
    }

    /* 侧栏导航 */
    el.adminNav.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-view]');
      if (!btn) return;
      var view = btn.getAttribute('data-view');
      if (state.view === 'site') state.site = collectSite();
      setView(view);
    });

    el.themeBtn.addEventListener('click', function () { ui.toggleTheme(); });
    el.lockBtn.addEventListener('click', function () {
      if (state.dirty) {
        askInline({
          message: '有未保存的修改。锁定后这些修改仍保存在本地草稿里，重新进入后台可以恢复。',
          okText: '锁定',
          anchor: el.lockBtn
        }).then(function (ok) { if (ok) lockAdmin(); });
      } else {
        lockAdmin();
      }
    });

    /* 顶部按钮 */
    el.saveBtn.addEventListener('click', saveAll);
    el.exportBtn.addEventListener('click', function () {
      if (state.view === 'site') state.site = collectSite();
      download('data.json', payloadJSON());
      setTimeout(function () { download('site.json', siteJSON()); }, 400);
      setTimeout(function () { download('data-embedded.js', embeddedJS()); }, 800);
      toast('已导出 3 个文件。', 'ok');
    });
    el.dirtyFlag.hidden = true;

    /* 仪表盘快捷操作 */
    $$('[data-quick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var q = btn.getAttribute('data-quick');
        if (q === 'new') openEditor(null);
        if (q === 'site') setView('site');
        if (q === 'save') saveAll();
        if (q === 'export') el.exportBtn.click();
      });
    });
    $$('[data-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.getAttribute('data-goto')); });
    });

    el.dashRecent.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-mini-edit]');
      if (btn) openEditor(btn.getAttribute('data-mini-edit'));
    });

    /* 作品列表 */
    el.newProjectBtn.addEventListener('click', function () { openEditor(null); });
    el.projSearch.addEventListener('input', function () {
      state.projQuery = el.projSearch.value;
      renderProjectList();
    });

    el.projList.addEventListener('click', function (e) {
      var edit = e.target.closest('[data-edit]');
      if (edit) { openEditor(edit.getAttribute('data-edit')); return; }

      var dup = e.target.closest('[data-dup]');
      if (dup) {
        var src = state.data.projects.find(function (p) { return p.id === dup.getAttribute('data-dup'); });
        if (!src) return;
        var copy = clone(src);
        copy.id = uid();
        copy.title = src.title + '（副本）';
        copy.slug = uniqueSlug((src.slug || 'work') + '-copy', copy.id);
        var i = state.data.projects.findIndex(function (p) { return p.id === src.id; });
        state.data.projects.splice(i + 1, 0, copy);
        markDirty(true);
        renderProjectList();
        toast('已复制。', 'ok');
        return;
      }

      var del = e.target.closest('[data-del]');
      if (del) {
        var id = del.getAttribute('data-del');
        var p = state.data.projects.find(function (x) { return x.id === id; });
        if (!p) return;
        askInline({
          message: '确定删除「' + ui.escapeHtml(p.title) + '」吗？点「保存」之后不可撤销。',
          okText: '删除',
          danger: true,
          anchor: del.closest('.proj-row') || del
        }).then(function (ok) {
          if (!ok) return;
          state.data.projects = state.data.projects.filter(function (x) { return x.id !== id; });
          markDirty(true);
          renderProjectList();
          renderDashboard();
          toast('已删除，记得点右上角「保存」写入文件。', 'warn', 5000);
        });
      }
    });

    /* 编辑器 */
    el.cancelEdit.addEventListener('click', function () {
      setView('projects');
    });
    el.applyProject.addEventListener('click', applyProject);
    el.genSlug.addEventListener('click', function () {
      el.f_slug.value = uniqueSlug(slugify(el.f_title.value), state.editBuffer && state.editBuffer.id);
      updateSlugPreview();
    });
    el.f_slug.addEventListener('input', updateSlugPreview);
    el.f_title.addEventListener('blur', function () {
      if (!el.f_slug.value.trim() && el.f_title.value.trim()) {
        el.f_slug.value = uniqueSlug(slugify(el.f_title.value), state.editBuffer && state.editBuffer.id);
        updateSlugPreview();
      }
    });
    $$('.editor-tab').forEach(function (b) {
      b.addEventListener('click', function () { switchMdTab(b.getAttribute('data-md-tab')); });
    });

    initCover();
    initTagEditor();
    initLinkEditor();

    /* 站点表单：任何改动都标记为脏 */
    el.siteForm.addEventListener('input', function () { markDirty(true); });
    el.siteForm.addEventListener('change', function () { markDirty(true); });

    /* 数据页 */
    el.bindDirBtn.addEventListener('click', bindDir);
    el.bindBtn.addEventListener('click', bindFile);
    el.unbindBtn.addEventListener('click', function () {
      state.handle = null;
      state.dirHandle = null;
      renderDataView();
      toast('已解除绑定，之后保存会改为下载。', 'info');
    });
    el.dlData.addEventListener('click', function () { download('data.json', payloadJSON()); });
    el.dlSite.addEventListener('click', function () { download('site.json', siteJSON()); });
    el.dlEmbed.addEventListener('click', function () { download('data-embedded.js', embeddedJS()); });

    el.importFile.addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var parsed = JSON.parse(fr.result);
          var imported = false;
          if (parsed.projects && Array.isArray(parsed.projects)) {
            state.data = parsed;
            imported = true;
          } else if (parsed.data && parsed.data.projects) {
            state.data = parsed.data;
            if (parsed.site) state.site = parsed.site;
            imported = true;
          } else if (parsed.brand || parsed.hero || parsed.settings) {
            state.site = parsed;
            imported = true;
          }
          if (!imported) throw new Error('无法识别的文件结构');
          markDirty(true);
          fillSiteForm();
          renderProjectList();
          renderDashboard();
          renderDataView();
          toast('导入成功。检查一下内容，然后点「保存」写入文件。', 'ok', 5000);
        } catch (err) {
          toast('导入失败：' + ui.escapeHtml(err.message), 'err', 5000);
        }
      };
      fr.readAsText(file);
      e.target.value = '';
    });

    el.clearDraft.addEventListener('click', function () {
      clearDraft();
      toast('本地草稿已清除。', 'ok');
    });

    el.resetAll.addEventListener('click', function () {
      askInline({
        message: '这会把后台里的作品列表清空（还没有写入文件，点「保存」前可以刷新页面放弃）。',
        okText: '清空',
        danger: true,
        anchor: el.resetAll
      }).then(function (ok) {
        if (!ok) return;
        state.data.projects = [];
        markDirty(true);
        renderProjectList();
        renderDashboard();
        toast('已清空，记得点「保存」（或者直接刷新页面放弃修改）。', 'warn', 5000);
      });
    });

    /* 离开前提醒 */
    window.addEventListener('beforeunload', function (e) {
      if (!state.dirty) return;
      e.preventDefault();
      e.returnValue = '';
    });

    window.addEventListener('idr:themechange', function () { /* 主题由 ui.js 处理 */ });
  }

  /* ==========================================================================
     初始化
     ========================================================================== */
  async function init() {
    /* 缓存 DOM */
    [
      'gate', 'gateForm', 'gatePin', 'gateError', 'gateLogo', 'admin', 'sideLogo', 'sideName',
      'adminNav', 'navProjectCount', 'dataSource', 'themeBtn', 'lockBtn', 'viewTitle',
      'dirtyFlag', 'exportBtn', 'saveBtn', 'adminScroll', 'dashStats', 'dashRecent',
      'projCount', 'projSearch', 'newProjectBtn', 'projList',
      'editorTitle', 'projForm', 'cancelEdit', 'applyProject',
      'f_title', 'f_summary', 'f_content', 'mdPreview', 'coverBox', 'coverPreview', 'coverEmpty',
      'coverFile', 'coverUrlBtn', 'coverClear', 'coverHint',
      'coverUrlRow', 'coverUrlInput', 'coverUrlApply', 'coverUrlCancel',
      'f_slug', 'genSlug', 'slugPreview', 'f_category', 'categoryList', 'tagEditor', 'tagList',
      'tagInput', 'f_date', 'f_status', 'f_role', 'f_duration', 'f_featured', 'linkList', 'addLink',
      'f_highlights', 'siteForm',
      's_name', 's_fullName', 's_tagline', 's_heroKicker', 's_heroTitle', 's_heroSubtitle',
      's_cta1Label', 's_cta1Href', 's_cta2Label', 's_cta2Href', 's_stats',
      's_aboutLead', 's_aboutParagraphs', 's_timeline',
      's_skillsTitle', 's_skillsSubtitle', 's_skills',
      's_contactTitle', 's_contactSubtitle', 's_contactEmail', 's_contactLocation', 's_socials',
      's_footerNote', 's_footerCopyright', 's_footerRepoUrl', 's_defaultTheme', 's_allowThemeToggle', 's_adminPin',
      'bindRow', 'bindTitle', 'bindSub', 'bindDirBtn', 'bindBtn', 'unbindBtn',
      'dlData', 'dlSite', 'dlEmbed', 'importFile', 'clearDraft', 'resetAll', 'rawPreview',
      'toastStack',
      'draftBanner', 'draftText', 'draftActions'
    ].forEach(function (id) { el[id] = document.getElementById(id); });

    initNavIcons();

    /* 载入数据 */
    var loaded = await IDR.store.ready();
    state.source = loaded.source;
    state.site = clone(IDR.store.site());
    state.data = clone(IDR.store.raw());
    if (!Array.isArray(state.data.projects)) state.data.projects = [];
    if (!Array.isArray(state.data.categories)) state.data.categories = [];

    /* 先把数据和视图准备好，再绑事件 */
    fillSiteForm();
    renderProjectList();
    renderDashboard();
    renderDataView();

    // 逐段绑定，任何一段出错都不影响后续事件
    bindEventsSafely();

    /* 让闸门 / 后台先显示出来 */
    initGate();

    // 布局自检：找出任何可能拦截点击/滚动的全屏元素，并确认主区可滚动
    setTimeout(diagnoseOverlay, 120);

    /* 草稿恢复：用常驻提示条提示，不再用弹窗（弹窗一旦异常就会变成"只有按钮的空窗"） */
    var banner = IDR.draftBanner;
    if (banner) { banner.init(); banner.bind(); }

    var draft = readDraft();
    if (draft && draft.data && draft.site && banner) {
      var draftCount = (draft.data.projects || []).length;
      var diskCount = (state.data.projects || []).length;
      var sameAsDisk = JSON.stringify(draft.data) === JSON.stringify(state.data) &&
                       JSON.stringify(draft.site) === JSON.stringify(state.site);
      if (!sameAsDisk) {
        banner.show({
          at: draft.at,
          draftCount: draftCount,
          diskCount: diskCount,
          restore: function () {
            state.site = draft.site;
            state.data = draft.data;
            markDirty(true);
            fillSiteForm();
            renderProjectList();
            renderDashboard();
            renderDataView();
            toast('已恢复草稿内容，记得点右上角「保存」写入文件。', 'warn', 6000);
          },
          discard: function () {
            clearDraft();
            toast('已丢弃草稿，以文件里的内容为准。', 'info');
          }
        });
      } else {
        // 草稿和文件内容一致，没有恢复的必要，直接清掉免得每次打扰
        clearDraft();
      }
    }

    /* 数据来源提示 */
    var sourceText = {
      json: '数据来自 <b>assets/data/*.json</b>',
      embedded: '数据来自 <b>data-embedded.js</b>（内嵌副本）',
      cache: '数据来自<b>浏览器缓存</b>（JSON 读取失败）',
      default: '<b>没有找到数据文件</b>，已用空数据'
    }[state.source] || '';
    el.dataSource.innerHTML = '当前状态：<br>' + sourceText;

    /* 分类下拉 */
    function refreshCategoryList() {
      var cats = {};
      (state.data.categories || []).forEach(function (c) { cats[c] = 1; });
      (state.data.projects || []).forEach(function (p) {
        if (p.category) cats[p.category] = 1;
        (p.tags || []).forEach(function (t) { cats[t] = 1; });
      });
      el.categoryList.innerHTML = Object.keys(cats).map(function (c) {
        return '<option value="' + ui.escapeAttr(c) + '"></option>';
      }).join('');
    }
    refreshCategoryList();
    setInterval(refreshCategoryList, 4000);
  }

  /* 统一入口 */
  function renderAll() {
    fillSiteForm();
    renderAllViews();
    setView(state.view || 'dashboard');
  }

  function renderAllViews() {
    renderProjectList();
    renderDashboard();
    renderDataView();
  }

  /* ==========================================================================
     安全绑定 + 启动自检
     ========================================================================== */

  /* 把 bindEvents 包在 try/catch 里执行。
     bindEvents 里已经对每个节点做了存在性判断，正常情况下不会抛错；
     万一某个节点缺失，也只是跳过它，不会连带毁掉弹窗按钮等关键交互。 */
  function bindEventsSafely() {
    var failed = 0;
    try {
      bindEvents();
    } catch (err) {
      failed = 1;
      console.error('[IDR.admin] 事件绑定中途出错：', err);
      console.error('[IDR.admin] 出错位置：', err && err.stack);
    }
    setBuildStamp(failed);
  }

  /* 在侧栏显示版本号，方便一眼确认浏览器跑的是不是最新代码 */
  function setBuildStamp(failCount) {
    var node = document.getElementById('buildStamp');
    var label = ADMIN_VERSION + (failCount ? ' ⚠ 绑定异常' : ' ✔ 正常');
    if (node) {
      node.textContent = label;
      node.title = failCount
        ? '有事件绑定失败，详见控制台 [IDR.admin] 报错'
        : '界面已正常加载';
    }
    console.log('[IDR.admin] 界面版本 ' + ADMIN_VERSION +
      (failCount ? '（事件绑定有异常，详见上方报错）' : '，事件绑定正常'));
  }

  /* --------------------------------------------------------------------------
     布局自检：找出任何"盖住整个视口、可能导致点不动/滚不动"的元素
     历史上就出过这个问题（旧版弹窗的 fixed 全屏遮罩因为 [hidden] 对
     display:grid 无效而一直盖在页面上，拦截了全部点击与滚动）。
     这个检查会在控制台明确点名元凶，省得靠猜。
     -------------------------------------------------------------------------- */
  function diagnoseOverlay() {
    // 这是个诊断工具，绝不能因为它自己出错而影响后台
    try {
      if (typeof window.getComputedStyle !== 'function') return;
      if (typeof document.elementFromPoint !== 'function') return;

      var vw = window.innerWidth || document.documentElement.clientWidth || 0;
      var vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (!vw || !vh) return;
      var cx = Math.round(vw / 2), cy = Math.round(vh / 2);

      // 1) 先看视口中心点到底是谁接住了事件
      var top = document.elementFromPoint(cx, cy);
      var chain = [];
      var n = top;
      while (n && n.tagName && chain.length < 6) {
        chain.push(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') +
          (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
        n = n.parentElement;
      }
      console.log('[IDR.admin] 视口中心处的最上层元素：' + (chain[0] || '(空)'));
      console.log('[IDR.admin] 它的父级链：' + chain.join(' < '));

      // 2) 扫描所有 fixed/absolute 且铺满视口的元素
      var suspects = [];
      var all = document.querySelectorAll('body *');
      for (var i = 0; i < all.length; i++) {
        var e = all[i];
        if (e.hidden) continue;
        var cs = window.getComputedStyle(e);
        if (!cs || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') continue;
        if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
        if (typeof e.getBoundingClientRect !== 'function') continue;
        var r = e.getBoundingClientRect();
        if (r.width < vw * 0.9 || r.height < vh * 0.9) continue;
        var z = parseInt(cs.zIndex, 10);
        suspects.push({
          desc: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') +
                (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''),
          position: cs.position,
          zIndex: isNaN(z) ? 0 : z,
          bg: cs.backgroundColor,
          pointerEvents: cs.pointerEvents,
          size: Math.round(r.width) + 'x' + Math.round(r.height)
        });
      }

      if (suspects.length) {
        console.warn('[IDR.admin] ⚠ 发现 ' + suspects.length + ' 个铺满视口的定位元素，' +
          '它们可能拦截点击/滚动：');
        suspects.forEach(function (s) { console.warn('   ', s); });
        console.warn('[IDR.admin] 如果页面"不可点击/不可滚动"，元凶就在上面这个列表里。');
      } else {
        console.log('[IDR.admin] 未发现铺满视口的拦截元素，布局正常 ✔');
      }

      // 3) 确认主区确实可以滚动
      var sc = document.getElementById('adminScroll');
      if (sc && typeof sc.getBoundingClientRect === 'function') {
        var cs2 = window.getComputedStyle(sc);
        var scrollable = sc.scrollHeight > sc.clientHeight;
        console.log('[IDR.admin] 主区滚动容器：#adminScroll  overflow-y=' + (cs2 && cs2.overflowY) +
          '  内容高=' + sc.scrollHeight + '  可视高=' + sc.clientHeight +
          (scrollable ? '  → 可滚动 ✔' : '  → 内容未超出，无需滚动'));
        if (cs2 && (cs2.overflowY === 'visible' || cs2.overflowY === 'hidden')) {
          console.warn('[IDR.admin] ⚠ #adminScroll 的 overflow-y 是 ' + cs2.overflowY +
            '，内容超出时将无法滚动。请检查 CSS 是否加载成功。');
        }
      }
    } catch (e) {
      // 诊断失败不影响任何功能
      console.log('[IDR.admin] 布局自检跳过：' + (e && e.message));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
