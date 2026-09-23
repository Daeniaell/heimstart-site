/* ==========================================================================
   Heimstart, Startseite: seiteneigene Choreografie.
   Liest den Fortschritt der Engine (api.acts[i].p) und verändert die Engine nicht.
   1. Hero: das Inserat öffnet sich zum lebenden Haus.
   2. Signatur: der Fragen-Sturm, der sich ordnet, und der Umschlag in den Tag.
   3. Antworten: Schärfe entlang der seitlichen Fahrt.
   4. Rechner: dieselbe Logik wie die Android-App (data/finance).
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  var clamp01 = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (x) { x = clamp01(x); return x * x * (3 - 2 * x); };
  var easeOut = function (x) { x = clamp01(x); return 1 - Math.pow(1 - x, 3); };
  var easeInOut = function (x) { x = clamp01(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var backOut = function (x) { x = clamp01(x); var c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

  /* ---- Zoomen mit zwei Fingern: nichts neu vermessen ---------------------
     Mobile Browser melden beim Zoomen den sichtbaren Ausschnitt als Fenstergröße.
     Engine und Choreografie würden sich auf den Ausschnitt umrechnen und zerfallen.
     Solange gezoomt ist, erreicht kein resize die Seite; zurück bei 100 % wird
     einmal neu vermessen (unten). Muss vor der Engine registriert sein. */
  var vv = window.visualViewport;
  var zoomed = function () { return !!vv && Math.abs(vv.scale - 1) > 0.01; };
  addEventListener('resize', function (e) { if (zoomed()) e.stopImmediatePropagation(); }, true);

  /* ---- Hochformat oder Querformat entscheidet über den Hero-Clip ----------
     Die Engine nimmt auf jedem Touch-Gerät die Handyfassung, auch am iPad quer.
     Hier wählt die Ausrichtung, passend zum <picture>-Poster (orientation). */
  var heroVideo = document.querySelector('.hero video[data-sc-scrub]');
  var portrait = matchMedia('(orientation: portrait)').matches;
  if (heroVideo) {
    var srcP = heroVideo.getAttribute('data-sc-src-mobile');
    if (portrait && srcP) heroVideo.setAttribute('data-sc-src', srcP);
    heroVideo.removeAttribute('data-sc-src-mobile');
  }

  /* ---- Stores: Ziele aus assets/stores.js --------------------------------
     Veröffentlicht: Badge führt in den Store, "App laden" auf dem Handy direkt
     in den passenden. Noch nicht veröffentlicht: Platzhalter mit Hinweis. */
  var ST = window.HEIMSTART_STORES || {};
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  var own = isIOS ? ST.apple : isAndroid ? ST.google : null;
  Array.prototype.forEach.call(document.querySelectorAll('[data-store-link]'), function (a) {
    if (own && own.live) a.href = own.url;
  });
  var hint = document.getElementById('stores-hint');
  Array.prototype.forEach.call(document.querySelectorAll('[data-store]'), function (a) {
    var s = ST[a.getAttribute('data-store')];
    if (s && s.live) { a.href = s.url; return; }
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (!hint) return;
      hint.textContent = (a.getAttribute('data-store') === 'apple' ? 'Im App Store' : 'Bei Google Play') +
        ' ist Heimstart bald erhältlich.';
      hint.hidden = false;
    });
  });
  var api = window.ScrollCraft.mount(document.body);
  var actById = {};
  api.acts.forEach(function (a) { if (a.el.id) actById[a.el.id] = a; });
  // Fensterhöhe wie die Engine sie nutzt, aber nie die eines gezoomten Ausschnitts.
  var VH = innerHeight;

  /* ---- Alles passt auf jeden Bildschirm ----------------------------------
     --fit verkleinert Schrift und Abstände einer Bühne nur so weit, dass ihr Inhalt
     ganz in den Rahmen passt: die größte Stufe zwischen min und 1, für die fits() gilt.
     Zeilenumbrüche machen den Zusammenhang sprunghaft, daher Halbierung statt Formel.
     Gemessen wird ohne Transformationen (offset*). */
  function fitScale(el, fits, min) {
    el.style.removeProperty('--fit');
    if (fits()) return;
    var lo = min, hi = 1;
    for (var k = 0; k < 7; k++) {
      var mid = (lo + hi) / 2;
      el.style.setProperty('--fit', mid.toFixed(3));
      if (fits()) lo = mid; else hi = mid;
    }
    el.style.setProperty('--fit', lo.toFixed(3));
    fits();
  }
  // Stapel mit festem Rahmen (Hero, Fragen, Schluss): need() ist die Höhe des Inhalts,
  // tol die erlaubte Abweichung (offset* ist auf ganze Pixel gerundet).
  function fitStack(box, need, min, tol) {
    if (!box) return;
    fitScale(box, function () {
      var cs = getComputedStyle(box);
      return need() <= box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) + tol;
    }, min);
  }

  /* ======================================================================
     1 · HERO
     ====================================================================== */
  var H = { act: actById.top };
  if (H.act) {
    var hs = H.act.el;
    H.stage = hs.querySelector('[data-sc-stage]');
    H.frame = hs.querySelector('.hero__frame');
    H.intro = hs.querySelector('.hero__intro');
    H.copy = hs.querySelector('.hero__copy');
    H.listing = hs.querySelector('.listing');
    H.photo = hs.querySelector('.listing__photo');
    H.meta = hs.querySelector('.listing__meta');
    H.couple = hs.querySelector('.hero__couple');
    H.hedge = hs.querySelector('.hero__hedge');
    H.air = hs.querySelector('.hero__air');
    H.scrim = hs.querySelector('.hero__scrim');
  }

  function heroLayout() {
    if (!H.act) return;
    // Das Foto gibt zuerst nach (CSS); reicht das nicht, wird die Überschrift kleiner.
    fitStack(H.intro, function () {
      var c = H.copy, l = H.listing;
      return Math.max(c.offsetTop + c.offsetHeight, l.offsetTop + H.meta.offsetTop + H.meta.offsetHeight) -
        Math.min(c.offsetTop, l.offsetTop);
    }, 0.55, 1);
    var W = H.stage.clientWidth, Ht = H.stage.clientHeight;
    var prev = H.listing.style.transform;
    H.listing.style.transform = 'none';
    var sr = H.stage.getBoundingClientRect(), pr = H.photo.getBoundingClientRect();
    H.listing.style.transform = prev;
    H.card = { x: pr.left - sr.left, y: pr.top - sr.top, w: pr.width, h: pr.height };
    H.W = W; H.H = Ht;
    var isPortrait = Ht > W;
    // Wo das Haus im Bild steht: dorthin zeigt das Inseratsfoto.
    H.fx = isPortrait ? 0.5 : 0.63;
    H.fy = isPortrait ? 0.44 : 0.44;
    H.s0 = Math.max(H.card.w / W, H.card.h / Ht);
  }

  function heroFrame() {
    if (!H.act || !H.card) return;
    var p = H.act.p, c = H.card, W = H.W, Ht = H.H;
    var t = reduce ? (p > 0.12 ? 1 : 0) : easeInOut((p - 0.05) / 0.42);

    var s = lerp(H.s0, 1, t);
    var tx0 = c.x + c.w / 2 - H.fx * W * H.s0;
    var ty0 = c.y + c.h / 2 - H.fy * Ht * H.s0;
    tx0 = Math.min(c.x, Math.max(c.x + c.w - W * H.s0, tx0));
    ty0 = Math.min(c.y, Math.max(c.y + c.h - Ht * H.s0, ty0));
    var tx = lerp(tx0, 0, t), ty = lerp(ty0, 0, t);
    var vx = lerp(c.x, 0, t), vy = lerp(c.y, 0, t), vw = lerp(c.w, W, t), vh = lerp(c.h, Ht, t);
    var L = (vx - tx) / s, T = (vy - ty) / s;
    var R = W - (vx + vw - tx) / s, B = Ht - (vy + vh - ty) / s;
    var r = (lerp(18, 0, t) / s).toFixed(2), rb = (lerp(0, 0, t) / s).toFixed(2);
    H.frame.style.transform = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(5) + ')';
    H.frame.style.clipPath = t >= 0.999 ? 'none' :
      'inset(' + T.toFixed(2) + 'px ' + R.toFixed(2) + 'px ' + B.toFixed(2) + 'px ' + L.toFixed(2) + 'px round ' + r + 'px ' + r + 'px ' + rb + 'px ' + rb + 'px)';

    // Das Inserat tritt zurück, sobald das Foto wächst.
    var lo = 1 - smooth(t / 0.32);
    H.listing.style.opacity = lo.toFixed(3);
    H.listing.style.visibility = lo < 0.01 ? 'hidden' : 'visible';
    if (!reduce) H.listing.style.transform = 'translate3d(0,' + (t * 2.5).toFixed(2) + 'vh,0) scale(' + (1 + t * 0.04).toFixed(4) + ')';

    // Ebenen: Paar und Hecke steigen auf, mit verschiedenen Raten (Tiefe).
    var t2 = reduce ? (p > 0.4 ? 1 : 0) : easeOut((p - 0.34) / 0.30);
    var drift = p - 0.5;
    H.couple.style.opacity = t2.toFixed(3);
    H.hedge.style.opacity = t2.toFixed(3);
    H.air.style.opacity = smooth((t - 0.55) / 0.45).toFixed(3);
    H.scrim.style.opacity = smooth((p - 0.34) / 0.12).toFixed(3);
    if (!reduce) {
      H.couple.style.transform = 'translate3d(0,' + ((1 - t2) * 42 - drift * 5).toFixed(3) + 'vh,0)';
      H.hedge.style.transform = 'translate3d(0,' + ((1 - t2) * 34 - drift * 13).toFixed(3) + 'vh,0)';
    }
  }

  /* ======================================================================
     2 · SIGNATUR: der Fragen-Sturm, der sich ordnet
     ====================================================================== */
  var S = { act: actById.fragen };
  if (S.act) {
    var ss = S.act.el;
    S.stage = ss.querySelector('[data-sc-stage]');
    S.layout = ss.querySelector('.storm__layout');
    S.head = ss.querySelector('.storm__head');
    S.board = ss.querySelector('.storm__board');
    S.day = ss.querySelector('.storm__day');
    S.hush = ss.querySelector('.storm__hush');
    S.heads = Array.prototype.slice.call(ss.querySelectorAll('.storm__group h3'));
    S.items = Array.prototype.slice.call(ss.querySelectorAll('.q')).map(function (el, i) {
      return { el: el, check: el.querySelector('.q__check'), anchor: el.classList.contains('q--anchor'), i: i, lit: false };
    });
  }

  // Reproduzierbare Streuung: jede Frage hat ihren festen Platz im Sturm.
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function stormLayout() {
    if (!S.act) return;
    fitStack(S.layout, function () {
      return S.board.offsetTop + S.board.offsetHeight - S.head.offsetTop;
    }, 0.45, -1);
    var W = S.stage.clientWidth, Ht = S.stage.clientHeight;
    S.W = W; S.H = Ht;
    S.items.forEach(function (it) { it.el.style.transform = 'none'; });
    S.board.style.transform = 'none';
    var sr = S.stage.getBoundingClientRect();
    var rnd = seeded(20260923);
    var small = W < 760;
    var others = S.items.filter(function (it) { return !it.anchor; });
    S.items.forEach(function (it) {
      var r = it.el.getBoundingClientRect(), cr = it.check.getBoundingClientRect();
      var tr = it.el.querySelector('span').getBoundingClientRect();
      it.gx = r.left - sr.left;                 // linke Kante im Raster
      it.gy = r.top - sr.top + r.height / 2;    // Mitte im Raster
      it.cx = cr.left - sr.left + cr.width / 2; // Mitte des Häkchens
      it.cy = cr.top - sr.top + cr.height / 2;
      it.w = tr.right - r.left;                 // sichtbare Breite: Häkchen plus Text
    });
    // Streupositionen: Spirale im Goldenen Winkel, gleichmäßig verteilt,
    // mit freier Mitte, damit die eine Frage Luft behält.
    var N = others.length, GA = Math.PI * (3 - Math.sqrt(5));
    var order = others.map(function (_, k) { return k; });
    for (var q = order.length - 1; q > 0; q--) { var j = Math.floor(rnd() * (q + 1)), tmp = order[q]; order[q] = order[j]; order[j] = tmp; }
    others.forEach(function (it, k) {
      var slot = order[k];
      var rr = 0.34 + 0.66 * Math.sqrt((slot + 0.5) / N);
      var ang = slot * GA + 0.7;
      it.ss = small ? 1.08 : 1.3;                                  // Grundgröße im Sturm
      it.sx = W / 2 + Math.cos(ang) * W * (small ? 0.40 : 0.43) * rr - it.w * it.ss / 2;
      it.sy = Ht / 2 + Math.sin(ang) * Ht * (small ? 0.40 : 0.37) * rr;
      it.sz = -720 + rnd() * 700;
      it.a = 0.03 + (k / N) * 0.24 + rnd() * 0.04;                 // Erscheinen
      it.rz = (rnd() - 0.5) * 6;
      it.l = 0.50 + (k / (N - 1)) * 0.10;                          // Abflug ins Raster
      // Auch im Vordergrund (größer durch die Perspektive) bleibt jede Frage ganz im Bild.
      var f = 1100 / (1100 - 160), ox = W / 2, oy = Ht / 2, m = 18, bw = it.w * it.ss;
      var top = parseFloat(getComputedStyle(root).getPropertyValue('--bar-h')) * 16 || 64;
      it.sx = ox + Math.max((m - ox) / f, Math.min((W - m - bw * f - ox) / f, it.sx - ox));
      it.sy = oy + Math.max((top + 24 - oy) / f, Math.min((Ht - 36 - oy) / f, it.sy - oy));
    });
    // Fluchtpunkt in die Bildmitte, egal wo das Raster sitzt (am Handy unten).
    var br = S.board.getBoundingClientRect();
    S.board.style.perspectiveOrigin = (W / 2 - (br.left - sr.left)).toFixed(1) + 'px ' + (Ht / 2 - (br.top - sr.top)).toFixed(1) + 'px';
    var anchor = S.items.filter(function (it) { return it.anchor; })[0];
    S.anchor = anchor;
    anchor.bigScale = Math.min(small ? 2.4 : 3.4, (W - 36) / anchor.w);
    anchor.cxS = W / 2 - anchor.w * anchor.bigScale / 2;          // zentriert, groß
    anchor.l = 0.615;
    S.maxR = Math.hypot(Math.max(anchor.cx, W - anchor.cx), Math.max(anchor.cy, Ht - anchor.cy)) + 40;
  }

  var lean = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };

  function stormItemState(it, p) {
    // Position im Sturm zum Zeitpunkt p (vor dem Ordnen).
    var sp = Math.min(p, 0.40);
    var z = it.sz + Math.max(0, sp - it.a) * 880;
    var appear = smooth((p - it.a) / 0.06);
    var near = z > 240 ? clamp01(1 - (z - 240) / 260) : 1;
    var far = 0.35 + 0.65 * clamp01((z + 800) / 800);
    return { x: it.sx, y: it.sy, z: z, o: appear * near * far, rz: it.rz };
  }

  function stormFrame() {
    if (!S.act || S.W === undefined) return;
    var p = S.act.p, W = S.W, Ht = S.H;
    var landed = 0;

    if (reduce) {
      // Wenig Bewegung: alles steht im Raster; Häkchen und Tag kommen als Überblendung.
      var on = p >= 0.55;
      S.items.forEach(function (it) {
        it.el.style.opacity = '1';
        it.check.style.opacity = on ? '1' : '0';
        it.check.style.transform = 'none';
        it.el.classList.toggle('is-lit', on);
      });
      S.day.style.clipPath = 'none';
      S.day.style.opacity = on ? '1' : '0';
      S.heads.forEach(function (h) { h.style.opacity = on ? '1' : '0'; });
      S.stage.setAttribute('data-sc-verify-state', on ? 'day' : 'night');
      return;
    }

    var hush = smooth((p - 0.39) / 0.06) * (1 - smooth((p - 0.60) / 0.08));
    S.hush.style.opacity = (hush * 0.55).toFixed(3);

    S.items.forEach(function (it) {
      var x, y, z, o, sc, rz;
      if (it.anchor) {
        // Die eine Frage: groß, dann eine unter vielen, dann allein, dann an ihren Platz.
        var recede = smooth((p - 0.06) / 0.22) * (1 - smooth((p - 0.38) / 0.08));
        var fly = easeInOut((p - it.l) / 0.06);
        // Während die anderen einrasten, weicht die eine Frage nach oben aus.
        var lift = smooth((p - 0.50) / 0.08);
        var bigX = it.cxS, bigY = Ht * lerp(W < 760 ? 0.44 : 0.46, W < 760 ? 0.2 : 0.24, lift);
        var awayX = W * 0.30, awayY = Ht * 0.34;
        x = lerp(lerp(bigX, awayX, recede), it.gx, fly);
        y = lerp(lerp(bigY, awayY, recede), it.gy, fly);
        z = lerp(-520 * recede, 0, fly);
        sc = lerp(lerp(it.bigScale, 1.25, recede), 1, fly);
        o = lerp(1 - 0.45 * recede, 1, fly);
        rz = 0;
      } else {
        var st = stormItemState(it, p);
        var silence = 1 - smooth((p - 0.37) / 0.06);
        var f = easeInOut((p - it.l) / 0.07);
        if (p < it.l) {
          x = st.x; y = st.y; z = st.z; rz = st.rz; sc = it.ss;
          o = st.o * silence;
        } else {
          var fr = stormItemState(it, 0.40);
          x = lerp(fr.x, it.gx, f); y = lerp(fr.y, it.gy, f); z = lerp(fr.z, 0, f);
          rz = lerp(fr.rz, 0, f); sc = lerp(it.ss, 1, f);
          o = lerp(0, 1, smooth(f / 0.5));
        }
      }
      var dx = x - it.gx, dy = y - it.gy;
      it.el.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,' + z.toFixed(1) + 'px) rotate(' + rz.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      it.el.style.opacity = clamp01(o).toFixed(3);

      // Häkchen: springt beim Landen auf.
      var landT = it.l + (it.anchor ? 0.06 : 0.07);
      var c = clamp01((p - landT) / 0.022);
      it.check.style.opacity = c.toFixed(3);
      it.check.style.transform = 'scale(' + lerp(0.6, 1, backOut(c)).toFixed(4) + ')';
      if (c >= 1) landed++;
    });

    // Der Umschlag: aus dem letzten Häkchen wächst der Tag.
    var a = S.anchor;
    var fT = easeInOut((p - (a.l + 0.07)) / 0.075);
    var rad = fT * S.maxR;
    S.day.style.clipPath = fT >= 0.999 ? 'none' : 'circle(' + rad.toFixed(1) + 'px at ' + a.cx.toFixed(1) + 'px ' + a.cy.toFixed(1) + 'px)';
    S.items.forEach(function (it) {
      var lit = rad > Math.hypot(it.cx - a.cx, it.cy - a.cy) + 6;
      if (lit !== it.lit) { it.lit = lit; it.el.classList.toggle('is-lit', lit); }
    });
    var ho = smooth((p - 0.73) / 0.05);
    S.heads.forEach(function (h) { h.style.opacity = ho.toFixed(3); });

    // Für die Prüfung: was tatsächlich gemalt wird, gerundet.
    S.stage.setAttribute('data-sc-verify-state',
      'a' + Math.round(p < a.l ? (p < 0.4 ? p * 40 : 16 + hush * 4) : 30) + '-l' + landed + '-d' + Math.round(fT * 20));

    // Leichtes Anlehnen des Sturms an den Zeiger (nur Desktop, nur vor dem Ordnen).
    var leanOn = fine && p < 0.5;
    lean.active = leanOn;
    if (!leanOn) { S.board.style.transform = 'none'; lean.x = lean.y = 0; }
  }

  function leanTick() {
    lean.raf = 0;
    if (!lean.active) return;
    lean.x += (lean.tx - lean.x) * 0.08;
    lean.y += (lean.ty - lean.y) * 0.08;
    S.board.style.transform = 'rotateX(' + (-lean.y * 4).toFixed(3) + 'deg) rotateY(' + (lean.x * 5).toFixed(3) + 'deg)';
    if (Math.abs(lean.tx - lean.x) > 0.001 || Math.abs(lean.ty - lean.y) > 0.001) lean.raf = requestAnimationFrame(leanTick);
  }
  if (fine && !reduce && S.act) {
    addEventListener('pointermove', function (e) {
      lean.tx = (e.clientX / innerWidth - 0.5) * 2;
      lean.ty = (e.clientY / innerHeight - 0.5) * 2;
      if (lean.active && !lean.raf) lean.raf = requestAnimationFrame(leanTick);
    }, { passive: true });
  }

  /* ======================================================================
     Tag oder Nacht: Leiste, Seitengrund, Browserfarbe
     ====================================================================== */
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var phase = 'night';
  function phaseFrame() {
    var day = false;
    if (S.act) {
      var travel = Math.max(S.act.height - VH, 1);
      day = scrollY >= S.act.top + travel * (reduce ? 0.55 : 0.70);
    }
    var next = day ? 'day' : 'night';
    if (next !== phase) {
      phase = next;
      root.setAttribute('data-phase', next);
      if (themeMeta) themeMeta.setAttribute('content', day ? '#F6F4EE' : '#0A0F1F');
    }
  }

  /* ======================================================================
     3 · ANTWORTEN: Schärfe entlang der seitlichen Fahrt
     ====================================================================== */
  var A = { act: actById.antworten };
  if (A.act) {
    A.stage = A.act.el.querySelector('[data-sc-stage]');
    A.rail = A.act.el.querySelector('[data-sc-pan]');
    A.items = Array.prototype.slice.call(A.act.el.querySelectorAll('.answer, .answers__note'));
    A.answers = A.items.filter(function (el) { return el.classList.contains('answer'); });
    A.all = A.items.concat(Array.prototype.slice.call(A.act.el.querySelectorAll('.answers__lead')));
  }
  // Jede Antwort steht ganz unter der Leiste, nichts wird abgeschnitten. Reihenfolge:
  // Bild verkleinern (Gerät höchstens bis 96 px Breite), dann erst die Schrift (--fit).
  var PH = 2868 / 1320; // Gerät: Höhe je Breite
  function answersFit() {
    if (!A.act || reduce) return;
    var R = A.rail;
    R.classList.remove('is-side');
    R.style.removeProperty('--fit');
    R.style.removeProperty('--pw-fit');
    R.style.removeProperty('--ph-fit');
    var cs = getComputedStyle(R);
    var avail = A.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var media = function (el) { return el.querySelector('.phone, .answer__photo'); };
    var stacked = function () { return getComputedStyle(A.answers[0]).flexDirection === 'column'; };
    // Höhe, die das Bild haben darf: untereinander nur, was der Text übrig lässt.
    var room = function (el) { return stacked() ? avail - (el.offsetHeight - media(el).offsetHeight) : avail; };
    // Bliebe das Gerät untereinander schmaler als 150 px, stehen Gerät und Text nebeneinander.
    if (stacked()) {
      var r = Infinity;
      A.answers.forEach(function (el) { if (media(el).classList.contains('phone')) r = Math.min(r, room(el)); });
      if (r / PH < 150) R.classList.add('is-side');
    }
    var shrink = function () {
      R.style.removeProperty('--pw-fit');
      R.style.removeProperty('--ph-fit');
      var pw = Infinity, ph = Infinity;
      A.answers.forEach(function (el) {
        var m = media(el), h = room(el);
        if (m.offsetHeight <= h + 1) return;
        if (m.classList.contains('phone')) pw = Math.min(pw, h / PH); else ph = Math.min(ph, h);
      });
      if (pw < Infinity) R.style.setProperty('--pw-fit', Math.max(96, pw).toFixed(1) + 'px');
      if (ph < Infinity) R.style.setProperty('--ph-fit', Math.max(96, ph).toFixed(1) + 'px');
    };
    fitScale(R, function () {
      shrink();
      return A.all.every(function (el) { return el.offsetHeight <= avail + 1; });
    }, 0.6);
  }
  function answersLayout() {
    if (!A.act) return;
    answersFit();
    // Lage im Stage ohne Schienenverschiebung; pro Bild wird nur gerechnet, nicht gemessen.
    A.W = A.stage.clientWidth;
    A.pos = A.items.map(function (el) { return { el: el, x: el.offsetLeft, w: el.offsetWidth }; });
  }
  function answersFrame() {
    if (!A.act || reduce || !A.act.live || !A.pos) return;
    var m = /translate3d\((-?[\d.]+)px/.exec(A.rail.style.transform || '');
    var shift = m ? parseFloat(m[1]) : 0;
    var vw = A.W;
    A.pos.forEach(function (it) {
      var d = Math.abs(it.x + shift + it.w / 2 - vw * 0.5) / (vw * 0.75);
      var k = smooth(d);
      it.el.style.opacity = (1 - 0.42 * k).toFixed(3);
      it.el.style.transform = 'scale(' + (1 - 0.035 * k).toFixed(4) + ')';
    });
  }

  /* ======================================================================
     Rahmen: ein Takt pro Bild, nach dem Lesen der Engine
     ====================================================================== */
  var queued = false;
  function frame() {
    queued = false;
    heroFrame();
    stormFrame();
    phaseFrame();
    answersFrame();
  }
  function queue() { if (!queued) { queued = true; requestAnimationFrame(frame); } }

  // Schluss: Text und Fußzeile passen gemeinsam hinein, auch wenn später das
  // Rechenergebnis oder der Store-Hinweis dazukommt.
  var C = { act: actById.laden };
  if (C.act) {
    C.box = C.act.el.querySelector('.close__layout');
    C.copy = C.act.el.querySelector('.close__copy');
    C.foot = C.act.el.querySelector('.foot');
  }
  function closeFit() {
    if (!C.box) return;
    // Freier Platz zwischen Text und Fußzeile zählt nicht: nur beide Höhen zusammen.
    fitStack(C.box, function () { return C.copy.offsetHeight + C.foot.offsetHeight; }, 0.5, -1);
  }
  if (C.box && window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(closeFit); }).observe(C.copy);

  function relayout() {
    heroLayout();
    stormLayout();
    answersLayout();
    closeFit();
    queue();
  }
  addEventListener('scroll', queue, { passive: true });
  var lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', function () {
    VH = innerHeight;
    // Nur die Adressleiste? Dann nichts neu vermessen (wie die Engine).
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 120) return;
    lastW = innerWidth; lastH = innerHeight;
    relayout();
  }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { api.layout(); relayout(); });
  // Zurück auf 100 %: einmal vollständig neu vermessen, Engine zuerst.
  if (vv) {
    var wasZoomed = zoomed();
    vv.addEventListener('resize', function () {
      var z = zoomed();
      if (wasZoomed && !z) {
        VH = innerHeight; lastW = innerWidth; lastH = innerHeight;
        api.layout(); relayout();
      }
      wasZoomed = z;
    });
  }

  // "App laden" und Sprünge zu #laden: bis ganz ans Ende. Der Schluss ist gepinnt; an seiner
  // Oberkante ist der Text noch ausgeblendet, erst am Seitenende steht er vollständig.
  function toEnd(behavior) {
    scrollTo({ top: document.documentElement.scrollHeight - VH, behavior: behavior });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#laden"]');
    if (!a || a.hasAttribute('data-store')) return;
    e.preventDefault();
    toEnd(reduce ? 'instant' : 'smooth');
  });
  if (location.hash === '#laden') addEventListener('load', function () { setTimeout(function () { toEnd('instant'); }, 60); });

  // Tastatur im Schluss: der Schluss ist gepinnt. Fokus auf seinen Knopf parkt die Bühne dort,
  // wo die Einblendung sicher offen ist (die Engine zentriert sonst vor den Akt).
  var closeAct = actById.laden;
  if (closeAct) addEventListener('focusin', function (e) {
    if (!e.target.closest || !e.target.closest('.close__copy')) return;
    var travel = Math.max(closeAct.height - VH, 1);
    scrollTo({ top: closeAct.top + travel * 0.6, behavior: 'instant' });
  });
  relayout();
  root.classList.add('hs-ready');

  /* ======================================================================
     4 · RECHNER
     Quelle: FinancingCalculator, PurchaseAcquisitionCosts,
     GermanPropertyTransferTaxRates (Stand 2026-09-05) der Android-App.
     ====================================================================== */
  var TAX = {
    'Baden-Württemberg': 5.0, 'Bayern': 3.5, 'Berlin': 6.0, 'Brandenburg': 6.5,
    'Bremen': 5.5, 'Hamburg': 5.5, 'Hessen': 6.0, 'Mecklenburg-Vorpommern': 6.0,
    'Niedersachsen': 5.0, 'Nordrhein-Westfalen': 6.5, 'Rheinland-Pfalz': 5.0, 'Saarland': 6.5,
    'Sachsen': 5.5, 'Sachsen-Anhalt': 5.0, 'Schleswig-Holstein': 6.5, 'Thüringen': 5.0
  };
  var eur0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
  var eur2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var pct1 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var pctN = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 });
  var money0 = function (v) { return eur0.format(Math.round(v)) + ' €'; };
  var money2 = function (v) { return eur2.format(v) + ' €'; };
  var round2 = function (v) { return Math.round(v * 100) / 100; };
  var $ = function (id) { return document.getElementById(id); };

  var calc = document.querySelector('.calc');
  var interacted = false;

  function parseMoney(s) { var d = String(s).replace(/[^\d]/g, ''); return d ? parseInt(d, 10) : NaN; }
  function parsePercent(s) {
    var t = String(s).trim().replace(/\s|%/g, '');
    if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(t);
    return isFinite(v) ? v : NaN;
  }

  var fields = {};
  if (calc) {
    Array.prototype.forEach.call(calc.querySelectorAll('.field[data-field]'), function (f) {
      var key = f.getAttribute('data-field');
      var F = {
        el: f, key: key,
        min: +f.getAttribute('data-min'), max: +f.getAttribute('data-max'), step: +f.getAttribute('data-step'),
        value: +f.getAttribute('data-value'),
        text: f.querySelector('.field__value'), range: f.querySelector('.range')
      };
      fields[key] = F;
      var sync = function () {
        F.text.value = money0(F.value);
        F.range.value = String(F.value);
        F.range.style.setProperty('--fill', ((F.value - F.min) / (F.max - F.min) * 100).toFixed(2) + '%');
      };
      F.sync = sync;
      F.range.addEventListener('input', function () { F.value = +F.range.value; interacted = true; sync(); compute(); });
      var commit = function () {
        var v = parseMoney(F.text.value);
        if (isNaN(v)) v = F.value;
        F.value = Math.min(F.max, Math.max(F.min, v));
        interacted = true; sync(); compute();
      };
      F.text.addEventListener('change', commit);
      F.text.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); commit(); F.text.select(); } });
      F.text.addEventListener('focus', function () { F.text.value = eur0.format(F.value); requestAnimationFrame(function () { F.text.select(); }); });
      F.text.addEventListener('blur', sync);
      sync();
    });

    var sel = $('f-state');
    Object.keys(TAX).forEach(function (name) {
      var o = document.createElement('option');
      o.value = name; o.textContent = name;
      if (name === 'Nordrhein-Westfalen') o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { interacted = true; compute(); });
    ['a-rate', 'a-repay', 'a-notary', 'a-broker', 'a-costs'].forEach(function (id) {
      $(id).addEventListener('change', function () { interacted = true; compute(); });
    });
    $('a-broker-on').addEventListener('change', function () { interacted = true; compute(); });
  }

  var ICON = {
    ok: '<circle cx="12" cy="12" r="11" fill="#047857"/><path d="m7 12.3 3.3 3.3L17 8.9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    warn: '<path d="M12 2.5 22.5 21h-21Z" fill="#A96800"/><path d="M12 9v5.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.25" fill="#fff"/>',
    crit: '<path d="M8 2h8l6 6v8l-6 6H8l-6-6V8Z" fill="#B42318"/><path d="m8.5 8.5 7 7m0-7-7 7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'
  };

  var shownRate = null, rateAnim = 0;
  function showRate(v) {
    var el = $('r-rate');
    if (reduce || shownRate === null) { shownRate = v; el.textContent = money2(v); return; }
    var from = shownRate, t0 = performance.now();
    cancelAnimationFrame(rateAnim);
    (function step(now) {
      var k = easeOut((now - t0) / 420);
      el.textContent = money2(round2(lerp(from, v, k)));
      if (k < 1) rateAnim = requestAnimationFrame(step); else shownRate = v;
    })(t0);
  }

  function compute() {
    if (!calc) return;
    var price = fields.price.value, equity = fields.equity.value,
        renovation = fields.renovation.value, income = fields.income.value;
    var state = $('f-state').value, taxRate = TAX[state] || 0;
    var ir = parsePercent($('a-rate').value), rp = parsePercent($('a-repay').value),
        nt = parsePercent($('a-notary').value), bk = parsePercent($('a-broker').value),
        costs = parseMoney($('a-costs').value);
    if (!isFinite(ir) || ir < 0) ir = 3.6;
    if (!isFinite(rp) || rp < 0) rp = 2.0;
    if (!isFinite(nt) || nt < 0) nt = 1.5;
    if (!isFinite(bk) || bk < 0) bk = 3.57;
    if (isNaN(costs)) costs = 350;
    var brokerOn = $('a-broker-on').checked;

    // Wie PurchaseAcquisitionCosts: Steuer auf volle Euro abgerundet, Rest kaufmännisch.
    var tax = Math.floor(price * taxRate / 100);
    var notary = round2(price * nt / 100);
    var broker = brokerOn ? round2(price * bk / 100) : 0;
    var ancillary = round2(tax + notary + broker);
    var total = round2(price + ancillary + renovation);
    var loan = Math.max(0, round2(total - equity));
    // Wie AmortizationCalculator.initialAnnuity: Darlehen x (Zins + Tilgung) / 12.
    var rate = round2(loan * (ir + rp) / 100 / 12);
    var housing = round2(rate + costs);
    var ratio = income > 0 ? housing / income * 100 : Infinity;
    // Wie FinancingScreen (Android): bis 35 % im Rahmen, bis 40 % erhöht, darüber kritisch.
    var level = ratio <= 35 ? 'ok' : ratio <= 40 ? 'warn' : 'crit';

    showRate(rate);
    $('f-state-hint').textContent = 'Grunderwerbsteuer ' + pctN.format(taxRate) + ' %';
    $('l-price').textContent = money0(price);
    $('l-tax-label').textContent = 'Grunderwerbsteuer (' + pctN.format(taxRate) + ' %)';
    $('l-tax').textContent = money0(tax);
    $('l-notary-label').textContent = 'Notar und Grundbuch (' + pctN.format(nt) + ' %)';
    $('l-notary').textContent = money0(notary);
    $('f-broker-hint').textContent = brokerOn ? 'Provision ' + pctN.format(bk) + ' % vom Kaufpreis' : 'Ohne Maklerprovision';
    $('l-broker-label').textContent = brokerOn ? 'Makler (' + pctN.format(bk) + ' %)' : 'Makler (ohne)';
    $('l-broker').textContent = money0(broker);
    $('l-renovation').textContent = money0(renovation);
    $('l-total').textContent = money0(total);
    $('l-equity').textContent = '− ' + money0(equity);
    $('l-loan').textContent = money0(loan);
    $('l-rate').textContent = money2(rate);
    $('l-costs').textContent = '+ ' + money0(costs);
    $('l-housing').textContent = money2(housing);

    var pos = isFinite(ratio) ? Math.min(ratio, 60) / 60 * 100 : 100;
    $('r-pin').style.left = pos.toFixed(2) + '%';
    var v = $('r-verdict');
    v.setAttribute('data-level', level);
    v.querySelector('svg').innerHTML = ICON[level];
    var share = isFinite(ratio) ? pct1.format(ratio) + ' %' : 'mehr als das Einkommen';
    var titles = { ok: 'Rechnerisch innerhalb der gewählten Grenze', warn: 'Erhöhte Belastung, Budget prüfen', crit: 'Kritisch' };
    var texts = {
      ok: 'Wohnkosten von ' + money0(housing) + ' sind ' + share + ' des Nettoeinkommens. Bis 35 % gilt das in Heimstart als solider Rahmen.',
      warn: share + ' des Nettoeinkommens gehen ins Wohnen. Zwischen 35 und 40 % wird es eng.',
      crit: share + ' des Nettoeinkommens gehen ins Wohnen. Über 40 % bleibt zu wenig Luft für alles andere.'
    };
    $('r-verdict-title').textContent = titles[level];
    $('r-verdict-text').textContent = texts[level];

    var eq = $('r-equity');
    eq.textContent = equity >= ancillary
      ? 'Die Kaufnebenkosten von ' + money0(ancillary) + ' sind durch Eigenkapital gedeckt.'
      : 'Die Kaufnebenkosten von ' + money0(ancillary) + ' sind noch nicht vollständig durch Eigenkapital gedeckt.';

    // Der eigene Stand reist mit bis zum Schluss.
    var carry = $('close-result');
    if (carry && interacted) {
      carry.textContent = 'Euer Stand aus dem Rechner: ' + money2(rate) + ' Monatsrate, ' + share + ' Belastung. In Heimstart rechnet ihr mit allen Details weiter.';
      carry.hidden = false;
    }
  }
  compute();
})();
