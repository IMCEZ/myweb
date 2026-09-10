/* ==========================================================================
   作品列表页：搜索 / 分类筛选 / 排序
   支持通过 URL 参数直达筛选状态，例如 projects.html?tag=开源项目&q=cli
   ========================================================================== */
(function () {
  'use strict';

  var ALL = '__all__';

  function readParams() {
    var p = new URLSearchParams(window.location.search);
    return {
      q: p.get('q') || '',
      tag: p.get('tag') || ALL,
      sort: p.get('sort') || 'new'
    };
  }

  function writeParams(state) {
    var p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.tag && state.tag !== ALL) p.set('tag', state.tag);
    if (state.sort && state.sort !== 'new') p.set('sort', state.sort);
    var qs = p.toString();
    var url = window.location.pathname.split('/').pop() + (qs ? '?' + qs : '');
    try { history.replaceState(null, '', url); } catch (e) {}
  }

  window.IDR_PAGE = function (ctx) {
    var store = ctx.store, ui = ctx.ui;
    var state = readParams();

    var gridEl = document.getElementById('worksGrid');
    var emptyEl = document.getElementById('worksEmpty');
    var countEl = document.querySelector('[data-result-count]');
    var filtersEl = document.querySelector('[data-filters]');
    var searchEl = document.getElementById('workSearch');
    var iconEl = document.querySelector('[data-search-icon]');

    if (iconEl) iconEl.innerHTML = ui.ICON.search;
    if (!gridEl || !emptyEl || !filtersEl || !searchEl) return;

    /* ---------------------------- 分类筛选按钮 ---------------------------- */
    var cats = store.categories();
    var chips = [{ key: ALL, label: '全部' }].concat(cats.map(function (c) { return { key: c, label: c }; }));
    filtersEl.innerHTML = chips.map(function (c) {
      return '<button class="chip' + (c.key === state.tag ? ' is-active' : '') + '" type="button" data-tag="' +
        ui.escapeAttr(c.key) + '">' + ui.escapeHtml(c.label) + '</button>';
    }).join('');

    filtersEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tag]');
      if (!btn) return;
      state.tag = btn.getAttribute('data-tag');
      Array.prototype.forEach.call(filtersEl.querySelectorAll('.chip'), function (c) {
        c.classList.toggle('is-active', c === btn);
      });
      render();
    });

    /* ---------------------------- 搜索 ---------------------------- */
    var debounce = null;
    searchEl.value = state.q;
    searchEl.addEventListener('input', function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () {
        state.q = searchEl.value.trim();
        render();
      }, 140);
    });

    /* ---------------------------- 渲染 ---------------------------- */
    function emptyState() {
      return '<div class="empty" style="grid-column:1/-1">' + ui.ICON.search2 +
        '<h3>没有匹配的作品</h3>' +
        '<p>换个关键词，或者点「全部」看看所有作品。</p>' +
        '<div style="margin-top:var(--space-5)"><button class="btn btn--ghost btn--sm" type="button" data-reset>重置筛选</button></div>' +
        '</div>';
    }

    function render() {
      var list = store.search(state.q, { tag: state.tag });

      if (countEl) {
        countEl.textContent = list.length
          ? '共 ' + list.length + ' 个作品'
          : '没有结果';
      }

      if (!list.length) {
        gridEl.hidden = true;
        gridEl.innerHTML = '';
        emptyEl.hidden = false;
        emptyEl.innerHTML = emptyState();
        var resetBtn = emptyEl.querySelector('[data-reset]');
        if (resetBtn) {
          resetBtn.addEventListener('click', function () {
            state.q = ''; state.tag = ALL; searchEl.value = '';
            Array.prototype.forEach.call(filtersEl.querySelectorAll('.chip'), function (c, i) {
              c.classList.toggle('is-active', i === 0);
            });
            render();
          });
        }
        writeParams(state);
        return;
      }

      emptyEl.hidden = true;
      emptyEl.innerHTML = '';
      gridEl.hidden = false;
      gridEl.innerHTML = list.map(function (p, i) {
        return ui.projectCard(p, { delay: Math.min(i, 6) * 55 });
      }).join('');
      ui.initReveal(gridEl);
      writeParams(state);
    }

    // 首屏若无筛选条件，给个总数提示
    var subEl = document.querySelector('[data-projects-subtitle]');
    var total = store.projects().length;
    if (subEl && total) {
      subEl.textContent = '共收录 ' + total + ' 个项目，从完整的产品到随手写的小工具都有。点开卡片可以看到每个项目的来龙去脉。';
    }

    render();
  };
})();
