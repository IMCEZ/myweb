/* ==========================================================================
   IDR · 每日一语
   ---------------------------------------------------------------------------
   每次页面加载随机抽一条语录显示；点「换一句」可以再抽一条（不刷新页面）。
   语录数据来自 assets/data/quotes.json（file:// 下走内嵌副本），
   由 store.randomQuote() 提供，本模块只负责渲染与交互。

   挂载点：页面上任意位置放 <div data-daily-quote></div>，
   然后调用 IDR.quoteCard.mount(container, store)（不传 container 则自动查找）。
   ========================================================================== */
(function (global) {
  'use strict';

  var last = null;   // 记住上一次抽到的，避免「换一句」抽到同一条

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* 格式固定为：......---《出处》 */
  function format(q) {
    return q.text + '---《' + q.source + '》';
  }

  function renderInto(node, q) {
    var textEl = node.querySelector('[data-quote-text]');
    var srcEl = node.querySelector('[data-quote-source]');
    var fullEl = node.querySelector('[data-quote-full]');

    if (!q) {
      node.hidden = true;
      return;
    }
    if (textEl) textEl.textContent = q.text;
    if (srcEl) srcEl.textContent = '《' + q.source + '》';
    // 同时保留完整格式的文本（供复制 / 无障碍读出 / 爬虫）
    if (fullEl) fullEl.textContent = format(q);
    node.hidden = false;
  }

  /* 抽一条并渲染，带轻微的淡出淡入 */
  function draw(node, store, animate) {
    var q = store.randomQuote(last);
    if (!q) { node.hidden = true; return null; }
    last = q;

    if (!animate) { renderInto(node, q); return q; }

    node.classList.add('is-swapping');
    global.setTimeout(function () {
      renderInto(node, q);
      node.classList.remove('is-swapping');
    }, 140);
    return q;
  }

  function mount(container, store) {
    var node = container || document.querySelector('[data-daily-quote]');
    if (!node || !store || typeof store.randomQuote !== 'function') return null;

    // 首次抽签
    var first = draw(node, store, false);

    // 「换一句」按钮
    var btn = node.querySelector('[data-quote-refresh]');
    if (btn) {
      btn.addEventListener('click', function () {
        draw(node, store, true);
        btn.classList.remove('is-spin');
        // 触发一次旋转动画（强制重排以便重复播放）
        void btn.offsetWidth;
        btn.classList.add('is-spin');
      });
    }

    // 显示总数
    var countEl = node.querySelector('[data-quote-count]');
    if (countEl) {
      var meta = typeof store.quotesMeta === 'function' ? store.quotesMeta() : { count: 0 };
      countEl.textContent = meta.count ? '共收录 ' + meta.count + ' 条' : '';
    }

    return first;
  }

  global.IDR = global.IDR || {};
  global.IDR.quoteCard = {
    mount: mount,
    draw: draw,
    format: format
  };
})(window);
