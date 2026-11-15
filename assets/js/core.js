/* PARALLAX core: namespace, data registry, script loader, router, settings, drawer, home */
(function () {
  'use strict';
  const CM = window.CM = {
    pages: {}, store: {}, version: '0.1.0',
    terr: {}, terrIndex: null, relief: null, polities: null, geo: null, modern: null,
    lessons: {}, battles: {}, battleIndex: [], curriculum: null, terms: null, termChunks: {}, topics: [],
    events: null, searchIndex: null, places: {}, routes: {}
  };

  /* ---------------- data registry (data files call these) ---------------- */
  CM.data = {
    terr(id, obj) { CM.terr[id] = obj; },
    terrIndex(obj) { CM.terrIndex = obj; },
    relief(obj) { CM.relief = obj; },
    polities(arr) { CM.polities = arr; },
    geo(obj) { CM.geo = obj; },
    modern(arr) { CM.modern = arr; },
    lesson(obj) { CM.lessons[obj.id] = obj; },
    battle(obj) { CM.battles[obj.id] = obj; },
    battleIndex(arr) { CM.battleIndex = arr; },
    curriculum(obj) { CM.curriculum = obj; },
    termsIndex(arr) {
      CM.terms = { list: arr, byName: new Map() };
      arr.forEach(t => {
        CM.terms.byName.set(t.h, t);
        (t.a || []).forEach(a => { if (!CM.terms.byName.has(a)) CM.terms.byName.set(a, t); });
      });
    },
    termChunk(key, obj) { CM.termChunks[key] = obj; },
    topics(arr) { CM.topics = arr; },
    events(arr) { CM.events = arr; },
    search(arr) { CM.searchIndex = arr; },
    places(obj) { Object.assign(CM.places, obj); },
    routes(obj) { Object.assign(CM.routes, obj); },
    areas(obj) { Object.assign(CM.areas, obj); },
    glabels(obj) { Object.assign(CM.glabels, obj); }
  };
  CM.areas = {}; CM.glabels = {};

  /* ---------------- loader ---------------- */
  const loading = new Map();
  CM.load = function (src) {
    if (loading.has(src)) return loading.get(src);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading.delete(src); reject(new Error('読み込めませんでした: ' + src)); };
      document.head.appendChild(s);
    });
    loading.set(src, p);
    return p;
  };
  CM.loadAll = (list) => Promise.all(list.map(CM.load));

  /* ---------------- utils ---------------- */
  CM.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  CM.h = function (tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };
  CM.fmtYear = function (y, opts) {
    if (y == null || isNaN(y)) return '';
    y = Math.round(y);
    if (y <= -100000) { const m = -y / 10000; return '約' + (m >= 100 ? Math.round(m / 100) + '00万' : (Math.round(m * 10) / 10) + '万') + '年前'; }
    if (y <= -10000) return '約' + Math.round(-y / 1000) / 10 + '万年前';
    if (y < 0) return '前' + (-y) + '年';
    if (y === 0) return '前1年';
    return y + '年';
  };
  CM.fmtYearShort = (y) => y < 0 ? '前' + (-y) : String(y);

  /* Round every corner of a polyline with a tangent quadratic arc (G1-continuous, no cusps).
     Interior shape points get maximal rounding; points flagged in keep[] are rounded less so the
     curve stays close to them. Returns dense points plus, for each input point, the nearest dense index. */
  CM.roundPts = function (P, keep, seg) {
    const n = P.length;
    if (n < 3) return { pts: P.map(p => [p[0], p[1]]), idx: P.map((_, i) => (i ? 1 : 0)) };
    const out = [[P[0][0], P[0][1]]], idx = [0];
    const steps = seg || 14;
    for (let i = 1; i < n - 1; i++) {
      const a = P[i - 1], v = P[i], b = P[i + 1];
      const l1 = Math.hypot(v[0] - a[0], v[1] - a[1]), l2 = Math.hypot(b[0] - v[0], b[1] - v[1]);
      if (l1 < 1e-9 || l2 < 1e-9) { idx.push(out.length - 1); continue; }
      const f = keep && keep[i] ? 0.3 : 0.5;
      const r1 = l1 * (i === 1 ? Math.min(0.85, f * 1.6) : f), r2 = l2 * (i === n - 2 ? Math.min(0.85, f * 1.6) : f);
      const A = [v[0] + (a[0] - v[0]) * r1 / l1, v[1] + (a[1] - v[1]) * r1 / l1];
      const B = [v[0] + (b[0] - v[0]) * r2 / l2, v[1] + (b[1] - v[1]) * r2 / l2];
      let best = 0, bd = Infinity;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, u = 1 - t;
        const q = [u * u * A[0] + 2 * u * t * v[0] + t * t * B[0], u * u * A[1] + 2 * u * t * v[1] + t * t * B[1]];
        const last = out[out.length - 1];
        if (Math.hypot(q[0] - last[0], q[1] - last[1]) > 1e-9) out.push(q);
        const d = Math.hypot(q[0] - v[0], q[1] - v[1]); if (d < bd) { bd = d; best = out.length - 1; }
      }
      idx.push(best);
    }
    out.push([P[n - 1][0], P[n - 1][1]]); idx.push(out.length - 1);
    return { pts: out, idx };
  };
  CM.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  CM.toast = function (msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(CM.toast._t); CM.toast._t = setTimeout(() => t.classList.remove('on'), 2400);
  };
  CM.reducedMotion = () => document.documentElement.getAttribute('data-motion') === 'reduced' ||
    (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  // cached theme tokens for canvas drawing
  CM.tv = function () {
    if (CM._tv) return CM._tv;
    const g = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    CM._tv = { sea: g('--map-sea'), relief: g('--relief').split(',').map(Number), halo: g('--halo'), ink: g('--ink'), ink2: g('--ink-2'), display: g('--font-display'), body: g('--font-body') };
    return CM._tv;
  };
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { CM._tv = null; });
  CM.css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  CM.isDark = function () {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t === 'dark' || t === 'navy';
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  };

  /* ---------------- persistence (per-browser) ---------------- */
  CM.storage = {
    get(key, def) { try { const v = localStorage.getItem('cm.' + key); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(key, val) { try { localStorage.setItem('cm.' + key, JSON.stringify(val)); } catch (e) { /* storage unavailable */ } }
  };
  CM.progress = {
    markRead(id) { const r = CM.storage.get('read', {}); r[id] = Date.now(); CM.storage.set('read', r); CM.storage.set('last', id); },
    isRead(id) { return !!CM.storage.get('read', {})[id]; },
    quiz(id, score, total) { const q = CM.storage.get('quiz', {}); q[id] = [score, total, Date.now()]; CM.storage.set('quiz', q); }
  };

  /* ---------------- settings ---------------- */
  function applySettings(s) {
    const root = document.documentElement;
    if (s.theme && s.theme !== 'system') root.setAttribute('data-theme', s.theme); else root.removeAttribute('data-theme');
    root.setAttribute('data-font', s.font || 'gothic');
    root.setAttribute('data-size', s.size || 'm');
    root.setAttribute('data-ui', s.ui || 'm');
    if (s.ruby === false) root.setAttribute('data-ruby', 'off'); else root.removeAttribute('data-ruby');
    if (s.motion === 'reduced') root.setAttribute('data-motion', 'reduced'); else root.removeAttribute('data-motion');
    if (s.imp === false) root.setAttribute('data-imp', 'off'); else root.removeAttribute('data-imp');
    if (s.blur === false) root.setAttribute('data-blur', 'off'); else root.removeAttribute('data-blur');
    CM._tv = null;
    document.dispatchEvent(new CustomEvent('cm:theme'));
  }
  function initSettings() {
    const s = CM.storage.get('settings', {});
    applySettings(s);
    const pop = document.getElementById('settings');
    const $ = (id) => document.getElementById(id);
    $('set-theme').value = s.theme || 'system';
    $('set-font').value = s.font || 'gothic';
    $('set-size').value = s.size || 'm';
    $('set-ui').value = s.ui || 'm';
    $('set-ruby').checked = s.ruby !== false;
    $('set-motion').checked = s.motion === 'reduced';
    $('set-imp').checked = s.imp !== false;
    $('set-blur').checked = s.blur !== false;
    const save = () => {
      const n = { theme: $('set-theme').value, font: $('set-font').value, size: $('set-size').value, ui: $('set-ui').value, ruby: $('set-ruby').checked, imp: $('set-imp').checked, blur: $('set-blur').checked, motion: $('set-motion').checked ? 'reduced' : 'auto' };
      CM.storage.set('settings', n); applySettings(n); if (CM.fitTopbar) CM.fitTopbar();
    };
    ['set-theme', 'set-font', 'set-size', 'set-ui', 'set-ruby', 'set-imp', 'set-blur', 'set-motion'].forEach(id => $(id).addEventListener('change', save));
    $('settingsbtn').addEventListener('click', () => { pop.hidden = !pop.hidden; });
    $('settingsclose').addEventListener('click', () => { pop.hidden = true; });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => document.dispatchEvent(new CustomEvent('cm:theme')));
  }

  /* ---------------- terms & drawer ---------------- */
  const KANA_ROWS = [['a', 'あいうえおぁぃぅぇぉゔ'], ['ka', 'かきくけこがぎぐげご'], ['sa', 'さしすせそざじずぜぞ'], ['ta', 'たちつてとだぢづでどっ'], ['na', 'なにぬねの'], ['ha', 'はひふへほばびぶべぼぱぴぷぺぽ'], ['ma', 'まみむめも'], ['ya', 'やゆよゃゅょ'], ['ra', 'らりるれろ'], ['wa', 'わをんゎ']];
  CM.KANA_ROWS = KANA_ROWS;
  CM.kanaRow = function (yomi) {
    const c = (yomi || '').charAt(0);
    for (const [k, chars] of KANA_ROWS) if (chars.indexOf(c) >= 0) return k;
    return 'etc';
  };
  CM.findTerm = (name) => CM.terms && CM.terms.byName.get(name);
  CM.getTermBody = async function (t) {
    const key = t.c;
    if (!CM.termChunks[key]) await CM.load('data/terms/t_' + key + '.js');
    return CM.termChunks[key][t.h];
  };
  CM.renderTerm = async function (name, opts) {
    const t = CM.findTerm(name);
    if (!t) return '<div class="term"><h1>' + CM.esc(name) + '</h1><p class="missing">この用語の解説はまだ準備中です。</p></div>';
    const body = await CM.getTermBody(t);
    const meta = [t.k ? '<span class="chip">' + CM.esc(t.k) + '</span>' : '', t.e ? '<span class="chip num">' + CM.esc(t.e) + '</span>' : '', t.r ? '<span class="chip">' + CM.esc(t.r) + '</span>' : ''].join('');
    const alias = (t.a && t.a.length) ? '<div class="yomi">別表記：' + t.a.map(CM.esc).join('、') + '</div>' : '';
    const lessons = (t.l || []).map(id => {
      const L = CM.lessonMeta(id);
      return L ? '<a class="chip" href="#/lesson/' + id + '">講義：' + CM.esc(L.title) + '</a>' : '';
    }).join('');
    const por = t.i ? '<figure class="img term-por"><img loading="lazy" src="https://commons.wikimedia.org/wiki/Special:FilePath/' + CM.esc(t.i) + '?width=360" alt="' + CM.esc(t.h) + '"><div class="fallback">画像はオンライン時に表示</div><figcaption>' + CM.esc(t.ic || t.h) + '</figcaption></figure>' : '';
    return '<article class="term">' + por + '<div class="yomi">' + CM.esc(t.y || '') + '</div><h1>' + CM.esc(t.h) + '</h1>' + alias +
      '<div class="meta">' + meta + '</div><div class="body">' + (body || '<p class="missing">本文準備中</p>') + '</div>' +
      (lessons ? '<div class="related">' + lessons + '</div>' : '') + '</article>';
  };
  /* Wikipedia (ja) lead image + intro extract, fetched at view time (online only; CC BY-SA, clearly labelled).
     A match is accepted only if the page is not a disambiguation page and, when the term carries years,
     the article mentions at least one of them - this filters out namesakes (e.g. pope vs. emperor Leo III). */
  const WIKI_CACHE = {};
  const wikiQuery = async (title) => {
    if (WIKI_CACHE[title] !== undefined) return WIKI_CACHE[title];
    const u = 'https://ja.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&prop=pageimages|pageprops|extracts&piprop=thumbnail|name&pithumbsize=480&ppprop=disambiguation&exintro=1&explaintext=1&exchars=900&titles=' + encodeURIComponent(title);
    let out = null;
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(u, { signal: ctl.signal }).then(r => r.json()); clearTimeout(tm);
      const pg = Object.values((r.query || {}).pages || {})[0];
      if (pg && pg.missing === undefined && !(pg.pageprops && pg.pageprops.disambiguation !== undefined)) out = pg;
    } catch (e) { out = null; }
    WIKI_CACHE[title] = out; return out;
  };
  const eraYears = (e) => (String(e || '').match(/\d{3,4}/g) || []).map(Number).filter(n => n >= 100);
  const wikiFits = (t, pg) => {
    const ys = eraYears(t.e); if (!ys.length || pg.title === t.h || pg.title === t.w) return true;
    const txt = (pg.extract || '') + ' ' + pg.title;
    return ys.some(y => txt.indexOf(String(y)) >= 0 || txt.indexOf(String(y - 1)) >= 0 || txt.indexOf(String(y + 1)) >= 0);
  };
  CM.wikiEnrich = async function (root, t) {
    if (!t || t.w === '-' || !navigator.onLine) return;
    const art = root.querySelector('article.term'); if (!art) return;
    const cands = [t.w || t.h].concat(t.w ? [] : (t.a || []).slice(0, 2));
    let pg = null;
    for (const c of cands) { const p = await wikiQuery(c); if (p && wikiFits(t, p)) { pg = p; break; } }
    if (!pg || !art.isConnected) return;
    if (!t.i && pg.thumbnail && pg.pageimage) {
      const f = CM.h('figure', { class: 'img term-por wiki-por' }, '<a href="https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(pg.pageimage) + '" target="_blank" rel="noopener"><img src="' + CM.esc(pg.thumbnail.source) + '" alt="' + CM.esc(pg.title) + '"></a><figcaption>画像：Wikimedia Commons</figcaption>');
      art.insertBefore(f, art.firstChild);
    }
    const ex = (pg.extract || '').trim();
    if (ex.length > 40) {
      const paras = ex.split(/\n+/).filter(Boolean).map(p => '<p>' + CM.esc(p) + '</p>').join('');
      const d = CM.h('details', { class: 'wiki-ex' }, '<summary>もっと詳しく：Wikipedia日本語版の解説（冒頭）</summary>' + paras +
        '<p class="src">出典：Wikipedia日本語版「<a href="https://ja.wikipedia.org/wiki/' + encodeURIComponent(pg.title) + '" target="_blank" rel="noopener">' + CM.esc(pg.title) + '</a>」（CC BY-SA 4.0）。本サイトの記述ではなく、閲覧時に取得して表示している。</p>');
      const rel = art.querySelector('.related');
      art.insertBefore(d, rel || null);
    }
  };
  const drawer = { stack: [] };
  CM.openTerm = async function (name, push) {
    const d = document.getElementById('drawer');
    const body = document.getElementById('drawerbody');
    if (push !== false) drawer.stack.push(name);
    document.getElementById('drawerback').hidden = drawer.stack.length < 2;
    const t = CM.findTerm(name);
    document.getElementById('draweropen').href = '#/term/' + encodeURIComponent(t ? t.h : name);
    d.hidden = false;
    body.innerHTML = '<p class="muted">読み込み中…</p>';
    body.innerHTML = await CM.renderTerm(name);
    body.scrollTop = 0;
    CM.bindInline(body);
    CM.wikiEnrich(body, CM.findTerm(name));
  };
  function initDrawer() {
    document.getElementById('drawerclose').addEventListener('click', () => { document.getElementById('drawer').hidden = true; drawer.stack = []; });
    document.getElementById('drawerback').addEventListener('click', () => { drawer.stack.pop(); const n = drawer.stack[drawer.stack.length - 1]; if (n) CM.openTerm(n, false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.getElementById('drawer').hidden = true; document.getElementById('settings').hidden = true; } });
  }
  // inline behaviors for rendered prose: term links, image fallbacks
  CM.bindInline = function (root) {
    root.querySelectorAll('.t[data-t]').forEach(a => {
      const name = a.getAttribute('data-t');
      if (CM.terms && !CM.findTerm(name)) a.classList.add('nt');
      if (a._b) return; a._b = 1;
      a.setAttribute('role', 'button'); a.setAttribute('tabindex', '0');
      const go = (e) => { e.preventDefault(); CM.openTerm(name); };
      a.addEventListener('click', go);
      a.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(e); });
    });
    if (CM.initWidgets) CM.initWidgets(root);
    root.querySelectorAll('.nsfw .cwbtn').forEach(b => {
      if (b._b) return; b._b = 1;
      b.addEventListener('click', (e) => { e.preventDefault(); b.closest('.nsfw').classList.add('shown'); });
    });
    root.querySelectorAll('.nsfw .cwhide').forEach(b => {
      if (b._b) return; b._b = 1;
      b.addEventListener('click', (e) => { e.preventDefault(); b.closest('.nsfw').classList.remove('shown'); });
    });
    root.querySelectorAll('.ytf').forEach(f => {
      if (f._b) return; f._b = 1;
      f.addEventListener('click', () => {
        const id = f.dataset.yt, st = f.dataset.start;
        const watch = 'https://www.youtube.com/watch?v=' + encodeURIComponent(id) + (st ? '&t=' + encodeURIComponent(st) + 's' : '');
        if (!/^https?:$/.test(location.protocol)) {
          // a page opened from a local file sends no Referer, which YouTube rejects (error 153): open it on YouTube instead
          window.open(watch, '_blank', 'noopener');
          if (!f.querySelector('.ytnote')) { const n = document.createElement('div'); n.className = 'ytnote'; n.textContent = 'ファイルを直接開いているため、YouTubeの仕様によりここでは再生できません。YouTubeのページで開きました（サイトをサーバーに置くと、ここで再生できます）。'; f.appendChild(n); }
          return;
        }
        const ifr = document.createElement('iframe');
        ifr.className = 'yt';
        ifr.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0' + (st ? '&start=' + encodeURIComponent(st) : '');
        ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        ifr.referrerPolicy = 'strict-origin-when-cross-origin'; ifr.allowFullscreen = true; ifr.title = (f.querySelector('img') || {}).alt || 'YouTube';
        f.replaceWith(ifr);
      });
    });
    root.querySelectorAll('figure.media video, figure.media audio').forEach(m => {
      if (m._b) return; m._b = 1;
      const srcs = m.querySelectorAll('source'), last = srcs[srcs.length - 1];
      if (last) last.addEventListener('error', () => m.closest('figure').classList.add('broken'));
    });
    root.querySelectorAll('figure.img img').forEach(img => {
      if (img._b) return; img._b = 1;
      const fail = () => img.closest('figure').classList.add('broken');
      img.addEventListener('error', fail);
      if (img.complete && img.naturalWidth === 0 && img.src) fail();
    });
  };

  /* ---------------- curriculum helpers ---------------- */
  CM.lessonMeta = function (id) {
    if (!CM.curriculum) return null;
    for (const p of CM.curriculum.parts) for (const l of p.lessons) if (l.id === id) return Object.assign({ part: p }, l);
    return null;
  };
  CM.lessonOrder = function () {
    const out = [];
    if (CM.curriculum) CM.curriculum.parts.forEach(p => p.lessons.forEach(l => out.push(l)));
    return out;
  };

  /* ---------------- router ---------------- */
  let current = null;
  CM.route = function () {
    const raw = decodeURIComponent((location.hash || '#/').replace(/^#\/?/, ''));
    const [path, query] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const name = parts[0] || 'home';
    const page = CM.pages[name] || CM.pages.notfound;
    if (current && current.destroy) { try { current.destroy(); } catch (e) { console.error(e); } }
    const view = document.getElementById('view');
    view.innerHTML = '';
    view.className = 'page-' + name;
    document.querySelectorAll('#mainnav a').forEach(a => a.classList.toggle('on', a.getAttribute('data-nav') === (name === 'lesson' ? 'home' : name === 'term' ? 'terms' : name === 'battle' ? 'battles' : name)));
    const q = {};
    if (query) query.split('&').forEach(kv => { const [k, v] = kv.split('='); q[k] = v; });
    current = page;
    window.scrollTo(0, 0);
    Promise.resolve(page.render(view, parts.slice(1), q)).catch(err => {
      console.error(err);
      view.innerHTML = '<div class="wrap"><h1>表示できませんでした</h1><p>' + CM.esc(err.message) + '</p></div>';
    });
  };

  /* ---------------- pages: home / about / notfound ---------------- */
  CM.commons = (f, w) => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=' + (w || 800);
  // representative picture for each part (file on Wikimedia Commons, short caption)
  const PART_IMG = [
    ['Hereford-Karte.jpg', 'ヘレフォードの世界図（1300年ごろ）'],
    ['Lascaux painting.jpg', 'ラスコーの洞窟壁画（前1万7000年ごろ）'],
    ['All Gizah Pyramids.jpg', 'ギザの三大ピラミッド'],
    ['The Parthenon in Athens.jpg', 'アテネのパルテノン神殿'],
    ['Hagia Sophia Mars 2013.jpg', 'ハギア・ソフィア（イスタンブル）'],
    ['Angkor Wat.jpg', 'アンコール・ワット（12世紀）'],
    ['Taj Mahal (Edited).jpeg', 'タージ・マハル（17世紀）'],
    ['Eugène Delacroix - La liberté guidant le peuple.jpg', 'ドラクロワ「民衆を導く自由の女神」'],
    ['Cheshire Regiment trench Somme 1916.jpg', 'ソンムの戦いの塹壕（1916年）'],
    ['Thefalloftheberlinwall1989.JPG', 'ベルリンの壁の崩壊（1989年）'],
    ['Shanghai Skyline 2020.jpg', '上海・浦東の超高層ビル群'],
    ['Standard of Ur - War.jpg', 'ウルのスタンダード「戦争の面」']
  ];
  const PART_COLORS = ['#7d8b75', '#a0855b', '#b06a4a', '#8a5c6e', '#5d6f8f', '#4f7f7a', '#87713f', '#9a4f3c', '#5a5f7c', '#6b6b6b', '#3f6a8a', '#7a7a52'];
  CM.pages.home = {
    async render(view) {
      const C = CM.curriculum;
      const last = CM.storage.get('last', null);
      const lastMeta = last && CM.lessonMeta(last);
      const avail = CM.lessonOrder().filter(l => l.ready);
      let html = '<section class="home-hero2"><div class="hh-bg" aria-hidden="true"><img src="' + CM.commons('OrteliusWorldMap1570.jpg', 1600) + '" alt="" onerror="this.remove()"></div><div class="wrap hh-in"><div>' +
        '<div class="eyebrow">人類の誕生から2026年まで ― 多視点の世界史講義アトラス</div><h1 class="hh-title">PARALLAX<span>パララックス／視差で読む世界史</span></h1>' +
        '<p class="hh-def"><b>視差（parallax）</b>：見る位置によって、同じ対象が違って見えること。</p>' +
        '<p>征服者と被征服者、西洋と非西洋、勝者と敗者、為政者と民衆。一つの出来事を複数の立場から見比べると、平面の年表が立体の歴史として浮かび上がる。講義を読み進めると、地図・戦況図・史料・当事者の証言がその場で連動する。</p>' +
        '<div class="actions">' + (lastMeta ? '<a class="btn primary" href="#/lesson/' + last + '">続きから：' + CM.esc(lastMeta.title) + '</a>' : (avail[0] ? '<a class="btn primary" href="#/lesson/' + avail[0].id + '">最初の講義を読む</a>' : '')) +
        '<a class="btn" href="#/atlas">歴史地図を開く</a><a class="btn" href="#/battles">戦史を見る</a><a class="btn" href="#/museum">博物館へ</a><a class="btn" href="#/about">凡例・出典</a></div></div>' +
        '<div><div class="today" id="today"><h3>今日は何の日</h3><ul><li class="muted">読み込み中…</li></ul></div></div></div>' +
        '<p class="hh-cap">背景：オルテリウス「世界の舞台」の世界図（1570年、Wikimedia Commons）</p></section><div class="wrap">';
      // era gallery: one representative picture per part (Wikimedia Commons, shown online only)
      if (C) {
        html += '<section class="eras"><h2>時代をめぐる</h2><div class="era-grid">';
        C.parts.forEach((p, i) => {
          const im = PART_IMG[i] || [];
          html += '<a class="era-card" href="#/" data-part="' + i + '" style="--pc:' + PART_COLORS[i % PART_COLORS.length] + '">' +
            (im[0] ? '<img loading="lazy" src="' + CM.commons(im[0], 640) + '" alt="' + CM.esc(im[1] || '') + '" onerror="this.remove()">' : '') +
            '<span class="ec-txt"><b>' + CM.esc(p.no) + '</b><strong>' + CM.esc(p.title) + '</strong><small>' + CM.esc(p.period) + '</small></span>' +
            (im[1] ? '<span class="ec-cap">' + CM.esc(im[1]) + '</span>' : '') + '</a>';
        });
        html += '</div></section>';
      }
      html += '<div class="home-grid"><section><h2 style="margin:0 0 4px;font-size:1.3rem">講義目次</h2><p class="muted" style="margin:0 0 6px;font-size:calc(13px * var(--ui,1))">全' + (C ? C.parts.reduce((a, p) => a + p.lessons.length, 0) : 0) + '回（公開中 ' + avail.length + '回）。灰色の回は準備中。</p>';
      if (C) C.parts.forEach((p, i) => {
        const ready = p.lessons.filter(l => l.ready).length;
        html += '<details class="part" id="part-' + i + '"' + (ready ? ' open' : '') + '><summary><span class="part-no">' + CM.esc(p.no) + '</span><span class="part-title">' + CM.esc(p.title) + '<small>' + CM.esc(p.period) + '</small></span><span class="part-count">' + ready + ' / ' + p.lessons.length + '</span></summary><ol class="lessons">';
        p.lessons.forEach(l => {
          html += '<li><span class="lno">' + CM.esc(l.no) + '</span>' + (l.ready ? '<a href="#/lesson/' + l.id + '" class="' + (CM.progress.isRead(l.id) ? 'done' : '') + '">' + CM.esc(l.title) + '</a>' : '<span class="plan">' + CM.esc(l.title) + '</span>') + '</li>';
        });
        html += '</ol></details>';
      });
      html += '</section><aside class="home-side"><div class="today" id="randtopic"><h3>トピックスから</h3><div class="muted">…</div></div>' +
        '<div class="today"><h3>このサイトの使い方</h3><ul><li>本文の<span class="t">点線の語</span>を押すと用語解説が開く。</li><li>本文をスクロールすると右の地図・戦況図が切り替わる。</li><li>【史実】【通説】【諸説】【伝承】【俗説】は記述の確度を表す。</li><li><mark class="imp">黄色の下線</mark>は試験で特に問われやすい重要事項・混同しやすい点。</li></ul></div></aside></div></div>';
      view.innerHTML = html;
      view.querySelectorAll('.era-card').forEach(a => a.addEventListener('click', (e) => {
        e.preventDefault(); const d = document.getElementById('part-' + a.dataset.part); if (!d) return;
        d.open = true; d.scrollIntoView({ behavior: CM.reducedMotion && CM.reducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }));
      // random topic
      const rt = document.getElementById('randtopic');
      if (CM.topics.length) {
        const t = CM.topics[Math.floor(Math.random() * CM.topics.length)];
        rt.innerHTML = '<h3>トピックスから</h3><div><span class="chip">' + CM.esc(t.kj) + '</span> <a href="#/lesson/' + t.l + '?topic=' + t.id + '"><b>' + CM.esc(t.t) + '</b></a><p class="muted" style="font-size:calc(13px * var(--ui,1));margin:6px 0 0">' + CM.esc(t.x) + '…</p></div>';
      }
      // today in history
      try {
        await CM.load('data/events.js');
        const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
        const hits = CM.events.filter(e => e.m === m && e.d === day).slice(0, 8);
        document.querySelector('#today ul').innerHTML = hits.length ? hits.map(e => '<li><span class="num">' + CM.esc(CM.fmtYear(e.y)) + '</span>' + CM.esc(e.t) + '</li>').join('') : '<li class="muted">' + m + '月' + day + '日の出来事は年表にまだ登録がない。</li>';
      } catch (e) { document.querySelector('#today ul').innerHTML = '<li class="muted">年表を読み込めなかった。</li>'; }
    }
  };
  CM.pages.about = {
    render(view) {
      const sec = (id, h, body) => '<section id="ab-' + id + '"><h2>' + h + '</h2>' + body + '</section>';
      const toc = [['name', 'サイト名と方針'], ['label', '記述の確度ラベル'], ['marker', '本文の表記'], ['topic', 'トピックスの種類'], ['quote', '史料・証言の示し方'], ['term', '用語解説'], ['map', '地図・戦況図'], ['museum', '博物館'], ['media', '図版・映像・音声'], ['data', '利用したデータと素材'], ['ref', '参考にした文献・サイト'], ['note', 'おことわり']];
      view.innerHTML = '<div class="wrap about"><div class="page-head"><h1>凡例・出典</h1><p>このサイトの記述のきまりと、利用したデータ・素材の出典をまとめる。</p></div>' +
        '<nav class="ab-toc">' + toc.map(t => '<a href="#/about" data-ab="' + t[0] + '">' + t[1] + '</a>').join('') + '</nav>' +
        sec('name', 'サイト名と方針',
          '<p><b>PARALLAX（パララックス）</b>は「視差」を意味する。見る位置によって、同じ対象が違って見えることをいう。征服者と被征服者、西洋と非西洋、勝者と敗者、為政者と民衆――一つの出来事を複数の立場から見比べることで、歴史の立体的な姿を浮かび上がらせることを、このサイトの方針としている。</p>' +
          '<p>そのため、本文とトピックスでは、教科書で大きく扱われる出来事だけでなく、勝者の側の暴力や、長く語られてこなかった犠牲（例：ソ連によるカティンの森事件、クロアチアのウスタシャによるヤセノヴァツ強制収容所、ロマの虐殺、戦後のドイツ系住民の追放、カンボジアやバングラデシュの虐殺など）も、出典と推計の幅を示して記述する。ある国や民族の加害を記すことは、その国や民族全体を責めることではなく、別の加害を軽く見ることでもない。</p>') +
        sec('label', '記述の確度ラベル',
          '<p><span class="lbl lbl-fact">史実</span>一次史料・考古資料で確認できる事柄。<br><span class="lbl lbl-common">通説</span>研究者の多くが支持する解釈。<br><span class="lbl lbl-debate">諸説</span>研究者の間で見解が分かれる事柄。死者数などの推計に大きな幅がある場合も、このラベルを付けて幅を示す。<br><span class="lbl lbl-legend">伝承</span>後世の記録・言い伝えで、史実かどうか確かめられない話。<br><span class="lbl lbl-myth">俗説</span>広く信じられているが、根拠が乏しいか誤りとされる話。</p>') +
        sec('marker', '本文の表記',
          '<ul><li><span class="t">点線の語</span>：押すと用語解説が開く。</li><li><mark class="imp">黄色のマーカー</mark>：試験で問われやすい重要事項（設定で非表示にできる）。</li><li>ふりがな：難読語に付ける（設定で非表示にできる）。</li><li>年代：紀元前は「前」を付けて表す。</li><li>人名・地名：高等学校の世界史の教科書で一般的な表記を基本とし、別の表記を用語解説の「別表記」に示す。</li></ul>') +
        sec('topic', 'トピックスの種類',
          '<p>本筋の合間に差し込む囲み記事で、次の8つのグループに分けている。</p><ul><li><b>史料</b>：当時の人々が残した記録・証言・遺物（「記録」「証言」「遺物」）。</li><li><b>深掘り</b>：人物・暮らし・しくみ・戦術をくわしく。</li><li><b>考える</b>：諸説の検討、俗説の検証、別の立場から見た歴史（「視点を変える」）。</li><li><b>混同注意</b>：取り違えやすい用語や出来事。</li><li><b>いま</b>：現在まで続く問題。</li><li><b>作品</b>：その時代を描いた小説・映画・美術。</li><li><b>音楽</b>：時代を映した歌と曲。</li><li><b>こぼれ話</b>：教科書では触れない、気になる場面。</li></ul>') +
        sec('quote', '史料・証言の示し方',
          '<p>史料や当事者の証言は、次の形で示す。</p><ul><li><b>原文</b>：原語のテキスト。ラテン語・古典ギリシア語・漢文・古文などは、校訂テキストにもとづく。長いものは「……」で中略する。</li><li><b>書き下し</b>：漢文の読み下し。</li><li><b>現代語訳／意訳</b>：原則として本サイトの訳。英訳などからの重訳や、要点を縮めた訳は「抄訳」と記す。</li><li><b>出典</b>：書名・巻・章・書簡の番号・碑文の番号（例：『ラテン碑文集成』第4巻3948番）・日付など、原典にさかのぼれる情報を記す。</li></ul>' +
          '<p>当事者の言葉として広く知られていても、原文が確認できないもの、後世の脚色が疑われるもの、筆者がはっきりしないものは、その旨を本文に記し、【伝承】【諸説】のラベルを付ける。原文の所在が確認できない「証言」は採用していない。</p>' +
          '<p>著作権の保護期間内にある近現代の著作（回想録・小説・詩など）は、出典を明示したうえで、引用の範囲にとどめるか、内容の要約として紹介する。既存の邦訳書の文章は転載していない。</p>' +
          '<p>各講義の末尾の「出典・参考」には、その回で引いた史料と、参考にした文献・サイトを記す。</p>') +
        sec('term', '用語解説',
          '<p>用語解説は、本サイトが書いた解説（主要な用語には「詳しく」の項を付けた）を中心とする。オンラインで閲覧しているときは、そのあとに、Wikipedia日本語版の該当記事の冒頭部分と、記事の代表画像（Wikimedia Commons）を、閲覧のたびに取得して表示する。これは本サイトの記述ではなく、出典（記事名）とライセンス（CC BY-SA 4.0）を付して表示している。同名の別の人物や事柄を誤って表示しないよう、曖昧さ回避のページは表示せず、用語の年代と記事の内容が合わない場合も表示しない。</p>') +
        sec('map', '地図・戦況図',
          '<p>勢力範囲は概略であり、前近代の「国境」は線ではなく、支配・影響の及ぶ範囲を示すにすぎない。現代の係争地は、当事者の主張と実効支配の状況を併記する方針である。</p>' +
          '<p>戦況図は、史料と研究にもとづく模式図であり、部隊の位置・規模・動きは概略である。部隊の記号は、移動の際に向きを変えず、進む方向は矢印で示す（艦船は、船首を進行方向に向ける）。戦史の一覧の地図では、名前が重なる場合は表示を省き、印にカーソルを合わせると名前が出る。</p>') +
        sec('museum', '博物館',
          '<p>「博物館」の3Dモデルは、各国の博物館・文化財機関などがSketchfabで公開しているモデルを、Sketchfabの埋め込み機能で表示している。各モデルに、作者（公開者）・ライセンス・元のページへのリンクを示した。後世に作られた複製・模型・復元モデルは、公的機関によるもので時代考証の面で大きな誤りのないものに限って採用し、その旨を解説に明記した。</p>') +
        sec('media', '図版・映像・音声',
          '<p>図版・映像・音声は、Wikimedia Commons 所蔵のパブリックドメインまたはクリエイティブ・コモンズのライセンスの素材を、外部参照で表示している（オンライン時のみ表示）。各講義の末尾に、掲載した素材の一覧と元のページへのリンクを示した。トップページの各部の写真・絵画も同様である。遺体や暴力の場面を含む写真・映像には警告を付け、設定でぼかしをかけられるようにしている。</p>') +
        sec('data', '利用したデータと素材',
          '<ul><li>勢力図・国名・君主一覧：World Historical Atlas（x768氏、twha5）を改変して利用。原作者の条件（改変・再配布可、名称を変えて区別）に従う。</li>' +
          '<li>海岸線・河川・湖沼・現代国境・等深線：Natural Earth（パブリックドメイン）。</li>' +
          '<li>3D地球儀：three.js r128（MIT License）。</li>' +
          '<li>3Dモデル：Sketchfab（各モデルのライセンスに従う）。</li>' +
          '<li>図版・映像・音声：Wikimedia Commons（各素材のライセンスに従う）。</li>' +
          '<li>用語解説の補足：Wikipedia日本語版（CC BY-SA 4.0、閲覧時に取得）。</li>' +
          '<li>年表の骨格：ユーザー提供の年表データをもとに地域・分野を付して再構成。</li>' +
          '<li>書体：Google Fonts（Shippori Mincho B1、Zen Kaku Gothic New、Zen Old Mincho、IBM Plex Mono。SIL Open Font License）。</li></ul>') +
        sec('ref', '参考にした文献・サイト',
          '<p><b>解説サイト</b>：世界史の窓、世界史講義録、世界史の目ほか。文章は転載せず、事実確認と構成の参考にとどめた。</p>' +
          '<p><b>史料の原文</b>：主に、公開されている校訂テキスト・データベースや刊本による（例：Perseus Digital Library、The Latin Library、Corpus Inscriptionum Latinarum（CIL）、Cuneiform Digital Library Initiative（CDLI）、中国哲学書電子化計画（ctext.org）、国立国会図書館デジタルコレクション、Gallica（フランス国立図書館）、Internet Archive）。</p>' +
          '<p><b>統計・推計</b>：犠牲者数などの推計は、アメリカ合衆国ホロコースト記念博物館（USHMM）、各国政府や国際機関の調査委員会の報告、主要な研究書などによる。推計に幅がある場合は、その幅を示した。</p>' +
          '<p>各講義の末尾に、その回で参照した文献・サイトを個別に記している。</p>') +
        sec('note', 'おことわり',
          '<p>本サイトは学習用の解説であり、記述には誤りが含まれている可能性がある。とくに推計値や解釈が分かれる事柄は、各講義末の出典をあわせて確認してほしい。外部の画像・3Dモデル・Wikipediaの解説は、ネットワークに接続しているときだけ表示される。</p>') +
        '</div>';
      view.querySelectorAll('[data-ab]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById('ab-' + a.dataset.ab); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    }
  };
  CM.pages.notfound = { render(view) { view.innerHTML = '<div class="wrap"><h1>ページが見つからない</h1><p><a href="#/">目次へ戻る</a></p></div>'; } };

  /* ---------------- search box ---------------- */
  function initSearch() {
    document.getElementById('searchform').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = document.getElementById('searchbox').value.trim();
      if (q) location.hash = '#/search?q=' + encodeURIComponent(q);
    });
  }

  // keep the gear button and every nav item visible: fold the top bar when it overflows, and publish its real height
  function fitTopbar() {
    const tb = document.getElementById('topbar'), nav = document.getElementById('mainnav');
    if (!tb || !nav) return;
    const root = document.documentElement;
    tb.classList.remove('tight'); root.style.removeProperty('--top');
    if (window.innerWidth <= 860) return; // the stylesheet already folds the bar on small screens
    const gear = document.getElementById('settingsbtn').getBoundingClientRect();
    if (nav.scrollWidth > nav.clientWidth + 2 || gear.right > window.innerWidth - 2) {
      tb.classList.add('tight');
      root.style.setProperty('--top', Math.ceil(tb.getBoundingClientRect().height) + 'px');
    }
  }
  CM.fitTopbar = fitTopbar;
  CM.start = function () {
    initSettings(); initDrawer(); initSearch();
    fitTopbar(); window.addEventListener('resize', fitTopbar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTopbar);
    window.addEventListener('hashchange', CM.route);
    CM.route();
  };
})();
