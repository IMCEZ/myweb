#!/usr/bin/env node
/* ==========================================================================
   把 assets/data/site.json 与 assets/data/data.json 内联进
   assets/js/data-embedded.js

   为什么需要：直接双击打开 HTML（file:// 协议）时，浏览器出于安全策略
   会拦截 fetch 本地 JSON 文件。这个生成文件让站点在零服务器的情况下
   依然能显示完整内容。

   用法：node tools/build-embedded.mjs
   （admin.html 里点「保存」时会自动同时更新这个文件）
   ========================================================================== */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const sitePath = resolve(root, 'assets/data/site.json');
const dataPath = resolve(root, 'assets/data/data.json');
const outPath = resolve(root, 'assets/js/data-embedded.js');

/** 把任意字符串安全地序列化为可嵌入 <script> 的 JS 字面量 */
function toJS(value) {
  return JSON.stringify(value, null, 2)
    .replace(/<\/(script)/gi, '<\\/$1')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const [siteRaw, dataRaw] = await Promise.all([
  readFile(sitePath, 'utf8'),
  readFile(dataPath, 'utf8')
]);

const site = JSON.parse(siteRaw);
const data = JSON.parse(dataRaw);

const payload = {
  site,
  data,
  generatedAt: data.updatedAt || new Date().toISOString()
};

const out = `/* 自动生成：由 tools/build-embedded.mjs 把 assets/data/*.json 内联为可用数据。
   用途：直接用 file:// 双击打开页面时，浏览器禁止 fetch 本地 JSON，
        这个文件就是它的替代数据源（内容与 JSON 完全一致）。
   注意：请勿手改。改内容请用 admin.html 保存，或改 assets/data/*.json 后重新生成。 */
window.IDR_EMBEDDED = ${toJS(payload)};
`;

await writeFile(outPath, out, 'utf8');

const projectCount = Array.isArray(data.projects) ? data.projects.length : 0;
console.log('✔ 已生成 assets/js/data-embedded.js');
console.log('  · 作品数量：' + projectCount);
console.log('  · 数据时间：' + payload.generatedAt);
console.log('  · 文件大小：' + (Buffer.byteLength(out, 'utf8') / 1024).toFixed(1) + ' KB');
