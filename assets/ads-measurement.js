/* Consent-gated image-pixel transport; no third-party script or form scanning. */
(function () {
  'use strict';
  var PIXEL = 'AJYfBxAdGFYem2unrJrBju';
  var KEY = 'heimstart_ads_v1', REF = 'heimstart_ads_ref_v1';
  var enabled = false, pageSent = false, pending = [];
  var debug = new URL(location.href).searchParams.get('ads_debug') === '1';
  if (debug) window.addEventListener('securitypolicyviolation', function (event) {
    console.warn('Heimstart Ads policy ' + JSON.stringify({ blockedURI: event.blockedURI, directive: event.effectiveDirective, policy: event.originalPolicy }));
  });
  function cookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)(?:;|$)'));
    return match ? decodeURIComponent(match[1]) : '';
  }
  function forget() {
    [REF, '__oppref', '__obref'].forEach(function (name) {
      ['', location.hostname, '.' + location.hostname, '.heimstart.de'].forEach(function (domain) {
        document.cookie = name + '=; Max-Age=0; Path=/' + (domain ? '; Domain=' + domain : '');
      });
    });
  }
  function send(event, id) {
    if (!enabled || cookie(KEY) !== 'accepted' || !/^(www\.)?heimstart\.de$/.test(location.hostname)) return false;
    if (event !== 'page_viewed' && event !== 'store_click' && event !== 'leitfaden_download') return false;
    var url = new URL('https://bzr.openai.com/v1/sdk/events');
    url.searchParams.set('pid', PIXEL);
    url.searchParams.set('event', event === 'page_viewed' ? event : 'custom');
    url.searchParams.set('data[type]', event === 'page_viewed' ? 'contents' : 'custom');
    url.searchParams.set('event_id', crypto.randomUUID());
    if (event !== 'page_viewed') url.searchParams.set('custom_event_name', event);
    if (id) url.searchParams.set('data[contents]', JSON.stringify([{id: id, content_type: event === 'store_click' ? 'app_store' : 'guide'}]));
    var ref = cookie(REF);
    if (ref) url.searchParams.set('oppref', ref);
    function report(status) {
      if (debug) console.info('Heimstart Ads measurement ' + JSON.stringify({ event: event, eventId: url.searchParams.get('event_id'), status: status }));
    }
    function imageFallback() {
      if (!enabled || cookie(KEY) !== 'accepted') return;
      var image = new Image(1, 1);
      image.referrerPolicy = 'origin';
      image.onload = function () { report('image_loaded'); pending = pending.filter(function (item) { return item !== image; }); };
      image.onerror = function () { report('image_failed'); pending = pending.filter(function (item) { return item !== image; }); };
      pending.push(image);
      image.src = url.href;
    }
    // Reuse the same event ID for the documented image fallback: no second conversion.
    if (window.fetch) {
      window.fetch(url.href, { method: 'GET', mode: 'cors', credentials: 'omit', keepalive: true, referrer: location.origin + '/', referrerPolicy: 'origin' }).then(function (response) {
        report(response.status);
        if (!response.ok) imageFallback();
      }).catch(function (error) {
        if (debug) console.warn('Heimstart Ads transport ' + String(error));
        imageFallback();
      });
    } else imageFallback();
    return true;
  }
  function consent(allow) {
    enabled = allow === true;
    if (!enabled) { forget(); return; }
    // Store only OpenAI's click reference, never arbitrary URL values or form inputs.
    var ref = new URL(location.href).searchParams.get('oppref');
    if (ref && /^[A-Za-z0-9_=-]{1,2048}$/.test(ref)) {
      document.cookie = REF + '=' + encodeURIComponent(ref) + '; Max-Age=2592000; Path=/; SameSite=Lax; Secure';
    }
    if (!pageSent && send('page_viewed')) pageSent = true;
  }
  window.HEIMSTART_ADS = {
    choice: function () { return cookie(KEY); },
    decide: function (allow) {
      document.cookie = KEY + '=' + (allow ? 'accepted' : 'rejected') + '; Max-Age=15552000; Path=/; SameSite=Lax; Secure';
      consent(allow);
    },
    sync: function () { consent(cookie(KEY) === 'accepted'); },
    send: function (name, id) {
      if (name !== 'store_click' && name !== 'leitfaden_download') return false;
      if (name === 'store_click' && id !== 'apple' && id !== 'google') return false;
      if (name === 'leitfaden_download' && !/^teil-[1-4]$/.test(id)) return false;
      return send(name, id);
    }
  };
  consent(cookie(KEY) === 'accepted');
  window.addEventListener('focus', window.HEIMSTART_ADS.sync);
})();
