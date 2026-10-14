/* CHRONICA MUNDI core: namespace, data registry, script loader, router, settings, drawer, home */
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
    if (s.ruby === false) root.setAttribute('data-ruby', 'off'); else root.removeAttribute('data-ruby');
    if (s.motion === 'reduced') root.setAttribute('data-motion', 'reduced'); else root.removeAttribute('data-motion');
    if (s.imp === false) root.setAttribute('data-imp', 'off'); else root.removeAttribute('data-imp');
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
    $('set-ruby').checked = s.ruby !== false;
    $('set-motion').checked = s.motion === 'reduced';
    $('set-imp').checked = s.imp !== false;
    const save = () => {
      const n = { theme: $('set-theme').value, font: $('set-font').value, size: $('set-size').value, ruby: $('set-ruby').checked, imp: $('set-imp').checked, motion: $('set-motion').checked ? 'reduced' : 'auto' };
      CM.storage.set('settings', n); applySettings(n);
    };
    ['set-theme', 'set-font', 'set-size', 'set-ruby', 'set-imp', 'set-motion'].forEach(id => $(id).addEventListener('change', save));
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
  const PART_COLORS = ['#7d8b75', '#a0855b', '#b06a4a', '#8a5c6e', '#5d6f8f', '#4f7f7a', '#87713f', '#9a4f3c', '#5a5f7c', '#6b6b6b', '#3f6a8a', '#7a7a52'];
  CM.pages.home = {
    async render(view) {
      const C = CM.curriculum;
      const last = CM.storage.get('last', null);
      const lastMeta = last && CM.lessonMeta(last);
      const avail = CM.lessonOrder().filter(l => l.ready);
      let html = '<div class="wrap">';
      html += '<section class="home-hero"><div><div class="eyebrow">人類の誕生から2026年まで</div><h1>CHRONICA MUNDI</h1>' +
        '<p>講義を読み進めると、地図・戦況図・史料がその場で連動する世界史の学習サイト。本筋の合間に、こぼれ話や当時の記録を「トピックス」として差し込んでいる。気になったところだけ開けばよい。</p>' +
        '<div class="actions">' + (lastMeta ? '<a class="btn primary" href="#/lesson/' + last + '">続きから：' + CM.esc(lastMeta.title) + '</a>' : (avail[0] ? '<a class="btn primary" href="#/lesson/' + avail[0].id + '">最初の講義を読む</a>' : '')) +
        '<a class="btn" href="#/atlas">歴史地図を開く</a><a class="btn" href="#/battles">戦史を見る</a><a class="btn" href="#/about">凡例・出典</a></div></div>' +
        '<div><div class="today" id="today"><h3>今日は何の日</h3><ul><li class="muted">読み込み中…</li></ul></div></div></section>';
      html += '<div class="home-grid"><section><h2 style="margin:0 0 4px;font-size:1.3rem">講義目次</h2><p class="muted" style="margin:0 0 6px;font-size:13px">全' + (C ? C.parts.reduce((a, p) => a + p.lessons.length, 0) : 0) + '回（公開中 ' + avail.length + '回）。灰色の回は準備中。</p>';
      if (C) C.parts.forEach((p, i) => {
        const ready = p.lessons.filter(l => l.ready).length;
        html += '<details class="part"' + (ready ? ' open' : '') + '><summary><span class="part-no">' + CM.esc(p.no) + '</span><span class="part-title">' + CM.esc(p.title) + '<small>' + CM.esc(p.period) + '</small></span><span class="part-count">' + ready + ' / ' + p.lessons.length + '</span></summary><ol class="lessons">';
        p.lessons.forEach(l => {
          html += '<li><span class="lno">' + CM.esc(l.no) + '</span>' + (l.ready ? '<a href="#/lesson/' + l.id + '" class="' + (CM.progress.isRead(l.id) ? 'done' : '') + '">' + CM.esc(l.title) + '</a>' : '<span class="plan">' + CM.esc(l.title) + '</span>') + '</li>';
        });
        html += '</ol></details>';
      });
      html += '</section><aside class="home-side"><div class="today" id="randtopic"><h3>トピックスから</h3><div class="muted">…</div></div>' +
        '<div class="today"><h3>このサイトの使い方</h3><ul><li>本文の<span class="t">点線の語</span>を押すと用語解説が開く。</li><li>本文をスクロールすると右の地図・戦況図が切り替わる。</li><li>【史実】【通説】【諸説】【伝承】【俗説】は記述の確度を表す。</li><li><mark class="imp">黄色の下線</mark>は試験で特に問われやすい重要事項・混同しやすい点。</li></ul></div></aside></div></div>';
      view.innerHTML = html;
      // random topic
      const rt = document.getElementById('randtopic');
      if (CM.topics.length) {
        const t = CM.topics[Math.floor(Math.random() * CM.topics.length)];
        rt.innerHTML = '<h3>トピックスから</h3><div><span class="chip">' + CM.esc(t.kj) + '</span> <a href="#/lesson/' + t.l + '?topic=' + t.id + '"><b>' + CM.esc(t.t) + '</b></a><p class="muted" style="font-size:13px;margin:6px 0 0">' + CM.esc(t.x) + '…</p></div>';
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
      view.innerHTML = '<div class="wrap about"><div class="page-head"><h1>凡例・出典</h1></div>' +
        '<h2>記述の確度ラベル</h2><p><span class="lbl lbl-fact">史実</span>一次史料・考古資料で確認できる事柄。<br><span class="lbl lbl-common">通説</span>研究者の多くが支持する解釈。<br><span class="lbl lbl-debate">諸説</span>研究者の間で見解が分かれる事柄。<br><span class="lbl lbl-legend">伝承</span>後世の記録・言い伝えで、史実かどうか確かめられない話。<br><span class="lbl lbl-myth">俗説</span>広く信じられているが、根拠が乏しいか誤りとされる話。</p>' +
        '<h2>トピックスの種類</h2><p>こぼれ話／史料（当時の記録の本サイト訳）／暮らし／諸説あり／混同注意／視点を変える／いま（現在も続く問題）／人物／戦術。</p>' +
        '<h2>史料の訳について</h2><p>「史料」トピックスの訳文は、著作権の切れた原典（または公開されている校訂テキスト・英訳）をもとに本サイトで訳出したもの。英訳などからの重訳はその旨を記した。既存の邦訳書の文章は転載していない。</p>' +
        '<h2>地図について</h2><p>勢力範囲は概略であり、前近代の「国境」は線ではなく支配・影響の及ぶ範囲を示すにすぎない。現代の係争地は当事者の主張と実効支配の状況を併記する方針である。</p>' +
        '<h2>利用したデータ</h2><ul>' +
        '<li>勢力図・国名・君主一覧：World Historical Atlas（x768氏、twha5）を改変して利用。原作者の条件（改変・再配布可、名称を変えて区別）に従う。</li>' +
        '<li>海岸線・河川・湖沼・現代国境・等深線：Natural Earth（パブリックドメイン）。</li>' +
        '<li>3D地球儀：three.js r128（MIT License）。</li>' +
        '<li>図版：Wikimedia Commons 所蔵のパブリックドメインまたはCCライセンス画像を、出典・ライセンスを付して外部参照で表示（オンライン時のみ表示）。</li>' +
        '<li>年表の骨格：ユーザー提供の年表データをもとに地域・分野を付して再構成。</li></ul>' +
        '<h2>参考にした解説サイト</h2><p>世界史の窓、世界史講義録、世界史の目ほか。文章は転載せず、事実確認と構成の参考にとどめた。各講義末に出典を記す。</p></div>';
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

  CM.start = function () {
    initSettings(); initDrawer(); initSearch();
    window.addEventListener('hashchange', CM.route);
    CM.route();
  };
})();
