/* SYYH Signal: website draft. Composes the SYYH components into the five places of the site.
   Used by the Pages previews and by prototype/index.html. Content is placeholder. */
(function () {
  var S = window.SYYH, h = React.createElement, useState = React.useState;

  var ISLANDS = [
    { id: 'a', letter: 'A', name: 'Works', kana: 'サクヒン', channel: 'CH-01', tone: 'a', x: 380, y: 330 },
    { id: 'b', letter: 'B', name: 'About', kana: 'ジコショウカイ', channel: 'CH-02', tone: 'b', x: 1180, y: 280 },
    { id: 'c', letter: 'C', name: 'Story', kana: 'モノガタリ', channel: 'CH-03', tone: 'c', x: 520, y: 760 },
    { id: 'd', letter: 'D', name: 'Board', kana: 'ケイジバン', channel: 'CH-04', tone: 'd', x: 1220, y: 740 }];
  var WORKS = [
    { no: 7, title: 'Neon Alley', year: 2026, kind: 'Key visual', sfx: 'ドンッ' },
    { no: 6, title: 'Bangboo Parade', year: 2026, kind: 'AIGC series', sfx: 'ワイワイ', tone: 'b' },
    { no: 5, title: 'Hollow Signal', year: 2025, kind: 'Motion', sfx: 'ザザッ', tone: 'c' },
    { no: 4, title: 'Rooftop 04:00', year: 2025, kind: 'Illustration', sfx: 'シーン', tone: 'd' },
    { no: 3, title: 'Video Store', year: 2025, kind: 'Scene', sfx: 'ガチャ' },
    { no: 2, title: 'Line Art Riot', year: 2024, kind: 'Manga page', sfx: 'バン', tone: 'b' },
    { no: 1, title: 'First Signal', year: 2024, kind: 'Sketch', sfx: 'ピッ', tone: 'c' }];

  var css = [
    '.dr-app{position:relative;height:100vh;display:flex;flex-direction:column;background:var(--void);overflow:hidden}',
    '.dr-stage{position:relative;flex:1;min-height:0}',
    '.dr-scroll{position:absolute;inset:0;overflow:auto}',
    '.dr-arrive{animation:dr-wipe 420ms cubic-bezier(.7,0,.2,1) both}',
    '@keyframes dr-wipe{from{clip-path:polygon(0 0,0 0,-20% 100%,-20% 100%)}to{clip-path:polygon(0 0,120% 0,100% 100%,-20% 100%)}}',
    '.dr-wrap{padding:var(--space-12);display:flex;flex-direction:column;gap:var(--space-16)}',
    '.dr-gate{position:absolute;inset:0;display:grid;place-items:center;padding:var(--space-4)}',
    '.dr-gate__sfx{position:absolute;right:var(--space-12);top:var(--space-12);color:var(--pop);transform:rotate(8deg)}',
    '.dr-strip{position:absolute;left:0;right:0;bottom:0;height:18px;border-top:3px solid var(--line)}',
    '.dr-hero{display:grid;grid-template-columns:1.25fr 1fr;gap:var(--space-12);align-items:end}',
    '.dr-hero__media{position:relative;aspect-ratio:16/10;border:3px solid var(--line);box-shadow:var(--shadow-pop);background-color:var(--surface);display:grid;place-items:center}',
    '.dr-hero__media .sfx{font-size:clamp(56px,9vw,120px);color:var(--island-a);transform:rotate(var(--tilt));-webkit-text-stroke:3px var(--on-accent);paint-order:stroke}',
    '.dr-hero__media .sy-sticker{position:absolute;left:var(--space-4);top:var(--space-4)}',
    '.dr-hero__text{display:flex;flex-direction:column;gap:var(--space-6);align-items:flex-start}',
    '.dr-hero__text p{margin:0}',
    '.dr-row{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(220px,1fr);gap:var(--space-6);overflow-x:auto;padding:var(--space-2) var(--space-2) var(--space-6);scroll-snap-type:x mandatory}',
    '.dr-row>*{scroll-snap-align:start}',
    '.dr-about{display:grid;grid-template-columns:1.1fr 1fr;gap:var(--space-12);align-items:center}',
    '.dr-about h1{margin:0}',
    '.dr-about p{margin:var(--space-6) 0 0;max-width:34em}',
    '.dr-portrait{aspect-ratio:1;border:3px solid var(--line);box-shadow:var(--shadow-pop);display:grid;place-items:center;background-color:var(--surface)}',
    '.dr-portrait .sfx{color:var(--island-b);-webkit-text-stroke:3px var(--on-accent);paint-order:stroke;transform:rotate(-6deg)}',
    '.dr-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6)}',
    '.dr-tags{display:flex;flex-wrap:wrap;gap:var(--space-3)}',
    '.dr-list{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:var(--space-2)}',
    '.dr-list b{font-family:var(--font-pixel);font-weight:400;color:var(--signal-text);margin-right:var(--space-3)}',
    '.dr-frames{display:grid;grid-template-columns:2fr 1fr;grid-auto-rows:220px;gap:var(--space-4)}',
    '.dr-frame{border:3px solid var(--line);background-color:var(--surface);position:relative;display:flex;align-items:flex-end;padding:var(--space-4)}',
    '.dr-frame:first-child{grid-row:span 2}',
    '.dr-frame .cap{background:var(--surface-raised);border:2px solid var(--line);padding:var(--space-2) var(--space-3)}',
    '.dr-board{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-6)}',
    '.dr-note{background:var(--surface);border:3px solid var(--line);padding:var(--space-6);display:flex;flex-direction:column;gap:var(--space-3);align-items:flex-start;color:var(--ink);text-decoration:none}',
    '.dr-note:nth-child(odd){transform:rotate(-1.5deg)}.dr-note:nth-child(even){transform:rotate(1.2deg)}',
    '.dr-note:hover{box-shadow:var(--shadow-pop)}',
    '@media (max-width:820px){.dr-hero,.dr-about{grid-template-columns:1fr}.dr-grid3,.dr-board{grid-template-columns:1fr 1fr}.dr-wrap{padding:var(--space-4)}}',
    '@media (prefers-reduced-motion:reduce){.dr-arrive{animation:none}}'].join('\n');
  if (!document.getElementById('dr-style')) {
    var st = document.createElement('style'); st.id = 'dr-style'; st.textContent = css; document.head.appendChild(st);
  }

  // ---- places ---------------------------------------------------------------
  function GateScreen(p) {
    return h('div', { className: 'dr-gate sy-scanlines' },
      h('span', { className: 'dr-gate__sfx sfx', 'aria-hidden': true }, 'ザザ…'),
      h(S.GateConsole, { onEnter: p.onEnter }),
      h('div', { className: 'dr-strip sy-hazard', 'aria-hidden': true }));
  }

  function WorksIsland() {
    return h('div', { className: 'dr-wrap' },
      h('section', { className: 'dr-hero' },
        h('div', { className: 'dr-hero__media sy-tone-bg' },
          h(S.Sticker, { tone: 'a' }, 'FEATURED · No.07'),
          h('span', { className: 'sfx', 'aria-hidden': true }, 'ドンッ')),
        h('div', { className: 'dr-hero__text' },
          h(S.SectionTitle, { index: 'CH-01', title: 'Works', kana: 'サクヒン', tone: 'a', size: 'hero', as: 'h1' }),
          h('h2', { className: 'display-md', style: { margin: 0 } }, 'Neon Alley'),
          h('p', { className: 'body sy-muted' }, '2026 · Key visual · A rainy alley lit by one vending machine and too many signs.'),
          h(S.Button, { tone: 'a' }, 'VIEW WORK ▶'))),
      h('section', null,
        h(S.SectionTitle, { index: 'No.01–07', title: 'Selected works', kana: 'セレクト', tone: 'a' }),
        h('div', { className: 'dr-row', style: { marginTop: 'var(--space-8)' } },
          WORKS.map(function (w) { return h(S.WorkTile, Object.assign({ key: w.no }, w)); }))));
  }

  function AboutIsland() {
    var ts = useState('night'), theme = ts[0], setTheme = ts[1];
    return h('div', { 'data-theme': theme, style: { background: 'var(--void)', color: 'var(--ink)', minHeight: '100%' } },
      h('div', { className: 'dr-wrap' },
        h('section', { className: 'dr-about' },
          h('div', null,
            h(S.Sticker, { tone: 'b' }, 'CH-02 · ABOUT'),
            h('h1', { className: 'hero', style: { marginTop: 'var(--space-6)' } }, "HI, I'M SYYH."),
            h('span', { className: 'kana sy-muted', style: { display: 'block', marginTop: 'var(--space-3)' } }, 'ジコショウカイ'),
            h('p', { className: 'body-lg' }, 'I design things that glow in the dark: AIGC art, key visuals and odd little websites. Off the clock I am a Zenless Zone Zero proxy and a manga hoarder.'),
            h('div', { style: { display: 'flex', gap: 16, marginTop: 'var(--space-8)' } },
              h(S.Button, { tone: 'b' }, 'SAY HI ▶'),
              h(S.Button, { variant: 'ghost', onClick: function () { setTheme(theme === 'night' ? 'paper' : 'night'); } },
                theme === 'night' ? 'PAPER MODE' : 'NIGHT MODE'))),
          h('div', { className: 'dr-portrait sy-tone-bg' }, h('span', { className: 'sfx' }, 'ニヤッ'))),
        h('section', { className: 'dr-grid3' },
          h(S.Panel, { index: '01', title: 'Likes', kana: 'スキ', tone: 'b' },
            h('div', { className: 'dr-tags' },
              h(S.Sticker, { tone: 'd' }, 'ZZZ'), h(S.Sticker, { tone: 'b', tilt: 'right' }, 'MANGA'),
              h(S.Sticker, { tone: 'c' }, 'AIGC'), h(S.Sticker, { tone: 'a', tilt: 'right' }, 'NIGHT CITY'))),
          h(S.Panel, { index: '02', title: 'Tools', kana: 'ドウグ', tone: 'b' },
            h('ul', { className: 'dr-list body' },
              h('li', null, h('b', null, '▶'), 'Stable Diffusion / ComfyUI'),
              h('li', null, h('b', null, '▶'), 'Photoshop · Clip Studio'),
              h('li', null, h('b', null, '▶'), 'Figma · Blender'))),
          h(S.Panel, { index: '03', title: 'Timeline', kana: 'レキシ', tone: 'b' },
            h('ul', { className: 'dr-list body' },
              h('li', null, h('b', null, '2026'), 'This site goes live'),
              h('li', null, h('b', null, '2025'), 'First AIGC series'),
              h('li', null, h('b', null, '2024'), 'Started drawing again'))))));
  }

  function StoryIsland() {
    return h('div', { className: 'dr-wrap' },
      h(S.SectionTitle, { index: 'CH-03 · EP.01', title: 'The city that floats', kana: 'モノガタリ', tone: 'c', size: 'hero', as: 'h1' }),
      h('p', { className: 'body sy-muted', style: { margin: 0, maxWidth: '40em' } },
        'Draft: a scroll-scrubbed cinematic (canvas image sequence) plays here. Each scroll step advances the frames, and manga captions pop in at key moments.'),
      h('div', { className: 'dr-frames' },
        h('div', { className: 'dr-frame sy-tone-bg' }, h('span', { className: 'cap hud' }, 'FRAME 001 · THE SIGNAL STARTS')),
        h('div', { className: 'dr-frame sy-scanlines' }, h('span', { className: 'cap hud' }, 'FRAME 120 · ISLANDS RISE')),
        h('div', { className: 'dr-frame sy-tone-bg' }, h('span', { className: 'cap hud' }, 'FRAME 240 · YOU ARRIVE'))));
  }

  function BoardIsland() {
    var notes = [['X / TWITTER', '@syyh', 'd'], ['BILIBILI', 'space/syyh', 'c'], ['XIAOHONGSHU', 'SYYH', 'b'], ['EMAIL', 'hello@…', 'a']];
    return h('div', { className: 'dr-wrap' },
      h(S.SectionTitle, { index: 'CH-04', title: 'Notice board', kana: 'ケイジバン', tone: 'd', size: 'hero', as: 'h1' }),
      h('div', { className: 'dr-board' },
        notes.map(function (n) {
          return h('a', { key: n[0], className: 'dr-note', href: '#' },
            h(S.Sticker, { tone: n[2] }, n[0]), h('span', { className: 'title' }, n[1]), h('span', { className: 'hud-sm sy-muted' }, 'OPEN ↗'));
        })),
      h(S.Panel, { index: 'GB', title: 'Guestbook', kana: 'ラクガキ', tone: 'd' },
        h('p', { className: 'body sy-muted', style: { margin: 0 } }, 'Draft: visitors leave a one-line message, signed with their gate callsign.')));
  }

  var PAGES = { a: WorksIsland, b: AboutIsland, c: StoryIsland, d: BoardIsland };
  function byId(id) { return ISLANDS.filter(function (i) { return i.id === id; })[0]; }

  // ---- the app: gate → hub → island, every move between islands is a jump ----
  function App(p) {
    var ss = useState(p.start || 'gate'), screen = ss[0], setScreen = ss[1];
    var cs = useState(p.callsign || null), callsign = cs[0], setCallsign = cs[1];
    var isl = byId(screen), Page = isl && PAGES[isl.id];
    var hud = screen === 'gate' ? { channel: 'CH-00', location: 'GATE' }
      : isl ? { channel: isl.channel, location: isl.name, tone: isl.tone, onHub: function () { setScreen('hub'); } }
      : { channel: 'HUB', location: 'NIGHT SKY' };
    return h('div', { className: 'dr-app' },
      h(S.HudBar, Object.assign({ callsign: callsign }, hud)),
      h('div', { className: 'dr-stage' },
        screen === 'gate' ? h(GateScreen, { onEnter: function (c) { setCallsign(c); setScreen('hub'); } })
        : isl ? h('div', { key: isl.id, className: 'dr-scroll dr-arrive' }, h(Page))
        : h(S.IslandMap, { islands: ISLANDS, onArrive: function (i) { setScreen(i.id); } })));
  }

  window.SYYHDraft = { App: App, ISLANDS: ISLANDS, WORKS: WORKS, GateScreen: GateScreen,
    WorksIsland: WorksIsland, AboutIsland: AboutIsland, StoryIsland: StoryIsland, BoardIsland: BoardIsland };
})();
