/* 委託頁：排程月曆 + 點方案篩選
   資料來自頁面內的 <script id="cm-data">（由 commission.yml 產生，只含可公開欄位）。
   之後改成讀後台資料庫時，只要換掉下面 data 的來源即可。 */
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
  var events = [];
  var marksByDay = {};

  var now = new Date();
  var todayNum = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000;
  var cur = new Date(now.getFullYear(), now.getMonth(), 1);
  var filter = null;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function toNum(s) {
    var p = s.split('-');
    return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
  }
  function numToDate(n) { return new Date(n * 86400000); }
  function md(n) { var d = numToDate(n); return pad(d.getUTCMonth() + 1) + '/' + pad(d.getUTCDate()); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function setData(d) {
    data = d;
    hasAny = data.schedule.length > 0;
    if (hint) hint.hidden = !hasAny;
    events = data.schedule.map(function (e) {
      return { id: e.id, type: e.type, s: toNum(e.start), e: toNum(e.end), done: e.done, note: e.note };
    }).filter(function (e) { return e.e >= e.s; })
      .sort(function (a, b) { return a.s - b.s || (b.e - b.s) - (a.e - a.s); });
    marksByDay = {};
    data.marks.forEach(function (m) {
      var n = toNum(m.date);
      (marksByDay[n] = marksByDay[n] || []).push(m);
    });
  }

  function weekSegments(ws) {
    // 這一週與哪些委託重疊，並分配不重疊的橫排（lane）
    var segs = [];
    events.forEach(function (ev) {
      if (ev.e < ws || ev.s > ws + 6) return;
      segs.push({
        ev: ev,
        c1: Math.max(ev.s, ws) - ws,
        c2: Math.min(ev.e, ws + 6) - ws,
        first: ev.s >= ws,
        last: ev.e <= ws + 6
      });
    });
    var lanes = [];
    segs.forEach(function (sg) {
      var placed = false;
      for (var i = 0; i < lanes.length && !placed; i++) {
        var clash = lanes[i].some(function (o) { return !(sg.c2 < o.c1 || sg.c1 > o.c2); });
        if (!clash) { lanes[i].push(sg); sg.lane = i; placed = true; }
      }
      if (!placed) { sg.lane = lanes.length; lanes.push([sg]); }
    });
    return { segs: segs, laneCount: lanes.length };
  }

  function render() {
    var y = cur.getFullYear(), m = cur.getMonth();
    title.textContent = y + ' · ' + (m + 1) + ' 月';

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
      var info = weekSegments(ws);
      var minH = Math.max(88, 34 + info.laneCount * 26 + 26);

      var cells = '';
      var weekMarks = [];
      for (var c = 0; c < 7; c++) {
        var dn = ws + c;
        var inMonth = dn >= first && dn <= monthEnd;
        var cls = 'cm-c' + (inMonth ? '' : ' o') + (dn === todayNum ? ' t' : '');
        var ms = marksByDay[dn] || [];
        var isRest = ms.some(function (x) { return x.rest; });
        if (isRest) cls += ' r';
        var txt = ms.map(function (x) { return x.text; }).filter(Boolean).join('、') || (isRest ? '休息' : '');
        if (inMonth && ms.length) weekMarks.push({ dn: dn, text: txt, rest: isRest });
        cells += '<div class="' + cls + '"><span class="n">' + new Date(dn * 86400000).getUTCDate() + '</span>' +
          (txt ? '<div class="tx">' + esc(txt) + '</div>' : '') + '</div>';
      }

      var bars = '';
      var listItems = '';
      info.segs.forEach(function (sg) {
        var ev = sg.ev;
        // 只在這個月有重疊時才算「本月有排程」
        if (ev.e >= first && ev.s <= monthEnd) monthHasEvent = true;
        var label = sg.first ? ev.id + (typeName[ev.type] ? ' ' + typeName[ev.type] : '') : ev.id + ' …';
        bars += '<div class="cm-bar' + (ev.done ? ' done' : '') + '" data-t="' + esc(ev.type) + '" title="' +
          esc(ev.note) + '" style="grid-column:' + (sg.c1 + 1) + ' / ' + (sg.c2 + 2) + ';grid-row:' + (sg.lane + 1) + '">' +
          '<span class="lb">' + esc(label) + '</span>' + (sg.last ? '<i></i>' : '') + '</div>';

        if (ev.e >= first && ev.s <= monthEnd) {
          listItems += '<div class="cm-li' + (ev.done ? ' done' : '') + '" data-t="' + esc(ev.type) + '">' +
            '<span class="cm-li-dot"></span><span class="cm-li-nm">' + esc(ev.id) +
            (typeName[ev.type] ? '<em>' + esc(typeName[ev.type]) + '</em>' : '') + '</span>' +
            '<span class="cm-li-d">' + (sg.last ? md(ev.e) + ' 交件' : '進行中') + '</span>' +
            (ev.note ? '<span class="cm-li-note">' + esc(ev.note) + '</span>' : '') + '</div>';
        }
      });

      gridHtml += '<div class="cm-wk" style="min-height:' + minH + 'px"><div class="cm-row">' + cells + '</div>' +
        (bars ? '<div class="cm-bars">' + bars + '</div>' : '') + '</div>';

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
        ? (monthHasEvent ? '橫條右端亮起的星點，是預計交件日' : '這個月沒有排程中的委託')
        : '目前沒有排程中的委託';
    }
    applyFilter();
  }

  function applyFilter() {
    root.classList.toggle('f', !!filter);
    var nodes = root.querySelectorAll('.cm-bar, .cm-li');
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
    cur = new Date(cur.getFullYear(), cur.getMonth() - 1, 1); render();
  });
  document.getElementById('cm-next').addEventListener('click', function () {
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); render();
  });

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
    var box = document.getElementById('cm-chips');
    if (!box || !st) return;
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
    box.innerHTML = h;
  }

  setData(data);
  render();

  // 有設定後台網址時，改讀即時資料；讀不到就維持頁面內建立的版本，月曆不會壞掉。
  var apiBase = (root.getAttribute('data-api') || '').replace(/\/+$/, '');
  if (apiBase && window.fetch) {
    fetch(apiBase + '/api/public', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
      .then(function (d) {
        if (!d || !Array.isArray(d.schedule) || !Array.isArray(d.marks)) throw new Error('bad shape');
        setData({ schedule: d.schedule, marks: d.marks, types: data.types });
        renderChips(d.settings);
        render();
      })
      .catch(function () { /* 後台暫時連不上：保留原本的資料 */ });
  }
})();