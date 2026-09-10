/* ==========================================================================
   IDR · 后台草稿恢复提示条
   ---------------------------------------------------------------------------
   设计说明：恢复草稿这个提示原先是用模态弹窗做的，一旦任何环节出问题
   （节点取不到、正文渲染异常、CSS 冲突），用户就会看到一个"只有按钮的空窗"，
   完全不知道发生了什么，也无法操作。

   现在改成**不依赖弹窗**的常驻提示条：
     - 它就在页面流里（后台主体最上方），不依赖 fixed 定位与 z-index
     - 文字写死在 HTML 模板里，JS 只负责填数字
     - 就算 JS 完全没跑起来，提示条也只会是隐藏的，绝不会出现空窗
   ========================================================================== */
(function (global) {
  'use strict';

  var IDR = global.IDR;
  var ui = IDR.ui;

  var node, textEl, actionsEl, onRestore, onDiscard;

  function init() {
    node = document.getElementById('draftBanner');
    textEl = document.getElementById('draftText');
    actionsEl = document.getElementById('draftActions');
    if (!node) return false;

    var event = new CustomEvent('idr:draftbanner');
    node.__idrEvent = event;
    return true;
  }

  /* 显示提示条
     opts = { at: 草稿时间, draftCount: 草稿内作品数, diskCount: 文件内作品数,
              restore: fn, discard: fn } */
  function show(opts) {
    if (!node) init();
    if (!node) {
      console.error('[IDR.admin] 找不到 #draftBanner 节点，跳过草稿提示');
      return;
    }
    onRestore = opts.restore;
    onDiscard = opts.discard;

    var when = '一个较早的时间';
    if (opts.at) {
      var d = new Date(opts.at);
      if (!isNaN(d.getTime())) when = d.toLocaleString('zh-CN');
    }

    textEl.innerHTML =
      '上次编辑的内容还没有写入文件。草稿时间：<b>' + ui.escapeHtml(when) + '</b>，' +
      '草稿里有 <b>' + Number(opts.draftCount || 0) + '</b> 个作品，' +
      '当前文件里是 <b>' + Number(opts.diskCount || 0) + '</b> 个。';

    node.hidden = false;

    // 把提示条滚进视野，确保用户一定看得到
    try { node.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }

  function hide() {
    if (!node) return;
    node.hidden = true;
    onRestore = null;
    onDiscard = null;
  }

  function isVisible() {
    return !!(node && node.hidden === false);
  }

  function bind() {
    if (!node) init();
    if (!node) return;
    actionsEl.addEventListener('click', function (e) {
      var target = e.target;
      var btn = target && target.closest ? target.closest('[data-draft-action]') : null;
      if (!btn && target && target.getAttribute && target.getAttribute('data-draft-action')) {
        btn = target; // 兜底：事件目标本身就是按钮
      }
      if (!btn) return;
      var action = btn.getAttribute('data-draft-action');
      btn.disabled = true;
      if (action === 'restore') {
        if (onRestore) onRestore();
      } else {
        if (onDiscard) onDiscard();
      }
      hide();
    });
  }

  global.IDR = global.IDR || {};
  global.IDR.draftBanner = {
    init: init,
    bind: bind,
    show: show,
    hide: hide,
    isVisible: isVisible
  };
})(window);
