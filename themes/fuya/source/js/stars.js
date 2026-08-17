/* ------------------------------------------------
   stars.js — 背景星空
   在 #stars 容器裡動態灑一批會明滅的星星
------------------------------------------------ */
(function () {
  var container = document.getElementById('stars');
  if (!container) return;

  var count = window.innerWidth < 640 ? 40 : 80;
  var frag = document.createDocumentFragment();

  for (var i = 0; i < count; i++) {
    var s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';

    var size = (Math.random() * 1.5 + 1).toFixed(2);
    s.style.width = size + 'px';
    s.style.height = size + 'px';

    frag.appendChild(s);
  }

  container.appendChild(frag);
})();
