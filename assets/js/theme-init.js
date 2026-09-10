/* 主题预置：必须在 <head> 中同步执行，避免首屏闪白/闪黑 */
(function () {
  try {
    var saved = localStorage.getItem('idr.theme');
    var theme = (saved === 'dark' || saved === 'light')
      ? saved
      : (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#020617' : '#ffffff');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'light');
  }
})();
