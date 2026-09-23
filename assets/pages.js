/* Heimstart, Unterseiten: Tag/Nacht der Leiste, "App laden", mitlaufendes Inhaltsverzeichnis, Erscheinen. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  // Leiste: hell, sobald der Tag-Bogen unter ihr liegt.
  var head = document.querySelector('.page-head');
  var theme = document.querySelector('meta[name="theme-color"]');
  function phase() {
    var day = !head || head.getBoundingClientRect().bottom < 90;
    var next = day ? 'day' : 'night';
    if (root.getAttribute('data-phase') !== next) {
      root.setAttribute('data-phase', next);
      if (theme) theme.setAttribute('content', day ? '#F6F4EE' : '#0A0F1F');
    }
  }
  addEventListener('scroll', phase, { passive: true });
  addEventListener('resize', phase, { passive: true });
  phase();

  // "App laden": auf dem Handy direkt in den passenden Store, sobald er in
  // assets/stores.js freigeschaltet ist; bis dahin zu den Badges der Startseite.
  var ST = window.HEIMSTART_STORES || {};
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var own = isIOS ? ST.apple : /Android/.test(ua) ? ST.google : null;
  Array.prototype.forEach.call(document.querySelectorAll('[data-store-link]'), function (a) {
    if (own && own.live) a.href = own.url;
  });

  // Inhaltsverzeichnis: markiert den Abschnitt, in dem gelesen wird.
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  if (links.length && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      var first = Object.keys(byId).filter(function (id) { return visible[id]; })[0];
      if (!first) return;
      links.forEach(function (a) { a.classList.toggle('is-current', a === byId[first]); });
    }, { rootMargin: '-20% 0px -60% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }
  // Mobiles Inhaltsverzeichnis schließt sich nach der Wahl.
  Array.prototype.forEach.call(document.querySelectorAll('.toc-mobile a'), function (a) {
    a.addEventListener('click', function () { a.closest('details').open = false; });
  });

  // Abschnitte erscheinen einmal, wenn sie ins Bild kommen.
  var rev = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(rev, function (el) { ro.observe(el); });
  } else {
    Array.prototype.forEach.call(rev, function (el) { el.classList.add('is-in'); });
  }
})();
