/* /app/: auf dem Handy direkt in den passenden Store, die Kampagne setzt stores.js dazu.
   Am Rechner bleibt die Auswahl stehen; der Weg zum Rechner behält die utm-Werte. */
(function () {
  var s = window.HEIMSTART_STORES || {}, ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var target = ios ? s.apple : /Android/.test(ua) ? s.google : null;
  Array.prototype.forEach.call(document.querySelectorAll('a[data-keep-utm]'), function (a) {
    a.href = a.pathname + location.search + a.hash;
  });
  if (target && target.live) location.replace(target.url);
})();
