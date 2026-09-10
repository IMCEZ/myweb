/* ==========================================================================
   作品详情页
   路由：project.html?id=<slug 或 id>
   ========================================================================== */
(function () {
  'use strict';

  function readId() {
    var p = new URLSearchParams(window.location.search);
    var id = p.get('id') || p.get('p') || p.get('slug');
    if (!id && window.location.hash) {
      var hp = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      id = hp.get('id');
    }
    return id || '';
  }

  function setMeta(name, content) {
    if (!content) return;
    var el = document.querySelector('meta[name="' + name + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('name', name);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function setOg(property, content) {
    if (!content) return;
    var el = document.querySelector('meta[property="' + property + '"]');
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute('property', property);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // 兼容 file:// 与旧浏览器
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        ok ? resolve() : reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  window.IDR_PAGE = function (ctx) {
    var store = ctx.store, ui = ctx.ui, md = ctx.md;

    var rootEl = document.getElementById('detailRoot');
    var nfEl = document.getElementById('notFound');
    var id = readId();
    var project = store.getProject(id);

    /* ------------------------------ 未找到 ------------------------------ */
    if (!project) {
      if (nfEl) {
        nfEl.hidden = false;
        var nfIcon = nfEl.querySelector('[data-nf-icon]');
        if (nfIcon) nfIcon.innerHTML = ui.ICON.search2;
      }
      document.title = '没有找到这个作品 · Ide-Chen (IDR)';
      return;
    }

    if (rootEl) rootEl.hidden = false;

    var url = new URL(window.location.href);
    url.search = '?id=' + encodeURIComponent(project.slug || project.id);

    /* ------------------------------ 页面标题与 SEO ------------------------------ */
    document.title = project.title + ' · Ide-Chen (IDR)';
    setMeta('description', project.summary || md.excerpt(project.content, 150));
    setOg('og:title', project.title);
    setOg('og:description', project.summary || md.excerpt(project.content, 150));
    setOg('og:type', 'article');
    if (project.cover && /^https?:/i.test(project.cover)) setOg('og:image', project.cover);

    /* ------------------------------ 面包屑 ------------------------------ */
    var crumb = document.querySelector('[data-crumb-title]');
    if (crumb) crumb.textContent = project.title || '';

    /* ------------------------------ 封面 ------------------------------ */
    var coverWrap = document.querySelector('[data-cover-wrap]');
    var coverImg = document.querySelector('[data-cover]');
    if (project.cover && coverImg && coverWrap) {
      coverImg.src = project.cover;
      coverImg.alt = project.title + ' 封面';
    } else if (coverWrap) {
      coverWrap.hidden = true;
    }

    /* ------------------------------ 标签 ------------------------------ */
    var tagsEl = document.querySelector('[data-tags]');
    if (tagsEl) {
      var tags = (project.tags || []).slice();
      if (project.category && tags.indexOf(project.category) < 0) tags.unshift(project.category);
      tagsEl.innerHTML = tags.map(function (t) {
        return '<a class="tag" href="projects.html?tag=' + encodeURIComponent(t) + '">' + ui.escapeHtml(t) + '</a>';
      }).join('');
      if (!tags.length) tagsEl.hidden = true;
    }

    /* ------------------------------ 标题与摘要 ------------------------------ */
    var titleEl = document.querySelector('[data-title]');
    if (titleEl) titleEl.textContent = project.title || '未命名作品';

    var sumEl = document.querySelector('[data-summary]');
    if (sumEl) {
      sumEl.textContent = project.summary || md.excerpt(project.content, 140);
      if (!sumEl.textContent) sumEl.hidden = true;
    }

    /* ------------------------------ 行内元信息 ------------------------------ */
    var metaInlineEl = document.querySelector('[data-meta-inline]');
    if (metaInlineEl) {
      var bits = [];
      if (project.date) bits.push('<span>' + ui.ICON.calendar + ui.formatDate(project.date) + '</span>');
      if (project.role) bits.push('<span>' + ui.ICON.box + ui.escapeHtml(project.role) + '</span>');
      if (project.status) bits.push('<span>' + ui.ICON.check + ui.escapeHtml(project.status) + '</span>');
      metaInlineEl.innerHTML = bits.join('');
    }

    /* ------------------------------ 正文 ------------------------------ */
    var bodyEl = document.querySelector('[data-body]');
    if (bodyEl) {
      bodyEl.innerHTML = md.toHTML(project.content || '');
      // 正文里的外链统一加上安全属性
      Array.prototype.forEach.call(bodyEl.querySelectorAll('a[href^="http"]'), function (a) {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    }

    /* ------------------------------ 侧栏：信息 ------------------------------ */
    var metaCard = document.querySelector('[data-sidebar-meta]');
    if (metaCard) {
      var rows = [];
      if (project.category) rows.push(['分类', project.category]);
      if (project.role) rows.push(['我的角色', project.role]);
      if (project.status) rows.push(['状态', project.status]);
      if (project.duration) rows.push(['周期', project.duration]);
      if (project.date) rows.push(['时间', ui.formatDate(project.date)]);

      metaCard.innerHTML = '<div class="sidebar__title">项目信息</div>' +
        (rows.length
          ? '<div class="meta-list">' + rows.map(function (r) {
              return '<div class="meta-list__row"><span class="meta-list__key">' + ui.escapeHtml(r[0]) +
                '</span><span class="meta-list__val">' + ui.escapeHtml(r[1]) + '</span></div>';
            }).join('') + '</div>'
          : '<p style="font-size:14px;color:var(--text-muted);margin:0">还没有填写项目信息。</p>');
    }

    /* ------------------------------ 侧栏：相关链接 ------------------------------ */
    var linksCard = document.querySelector('[data-sidebar-links]');
    var links = (Array.isArray(project.links) ? project.links : []).filter(function (l) { return l && l.url; });
    if (linksCard) {
      if (links.length) {
        linksCard.hidden = false;
        linksCard.innerHTML = '<div class="sidebar__title">相关链接</div><div class="link-stack">' +
          links.map(function (l) {
            var type = String(l.type || '').toLowerCase();
            var icon = ui.LINK_TYPE_ICON[type] || ui.LINK_TYPE_ICON.default;
            return '<a class="link-item" href="' + ui.escapeAttr(l.url) + '" target="_blank" rel="noopener noreferrer">' +
              icon + '<span>' + ui.escapeHtml(l.label || l.url) + '</span>' +
              '<span class="arrow">' + ui.ICON.arrowUpRight + '</span></a>';
          }).join('') + '</div>';
      } else {
        linksCard.hidden = true;
      }
    }

    /* ------------------------------ 侧栏：亮点 ------------------------------ */
    var hlCard = document.querySelector('[data-sidebar-highlights]');
    var highlights = (Array.isArray(project.highlights) ? project.highlights : []).filter(Boolean);
    if (hlCard) {
      if (highlights.length) {
        hlCard.hidden = false;
        hlCard.innerHTML = '<div class="sidebar__title">亮点</div><ul class="highlight-list">' +
          highlights.map(function (h) {
            return '<li>' + ui.ICON.check + '<span>' + ui.escapeHtml(h) + '</span></li>';
          }).join('') + '</ul>';
      } else {
        hlCard.hidden = true;
      }
    }

    /* ------------------------------ 分享 / 返回图标 ------------------------------ */
    var copyIcon = document.querySelector('[data-copy-icon]');
    if (copyIcon) copyIcon.innerHTML = ui.ICON.link;
    var copyArrow = document.querySelector('[data-copy-arrow]');
    if (copyArrow) copyArrow.innerHTML = ui.ICON.arrowUpRight;
    var backIcon = document.querySelector('[data-back-icon]');
    if (backIcon) backIcon.innerHTML = ui.ICON.arrowLeft;
    var backArrow = document.querySelector('[data-back-arrow]');
    if (backArrow) backArrow.innerHTML = ui.ICON.arrowRight;

    var copyBtn = document.querySelector('[data-copy-link]');
    var copyLabel = document.querySelector('[data-copy-label]');
    if (copyBtn && copyLabel) {
      copyBtn.addEventListener('click', function () {
        copyText(url.toString()).then(function () {
          copyLabel.textContent = '链接已复制 ✓';
          copyBtn.style.color = 'var(--primary)';
          setTimeout(function () {
            copyLabel.textContent = '复制本页链接';
            copyBtn.style.color = '';
          }, 1800);
        }).catch(function () {
          copyLabel.textContent = '复制失败，请手动复制地址栏';
          setTimeout(function () { copyLabel.textContent = '复制本页链接'; }, 2200);
        });
      });
    }

    /* ------------------------------ 上一篇 / 下一篇 ------------------------------ */
    var pnEl = document.querySelector('[data-prevnext]');
    var nb = store.neighbors(project.slug || project.id);
    if (pnEl) {
      if (!nb.prev && !nb.next) {
        pnEl.hidden = true;
      } else {
        var html = '';
        html += nb.prev
          ? '<a class="prevnext__item" href="' + ui.projectUrl(nb.prev) + '">' +
              '<div class="prevnext__label">' + ui.ICON.arrowLeft + ' 更新一个</div>' +
              '<div class="prevnext__title">' + ui.escapeHtml(nb.prev.title) + '</div></a>'
          : '<div></div>';
        html += nb.next
          ? '<a class="prevnext__item prevnext__item--next" href="' + ui.projectUrl(nb.next) + '">' +
              '<div class="prevnext__label">更早一个 ' + ui.ICON.arrowRight + '</div>' +
              '<div class="prevnext__title">' + ui.escapeHtml(nb.next.title) + '</div></a>'
          : '<div></div>';
        pnEl.innerHTML = html;
      }
    }
  };
})();
