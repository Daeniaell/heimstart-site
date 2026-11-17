/* GA4: optional website measurement. Calculator values stay in the browser. */
(function () {
  'use strict';
  var ID = 'G-01YZWB98V1';
  var KEY = 'heimstart_analytics_v1';
  var disabled = 'ga-disable-' + ID;
  var started = false;
  var calculatorUsed = false;
  var choice = readChoice();
  var base = document.currentScript.src;
  var privacyURL = new URL('../datenschutz/#webseite', base).href;
  window[disabled] = true;

  function readChoice() {
    var match = document.cookie.match(/(?:^|;\s*)heimstart_analytics_v1=(accepted|rejected)(?:;|$)/);
    return match ? match[1] : '';
  }
  function cleanURL(value) {
    try { var url = new URL(value); return url.origin + url.pathname; }
    catch (_) { return ''; }
  }
  function start() {
    window[disabled] = false;
    if (started) return;
    started = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', { analytics_storage: 'granted' });
    window.gtag('js', new Date());
    window.gtag('config', ID, {
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_expires: 5184000,
      page_location: cleanURL(location.href), page_referrer: cleanURL(document.referrer),
      debug_mode: new URL(location.href).searchParams.get('ga_debug') === '1'
    });
    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(tag);
  }
  function clearAnalyticsCookies() {
    var names = document.cookie.split(';').map(function (item) { return item.trim().split('=')[0]; });
    var domains = [location.hostname, '.' + location.hostname, '.heimstart.de'];
    names.filter(function (name) { return name === '_ga' || name.indexOf('_ga_') === 0; }).forEach(function (name) {
      document.cookie = name + '=; Max-Age=0; Path=/';
      domains.forEach(function (domain) { document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + domain; });
    });
  }
  function decide(next) {
    if (window.HEIMSTART_ADS) window.HEIMSTART_ADS.decide(panel.querySelector('[data-ads-choice]').checked);
    choice = next;
    document.cookie = KEY + '=' + next + '; Max-Age=15552000; Path=/; SameSite=Lax; Secure';
    if (next === 'accepted') start();
    else { window[disabled] = true; clearAnalyticsCookies(); }
    panel.hidden = true;
    settings.focus({ preventScroll: true });
  }
  function send(name, params) {
    if (window.HEIMSTART_ADS && name === 'store_click') window.HEIMSTART_ADS.send(name, params.store_name);
    if (window.HEIMSTART_ADS && name === 'leitfaden_download') window.HEIMSTART_ADS.send(name, 'teil-' + params.teil);
    if (choice !== 'accepted' || window[disabled] || !window.gtag) return false;
    window.gtag('event', name, Object.assign({ send_to: ID }, params));
    return true;
  }

  var sheet = document.createElement('link');
  sheet.rel = 'stylesheet'; sheet.href = new URL('analytics.css?v=20261117', base).href;
  document.head.appendChild(sheet);
  var panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'analytics-choice-title');
  panel.innerHTML = '<h2 id="analytics-choice-title">Deine Datenschutzauswahl</h2>' +
    '<p>Beides ist freiwillig. Deine Rechner-Eingaben bleiben im Browser. Du kannst jederzeit über „Datenschutzeinstellungen“ widerrufen.</p>' +
    '<label class="analytics-choice__option"><input type="checkbox" data-ga-choice> <span><strong>Website-Analyse mit Google Analytics</strong><br>Misst Seitenaufrufe, Rechner-Nutzung, Leitfaden- und Store-Klicks; übermittelt Nutzungsdaten an Google und speichert Analyse-Cookies.</span></label>' +
    '<label class="analytics-choice__option"><input type="checkbox" data-ads-choice> <span><strong>Werbeerfolg mit OpenAI messen</strong><br>Misst Seitenaufrufe, Klicks zu den App-Stores und auf Leitfaden-PDFs; übermittelt technische Nutzungsdaten an OpenAI und speichert Zuordnungs-Cookies. Keine Rechnerwerte oder Kontaktdaten.</span></label>' +
    '<div class="analytics-choice__actions"><button type="button" data-analytics-deny>Alle ablehnen</button>' +
    '<button type="button" data-analytics-accept>Auswahl speichern</button><a href="' + privacyURL + '">Datenschutz</a></div>';
  function updateChoices() {
    panel.querySelector('[data-ga-choice]').checked = choice === 'accepted';
    panel.querySelector('[data-ads-choice]').checked = !!window.HEIMSTART_ADS && window.HEIMSTART_ADS.choice() === 'accepted';
  }
  updateChoices();
  panel.hidden = !!choice;
  document.body.appendChild(panel);
  var settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'analytics-settings';
  settings.textContent = 'Datenschutzeinstellungen';
  (document.querySelector('footer nav') || document.querySelector('footer') || document.body).appendChild(settings);
  settings.addEventListener('click', function () {
    updateChoices(); panel.hidden = false; panel.querySelector('[data-analytics-deny]').focus();
  });
  panel.querySelector('[data-analytics-deny]').addEventListener('click', function () {
    panel.querySelector('[data-ads-choice]').checked = false;
    decide('rejected');
  });
  panel.querySelector('[data-analytics-accept]').addEventListener('click', function () { decide(panel.querySelector('[data-ga-choice]').checked ? 'accepted' : 'rejected'); });
  panel.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { panel.hidden = true; settings.focus(); }
  });
  window.addEventListener('focus', function () {
    var stored = readChoice();
    if (stored !== choice) {
      choice = stored;
      if (choice === 'accepted') start();
      else { window[disabled] = true; clearAnalyticsCookies(); }
      panel.hidden = !!choice;
    }
  });
  if (choice === 'accepted') start();
  else clearAnalyticsCookies();

  var calculator = document.getElementById('rechner');
  if (calculator) {
    function useCalculator(event) {
      if (!event.isTrusted || calculatorUsed || !event.target.matches('input, select')) return;
      calculatorUsed = send('calculator_use', { calculator_name: 'financing' });
    }
    calculator.addEventListener('input', useCalculator);
    calculator.addEventListener('change', useCalculator);
  }
  document.addEventListener('click', function (event) {
    if (!event.isTrusted || !event.target.closest) return;
    var guide = event.target.closest('a[data-leitfaden][href]');
    if (guide) { send('leitfaden_download', { teil: guide.getAttribute('data-leitfaden') }); return; }
    var anchor = event.target.closest('a[data-store], a[data-store-link]');
    if (!anchor) return;
    var stores = window.HEIMSTART_STORES || {};
    var store = anchor.getAttribute('data-store');
    if (!store) {
      Object.keys(stores).some(function (key) {
        if (anchor.href === stores[key].url) { store = key; return true; }
        return false;
      });
    }
    if (!store || !stores[store]) return;
    var actual = new URL(anchor.href), expected = new URL(stores[store].url);
    var sameTarget = actual.origin === expected.origin && actual.pathname === expected.pathname &&
      (store !== 'google' || actual.searchParams.get('id') === expected.searchParams.get('id'));
    var live = stores[store].live && sameTarget;
    send(live ? 'store_click' : 'store_interest', { store_name: store, store_status: live ? 'live' : 'coming_soon' });
  });
})();
