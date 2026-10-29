/* Leitfaden „Vorher wissen“: schaltet jeden Teil an seinem Erscheinungstag frei und reicht
   Kampagnenwerte an Links mit data-keep-utm weiter (wie assets/app.js). Keine Speicherung. */
(function () {
  'use strict';
  // Erscheinungstage, freigeschaltet ab 0:00 Uhr deutscher Zeit. Termine nur hier ändern.
  var TEILE = {
    1: { ab: '2026-11-05', pdf: '/leitfaden/pdf/vorher-wissen-teil-1-reicht-unser-geld.pdf' },
    2: { ab: '2026-11-12', pdf: '/leitfaden/pdf/vorher-wissen-teil-2-ist-es-das-richtige-haus.pdf' },
    3: { ab: '2026-11-19', pdf: '/leitfaden/pdf/vorher-wissen-teil-3-wie-schaffen-wir-den-umbau.pdf' },
    4: { ab: '2026-11-26', pdf: '/leitfaden/pdf/vorher-wissen-teil-4-wie-kommen-wir-gut-an.pdf' }
  };
  var now = Date.now();
  function each(root, selector, fn) { Array.prototype.forEach.call(root.querySelectorAll(selector), fn); }

  each(document, '[data-teil]', function (box) {
    var teil = TEILE[box.getAttribute('data-teil')];
    if (!teil) return;
    var start = new Date(teil.ab + 'T00:00:00+01:00');
    var open = now >= start.getTime();
    // Tag und Monat bleiben in einer Zeile („19. November“).
    var lang = start.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }).replace(/(\d+\.) /, '$1\u00a0');
    var kurz = start.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }).replace(/(\d+\.) /, '$1\u00a0');
    each(box, '[data-datum]', function (el) {
      el.textContent = el.getAttribute('data-datum') === 'kurz' ? kurz : lang;
      el.setAttribute('datetime', teil.ab);
    });
    each(box, '[data-soon]', function (el) { el.hidden = open; });
    each(box, '[data-open]', function (el) { el.hidden = !open; });
    if (open) each(box, 'a[data-pdf]', function (a) { a.href = teil.pdf; });
  });

  // Nur utm_* mit a-z, 0-9, _ und -, wie auf /app/. Ohne Werte bleibt das Ziel unverändert.
  var query = new URLSearchParams(location.search), campaign = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (key) {
    var value = query.get(key);
    if (value && /^[a-z0-9_-]{1,80}$/.test(value)) campaign.set(key, value);
  });
  if (campaign.toString()) {
    each(document, 'a[data-keep-utm]', function (link) {
      link.href = link.pathname + '?' + campaign.toString() + link.hash;
    });
  }
})();
