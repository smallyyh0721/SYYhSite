/* @ds-bundle: {"format":4,"namespace":"SYYH","components":[{"name":"Button"},{"name":"Sticker"},{"name":"HudBar"},{"name":"SectionTitle"},{"name":"Panel"},{"name":"WorkTile"},{"name":"IslandNode"},{"name":"SpeedLines"},{"name":"IslandMap"},{"name":"IntroSequence"},{"name":"GateConsole"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  // ---- shared helpers -------------------------------------------------------
  var TONE = { signal: '--signal', hazard: '--hazard', pop: '--pop', tube: '--tube', ink: '--ink',
    a: '--island-a', b: '--island-b', c: '--island-c', d: '--island-d' };
  function accent(tone) { return 'var(' + (TONE[tone] || TONE.signal) + ')'; }
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  // Deterministic PRNG so speed lines render the same every time (snapshot-testable).
  function rng(seed) {
    var s = seed >>> 0 || 1;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // ---- Button ---------------------------------------------------------------
  function Button(p) {
    var variant = p.variant || 'solid', rest = Object.assign({}, p);
    ['variant', 'tone', 'className', 'children', 'style'].forEach(function (k) { delete rest[k]; });
    return h('button', Object.assign({ type: 'button' }, rest, {
      className: cx('sy-btn', 'sy-btn--' + variant, p.className),
      style: Object.assign({ '--sy-accent': accent(p.tone) }, p.style)
    }), h('span', { className: 'sy-btn__in' }, p.children));
  }

  // ---- Sticker --------------------------------------------------------------
  function Sticker(p) {
    return h('span', {
      className: cx('sy-sticker', p.tilt === 'right' && 'sy-sticker--right', p.tilt === 'none' && 'sy-sticker--flat', p.className),
      style: { '--sy-accent': accent(p.tone) }
    }, p.children);
  }

  // ---- HudBar ---------------------------------------------------------------
  function useClock() {
    var st = useState(function () { return new Date(); });
    useEffect(function () {
      var id = setInterval(function () { st[1](new Date()); }, 15000);
      return function () { clearInterval(id); };
    }, []);
    return pad2(st[0].getHours()) + ':' + pad2(st[0].getMinutes());
  }
  function HudBar(p) {
    var time = useClock();
    return h('header', { className: cx('sy-hud', p.className), style: { '--sy-accent': accent(p.tone) } },
      h('div', { className: 'sy-hud__left' },
        h('span', { className: 'sy-live', 'aria-hidden': true }),
        h('span', { className: 'sy-hud__brand' }, 'SYYH'),
        p.onHub ? h('button', { type: 'button', className: 'sy-hud__back', onClick: p.onHub }, '◀ HUB') : null),
      h('div', { className: 'sy-hud__tab' },
        h('span', { className: 'sy-hud__tab-in' }, (p.channel || 'CH-00') + ' · ' + (p.location || 'GATE'))),
      h('div', { className: 'sy-hud__right' },
        h('span', null, p.callsign ? 'HI, ' + String(p.callsign).toUpperCase() : 'GUEST'),
        h('span', { className: 'sy-hud__dim' }, 'REC ' + time)));
  }

  // ---- SectionTitle ---------------------------------------------------------
  function SectionTitle(p) {
    return h('div', { className: cx('sy-stitle', p.className), style: { '--sy-accent': accent(p.tone) } },
      p.index != null ? h('span', { className: 'sy-plate' }, h('span', null, p.index)) : null,
      h(p.as || 'h2', { className: cx('sy-stitle__t', p.size === 'hero' ? 'hero' : 'display-lg') }, p.title),
      p.kana ? h('span', { className: 'sy-stitle__kana kana' }, p.kana) : null);
  }

  // ---- Panel ----------------------------------------------------------------
  function Panel(p) {
    return h('section', { className: cx('sy-panel', p.featured && 'sy-panel--featured', p.className), style: Object.assign({ '--sy-accent': accent(p.tone) }, p.style) },
      (p.title || p.index) ? h('div', { className: 'sy-panel__head' },
        p.index ? h('span', { className: 'sy-plate' }, h('span', null, p.index)) : null,
        p.title ? h('h3', { className: 'sy-panel__title title' }, p.title) : null,
        p.kana ? h('span', { className: 'sy-panel__kana hud-sm' }, p.kana) : null) : null,
      h('div', { className: 'sy-panel__body' }, p.children));
  }

  // ---- WorkTile -------------------------------------------------------------
  function WorkTile(p) {
    var media = p.image
      ? h('img', { src: p.image, alt: p.alt || p.title, className: 'sy-work__img' })
      : h('div', { className: 'sy-work__tone', 'aria-hidden': true }, h('span', { className: 'sfx' }, p.sfx || 'ガガッ'));
    return h('article', { className: cx('sy-work', p.className), style: { '--sy-accent': accent(p.tone || 'a') } },
      h('button', { type: 'button', className: 'sy-work__hit', onClick: p.onOpen, 'aria-label': 'Open ' + p.title }),
      h('div', { className: 'sy-work__media' }, media,
        h('span', { className: 'sy-work__no hud' }, 'No.' + pad2(p.no || 0))),
      h('div', { className: 'sy-work__meta' },
        h('h3', { className: 'title' }, p.title),
        h('p', { className: 'small sy-muted' }, [p.year, p.kind].filter(Boolean).join(' · '))));
  }

  // ---- IslandNode: a line-art floating island ------------------------------
  var TOP_HATCH = [0.2, 0.4, 0.6, 0.8].map(function (t) {
    return (20 + 100 * t) + ',' + (90 + 30 * t) + ' ' + (120 + 100 * t) + ',' + (60 + 30 * t);
  });
  function IslandNode(p) {
    var tone = p.tone || 'a';
    return h('button', {
      type: 'button',
      className: cx('sy-island', p.focused && 'is-focused', p.className),
      style: { '--sy-accent': accent(tone), '--sy-phase': (p.phase || 0) + 's' },
      onClick: p.onClick, onFocus: p.onFocus,
      'aria-label': (p.focused ? 'Enter ' : 'Travel to ') + (p.channel || '') + ' island ' + p.letter + (p.name ? ', ' + p.name : '')
    },
      h('svg', { className: 'sy-island__art', viewBox: '0 0 240 240', 'aria-hidden': true },
        h('ellipse', { className: 'sy-island__ring', cx: 120, cy: 228, rx: 64, ry: 7 }),
        h('polygon', { className: 'sy-island__rock', points: '20,90 120,120 220,90 205,130 170,150 150,200 128,172 104,218 84,158 46,134' }),
        h('polyline', { className: 'sy-island__hatch', points: '60,122 70,150' }),
        h('polyline', { className: 'sy-island__hatch', points: '120,120 116,186' }),
        h('polyline', { className: 'sy-island__hatch', points: '162,126 152,162' }),
        h('polygon', { className: 'sy-island__top', points: '20,90 120,60 220,90 120,120' }),
        TOP_HATCH.map(function (pts, i) { return h('polyline', { key: i, className: 'sy-island__hatch sy-island__hatch--top', points: pts }); }),
        h('polygon', { className: 'sy-island__box', points: '55,82 75,76 95,82 75,88' }),
        h('polygon', { className: 'sy-island__box', points: '55,82 75,88 75,106 55,100' }),
        h('polygon', { className: 'sy-island__box', points: '75,88 95,82 95,100 75,106' }),
        h('polyline', { className: 'sy-island__mast', points: '150,92 150,22' }),
        h('polyline', { className: 'sy-island__mast', points: '140,42 160,42' }),
        h('polyline', { className: 'sy-island__mast', points: '143,62 157,62' }),
        h('circle', { className: 'sy-island__beacon', cx: 150, cy: 18, r: 5 })),
      h('span', { className: 'sy-island__label' },
        h('svg', { className: 'sy-island__leader', viewBox: '0 0 80 60', 'aria-hidden': true },
          h('polyline', { points: '0,60 30,10 80,10' })),
        h('span', { className: 'sy-island__card' },
          h('span', { className: 'sy-plate' }, h('span', null, (p.channel || 'CH') + ' · ' + p.letter)),
          h('span', { className: 'sy-island__name display-md' }, p.name || 'Island ' + p.letter),
          p.kana ? h('span', { className: 'sy-island__kana caption-jp' }, p.kana) : null,
          p.blurb ? h('span', { className: 'sy-island__blurb small' }, p.blurb) : null,
          h('span', { className: 'sy-island__cta hud-sm' }, 'CLICK TO ENTER ▶'))));
  }
  // ---- SpeedLines -----------------------------------------------------------
  function SpeedLines(p) {
    var count = p.count || 56, rand = rng(p.seed || 7), wedges = [];
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 + rand() * 0.08, w = 0.008 + rand() * 0.02, r0 = 28 + rand() * 30, r1 = 160;
      var pt = function (ang, r) { return (Math.cos(ang) * r).toFixed(1) + ',' + (Math.sin(ang) * r).toFixed(1); };
      wedges.push(h('polygon', { key: i, points: pt(a, r0) + ' ' + pt(a - w, r1) + ' ' + pt(a + w, r1) }));
    }
    return h('svg', {
      className: cx('sy-speed', p.active && 'is-active', p.className),
      viewBox: '-100 -100 200 200', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': true,
      style: { '--sy-accent': accent(p.tone) }
    }, h('g', null, wedges));
  }

  // ---- IslandMap: the hub world, travelled by moving the mouse --------------
  // Pointer position (0..1 across the viewport) maps onto the camera's travel range;
  // wheel / trackpad nudges the same value. Islands near the target pull the camera in
  // (magnet), and the island nearest the camera is "focused". Clicking it enters (dive).
  var TRAVEL = { ease: 0.075, snapRadius: 340, focusRadius: 210, wheel: 1600, dive: 650, reduced: 200 };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function pad4(n) { n = Math.max(0, Math.round(n)); return ('000' + n).slice(-4); }
  function nearest(list, x, y) {
    var best = null, bd = Infinity;
    for (var i = 0; i < list.length; i++) { var d = Math.hypot(list[i].x - x, list[i].y - y); if (d < bd) { bd = d; best = list[i]; } }
    return { island: best, dist: bd };
  }
  function routePath(a, b) { // a gentle curve between two islands
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y;
    return 'M' + a.x + ' ' + a.y + ' Q' + (mx - dy * 0.18) + ' ' + (my + dx * 0.18) + ' ' + b.x + ' ' + b.y;
  }
  function IslandMap(p) {
    var islands = p.islands || [], W = p.worldWidth || 2400, H = p.worldHeight || 1500;
    var props = useRef(p); props.current = p;
    var vpRef = useRef(null), worldRef = useRef(null), fgRef = useRef(null);
    var hairX = useRef(null), hairY = useRef(null), readRef = useRef(null), tetherRef = useRef(null);
    var S = useRef({ u: 0.5, v: 0.5, cam: null, vw: 1280, vh: 720, s: 1, zoom: 1, pointer: null, focusId: null, locked: false }).current;
    var fs = useState(null), focus = fs[0], setFocus = fs[1];
    var hs = useState(p.hint !== false), hint = hs[0], setHint = hs[1];
    var ds = useState(null), diving = ds[0], setDiving = ds[1];

    function range() {
      var hw = S.vw / (2 * S.s), hh = S.vh / (2 * S.s);
      return { x0: Math.min(hw, W / 2), x1: Math.max(W - hw, W / 2), y0: Math.min(hh, H / 2), y1: Math.max(H - hh, H / 2) };
    }
    function aimAt(isl) { // move the travel target onto an island (keyboard focus, dive)
      var r = range();
      S.u = r.x1 > r.x0 ? clamp((isl.x - r.x0) / (r.x1 - r.x0), 0, 1) : 0.5;
      S.v = r.y1 > r.y0 ? clamp((isl.y - r.y0) / (r.y1 - r.y0), 0, 1) : 0.5;
    }

    useEffect(function () {
      var el = vpRef.current, raf = 0, reduce = prefersReducedMotion();
      function measure() { var r = el.getBoundingClientRect(); S.vw = r.width; S.vh = r.height; S.s = clamp(r.width / 1500, 0.55, 1); }
      function moved() { if (hint) setHint(false); }
      function onMove(e) {
        if (S.locked) return;
        var r = el.getBoundingClientRect();
        S.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
        S.u = clamp(S.pointer.x / r.width, 0, 1); S.v = clamp(S.pointer.y / r.height, 0, 1); moved();
      }
      function onLeave() { S.pointer = null; }
      function onWheel(e) {
        if (S.locked) return;
        e.preventDefault();
        var dx = e.deltaX, dy = e.deltaY; if (e.shiftKey && !dx) { dx = dy; dy = 0; }
        S.u = clamp(S.u + dx / TRAVEL.wheel, 0, 1); S.v = clamp(S.v + dy / TRAVEL.wheel, 0, 1); moved();
      }
      function tick() {
        var r = range(), tx = r.x0 + S.u * (r.x1 - r.x0), ty = r.y0 + S.v * (r.y1 - r.y0);
        var n = nearest(islands, tx, ty);
        if (n.island && n.dist < TRAVEL.snapRadius) {
          var k = Math.pow(1 - n.dist / TRAVEL.snapRadius, 0.6) * 0.85;
          tx += (n.island.x - tx) * k; ty += (n.island.y - ty) * k;
        }
        if (!S.cam) S.cam = { x: tx, y: ty };
        var e = reduce ? 1 : TRAVEL.ease;
        S.cam.x += (tx - S.cam.x) * e; S.cam.y += (ty - S.cam.y) * e;
        S.zoom += ((S.locked ? 2.6 : 1) - S.zoom) * (reduce ? 1 : 0.12); // the dive
        var sc = S.s * S.zoom, ox = S.vw / 2 - S.cam.x * sc, oy = S.vh / 2 - S.cam.y * sc;
        worldRef.current.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + sc + ')';
        if (fgRef.current) fgRef.current.style.transform = 'translate(' + (S.vw / 2 - S.cam.x * sc * 1.25) + 'px,' + (S.vh / 2 - S.cam.y * sc * 1.25) + 'px) scale(' + sc + ')';
        el.style.backgroundPosition = (ox * 0.4) + 'px ' + (oy * 0.4) + 'px';

        var f = nearest(islands, S.cam.x, S.cam.y), fid = f.island && f.dist < TRAVEL.focusRadius ? f.island.id : null;
        if (fid !== S.focusId) {
          S.focusId = fid; setFocus(fid ? f.island : null);
          if (props.current.onFocus) props.current.onFocus(fid ? f.island : null);
        }
        if (S.pointer) {
          hairX.current.style.transform = 'translateY(' + S.pointer.y + 'px)';
          hairY.current.style.transform = 'translateX(' + S.pointer.x + 'px)';
          readRef.current.style.transform = 'translate(' + (S.pointer.x + 14) + 'px,' + (S.pointer.y + 12) + 'px)';
          readRef.current.textContent = 'X' + pad4((S.pointer.x - ox) / sc) + ' · Y' + pad4((S.pointer.y - oy) / sc);
          var t = tetherRef.current;
          if (fid) {
            t.setAttribute('x1', S.pointer.x); t.setAttribute('y1', S.pointer.y);
            t.setAttribute('x2', f.island.x * sc + ox); t.setAttribute('y2', f.island.y * sc + oy);
          }
        }
        el.classList.toggle('has-pointer', !!S.pointer);
        raf = requestAnimationFrame(tick);
      }
      measure();
      if (!S.cam && p.startId) islands.forEach(function (i) { if (i.id === p.startId) aimAt(i); });
      var ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
      if (ro) ro.observe(el); else window.addEventListener('resize', measure);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
      el.addEventListener('wheel', onWheel, { passive: false });
      raf = requestAnimationFrame(tick);
      return function () {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect(); else window.removeEventListener('resize', measure);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerleave', onLeave);
        el.removeEventListener('wheel', onWheel);
      };
    }, [islands, W, H, hint]);

    function enter(isl) {
      if (diving) return;
      if (!focus || focus.id !== isl.id) { aimAt(isl); return; } // first click on a far island just travels there
      S.locked = true; aimAt(isl); setDiving(isl);
      setTimeout(function () {
        S.locked = false; S.zoom = 1; setDiving(null);
        if (props.current.onEnter) props.current.onEnter(isl);
      }, prefersReducedMotion() ? TRAVEL.reduced : TRAVEL.dive);
    }

    var routes = p.routes || islands.map(function (isl, i) { return [isl.id, islands[(i + 1) % islands.length].id]; });
    var byId = {}; islands.forEach(function (i) { byId[i.id] = i; });

    return h('div', { ref: vpRef, className: cx('sy-map', diving && 'is-dive', p.className), style: p.style },
      h('div', { ref: worldRef, className: 'sy-map__world', style: { width: W, height: H } },
        h('div', { className: 'sy-map__grid', 'aria-hidden': true }),
        h('svg', { className: 'sy-map__routes', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'aria-hidden': true },
          routes.map(function (r) {
            var a = byId[r[0]], b = byId[r[1]]; if (!a || !b) return null;
            var hot = focus && (focus.id === a.id || focus.id === b.id);
            return h('path', { key: r.join('-'), d: routePath(a, b), className: cx('sy-route', hot && 'is-hot'),
              style: hot ? { '--sy-accent': accent(focus.tone) } : null });
          }),
          islands.map(function (isl) {
            var on = focus && focus.id === isl.id;
            return h('g', { key: isl.id, className: cx('sy-orbit', on && 'is-on'), style: { '--sy-accent': accent(isl.tone) } },
              h('circle', { cx: isl.x, cy: isl.y, r: 170 }),
              h('circle', { className: 'sy-orbit__dash', cx: isl.x, cy: isl.y, r: 205 }),
              h('text', { className: 'sy-orbit__coord', x: isl.x + 175, y: isl.y + 196 }, 'X' + pad4(isl.x) + ' Y' + pad4(isl.y)));
          })),
        islands.map(function (isl, i) {
          return h('div', { key: isl.id, className: 'sy-map__slot', style: { left: isl.x, top: isl.y } },
            h(IslandNode, Object.assign({}, isl, {
              phase: i * -1.3, focused: focus && focus.id === isl.id,
              onClick: function () { enter(isl); }, onFocus: function () { aimAt(isl); }
            })));
        })),
      p.foreground ? h('div', { ref: fgRef, className: 'sy-map__fg', style: { width: W, height: H }, 'aria-hidden': true }, p.foreground) : null,
      h('div', { className: 'sy-map__hair sy-map__hair--x', ref: hairX, 'aria-hidden': true }),
      h('div', { className: 'sy-map__hair sy-map__hair--y', ref: hairY, 'aria-hidden': true }),
      h('svg', { className: 'sy-map__tether', 'aria-hidden': true, style: focus ? { '--sy-accent': accent(focus.tone) } : null },
        h('line', { ref: tetherRef, className: focus ? 'is-on' : '' })),
      h('span', { className: 'sy-map__read hud-sm', ref: readRef, 'aria-hidden': true }),
      h(SpeedLines, { active: !!diving, tone: diving ? diving.tone : 'signal' }),
      h('div', { className: 'sy-map__flash', style: { '--sy-accent': accent('hazard') }, 'aria-hidden': true }),
      hint ? h(TravelHint, null) : null,
      h('p', { className: 'sy-map__prompt hud', role: 'status' },
        diving ? 'ENTERING ' + diving.channel + '…'
          : focus ? focus.channel + ' · ' + String(focus.name).toUpperCase() + ' — CLICK TO ENTER'
          : (p.prompt || 'MOVE TO TRAVEL')));
  }
  IslandMap.timing = TRAVEL;

  function TravelHint() {
    return h('div', { className: 'sy-hint', 'aria-hidden': true },
      h('svg', { viewBox: '0 0 120 120', className: 'sy-hint__mouse' },
        h('rect', { x: 44, y: 34, width: 32, height: 52, rx: 16 }),
        h('line', { x1: 60, y1: 42, x2: 60, y2: 52 }),
        h('path', { d: 'M30 60 H12 M18 54 L12 60 L18 66 M90 60 H108 M102 54 L108 60 L102 66 M60 26 V10 M54 16 L60 10 L66 16 M60 94 V110 M54 104 L60 110 L66 104' })),
      h('span', { className: 'hud' }, 'MOVE YOUR MOUSE TO TRAVEL'),
      h('span', { className: 'caption-jp sy-muted' }, 'マウスを動かして、島から島へ'));
  }

  // ---- IntroSequence: the line-drawn entrance -------------------------------
  // line → frame → title stroke + counter → guidance → children (the gate). Any click or key skips.
  var INTRO = [0, 550, 1050, 2500, 3500];
  function IntroSequence(p) {
    var ps = useState(prefersReducedMotion() ? 4 : 0), phase = ps[0], setPhase = ps[1];
    var countRef = useRef(null);
    useEffect(function () {
      if (phase >= 4) return;
      var timers = INTRO.slice(phase + 1).map(function (t, i) {
        return setTimeout(function () { setPhase(phase + 1 + i); }, t - INTRO[phase]);
      });
      var start = performance.now(), raf = 0;
      function count(now) {
        var k = clamp((now - start - (INTRO[2] - INTRO[phase])) / (INTRO[3] - INTRO[2]), 0, 1);
        if (countRef.current) countRef.current.textContent = ('00' + Math.round(k * 100)).slice(-3);
        if (k < 1) raf = requestAnimationFrame(count);
      }
      raf = requestAnimationFrame(count);
      function skip() { setPhase(4); }
      window.addEventListener('keydown', skip); window.addEventListener('pointerdown', skip);
      return function () {
        timers.forEach(clearTimeout); cancelAnimationFrame(raf);
        window.removeEventListener('keydown', skip); window.removeEventListener('pointerdown', skip);
      };
    }, [phase >= 4]);
    useEffect(function () { if (phase === 4 && p.onDone) p.onDone(); }, [phase]);

    return h('div', { className: cx('sy-intro', 'is-p' + phase, p.className) },
      h('div', { className: 'sy-intro__line sy-intro__line--top', 'aria-hidden': true }),
      h('div', { className: 'sy-intro__line sy-intro__line--bot', 'aria-hidden': true }),
      h('div', { className: 'sy-intro__side sy-intro__side--l', 'aria-hidden': true }),
      h('div', { className: 'sy-intro__side sy-intro__side--r', 'aria-hidden': true }),
      h('div', { className: 'sy-intro__meta sy-intro__meta--tl hud-sm' }, (p.title || 'SYYH') + ' // SIGNAL'),
      h('div', { className: 'sy-intro__meta sy-intro__meta--tr hud-sm' }, 'EP.00 · ARRIVAL'),
      h('div', { className: 'sy-intro__meta sy-intro__meta--bl hud-sm' }, 'LOADING ', h('span', { ref: countRef }, phase >= 4 ? '100' : '000'), '%'),
      h('div', { className: 'sy-intro__meta sy-intro__meta--br hud-sm' }, phase >= 4 ? '' : 'CLICK TO SKIP ▶'),
      h('div', { className: 'sy-intro__vert caption-jp', 'aria-hidden': true }, p.caption || '信号を受信中'),
      phase < 4 ? h('div', { className: 'sy-intro__stage' },
        h('svg', { className: 'sy-intro__title', viewBox: '0 0 640 170', role: 'img', 'aria-label': p.title || 'SYYH' },
          h('text', { x: 320, y: 140, textAnchor: 'middle' }, p.title || 'SYYH')),
        h('div', { className: 'sy-intro__guide' }, h(TravelHint, null))) : null,
      phase >= 4 ? h('div', { className: 'sy-intro__content' }, p.children) : null);
  }

  // ---- GateConsole ----------------------------------------------------------
  function GateConsole(p) {
    var ss = useState(''); var name = ss[0], setName = ss[1];
    var boot = p.bootLines || ['SYYH BROADCAST SYSTEM v0.2', 'SIGNAL ........ 98%', 'ISLANDS ....... 4 ONLINE'];
    function submit(e) { e.preventDefault(); p.onEnter && p.onEnter(name.trim() || null); }
    return h('form', { className: cx('sy-gate', p.className), onSubmit: submit },
      h('div', { className: 'sy-gate__boot hud-sm' }, boot.map(function (l, i) { return h('div', { key: i }, '> ' + l); }),
        h('div', null, '> ', h('span', { className: 'sy-caret' }, '_'))),
      h('h1', { className: 'sy-gate__title hero' }, p.title || 'VISITOR ACCESS'),
      h('label', { className: 'sy-field' },
        h('span', { className: 'hud-sm sy-muted' }, 'CALLSIGN (OPTIONAL)'),
        h('input', { className: 'sy-input', value: name, maxLength: 20, placeholder: 'e.g. PROXY_07', onChange: function (e) { setName(e.target.value); } })),
      h('div', { className: 'sy-gate__actions' },
        h(Button, { type: 'submit' }, 'TUNE IN ▶'),
        h(Button, { variant: 'ghost', onClick: function () { p.onEnter && p.onEnter(null); } }, 'ENTER AS GUEST')));
  }

  window.SYYH = Object.assign(window.SYYH || {}, {
    Button: Button, Sticker: Sticker, HudBar: HudBar, SectionTitle: SectionTitle, Panel: Panel,
    WorkTile: WorkTile, IslandNode: IslandNode, SpeedLines: SpeedLines, IslandMap: IslandMap,
    IntroSequence: IntroSequence, TravelHint: TravelHint, GateConsole: GateConsole,
    util: { accent: accent, rng: rng, nearest: nearest }
  });
})();
