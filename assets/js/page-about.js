/* ==========================================================================
   关于页渲染
   ========================================================================== */
(function () {
  'use strict';

  function icons(ctx) {
    var ui = ctx.ui;
    var worksLink = document.querySelector('[data-works-link]');
    if (worksLink) {
      worksLink.innerHTML = ui.ICON.file + '<span>看看作品</span><span class="arrow">' + ui.ICON.arrowRight + '</span>';
    }
    var contactLink = document.querySelector('[data-contact-link]');
    if (contactLink) {
      contactLink.innerHTML = ui.ICON.mail + '<span>联系我</span><span class="arrow">' + ui.ICON.arrowRight + '</span>';
    }
  }

  window.IDR_PAGE = function (ctx) {
    var store = ctx.store, ui = ctx.ui, site = ctx.site;
    var about = site.about || {};
    var brand = site.brand || {};
    var contact = site.contact || {};

    document.title = (about.title || '关于我') + ' · ' + (brand.fullName || 'Ide-Chen') + ' (' + (brand.name || 'IDR') + ')';

    /* ------------------------------ 左侧内容 ------------------------------ */
    var titleEl = document.querySelector('[data-about-title]');
    if (titleEl) titleEl.textContent = about.title || '关于我';

    var leadEl = document.querySelector('[data-about-lead]');
    if (leadEl) leadEl.textContent = about.lead || '';

    var parasEl = document.querySelector('[data-about-paragraphs]');
    if (parasEl) {
      var paras = Array.isArray(about.paragraphs) ? about.paragraphs : [];
      parasEl.innerHTML = paras.map(function (p) { return '<p>' + ui.escapeHtml(p) + '</p>'; }).join('') ||
        '<p style="color:var(--text-muted)">还没有填写自我介绍。打开后台 → 站点设置可以补充。</p>';
    }

    /* ------------------------------ 时间线 ------------------------------ */
    var tlWrap = document.querySelector('[data-timeline-wrap]');
    var tlEl = document.querySelector('[data-timeline]');
    var timeline = Array.isArray(about.timeline) ? about.timeline : [];
    if (tlWrap && tlEl && timeline.length) {
      tlWrap.hidden = false;
      tlEl.innerHTML = timeline.map(function (t, i) {
        return '<div class="timeline__item" data-reveal data-reveal-delay="' + (i * 70) + '">' +
          '<div class="timeline__period">' + ui.escapeHtml(t.period || '') + '</div>' +
          '<div class="timeline__title">' + ui.escapeHtml(t.title || '') + '</div>' +
          (t.desc ? '<div class="timeline__desc">' + ui.escapeHtml(t.desc) + '</div>' : '') +
          '</div>';
      }).join('');
    }

    /* ------------------------------ 侧栏名片 ------------------------------ */
    var logoEl = document.querySelector('[data-about-logo]');
    if (logoEl) logoEl.innerHTML = ui.logoSVG({ height: 96, title: 'IDR' });

    var nameEl = document.querySelector('[data-about-name]');
    if (nameEl) nameEl.textContent = brand.fullName || 'Ide-Chen';

    var roleEl = document.querySelector('[data-about-role]');
    if (roleEl) roleEl.textContent = brand.tagline || '';

    /* ------------------------------ 侧栏小信息 ------------------------------ */
    var factsCard = document.querySelector('[data-facts-card]');
    var factsEl = document.querySelector('[data-facts]');
    var facts = [];
    if (contact.location) facts.push(['所在', contact.location]);
    facts.push(['作品数量', String(store.projects().length) + ' 个']);
    var firstYear = store.projects().map(function (p) { return String(p.date || '').slice(0, 4); })
      .filter(Boolean).sort()[0];
    if (firstYear) facts.push(['最早收录', firstYear + ' 年']);

    if (factsCard && factsEl && facts.length) {
      factsCard.hidden = false;
      factsEl.innerHTML = facts.map(function (f) {
        return '<div class="meta-list__row"><span class="meta-list__key">' + ui.escapeHtml(f[0]) +
          '</span><span class="meta-list__val">' + ui.escapeHtml(f[1]) + '</span></div>';
      }).join('');
    }

    /* ------------------------------ 技能 ------------------------------ */
    var skills = site.skills || {};
    var skTitle = document.querySelector('[data-skills-title]');
    if (skTitle) skTitle.textContent = skills.title || '技能与工具';
    var skSub = document.querySelector('[data-skills-subtitle]');
    if (skSub) skSub.textContent = skills.subtitle || '';
    var skEl = document.querySelector('[data-skills]');
    if (skEl) {
      var groups = Array.isArray(skills.groups) ? skills.groups : [];
      skEl.innerHTML = groups.map(function (g, i) {
        return '<div class="skill-group" data-reveal data-reveal-delay="' + (i * 60) + '">' +
          '<div class="skill-group__name">' + ui.escapeHtml(g.name || '') + '</div>' +
          '<div class="skill-list">' +
            (g.items || []).map(function (it) {
              return '<span class="tag tag--plain">' + ui.escapeHtml(it) + '</span>';
            }).join('') +
          '</div></div>';
      }).join('');
    }

    /* ------------------------------ 联系 ------------------------------ */
    var ctEl = document.querySelector('[data-contact-title]');
    if (ctEl) ctEl.textContent = contact.title || '联系我';
    var csEl = document.querySelector('[data-contact-subtitle]');
    if (csEl) csEl.textContent = contact.subtitle || '';

    var caEl = document.querySelector('[data-contact-actions]');
    if (caEl) {
      var mail = (contact.email || '').trim();
      caEl.innerHTML = (mail
        ? '<a class="btn btn--primary" href="mailto:' + ui.escapeAttr(mail) + '">' + ui.ICON.mail + '发邮件给我</a>'
        : '') +
        '<a class="btn btn--ghost" href="projects.html">' + ui.ICON.file + '浏览作品</a>';
    }

    var socialsEl = document.querySelector('[data-contact-socials]');
    if (socialsEl) {
      var socials = (Array.isArray(contact.socials) ? contact.socials : []).filter(function (s) { return s && s.url; });
      if (socials.length) {
        socialsEl.style.marginTop = 'var(--space-6)';
        socialsEl.innerHTML = socials.map(function (s) {
          var icon = ui.SOCIAL_ICON[String(s.type || '').toLowerCase()] || ui.ICON.link2;
          return '<a class="social-link" href="' + ui.escapeAttr(s.url) + '" target="_blank" rel="noopener noreferrer">' +
            icon + ui.escapeHtml(s.label || s.type || '链接') + '</a>';
        }).join('');
      }
    }

    var metaEl = document.querySelector('[data-contact-meta]');
    if (metaEl) {
      var bits = [];
      if (contact.email) bits.push('<span>' + ui.ICON.mail + ui.escapeHtml(contact.email) + '</span>');
      if (contact.location) bits.push('<span>' + ui.ICON.pin + ui.escapeHtml(contact.location) + '</span>');
      metaEl.innerHTML = bits.join('');
      if (!bits.length) metaEl.style.display = 'none';
    }

    icons(ctx);
    ui.initReveal();
  };
})();
