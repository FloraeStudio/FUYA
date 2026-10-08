#!/usr/bin/env node
'use strict';

// 建置前從後台把文章抓下來，寫成 Hexo 認得的 .md 檔放進 source/_posts/。
//   node tools/fetch-posts.js
//
// 後台網址的來源（依序）：環境變數 FUYA_ADMIN_URL → source/_data/commission.yml 裡的 api_url。
// 這支檔案刻意放在 tools/ 而不是 scripts/：Hexo 會自動執行 scripts/ 裡的每個檔案。
//
// 安全設計：
//  - 抓不到後台（斷線、後台掛掉）→ 不動現有檔案，用 repo 裡既有的文章繼續建置（會印出警告）。
//    如果設了 REQUIRE_POSTS=1，改成直接讓建置失敗。
//  - 後台回傳 0 篇，或比現有少一半以上 → 拒絕覆蓋並讓建置失敗，避免資料異常時把網站清空。
//    確定要這樣做時加 FORCE_POSTS=1。

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'source', '_posts');
const FOLDERS = { 企劃: 'projects', 轉蛋: 'gacha', 委託: 'commission', 雜談: 'misc' };

function adminUrl() {
  if (process.env.FUYA_ADMIN_URL) return process.env.FUYA_ADMIN_URL.replace(/\/+$/, '');
  try {
    const yml = fs.readFileSync(path.join(ROOT, 'source', '_data', 'commission.yml'), 'utf8');
    const m = yml.match(/^api_url:\s*['"]?([^'"\s#]*)['"]?/m);
    if (m && m[1]) return m[1].replace(/\/+$/, '');
  } catch (e) {}
  return '';
}

const q = (s) => JSON.stringify(String(s)); // JSON 字串同時是合法的 YAML 雙引號字串
function taipeiIso(iso) {
  const d = new Date(Date.parse(iso) + 8 * 3600000).toISOString(); // 2026-09-09T15:22:00.000Z
  return d.replace('Z', '+08:00');
}

// cat：這一份文章要放進哪個分類。文章如果設了「同時顯示在」，每個分類各產生一份（內容相同，只有分類不同）。
function frontMatter(p, cat) {
  const m = p.meta || {};
  const L = ['---', 'title: ' + q(p.title), 'date: ' + taipeiIso(p.date)];
  if (p.pin) L.push('pin: true');
  L.push('categories:', '  - ' + cat);
  if (cat === '企劃') {
    L.push('is_series: ' + (m.is_series ? 'true' : 'false'));
    if (m.status) L.push('status: ' + q(m.status));
    if (m.project_group) L.push('project_group: ' + q(m.project_group));
  }
  if (cat === '委託' && m.plan_tier) L.push('plan_tier: ' + q(m.plan_tier));
  if (m.description) L.push('description: ' + q(m.description));
  if (m.tags && m.tags.length) L.push('tags:', ...m.tags.map((t) => '  - ' + q(t)));
  if (m.notices && m.notices.length) L.push('notices:', ...m.notices.map((t) => '  - ' + q(t)));
  if (m.links && m.links.length) L.push('links:', ...m.links.flatMap((l) => ['  - label: ' + q(l.label), '    url: ' + q(l.url)]));
  if (m.cover) L.push('cover: ' + q(m.cover));
  L.push('---');
  return L.join('\n');
}

function countExisting() {
  let n = 0;
  for (const f of Object.values(FOLDERS)) {
    const dir = path.join(POSTS_DIR, f);
    if (fs.existsSync(dir)) n += fs.readdirSync(dir).filter((x) => x.endsWith('.md')).length;
  }
  return n;
}

function bail(msg, hard) {
  console.error((hard ? '✗ ' : '！') + msg);
  process.exit(hard ? 1 : 0);
}

(async () => {
  const base = adminUrl();
  const hard = process.env.REQUIRE_POSTS === '1';
  if (!base) return bail('沒有設定後台網址（FUYA_ADMIN_URL 或 commission.yml 的 api_url），略過抓文章，沿用 repo 裡的文章。', hard);

  let data;
  try {
    const res = await fetch(base + '/api/posts?t=' + Date.now(), { signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
    if (!data || !Array.isArray(data.posts)) throw new Error('回傳格式不正確');
  } catch (e) {
    return bail('連不上後台（' + e.message + '），沿用 repo 裡的文章。', hard);
  }

  const files = [];
  const seen = new Set();
  for (const p of data.posts) {
    const cats = [...new Set([p.category, ...((p.meta && p.meta.also_in) || [])])];
    for (const cat of cats) {
      const folder = FOLDERS[cat];
      if (!folder) { console.warn('！略過未知分類：' + cat + '／' + p.title); continue; }
      const key = folder + '/' + p.slug;
      if (seen.has(key) || /[\/\\]|^\./.test(p.slug)) { console.warn('！略過重複或不合法的網址名稱：' + key); continue; }
      seen.add(key);
      files.push({ folder, name: p.slug + '.md', text: frontMatter(p, cat) + '\n' + p.body.replace(/\r\n/g, '\n') + '\n' });
    }
  }

  // 固定順序寫入：Hexo 依檔案處理順序建立標籤，順序固定才能讓每次建置的標籤排列一致
  files.sort((a, b) => (a.folder + '/' + a.name < b.folder + '/' + b.name ? -1 : 1));

  const existing = countExisting();
  if (process.env.FORCE_POSTS !== '1') {
    if (files.length === 0) return bail('後台回傳 0 篇文章，為了安全不覆蓋現有文章。確定要清空請加 FORCE_POSTS=1。', true);
    if (existing >= 4 && files.length < existing / 2) {
      return bail('後台只有 ' + files.length + ' 篇，但現有有 ' + existing + ' 篇，差太多，為了安全不覆蓋。確定的話請加 FORCE_POSTS=1。', true);
    }
  }

  for (const f of Object.values(FOLDERS)) {
    const dir = path.join(POSTS_DIR, f);
    fs.mkdirSync(dir, { recursive: true });
    fs.readdirSync(dir).filter((x) => x.endsWith('.md')).forEach((x) => fs.unlinkSync(path.join(dir, x)));
  }
  files.forEach((f) => fs.writeFileSync(path.join(POSTS_DIR, f.folder, f.name), f.text));
  console.log('✓ 已從後台寫入 ' + files.length + ' 篇文章（原本 ' + existing + ' 篇）。');
})();
