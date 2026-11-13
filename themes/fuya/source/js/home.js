/* ------------------------------------------------
   home.js
   1. 首頁櫥窗：點吊燈、蛋糕罩、花束、牌子會有反應（只切換 class，動畫在 shop.css）
   2. 接單狀態列：有設定後台網址時，載入後改讀即時資料；讀不到就維持頁面內建的內容
------------------------------------------------ */
(function () {
  // ---------- 櫥窗 ----------
  var stage = document.getElementById('stage');
  if (stage) {
    var flip = function (a, b) {
      // 在 -a / -b 之間輪流切換，讓同一個動畫可以連續觸發
      var on = stage.classList.contains(a);
      stage.classList.remove(a, b);
      stage.classList.add(on ? b : a);
    };
    stage.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.hit') : null;
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      if (act === 'lamp') {
        var off = stage.classList.toggle('lamp-off');
        btn.setAttribute('aria-pressed', off ? 'false' : 'true');
      } else if (act === 'dome') {
        var open = stage.classList.toggle('dome-open');
        btn.setAttribute('aria-pressed', open ? 'true' : 'false');
      } else if (act === 'vase') {
        flip('vase-a', 'vase-b');
      } else if (act === 'sign') {
        stage.classList.remove('sign-load');
        flip('sign-a', 'sign-b');
      }
    });
  }

  // ---------- 狀態列 ----------
  var box = document.getElementById('cm-chips');
  var apiBase = box ? (box.getAttribute('data-api') || '').replace(/\/+$/, '') : '';
  if (!box || !apiBase || !window.fetch) return;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function render(st) {
    var open = st.accepting_status === '開放中';
    var total = parseInt(st.slots_total, 10) || 0;
    var left = Math.max(0, Math.min(total, parseInt(st.slots_open, 10) || 0));
    var h = '<span class="cm-chip"><i class="cm-dot' + (open ? '' : ' off') + '"></i><span class="cm-k">目前狀態</span><span class="cm-v">' + esc(st.accepting_status) + '</span></span>';
    if (total > 0) {
      var flowers = '';
      for (var i = 0; i < total; i++) {
        flowers += '<svg width="22" height="22"' + (i < left ? '' : ' class="e"') + '><use href="#flw"/></svg>';
      }
      h += '<span class="cm-chip"><span class="cm-k">本月名額</span><span class="cm-slots" aria-hidden="true">' + flowers + '</span><span class="cm-v">剩 ' + left + ' / ' + total + '</span></span>';
    }
    if (st.wait_estimate) {
      h += '<span class="cm-chip"><span class="cm-k">預估排單等待</span><span class="cm-v">' + esc(st.wait_estimate) + '</span></span>';
    }
    box.innerHTML = h;
  }

  fetch(apiBase + '/api/public', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('bad status'); return r.json(); })
    .then(function (d) { if (d && d.settings && d.settings.accepting_status) render(d.settings); })
    .catch(function () { /* 後台暫時連不上：保留頁面內建的內容 */ });
})();
