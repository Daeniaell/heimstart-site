/* Öffentliche Download-Ziele für die ganze Website.
   pt: Anbieterkürzel aus App Store Connect (Analysen, Kampagnen); erst damit wertet Apple ct aus. */
window.HEIMSTART_STORES = {
  apple:  { live: true, url: 'https://apps.apple.com/de/app/heimstart-haus-umzug-geld/id6809733214', pt: null },
  google: { live: true, url: 'https://play.google.com/store/apps/details?id=com.aistudio.movemaster.app.dcbcae' }
};

/* Kampagne bis in den Store: utm-Werte der aufgerufenen Seite gehen als referrer an Google Play
   und als ct an Apple. Nichts wird gespeichert; ohne utm_campaign bleiben die Ziele unverändert.
   Die Badges bekommen dieselben Ziele, damit analytics.js Store-Klicks weiter erkennt. */
(function (s) {
  var q = new URLSearchParams(location.search), utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (k) {
    var v = q.get(k);
    if (v && /^[a-z0-9_-]{1,80}$/.test(v)) utm[k] = v;
  });
  if (utm.utm_campaign) {
    var g = new URL(s.google.url), a = new URL(s.apple.url);
    g.searchParams.set('referrer', new URLSearchParams(utm).toString());
    a.searchParams.set('ct', [utm.utm_source, utm.utm_campaign].filter(Boolean).join('-').slice(0, 100));
    if (s.apple.pt) { a.searchParams.set('pt', s.apple.pt); a.searchParams.set('mt', '8'); }
    s.google.url = g.toString();
    s.apple.url = a.toString();
  }
  Array.prototype.forEach.call(document.querySelectorAll('a[data-store]'), function (el) {
    var t = s[el.getAttribute('data-store')];
    if (t && t.live) el.href = t.url;
  });
})(window.HEIMSTART_STORES);
