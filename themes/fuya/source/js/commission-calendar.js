/* 委託頁：排程月曆 + 點方案篩選
   月曆上不畫長條，只在「預計交稿日」那一天放一個標記（星點 + 你設定的單號或代稱）。
   資料來自頁面內的 <script id="cm-data">（由 commission.yml 產生，只含可公開欄位）；
   有設定後台網址時改讀後台的 /api/public，讀不到就維持頁面內建的版本。 */
(function () {
  var dataEl = document.getElementById('cm-data');
  var root = document.getElementById('cm');
  if (!dataEl || !root) return;

  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var grid = document.getElementById('cm-grid');
  var list = document.getElementById('cm-list');
  var title = document.getElementById('cm-title');
  var foot = document.getElementById('cm-foot');
  var hint = document.getElementById('cm-hint');
  var menu = document.getElementById('cm-menu');

  var typeName = {};
  (data.types || []).forEach(function (t) { typeName[t.key] = t.name; });

  var hasAny = false;
  var byDay = {};      // 日數 → 那天預計交稿的委託
  var marksByDay = {}; // 日數 → 休息日／備註

  var now = new Date();
  var todayNum = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
  var cur = new Date(now.getFullYear(), now.getMonth(), 1);
  var filter = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toNum(s) {
    var p = s.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
  }
  function md(n) { var d = new Date(n * 86400000); return pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate()); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // 後台舊版沒有 deliveries 時，用 schedule 自己算（預計交稿日就是 end）
  function deliveriesOf(d) {
    if (Array.isArray(d.deliveries)) return d.deliveries;
    return (d.schedule || []).map(function (e) {
      return { id: e.id, type: e.type, date: e.end, note: e.note, done: !!e.done };
    });
  }

  function setData(d) {
    data = d;
    byDay = {};
    marksByDay = {};
    hasAny = false;
    // 已完成的只留最近 14 天，之後自動退場
    deliveriesOf(d).forEach(function (e) {
      if (!e || !e.date) return;
      var n = toNum(e.date);
      hasAny = true;
      (byDay[n] = byDay[n] || []).push({ id: e.id, type: e.type, note: e.note || '', done: !!e.done, n: n });
    });
    (d.marks || []).forEach(function (m) {
      var n = toNum(m.date);
      (marksByDay[n] = marksByDay[n] || []).push(m);
    });
    if (hint) hint.hidden = !hasAny;
  }

  var FLOWER = '<svg width="14" height="14" aria-hidden="true"><use href="#flw"/></svg>';

  // 標記上的文字：單號或代稱（有填才顯示）+ 方案名稱 + 已完成
  function labelOf(ev) {
    return (ev.id ? esc(ev.id) + '　' : '') + esc(typeName[ev.type] || '') + (ev.done ? '　已完成' : '');
  }

  function markHtml(ev) {
    return '<div class="cm-mk' + (ev.done ? ' done' : '') + '" data-t="' + esc(ev.type) + '">' + FLOWER + '<span>' + labelOf(ev) + '</span></div>';
  }

  // 在 -a / -b 之間輪流切換 class，讓同一個動畫可以連續觸發
  function replay(prefix) {
    var on = root.classList.contains(prefix + '-a');
    root.classList.remove(prefix + '-a', prefix + '-b');
    root.classList.add(prefix + (on ? '-b' : '-a'));
  }

  function render() {
    var y = cur.getFullYear(), m = cur.getMonth();
    title.textContent = y + ' 年 ' + (m + 1) + ' 月';

    var first = Date.UTC(y, m, 1) / 86400000;
    var daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var offset = new Date(Date.UTC(y, m, 1)).getUTCDay();
    var weeks = Math.ceil((offset + daysIn) / 7);
    var monthEnd = first + daysIn - 1;

    var gridHtml = '';
    var listHtml = '';
    var monthHasEvent = false;

    for (var w = 0; w < weeks; w++) {
      var ws = first - offset + w * 7;
      var cells = '';
      var listItems = '';
      var weekMarks = [];

      for (var c = 0; c < 7; c++) {
        var dn = ws + c;
        var inMonth = dn >= first && dn <= monthEnd;
        var cls = 'cm-c' + (inMonth ? '' : ' o') + (dn === todayNum ? ' t' : '');
        var ms = marksByDay[dn] || [];
        var isRest = ms.some(function (x) { return x.rest; });
        if (isRest) cls += ' r';
        var txt = ms.map(function (x) { return x.text; }).filter(Boolean).join('、');
        if (inMonth && ms.length) weekMarks.push({ dn: dn, text: txt, rest: isRest });

        var evs = inMonth ? (byDay[dn] || []) : [];
        var marks = '';
        evs.forEach(function (ev) {
          monthHasEvent = true;
          marks += markHtml(ev);
          listItems += '<div class="cm-li' + (ev.done ? ' done' : '') + '" data-t="' + esc(ev.type) + '">' +
            FLOWER + '<span class="cm-li-nm">' + labelOf(ev) + '</span>' +
            '<span class="cm-li-d">' + md(ev.n) + ' 交稿</span></div>';
        });

        cells += '<div class="' + cls + '"><span class="n">' + new Date(dn * 86400000).getUTCDate() +
          '</span>' +
          marks +
          (txt ? '<div class="tx">' + esc(txt) + '</div>' : '') + '</div>';
      }

      gridHtml += '<div class="cm-wk"><div class="cm-row">' + cells + '</div></div>';

      if (listItems || weekMarks.length) {
        var from = Math.max(ws, first), to = Math.min(ws + 6, monthEnd);
        listHtml += '<div class="cm-lw"><div class="cm-lw-h">' + md(from) + ' – ' + md(to) + '</div>' + listItems +
          weekMarks.map(function (x) {
            return '<div class="cm-lm' + (x.rest ? ' rest' : '') + '"><span>' + md(x.dn) + '</span>' + esc(x.text) + '</div>';
          }).join('') + '</div>';
      }
    }

    grid.innerHTML = gridHtml;
    list.innerHTML = listHtml || '<p class="cm-none">這個月沒有排程。</p>';
    if (foot) {
      foot.textContent = hasAny
        ? (monthHasEvent ? '花朵標在預計交稿日，只顯示單號或代稱。' : '這個月沒有預計交稿的委託')
        : '目前沒有排程中的委託';
    }
    applyFilter();
  }

  function applyFilter(replayPop) {
    root.classList.toggle('f', !!filter);
    if (replayPop && filter) replay('p');
    var nodes = root.querySelectorAll('.cm-mk, .cm-li');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('on', nodes[i].getAttribute('data-t') === filter);
    }
    if (menu) {
      menu.classList.toggle('f', !!filter);
      var its = menu.querySelectorAll('.cm-it');
      for (var j = 0; j < its.length; j++) {
        var on = its[j].getAttribute('data-t') === filter;
        its[j].classList.toggle('on', on);
        its[j].setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    }
  }

  document.getElementById('cm-prev').addEventListener('click', function () {
    cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); render(); replay('m');
  });
  document.getElementById('cm-next').addEventListener('click', function () {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); render(); replay('m');
  });

  if (menu) {
    menu.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('.cm-it') : null;
      if (!it) return;
      var t = it.getAttribute('data-t');
      filter = filter === t ? null : t;
      applyFilter(true);
    });
  }

  setData(data);
  render();

  // 有設定後台網址時，改讀即時資料；讀不到就維持頁面內建立的版本，月曆不會壞掉。
  var apiBase = (root.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (apiBase && window.fetch) {
    fetch(apiBase + '/api/public', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.marks) || !(Array.isArray(d.deliveries) || Array.isArray(d.schedule))) throw new Error('bad shape');
        setData({ deliveries: d.deliveries, schedule: d.schedule, marks: d.marks, types: data.types });
        render();
      })
      .catch(function () { /* 後台暫時連不上：保留原本的資料 */ });
  }
})();