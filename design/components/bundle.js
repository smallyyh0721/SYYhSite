/* @ds-bundle: {"format":4,"namespace":"SYYH","components":[{"name":"Button"},{"name":"Sticker"},{"name":"HudBar"},{"name":"SectionTitle"},{"name":"Panel"},{"name":"WorkTile"},{"name":"IslandNode"},{"name":"SpeedLines"},{"name":"IslandMap"},{"name":"GateConsole"}]} */
(function () {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useCallback = React.useCallback;

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

  // ---- IslandNode -----------------------------------------------------------
  function IslandNode(p) {
    var tone = p.tone || 'a';
    return h('button', {
      type: 'button',
      className: cx('sy-island', p.active && 'is-active', p.className),
      style: { '--sy-accent': accent(tone), '--sy-phase': (p.phase || 0) + 's' },
      onClick: p.onClick,
      'aria-label': 'Jump to ' + (p.channel || '') + ' island ' + p.letter + (p.name ? ' — ' + p.name : '')
    },
      h('span', { className: 'sy-island__label' },
        h(Sticker, { tone: tone, tilt: p.letter && 'ABCD'.indexOf(p.letter) % 2 ? 'right' : undefined }, (p.channel || 'CH') + ' ▶'),
        h('span', { className: 'sy-island__name title' }, p.name || 'Island ' + p.letter),
        p.kana ? h('span', { className: 'sy-island__kana kana' }, p.kana) : null),
      h('svg', { className: 'sy-island__art', viewBox: '0 0 240 210', 'aria-hidden': true },
        h('ellipse', { className: 'sy-island__shadow', cx: 120, cy: 200, rx: 70, ry: 8 }),
        h('polygon', { className: 'sy-island__rock', points: '20,70 120,100 220,70 204,108 168,126 146,172 124,150 98,180 80,132 44,112' }),
        h('polyline', { className: 'sy-island__hatch', points: '60,112 88,128 104,150' }),
        h('polyline', { className: 'sy-island__hatch', points: '160,118 150,140' }),
        h('polygon', { className: 'sy-island__top', points: '20,70 120,40 220,70 120,100' }),
        h('text', { className: 'sy-island__letter', x: 120, y: 84, textAnchor: 'middle' }, p.letter)));
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

  // ---- IslandMap: the hub world and the island jump -------------------------
  var JUMP = { lift: 250, pan: 450, dive: 220, reduced: 200 };
  function IslandMap(p) {
    var islands = p.islands || [], W = p.worldWidth || 1600, H = p.worldHeight || 1000;
    var vpRef = useRef(null);
    var vs = useState({ w: 1280, h: 720 }); var vp = vs[0], setVp = vs[1];
    var cs = useState(null); var cam = cs[0], setCam = cs[1];          // {x, y, s} or null = overview
    var ps = useState('idle'); var phase = ps[0], setPhase = ps[1];    // idle | lift | pan | dive
    var ts = useState(null); var target = ts[0], setTarget = ts[1];

    useEffect(function () {
      var el = vpRef.current; if (!el) return;
      var measure = function () { var r = el.getBoundingClientRect(); setVp({ w: r.width, h: r.height }); };
      measure();
      var ro = window.ResizeObserver ? new ResizeObserver(measure) : null;
      if (ro) ro.observe(el); else window.addEventListener('resize', measure);
      return function () { if (ro) ro.disconnect(); else window.removeEventListener('resize', measure); };
    }, []);

    var fit = Math.min(vp.w / W, vp.h / H, 1);
    var view = cam || { x: W / 2, y: H / 2, s: fit };
    var transform = 'translate(' + (vp.w / 2 - view.x * view.s) + 'px,' + (vp.h / 2 - view.y * view.s) + 'px) scale(' + view.s + ')';

    var jump = useCallback(function (isl) {
      if (phase !== 'idle') return;
      setTarget(isl);
      if (prefersReducedMotion()) {
        setPhase('dive'); setTimeout(function () { setPhase('idle'); setCam(null); p.onArrive && p.onArrive(isl); }, JUMP.reduced);
        return;
      }
      setPhase('lift'); setCam({ x: W / 2, y: H / 2, s: fit * 0.85 });
      setTimeout(function () { setPhase('pan'); setCam({ x: isl.x, y: isl.y, s: fit * 1.1 }); }, JUMP.lift);
      setTimeout(function () { setPhase('dive'); setCam({ x: isl.x, y: isl.y, s: fit * 2.4 }); }, JUMP.lift + JUMP.pan);
      setTimeout(function () { setPhase('idle'); setCam(null); setTarget(null); p.onArrive && p.onArrive(isl); }, JUMP.lift + JUMP.pan + JUMP.dive);
    }, [phase, fit, W, H, p.onArrive]);

    return h('div', { ref: vpRef, className: cx('sy-map', 'is-' + phase, p.className), style: p.style },
      h('div', { className: 'sy-map__world', style: { width: W, height: H, transform: transform } },
        h('div', { className: 'sy-map__grid', 'aria-hidden': true }),
        islands.map(function (isl, i) {
          return h('div', { key: isl.id, className: 'sy-map__slot', style: { left: isl.x, top: isl.y } },
            h(IslandNode, Object.assign({}, isl, { phase: i * -1.3, active: target && target.id === isl.id, onClick: function () { jump(isl); } })));
        })),
      h(SpeedLines, { active: phase === 'pan' || phase === 'dive', tone: target ? target.tone : 'signal' }),
      h('div', { className: 'sy-map__flash', style: { '--sy-accent': accent('hazard') }, 'aria-hidden': true }),
      h('p', { className: 'sy-map__prompt hud', role: 'status' },
        phase === 'idle' ? (p.prompt || 'PICK AN ISLAND ▶') : 'JUMPING TO ' + (target ? target.channel : '') + '…'));
  }
  IslandMap.timing = JUMP;

  // ---- GateConsole ----------------------------------------------------------
  function GateConsole(p) {
    var ss = useState(''); var name = ss[0], setName = ss[1];
    var boot = p.bootLines || ['SYYH BROADCAST SYSTEM v0.1', 'SIGNAL ........ 98%', 'ISLANDS ....... 4 ONLINE'];
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
    WorkTile: WorkTile, IslandNode: IslandNode, SpeedLines: SpeedLines, IslandMap: IslandMap, GateConsole: GateConsole,
    util: { accent: accent, rng: rng }
  });
})();
