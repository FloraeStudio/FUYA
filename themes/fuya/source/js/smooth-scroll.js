/* ------------------------------------------------
   smooth-scroll.js — 慣性滾動（用 Lenis，MIT 授權，檔案在 js/vendor/）
   滑鼠滾輪捲動時有慣性、會「飄」一下才停；手機維持原生觸控捲動。
   系統設定「減少動態效果」時不啟用。
------------------------------------------------ */
(function () {
  if (typeof Lenis === 'undefined') return;

  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var lenis = null;

  function start() {
    if (lenis || mq.matches) return;
    lenis = new Lenis({
      lerp: 0.085,             // 越小越飄、停得越慢（0.05–0.12 之間調）
      smoothWheel: true,
      anchors: true,           // #錨點連結也用滑順捲動
      allowNestedScroll: true, // 月曆等可橫向捲動的區塊照常運作
      autoRaf: true
    });
    window.fuyaLenis = lenis;
  }

  function stop() {
    if (!lenis) return;
    lenis.destroy();
    lenis = null;
    window.fuyaLenis = null;
  }

  start();

  var onChange = function () { if (mq.matches) stop(); else start(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();
