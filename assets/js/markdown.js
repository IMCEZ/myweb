/* ==========================================================================
   IDR · 极简 Markdown 渲染器（零依赖，约 6KB）
   支持：标题 / 粗体 / 斜体 / 删除线 / 行内代码 / 代码块 / 链接 / 图片 /
        引用 / 有序无序列表 / 表格 / 分割线 / 段落
   安全：先整体转义 HTML，再生成标签；禁用原始 HTML 注入
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------ 工具 ------------------------------ */
  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/`/g, '&#96;');
  }

  /* 只允许安全协议的链接 */
  function safeUrl(url) {
    const u = String(url || '').trim();
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i.test(u)) return u;
    if (/^data:image\//i.test(u)) return u;
    return '#';
  }

  /* 标题转锚点 id（中文保留，空格转 -） */
  function slugify(text) {
    return String(text)
      .replace(/<[^>]*>/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '')
      .slice(0, 60) || 'section';
  }

  /* ------------------------------ 代码高亮 ------------------------------ */
  const LANG_KEYWORDS = {
    js: 'const let var function return if else for while class extends new this typeof instanceof import from export default await async try catch finally throw switch case break continue of in delete void yield static get set',
    javascript: 'const let var function return if else for while class extends new this typeof instanceof import from export default await async try catch finally throw switch case break continue of in delete void yield static get set',
    ts: 'const let var function return if else for while class extends implements interface type enum new this typeof instanceof import from export default await async try catch finally throw switch case break continue of in delete void yield static get set public private protected readonly as satisfies',
    typescript: 'const let var function return if else for while class extends implements interface type enum new this typeof instanceof import from export default await async try catch finally throw switch case break continue of in delete void yield static get set public private protected readonly as satisfies',
    py: 'def class return if elif else for while import from as with try except finally raise lambda yield global nonlocal pass break continue and or not in is None True False self async await print',
    python: 'def class return if elif else for while import from as with try except finally raise lambda yield global nonlocal pass break continue and or not in is None True False self async await print',
    bash: 'cd ls mkdir rm cp mv echo export source sudo apt npm pnpm yarn git docker run build if then fi for do done while cat touch chmod curl wget',
    sh: 'cd ls mkdir rm cp mv echo export source sudo apt npm pnpm yarn git docker run build if then fi for do done while cat touch chmod curl wget',
    shell: 'cd ls mkdir rm cp mv echo export source sudo apt npm pnpm yarn git docker run build if then fi for do done while cat touch chmod curl wget',
    css: 'display position color background border margin padding font flex grid transform transition animation opacity width height top left right bottom z-index var calc media import',
    html: 'div span a img ul li p h1 h2 h3 section header footer nav main button input form script link meta',
    json: 'true false null',
    sql: 'select from where group by order having insert into values update set delete join left right inner outer on as limit offset create table primary key foreign references',
    go: 'package import func return if else for range var const type struct interface map chan go defer select switch case break continue',
    rust: 'fn let mut const struct enum impl trait pub use mod match if else for while loop return self async await move ref where unsafe crate super',
    java: 'public private protected class interface extends implements new return if else for while static final void int String boolean try catch finally import package',
    yml: 'true false null',
    yaml: 'true false null',
    toml: 'true false'
  };

  const CSS_PROPS = new Set(('display position color background background-color border border-radius ' +
    'margin padding font font-size font-weight flex grid gap transform transition animation opacity ' +
    'width height min-width max-width min-height max-height top left right bottom inset z-index ' +
    'align-items justify-content flex-direction overflow cursor box-shadow line-height letter-spacing ' +
    'text-align white-space backdrop-filter filter').split(' '));

  const CSS_UNITS = /^(\d+(?:\.\d+)?)(px|rem|em|%|vh|vw|s|ms|fr|deg|ch|ex|pt)$/;

  function highlight(code, lang) {
    const L = String(lang || '').toLowerCase().trim();
    const keywords = LANG_KEYWORDS[L] ? LANG_KEYWORDS[L].split(' ') : null;

    // 先转义，再按「字符串 → 注释 → 关键词/数字」的顺序打标，
    // 已打标的片段用占位符保护，避免二次替换。
    let out = escapeHtml(code);
    const tokenSlots = [];
    // 占位符用「字母+数字」且避开关键字/数字正则能匹配的形态，
    // 例如 \u0000T0\u0000 —— 否则占位符里的数字会被下一步的数字规则二次命中。
    let tokenSeq = 0;

    function slot(html) {
      const key = '\u0000T' + (tokenSeq++) + '\u0000';
      tokenSlots[key] = html;
      return key;
    }

    const isCss = (L === 'css' || L === 'scss' || L === 'less');
    const slashComment = !/^(py|python|bash|sh|shell|yml|yaml|toml|rb|ruby)$/.test(L);

    // 1) 注释
    if (slashComment) {
      out = out.replace(/\/\/[^\n]*/g, function (m) { return slot('<span class="tok-com">' + m + '</span>'); });
      out = out.replace(/\/\*[\s\S]*?\*\//g, function (m) { return slot('<span class="tok-com">' + m + '</span>'); });
    } else {
      out = out.replace(/(^|\n)(\s*#[^\n]*)/g, function (m, p1, p2) {
        return p1 + slot('<span class="tok-com">' + p2 + '</span>');
      });
    }

    // 2) 字符串（含模板串）
    out = out.replace(/(&#39;|&quot;|`)(?:\\.|(?!\1)[\s\S])*?\1/g, function (m) {
      return slot('<span class="tok-str">' + m + '</span>');
    });

    // 3) CSS 属性名
    if (isCss) {
      out = out.replace(/([-\w]+)(\s*:)/g, function (m, name, colon) {
        return CSS_PROPS.has(name) ? slot('<span class="tok-key">' + name + '</span>') + colon : m;
      });
    }

    // 4) 数字
    out = out.replace(/\b\d+(?:\.\d+)?\b/g, function (m) {
      return slot('<span class="tok-num">' + m + '</span>');
    });

    // 5) 关键词
    if (keywords) {
      const re = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'g');
      out = out.replace(re, function (m) { return slot('<span class="tok-key">' + m + '</span>'); });
    }

    // 还原占位符
    out = out.replace(/\u0000T\d+\u0000/g, function (m) { return tokenSlots[m] || ''; });
    return out;
  }

  /* ------------------------------ 行内解析 ------------------------------ */
  function inline(text) {
    let s = String(text == null ? '' : text);

    // 行内代码优先抽出（内部不再解析其他语法）
    const codeSlots = [];
    s = s.replace(/`([^`]+)`/g, function (m, code) {
      const i = codeSlots.push('<code>' + code + '</code>') - 1;
      return '\u0001' + i + '\u0001';
    });

    s = escapeHtml(s);

    // 图片 ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (m, alt, url, title) {
        const u = safeUrl(url);
        return '<img src="' + escapeAttr(u) + '" alt="' + escapeAttr(alt) +
               '" loading="lazy"' + (title ? ' title="' + escapeAttr(title) + '"' : '') + '>';
      });

    // 链接 [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g,
      function (m, label, url, title) {
        const u = safeUrl(url);
        const external = /^https?:/i.test(u);
        return '<a href="' + escapeAttr(u) + '"' +
               (external ? ' target="_blank" rel="noopener noreferrer"' : '') +
               (title ? ' title="' + escapeAttr(title) + '"' : '') + '>' + label + '</a>';
      });

    // 自动链接 &lt;https://...&gt;
    s = s.replace(/&lt;(https?:\/\/[^\s&]+)&gt;/g, function (m, url) {
      return '<a href="' + escapeAttr(url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });

    // 粗体 / 斜体 / 删除线
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, '$1<em>$2</em>');
    s = s.replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');

    // 换行
    s = s.replace(/ {2,}$/gm, '<br>');

    // 还原行内代码
    s = s.replace(/\u0001(\d+)\u0001/g, function (m, i) { return codeSlots[Number(i)]; });

    return s;
  }

  /* ------------------------------ 块级解析 ------------------------------ */
  function toHTML(src) {
    if (!src) return '<p class="prose-empty">（这个作品还没有写详细说明。）</p>';

    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;

    function isBlank(line) { return !line || !line.trim(); }

    while (i < lines.length) {
      let line = lines[i];

      // 空行
      if (isBlank(line)) { i++; continue; }

      // 代码块 ```
      const fence = line.match(/^\s*(```+|~~~+)\s*([\w+#-]*)\s*$/);
      if (fence) {
        const marker = fence[1].slice(0, 3);
        const lang = fence[2] || '';
        i++;
        const buf = [];
        while (i < lines.length && !new RegExp('^\\s*' + marker).test(lines[i])) {
          buf.push(lines[i]);
          i++;
        }
        i++; // 跳过结束围栏
        const code = buf.join('\n');
        out.push(
          '<pre' + (lang ? ' data-lang="' + escapeAttr(lang) + '"' : '') + '><code>' +
          (lang ? highlight(code, lang) : escapeHtml(code)) +
          '</code></pre>'
        );
        continue;
      }

      // 分割线
      if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
        out.push('<hr>');
        i++;
        continue;
      }

      // 标题
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        const level = Math.min(h[1].length, 6);
        const text = h[2].trim();
        out.push('<h' + level + ' id="' + escapeAttr(slugify(text)) + '">' + inline(text) + '</h' + level + '>');
        i++;
        continue;
      }

      // 引用
      if (/^\s*>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        out.push('<blockquote>' + toHTML(buf.join('\n')) + '</blockquote>');
        continue;
      }

      // 表格（| a | b |  +  |---|---|）
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        const parseRow = function (row) {
          return row.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
        };
        const head = parseRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(parseRow(lines[i]));
          i++;
        }
        let table = '<table><thead><tr>' +
          head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
          '</tr></thead><tbody>';
        rows.forEach(function (r) {
          table += '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
        });
        table += '</tbody></table>';
        out.push(table);
        continue;
      }

      // 无序列表
      if (/^\s*[-*+]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
          i++;
        }
        out.push('<ul>' + buf.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      // 有序列表
      if (/^\s*\d+[.)]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          buf.push(lines[i].replace(/^\s*\d+[.)]\s+/, ''));
          i++;
        }
        out.push('<ol>' + buf.map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ol>');
        continue;
      }

      // 缩进代码块（4 空格）
      if (/^ {4}\S/.test(line)) {
        const buf = [];
        while (i < lines.length && (/^ {4}/.test(lines[i]) || isBlank(lines[i]))) {
          buf.push(lines[i].replace(/^ {4}/, ''));
          i++;
        }
        out.push('<pre><code>' + escapeHtml(buf.join('\n').replace(/\n+$/, '')) + '</code></pre>');
        continue;
      }

      // 段落
      const buf = [];
      while (i < lines.length && !isBlank(lines[i]) &&
             !/^\s*(#{1,6}\s|>|[-*+]\s|\d+[.)]\s|```|~~~|\|)/.test(lines[i]) &&
             !/^\s*([-*_])\s*\1\s*\1/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      if (buf.length) out.push('<p>' + inline(buf.join('\n')) + '</p>');
      else i++;
    }

    return out.join('\n');
  }

  /* ------------------------------ 摘要提取 ------------------------------ */
  function excerpt(markdown, maxLen) {
    const limit = maxLen || 120;
    const plain = String(markdown || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/[*_~>|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plain.length > limit ? plain.slice(0, limit) + '…' : plain;
  }

  global.IDR = global.IDR || {};
  global.IDR.markdown = {
    toHTML: toHTML,
    inline: inline,
    excerpt: excerpt,
    escapeHtml: escapeHtml,
    highlight: highlight
  };
})(window);
