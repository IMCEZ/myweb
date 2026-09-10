/* ==========================================================================
   首页渲染
   ========================================================================== */
(function () {
  'use strict';

  var ui = window.IDR.ui;

  /* Logo 每一段描边的实际长度（用于精确的绘制动画） */
  var STROKE_LENS = [24, 24, 114, 24, 72, 21];

  /** 给一个未标注的 logo 注入绘制动画所需的属性 */
  function decorateLogo(svg) {
    if (!svg) return null;
    var strokes = svg.querySelectorAll('g[stroke] > *');
    Array.prototype.forEach.call(strokes, function (el, i) {
      var len = STROKE_LENS[i] || 100;
      el.setAttribute('data-draw', String(i + 1));
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = len;
    });
    var dot = svg.querySelector('circle');
    if (dot) {
      dot.setAttribute('data-dot', '');
      dot.style.opacity = '0';
    }
    return svg;
  }

  /** Logo 绘制动画：路径依次画出来，最后点亮句点 */
  function animateLogo(svg) {
    if (!svg) return;
    var strokes = svg.querySelectorAll('[data-draw]');
    var dot = svg.querySelector('[data-dot]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      Array.prototype.forEach.call(strokes, function (el) { el.style.strokeDashoffset = 0; });
      if (dot) dot.style.opacity = '1';
      return;
    }

    Array.prototype.forEach.call(strokes, function (el, i) {
      var len = Number(el.style.strokeDasharray) || 100;
      el.style.transition = 'stroke-dashoffset 760ms cubic-bezier(0.16,1,0.3,1)';
      el.style.transitionDelay = (90 + i * 135) + 'ms';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.style.strokeDashoffset = 0; });
      });
    });

    if (dot) {
      dot.style.transition = 'opacity 460ms ease ' + (90 + strokes.length * 135 + 120) + 'ms, transform 620ms cubic-bezier(0.34,1.56,0.64,1) ' + (90 + strokes.length * 135) + 'ms';
      dot.style.transformOrigin = '180px 45px';
      dot.style.transform = 'scale(0.2)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dot.style.opacity = '1';
          dot.style.transform = 'scale(1)';
        });
      });
    }
  }

  /** 逐字入场：把标题切成小片段做轻微上浮 */
  function animateTitle(container, delayBase) {
    if (!container) return;
    var tokens = container.querySelectorAll('[data-tok]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      Array.prototype.forEach.call(tokens, function (t) { t.style.opacity = '1'; });
      return;
    }
    Array.prototype.forEach.call(tokens, function (t, i) {
      t.style.opacity = '0';
      t.style.display = 'inline-block';
      t.style.transform = 'translateY(14px)';
      t.style.transition = 'opacity 520ms cubic-bezier(0.16,1,0.3,1), transform 520ms cubic-bezier(0.16,1,0.3,1)';
      t.style.transitionDelay = (delayBase + i * 46) + 'ms';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          t.style.opacity = '1';
          t.style.transform = 'translateY(0)';
        });
      });
    });
  }

  /** 把文本切成「词 / 单字」两种粒度的 span */
  function tokenize(text) {
    var html = '';
    var parts = String(text || '').split(/(\s+)/);
    parts.forEach(function (part) {
      if (!part) return;
      if (/^\s+$/.test(part)) { html += ' '; return; }
      // 含中文的片段按字切，纯西文按词切
      if (/[\u4e00-\u9fa5]/.test(part)) {
        for (var i = 0; i < part.length; i++) {
          html += '<span data-tok>' + ui.escapeHtml(part[i]) + '</span>';
        }
      } else {
        html += '<span data-tok>' + ui.escapeHtml(part) + '</span>';
      }
    });
    return html;
  }

  window.IDR_PAGE = async function (ctx) {
    var store = ctx.store, ui = ctx.ui, site = ctx.site;
    var hero = site.hero || {};
    var brand = site.brand || {};

    /* ------------------------------ 首屏 ------------------------------ */
    var kicker = document.querySelector('[data-hero-kicker]');
    if (kicker) kicker.textContent = hero.kicker || 'HELLO, WORLD';

    var titleEl = document.querySelector('[data-hero-title]');
    if (titleEl) {
      var raw = hero.title || ('我是 ' + (brand.fullName || 'Ide-Chen') + '，代号 ' + (brand.name || 'IDR') + '。');
      // 把「代号 XXX」之后的部分做成渐变强调色
      var accentAt = raw.indexOf('代号');
      var head = accentAt > 0 ? raw.slice(0, accentAt) : raw;
      var tail = accentAt > 0 ? raw.slice(accentAt) : '';
      titleEl.innerHTML = tokenize(head) + (tail ? '<span class="accent">' + tokenize(tail) + '</span>' : '');
    }

    var subEl = document.querySelector('[data-hero-subtitle]');
    if (subEl) subEl.textContent = hero.subtitle || '';

    var ctaEl = document.querySelector('[data-hero-cta]');
    if (ctaEl) {
      var ctaHtml = '';
      if (hero.primaryCta && hero.primaryCta.label) {
        ctaHtml += '<a class="btn btn--primary" href="' + ui.escapeAttr(hero.primaryCta.href || 'projects.html') + '">' +
          ui.escapeHtml(hero.primaryCta.label) + ui.ICON.arrowRight + '</a>';
      }
      if (hero.secondaryCta && hero.secondaryCta.label) {
        ctaHtml += '<a class="btn btn--ghost" href="' + ui.escapeAttr(hero.secondaryCta.href || 'about.html') + '">' +
          ui.escapeHtml(hero.secondaryCta.label) + '</a>';
      }
      ctaEl.innerHTML = ctaHtml;
    }

    var statsEl = document.querySelector('[data-hero-stats]');
    if (statsEl) {
      var stats = Array.isArray(hero.stats) ? hero.stats : [];
      // 作品数量实时统计，避免和后台数据不一致
      stats = stats.map(function (s) {
        if (/项目/.test(s.label || '')) {
          return { value: String(store.projects().length), label: s.label };
        }
        return s;
      });
      statsEl.innerHTML = stats.map(function (s) {
        return '<div class="stat"><div class="stat__value">' + ui.escapeHtml(s.value) + '</div>' +
               '<div class="stat__label">' + ui.escapeHtml(s.label) + '</div></div>';
      }).join('');
    }

    /* Logo 大图 + 绘制动画 */
    var artEl = document.querySelector('[data-hero-art]');
    if (artEl) {
      artEl.innerHTML = ui.logoSVG({ height: 120, title: 'IDR · Ide-Chen' });
      animateLogo(decorateLogo(artEl.querySelector('svg')));
    }

    /* ------------------------------ 精选作品 ------------------------------ */
    var worksEl = document.querySelector('[data-featured-works]');
    if (worksEl) {
      var list = store.featured().slice(0, 4);
      if (!list.length) {
        worksEl.innerHTML =
          '<div class="empty" style="grid-column:1/-1">' + ui.ICON.file +
          '<h3>还没有作品</h3><p>打开 <code>admin.html</code> 添加第一个作品吧。</p></div>';
      } else {
        worksEl.innerHTML = list.map(function (p, i) {
          return ui.projectCard(p, { delay: i * 70 });
        }).join('');
      }
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

    /* ------------------------------ 关于摘要 ------------------------------ */
    var about = site.about || {};
    var leadEl = document.querySelector('[data-about-lead]');
    if (leadEl) leadEl.textContent = about.lead || '';
    var aboutEl = document.querySelector('[data-about-text]');
    if (aboutEl) {
      var paras = Array.isArray(about.paragraphs) ? about.paragraphs.slice(0, 2) : [];
      aboutEl.innerHTML = paras.map(function (p) { return '<p>' + ui.escapeHtml(p) + '</p>'; }).join('') +
        '<p style="margin-top:var(--space-5)"><a class="btn btn--text" href="about.html">继续了解我' + ui.ICON.arrowRight + '</a></p>';
    }

    /* ------------------------------ 联系 ------------------------------ */
    var contact = site.contact || {};
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

    /* ------------------------------ 每日一语 ------------------------------ */
    var quoteEl = document.querySelector('[data-daily-quote]');
    if (quoteEl) {
      var qIcon = quoteEl.querySelector('[data-quote-icon]');
      if (qIcon) qIcon.innerHTML = ui.ICON.refresh;
      if (window.IDR.quoteCard) window.IDR.quoteCard.mount(quoteEl, store);
    }

    /* ------------------------------ 入场动画 ------------------------------ */
    animateTitle(titleEl, 140);
    ui.initReveal();
  };
})();
