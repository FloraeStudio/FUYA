/* 委託頁：交稿排程 + 點方案篩選
   資料來自頁面內的 <script id="cm-data">（由 commission.yml 產生，只含可公開欄位）。
   有設定後台網址時改讀後台的 /api/public（deliveries）；讀不到就維持頁面內建的版本。 */
(function () {
  var dataEl = document.getElementById('cm-data');
  var root = document.getElementById('cm');
  if (!dataEl || !root) return;

  var data;
  try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var box = document.getElementById('cm-dl');
  var foot = document.getElementById('cm-foot');
  var hint = document.getElementById('cm-hint');
  var menu = document.getElementById('cm-menu');

  var typeName = {};
  (data.types || []).forEach(function (t) { typeName[t.key] = t.name; });

  var items = [];
  var filter = null;
  var WD = ['日', '一', '二', '三', '四', '五', '六'];

  var now = new Date();
  var todayNum = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;

  function toNum(s) {
    var p = s.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // 後台舊版沒有 deliveries 時，用 schedule 自己算（沒有預計交稿日就用交件日）
  function deliveriesOf(d) {
    if (Array.isArray(d.deliveries)) return d.deliveries;
    return (d.schedule || []).map(function (e) {
      return { id: e.id, type: e.type, date: e.end, note: e.note, done: !!e.done };
    });
  }

  function setData(d) {
    data = d;
    // 已完成的只留最近 14 天，之後自動退場
    var rows = deliveriesOf(d).filter(function (e) {
      return e && e.date && (!e.done || toNum(e.date) >= todayNum - 14);
    }).map(function (e) {
      return { kind: 'd', n: toNum(e.date), id: e.id, type: e.type, note: e.note || '', done: !!e.done };
    });
    // 休息日與備註：只列今天以後的，穿插在排程裡
    (d.marks || []).forEach(function (m) {
      var n = toNum(m.date);
      if (n < todayNum) return;
      var text = m.text || (m.rest ? '休息' : '');
      if (text) rows.push({ kind: 'm', n: n, text: text, rest: !!m.rest });
    });
    rows.sort(function (a, b) { return a.n - b.n || (a.kind === 'd' ? -1 : 1); });
    items = rows;
    if (hint) hint.hidden = !items.some(function (r) { return r.kind === 'd'; });
  }

  function rowHtml(r) {
    var dt = new Date(r.n * 86400000);
    var date = '<span class="cm-dd"><b>' + (dt.getUTCMonth() + 1) + '/' + dt.getUTCDate() + '</b><small>週' + WD[dt.getUTCDay()] + '</small></span>';
    if (r.kind === 'm') {
      return '<div class="cm-dr m' + (r.rest ? ' rest' : '') + '">' + date +
        '<span class="cm-dtx"><span class="cm-dnm">' + esc(r.text) + '</span></span></div>';
    }
    var diff = r.n - todayNum;
    var when = r.done ? '已完成' : diff === 0 ? '今天' : diff > 0 ? diff + ' 天後' : '';
    var name = esc(r.id) + (typeName[r.type] ? '<em>' + esc(typeName[r.type]) + '</em>' : '');
    return '<div class="cm-dr' + (r.done ? ' done' : '') + '" data-t="' + esc(r.type) + '">' + date +
      '<span class="cm-dtx"><span class="cm-dnm">' + name + '</span><span class="cm-ld"></span>' +
      (when ? '<span class="cm-dwh">' + when + '</span>' : '') +
      (r.note ? '<span class="cm-dnote">' + esc(r.note) + '</span>' : '') + '</span></div>';
  }

  function render() {
    var hasDelivery = items.some(function (r) { return r.kind === 'd'; });
    if (!hasDelivery) {
      box.innerHTML = '<p class="cm-none">目前沒有排程中的委託。</p>';
      if (foot) foot.hidden = true;
      applyFilter();
      return;
    }
    if (foot) foot.hidden = false;
    var html = '', curKey = '';
    items.forEach(function (r) {
      var dt = new Date(r.n * 86400000);
      // 日期已經過了的（還在進行，或剛完成），放在最前面的「近期」，不另外分月份
      var key = r.n < todayNum ? 'now' : dt.getUTCFullYear() + '-' + dt.getUTCMonth();
      if (key !== curKey) {
        if (curKey) html += '</div>';
        var head = key === 'now' ? '近期' : dt.getUTCFullYear() + ' · ' + (dt.getUTCMonth() + 1) + ' 月';
        html += '<div class="cm-mo"><div class="cm-mo-h">' + head + '</div>';
        curKey = key;
      }
      html += rowHtml(r);
    });
    box.innerHTML = html + '</div>';
    applyFilter();
  }

  function applyFilter() {
    root.classList.toggle('f', !!filter);
    var nodes = root.querySelectorAll('.cm-dr[data-t]');
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

  if (menu) {
    menu.addEventListener('click', function (e) {
      var it = e.target.closest ? e.target.closest('.cm-it') : null;
      if (!it) return;
      var t = it.getAttribute('data-t');
      filter = filter === t ? null : t;
      applyFilter();
    });
  }

  function renderChips(st) {
    var chips = document.getElementById('cm-chips');
    if (!chips || !st) return;
    var open = st.accepting_status === '開放中';
    var total = parseInt(st.slots_total, 10) || 0;
    var left = Math.max(0, Math.min(total, parseInt(st.slots_open, 10) || 0));
    var h = '<span class="cm-chip"><span class="cm-chip-dot' + (open ? '' : ' off') + '"></span>目前狀態：' + esc(st.accepting_status) + '</span>';
    if (total > 0) {
      var dots = '';
      for (var i = 0; i < total; i++) dots += '<i class="' + (i < left ? '' : 'e') + '"></i>';
      h += '<span class="cm-chip">本月名額 <span class="cm-slots" aria-hidden="true">' + dots + '</span> 剩 ' + left + ' / ' + total + '</span>';
    }
    if (st.wait_estimate) h += '<span class="cm-chip">預估排單等待：' + esc(st.wait_estimate) + '</span>';
    chips.innerHTML = h;
  }

  setData(data);
  render();

  // 有設定後台網址時，改讀即時資料；讀不到就維持頁面內建立的版本，排程不會壞掉。
  var apiBase = (root.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (apiBase && window.fetch) {
    fetch(apiBase + '/api/public', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.marks) || !(Array.isArray(d.deliveries) || Array.isArray(d.schedule))) throw new Error('bad shape');
        setData({ deliveries: d.deliveries, schedule: d.schedule, marks: d.marks, types: data.types });
        renderChips(d.settings);
        render();
      })
      .catch(function () { /* 後台暫時連不上：保留原本的資料 */ });
  }
})();
