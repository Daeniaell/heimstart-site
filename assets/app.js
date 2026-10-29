/* Nur /app/: passende Store-Auswahl, ohne Speicherung oder neue Messung. */
(function () {
  'use strict';
  var stores = window.HEIMSTART_STORES || {};
  var query = new URLSearchParams(location.search), campaign = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(function (key) {
    var value = query.get(key);
    if (value && /^[a-z0-9_-]{1,80}$/.test(value)) campaign.set(key, value);
  });

  function storeUrl(name) {
    var store = stores[name];
    if (!store || store.live !== true) return null;
    var url = new URL(store.url);
    if (campaign.has('utm_campaign')) {
      if (name === 'google') url.searchParams.set('referrer', campaign.toString());
      else {
        url.searchParams.set('ct', [campaign.get('utm_source'), campaign.get('utm_campaign')].filter(Boolean).join('-').slice(0, 30));
        if (store.pt) {
          url.searchParams.set('pt', store.pt);
          url.searchParams.set('mt', '8');
        }
      }
    }
    return url.toString();
  }

  Array.prototype.forEach.call(document.querySelectorAll('a[data-store]'), function (link) {
    var target = storeUrl(link.getAttribute('data-store'));
    if (target) link.href = target;
  });
  Array.prototype.forEach.call(document.querySelectorAll('a[data-keep-utm]'), function (link) {
    link.href = link.pathname + (campaign.toString() ? '?' + campaign.toString() : '') + link.hash;
  });

  var ua = navigator.userAgent || '';
  var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var target = ios ? storeUrl('apple') : /Android/i.test(ua) ? storeUrl('google') : null;
  if (target) location.replace(target);
})();
