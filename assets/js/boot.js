/* ==========================================================================
   IDR · 页面启动器
   每个页面在底部引入：<script src="assets/js/boot.js" defer></script>
   它会：加载数据 → 渲染导航/页脚 → 调用页面自己的 IDR_PAGE 渲染函数
   ========================================================================== */
(function (global) {
  'use strict';

  async function boot() {
    const IDR = global.IDR;

    // 加载数据
    let loaded = { source: 'default' };
    try {
      loaded = await IDR.store.ready();
    } catch (err) {
      console.error('[IDR.boot] 数据加载失败：', err);
    }
    const site = IDR.store.site();

    // 主题：尊重站点设置里的默认值（用户手动选择过则以用户为准）
    const settings = site.settings || {};
    if (settings.allowThemeToggle === false) {
      IDR.ui.applyTheme(settings.defaultTheme === 'dark' ? 'dark' : 'light', false);
    } else if (!IDR.ui.readTheme()) {
      const preferred = settings.defaultTheme;
      const fallback = preferred === 'dark' || preferred === 'light' ? preferred : IDR.ui.systemTheme();
      IDR.ui.applyTheme(fallback, false);
    }

    // 导航 + 页脚
    IDR.ui.renderNav(site);
    IDR.ui.renderFooter(site);

    // 页面自有渲染
    if (typeof global.IDR_PAGE === 'function') {
      try {
        await global.IDR_PAGE({ store: IDR.store, ui: IDR.ui, md: IDR.markdown, site: site });
      } catch (err) {
        console.error('[IDR.boot] 页面渲染出错：', err);
        const main = document.querySelector('main');
        if (main) {
          main.insertAdjacentHTML('afterbegin',
            '<div class="container" style="padding-block:var(--space-7)">' +
            '<div class="notice">页面渲染出错：' + IDR.ui.escapeHtml(err.message) + '</div></div>');
        }
      }
    }

    // 数据来源提示（仅 file:// 且用了内嵌数据时，给开发者一个温和提示）
    if (loaded.source === 'embedded' && global.location.protocol === 'file:') {
      document.documentElement.setAttribute('data-source', 'embedded');
    }
    document.documentElement.setAttribute('data-ready', 'true');
    IDR.ui.initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
