/* Interactive explainer widgets embedded in lessons via :::widget <name> | caption
   Each widget: CM.widgets[name] = (host, params, figureEl) => void
   Colours come from CSS tokens so every theme works. */
(function () {
  'use strict';
  const W = CM.widgets = CM.widgets || {};
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs, parent, style) => {
    const e = document.createElementNS(NS, tag);
    for (const k in (attrs || {})) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (style) e.setAttribute('style', style);
    if (parent) parent.appendChild(e);
    return e;
  };
  const H = (tag, cls, parent, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  const svgBox = (host, w, h) => S('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img' }, host, 'display:block;max-width:' + w + 'px;margin:0 auto;font-family:var(--font-body)');
  const txt = (p, s, x, y, size, style, anchor) => { const t = S('text', { x, y, 'text-anchor': anchor || 'middle', 'dominant-baseline': 'middle' }, p, 'font-size:' + (size || 13) + 'px;fill:var(--ink);' + (style || '')); t.textContent = s; return t; };
  const esc = (s) => CM.esc(String(s));

  /* run fn(dt) on rAF only while host is visible and attached */
  function animate(host, fn) {
    let on = false, last = 0, raf = 0;
    const tick = (now) => {
      if (!host.isConnected) { on = false; return; }
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
      fn(dt);
      if (on) raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => {
      const v = es.some(e => e.isIntersecting);
      if (v && !on) { on = true; last = 0; raf = requestAnimationFrame(tick); }
      else if (!v) { on = false; cancelAnimationFrame(raf); }
    });
    io.observe(host);
  }

  CM.initWidgets = function (root) {
    root.querySelectorAll('figure.widget[data-w]').forEach(f => {
      if (f._w) return; f._w = 1;
      const body = f.querySelector('.wbody'), fn = W[f.getAttribute('data-w')];
      if (!fn) { body.textContent = '（この図解は読み込めませんでした）'; return; }
      let p = {};
      try { p = JSON.parse(f.getAttribute('data-p') || '{}'); } catch (e) { /* ignore */ }
      try { fn(body, p, f); } catch (e) { console.error(e); body.textContent = '（図解の表示中にエラーが発生しました）'; }
    });
  };



  /* ================= trireme: three banks of oars ================= */
  W.trireme = function (host, p) {
    const T = [
      { k: 'th', n: 'スラニタイ（上段）', per: 31, c: 'var(--accent)', txt: '最上段。船べりから張り出した張出し（アウトリガー）に座り、最も長い角度で水面に届く櫂をこぐ。下の段の動きが見えるため、全体の調子を合わせる役割を担ったとされる。' },
      { k: 'zy', n: 'ジュギタイ（中段）', per: 27, c: 'var(--gold)', txt: '中段。船の横木（ジュゴン）の高さに座った。' },
      { k: 'ta', n: 'タラミタイ（下段）', per: 27, c: 'var(--verdigris)', txt: '最下段。櫂の穴は水面からわずか50cmほどで、波が入らないよう革の覆いがつけられた。上の段の漕ぎ手の汗が降ってくる、最もつらい席だったといわれる。' }
    ];
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ こぐ</button><span class="wlab">速さ</span><input type="range" class="wrange" min="10" max="50" value="30" aria-label="こぐ速さ">' + T.map(t => '<button type="button" data-k="' + t.k + '">' + t.n.split('（')[0] + '</button>').join(''));
    const svg = svgBox(host, 640, 250);
    const out = H('div', 'wout', host, '三段櫂船（トリエレス）：長さ約37m、幅約5m。片側に3段、両側で170人の漕ぎ手が乗った。段を選ぶと説明が表示される。');
    // cross-section (left)
    const cx = 130;
    S('path', { d: `M${cx - 70},60 Q${cx - 78},150 ${cx - 30},200 L${cx + 30},200 Q${cx + 78},150 ${cx + 70},60` }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:2');
    S('path', { d: `M${cx - 110},170 H${cx + 110}` }, svg, 'stroke:var(--navy);stroke-width:1.5;stroke-dasharray:5 4');
    txt(svg, '水面', cx + 100, 182, 10, 'fill:var(--navy)');
    const seats = { th: [[cx - 62, 72], [cx + 62, 72]], zy: [[cx - 44, 108], [cx + 44, 108]], ta: [[cx - 30, 142], [cx + 30, 142]] };
    const oarEnds = { th: 120, zy: 105, ta: 92 };
    const G = {};
    T.forEach(t => {
      const g = S('g', {}, svg); G[t.k] = g;
      seats[t.k].forEach(([x, y], i) => {
        const dir = i ? 1 : -1;
        S('path', { d: `M${x},${y} L${x + dir * oarEnds[t.k]},${176}` }, g, 'stroke:' + t.c + ';stroke-width:2.5');
        S('circle', { cx: x - dir * 8, cy: y - 10, r: 6 }, g, 'fill:' + t.c);
        S('path', { d: `M${x - dir * 8},${y - 4} v12` }, g, 'stroke:' + t.c + ';stroke-width:4;stroke-linecap:round');
      });
    });
    txt(svg, '断面（前から見た図）', cx, 22, 12, 'font-weight:700;fill:var(--ink-2)');
    // side view (right) with animated oars
    const sx0 = 290, sx1 = 620, wy = 150;
    txt(svg, '側面（片側の櫂）', (sx0 + sx1) / 2, 22, 12, 'font-weight:700;fill:var(--ink-2)');
    S('path', { d: `M${sx0},${wy - 40} L${sx1 - 20},${wy - 40} L${sx1},${wy - 20} L${sx1 - 10},${wy} L${sx0 + 30},${wy} L${sx0 - 6},${wy + 8} L${sx0 + 6},${wy - 10} Z` }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
    S('path', { d: `M${sx0 - 20},${wy + 12} H${sx1 + 10}` }, svg, 'stroke:var(--navy);stroke-width:1.5;stroke-dasharray:5 4');
    const oars = [];
    T.forEach((t, ti) => {
      const n = 12, y = wy - 32 + ti * 10;
      for (let i = 0; i < n; i++) { const x = sx0 + 40 + i * 22 + ti * 6; oars.push({ el: S('path', {}, svg, 'stroke:' + t.c + ';stroke-width:1.8;stroke-linecap:round'), x, y, L: 70 - ti * 8, k: t.k, ph: ti * 0.15 }); }
    });
    txt(svg, '衝角（青銅）', sx1 + 2, wy + 26, 10, 'fill:var(--ink-3)');
    let ph = 0, run = false, rate = 30, sel = null;
    const draw = () => {
      oars.forEach(o => {
        const a = Math.sin(ph * 2 * Math.PI + o.ph) * 0.45;
        const ex = o.x + Math.sin(a) * o.L * 0.9, ey = o.y + Math.cos(a) * o.L * 0.55 + 10;
        o.el.setAttribute('d', `M${o.x},${o.y} L${ex},${ey}`);
        o.el.style.opacity = !sel || sel === o.k ? 1 : 0.2;
      });
      T.forEach(t => G[t.k].style.opacity = !sel || sel === t.k ? 1 : 0.2);
    };
    ctl.querySelector('.wplay').addEventListener('click', (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ こぐ'; });
    ctl.querySelector('.wrange').addEventListener('input', (e) => { rate = +e.target.value; });
    ctl.querySelectorAll('button[data-k]').forEach(b => b.addEventListener('click', () => {
      sel = sel === b.dataset.k ? null : b.dataset.k;
      ctl.querySelectorAll('button[data-k]').forEach(x => x.classList.toggle('on', x.dataset.k === sel));
      const t = T.find(x => x.k === sel);
      out.innerHTML = t ? '<b>' + t.n + '</b>：片側' + t.per + '人、両側で' + t.per * 2 + '人。' + t.txt : '三段櫂船（トリエレス）：長さ約37m、幅約5m。片側に3段、両側で170人の漕ぎ手が乗った。';
      draw();
    }));
    animate(host, (dt) => { if (!run) return; ph += dt * rate / 60; draw(); });
    draw();
  };

  /* ================= ostracism: counting ostraka, two readings of the 6000 rule ================= */
  W.ostracism = function (host, p) {
    const C = p.cands || [{ n: 'テミストクレス', w: 4 }, { n: 'アリステイデス', w: 3 }, { n: 'メガクレス', w: 2 }, { n: 'その他', w: 1 }];
    const ctl = H('div', 'wctl', host, '<span class="wlab">投票に来た市民</span><input type="range" class="wrange" min="2000" max="12000" step="500" value="' + (p.n || 7000) + '" aria-label="投票数"><b class="wn"></b><button type="button" class="wplay">▶ 開票する</button>');
    const svg = svgBox(host, 640, 60 + C.length * 40);
    const out = H('div', 'wout', host);
    const max = 12000, X0 = 150, X1 = 610, sc = (X1 - X0) / max;
    const bars = C.map((c, i) => {
      const y = 40 + i * 40;
      txt(svg, c.n, X0 - 10, y + 12, 13, 'font-weight:700', 'end');
      S('rect', { x: X0, y, width: X1 - X0, height: 24, rx: 4 }, svg, 'fill:var(--paper-2)');
      const r = S('rect', { x: X0, y, width: 0, height: 24, rx: 4 }, svg, 'fill:var(--gold)');
      const t = txt(svg, '', X0 + 6, y + 13, 11.5, 'font-weight:700', 'start');
      return { r, t };
    });
    S('path', { d: `M${X0 + 6000 * sc},28 V${40 + C.length * 40}` }, svg, 'stroke:var(--accent);stroke-width:2;stroke-dasharray:5 4');
    txt(svg, '6000票', X0 + 6000 * sc, 18, 11, 'fill:var(--accent);font-weight:700');
    const nEl = ctl.querySelector('.wn'), rng = ctl.querySelector('.wrange');
    let N = +rng.value, cnt = C.map(() => 0), done = 0, run = false, shares = [];
    const reset = () => {
      N = +rng.value; nEl.textContent = N.toLocaleString() + '票'; cnt = C.map(() => 0); done = 0;
      const tw = C.reduce((a, c) => a + c.w, 0); shares = C.map(c => c.w / tw); draw(); out.innerHTML = '陶片（オストラコン）に名前を書いて投票する。「開票する」を押すと集計が始まる。';
    };
    const draw = () => {
      bars.forEach((b, i) => { b.r.setAttribute('width', cnt[i] * sc); b.t.setAttribute('x', X0 + cnt[i] * sc + 6); b.t.textContent = Math.round(cnt[i]).toLocaleString(); });
    };
    const verdict = () => {
      const top = cnt.indexOf(Math.max(...cnt)), name = C[top].n;
      const a = N >= 6000 ? '<b>' + name + '</b>が最多票で、10年間アテネから追放される' : '投票総数が6000に届かず、<b>不成立</b>';
      const b = cnt[top] >= 6000 ? '<b>' + name + '</b>が6000票以上を得て、追放される' : '6000票を得た者がおらず、<b>誰も追放されない</b>';
      out.innerHTML = '解釈①（プルタルコスなど）：投票総数が6000以上なら、最多得票者を追放 → ' + a + '<br>解釈②（フィロコロスなど）：1人が6000票以上を得たら追放 → ' + b + '<br><small>「6000」の意味は史料によって異なり、研究者の間でも意見が分かれている（諸説あり）。</small>';
    };
    rng.addEventListener('input', () => { run = false; ctl.querySelector('.wplay').textContent = '▶ 開票する'; reset(); });
    ctl.querySelector('.wplay').addEventListener('click', (e) => { if (done >= N) reset(); run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 開票する'; });
    animate(host, (dt) => {
      if (!run) return;
      const step = Math.min(N - done, N * dt / 3);
      done += step; cnt = cnt.map((c, i) => c + step * shares[i] * (0.9 + 0.2 * Math.random()));
      const sum = cnt.reduce((a, b) => a + b, 0); if (sum > done) cnt = cnt.map(c => c * done / sum);
      draw();
      if (done >= N) { run = false; ctl.querySelector('.wplay').textContent = '▶ もう一度'; verdict(); }
    });
    reset();
  };

  /* ================= kleroterion: allotment machine ================= */
  W.kleroterion = function (host, p) {
    const COLS = p.cols || 10, ROWS = p.rows || 8, WHITE = p.white || 3;
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ 抽選する</button><span class="wlab">必要な列</span><input type="range" class="wrange" min="1" max="' + (ROWS - 1) + '" value="' + WHITE + '" aria-label="選ぶ列の数"><b class="wn"></b>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const X0 = 70, Y0 = 50, DX = 34, DY = 28;
    txt(svg, '部族ごとの列（各部族の陪審員候補の名札を差し込む）', X0 + COLS * DX / 2, 22, 11.5, 'fill:var(--ink-3);font-weight:700');
    S('rect', { x: X0 - 14, y: Y0 - 14, width: COLS * DX + 10, height: ROWS * DY + 10, rx: 6 }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
    const cells = [];
    for (let r = 0; r < ROWS; r++) { const row = []; for (let c = 0; c < COLS; c++) { row.push(S('rect', { x: X0 + c * DX - 10, y: Y0 + r * DY - 9, width: 22, height: 16, rx: 2 }, svg, 'fill:var(--card);stroke:var(--ink-3)')); } cells.push(row); }
    for (let c = 0; c < COLS; c++) txt(svg, String(c + 1), X0 + c * DX, Y0 + ROWS * DY + 8, 10, 'fill:var(--ink-3)');
    const TX = X0 + COLS * DX + 30;
    S('rect', { x: TX - 10, y: 20, width: 20, height: Y0 + ROWS * DY - 10, rx: 8 }, svg, 'fill:none;stroke:var(--ink-2);stroke-width:2');
    txt(svg, '筒', TX, 14, 11, 'fill:var(--ink-3)');
    const balls = []; for (let r = 0; r < ROWS; r++) balls.push(S('circle', { cx: TX, cy: 32, r: 7 }, svg, 'stroke:var(--ink-2);stroke-width:1.2'));
    const marks = []; for (let r = 0; r < ROWS; r++) marks.push(txt(svg, '', TX + 40, Y0 + r * DY, 12, 'font-weight:700', 'start'));
    const nEl = ctl.querySelector('.wn'), rng = ctl.querySelector('.wrange');
    let order = [], k = -1, t = 0, run = false, white = WHITE;
    const reset = () => {
      white = +rng.value; nEl.textContent = '白玉' + white + '個・黒玉' + (ROWS - white) + '個';
      order = Array.from({ length: ROWS }, (_, i) => i < white); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      k = -1; t = 0;
      cells.forEach(row => row.forEach(c => { c.style.fill = 'var(--card)'; c.style.opacity = 1; }));
      balls.forEach((b, i) => { b.setAttribute('cy', 32 + i * 3); b.style.opacity = 0; }); marks.forEach(m => m.textContent = '');
      out.innerHTML = '市民は名札（ピナキオン）を自分の部族の列の穴に差し込む。筒の上から白と黒の玉を入れ、下から1つずつ出していく。';
    };
    const showBall = (i) => { const b = balls[i]; b.style.opacity = 1; b.style.fill = order[i] ? '#f4f1e8' : '#1d1d1d'; b.setAttribute('cy', Y0 + i * DY); marks[i].textContent = order[i] ? '白：' + COLS + '人選出' : '黒：帰宅'; marks[i].style.fill = order[i] ? 'var(--verdigris)' : 'var(--ink-3)'; cells[i].forEach(c => { c.style.fill = order[i] ? 'var(--gold)' : 'var(--card)'; c.style.opacity = order[i] ? 1 : 0.35; }); };
    rng.addEventListener('input', () => { run = false; ctl.querySelector('.wplay').textContent = '▶ 抽選する'; reset(); });
    ctl.querySelector('.wplay').addEventListener('click', (e) => { if (k >= ROWS - 1) reset(); run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 抽選する'; });
    animate(host, (dt) => {
      if (!run) return; t += dt;
      if (t > 0.7) { t = 0; k++; showBall(k); if (k >= ROWS - 1) { run = false; ctl.querySelector('.wplay').textContent = '▶ もう一度'; out.innerHTML = '<b>' + white * COLS + '人</b>が選ばれた（各部族から' + white + '人ずつ）。誰が選ばれるかは当日まで誰にも分からないため、前もって陪審員を買収することはできなかった。どの部族からも同じ人数が選ばれる点にも注意。'; } }
    });
    reset();
  };

  /* ================= orders: Greek architectural orders ================= */
  W.orders = function (host, p) {
    const O = [
      { k: 'd', n: 'ドーリア式', c: 'var(--accent)', t: '最も古く、簡素で力強い様式。柱に台座（柱礎）がなく、床から直接立つ。柱頭は皿のような丸いふくらみ（エキヌス）と四角い板（アバクス）だけ。太く、中ほどがふくらむ。主にギリシア本土で用いられた。', ex: 'パルテノン神殿（アテネ）、ポセイドン神殿（パエストゥム）' },
      { k: 'i', n: 'イオニア式', c: 'var(--navy)', t: '小アジアのイオニア地方で生まれた優美な様式。柱には柱礎があり、細く高い。柱頭の両側に、渦巻き（ヴォリュート）がある。', ex: 'エレクテイオン、アテナ＝ニケ神殿（アテネ）、アルテミス神殿（エフェソス）' },
      { k: 'c', n: 'コリント式', c: 'var(--gold)', t: '前5世紀末に生まれ、ヘレニズム時代からローマ時代に好まれた華麗な様式。柱頭がアカンサスという植物の葉で飾られる。ローマの建築で多用された。', ex: 'オリンピエイオン（アテネ）、ローマのパンテオン' }
    ];
    const ctl = H('div', 'wctl', host, '<span class="wlab">様式</span>' + O.map((o, i) => '<button type="button" data-i="' + i + '"' + (i ? '' : ' class="on"') + '>' + o.n + '</button>').join('') + '<button type="button" data-i="all">3つを並べる</button>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const col = (g, k, x, c, scale) => {
      const sc = scale || 1, w = (k === 'd' ? 46 : 38) * sc, top = 70, bot = 270, cx = x;
      const base = k === 'd' ? 0 : 14 * sc;
      // shaft with flutes
      S('path', { d: `M${cx - w / 2},${bot - base} L${cx - w / 2 + 3 * sc},${top + 30 * sc} L${cx + w / 2 - 3 * sc},${top + 30 * sc} L${cx + w / 2},${bot - base} Z` }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.6');
      for (let f = 1; f < 6; f++) { const fx = cx - w / 2 + w * f / 6; S('path', { d: `M${fx},${bot - base - 4} L${fx + (cx - fx) * 0.06},${top + 34 * sc}` }, g, 'stroke:' + c + ';stroke-width:0.8;opacity:.6'); }
      if (base) { S('rect', { x: cx - w / 2 - 8 * sc, y: bot - base, width: w + 16 * sc, height: base / 2 }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.4'); S('rect', { x: cx - w / 2 - 12 * sc, y: bot - base / 2, width: w + 24 * sc, height: base / 2 }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.4'); }
      S('path', { d: `M${cx - 120},${bot} H${cx + 120}` }, g, 'stroke:var(--ink-3);stroke-width:2');
      if (k === 'd') {
        S('path', { d: `M${cx - w / 2 + 2},${top + 30 * sc} Q${cx - w / 2 - 8 * sc},${top + 18 * sc} ${cx - w / 2 - 8 * sc},${top + 12 * sc} L${cx + w / 2 + 8 * sc},${top + 12 * sc} Q${cx + w / 2 + 8 * sc},${top + 18 * sc} ${cx + w / 2 - 2},${top + 30 * sc} Z` }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.6');
        S('rect', { x: cx - w / 2 - 12 * sc, y: top, width: w + 24 * sc, height: 12 * sc }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.6');
      } else if (k === 'i') {
        S('rect', { x: cx - w / 2 - 14 * sc, y: top + 8 * sc, width: w + 28 * sc, height: 10 * sc }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.6');
        [-1, 1].forEach(sd => { const vx = cx + sd * (w / 2 + 8 * sc), vy = top + 24 * sc; S('path', { d: `M${vx},${vy} m-11,0 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0 M${vx},${vy} m-6,0 a6,6 0 1,1 12,0 a6,6 0 1,1 -12,0` }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.5'); });
        S('rect', { x: cx - w / 2 - 6 * sc, y: top, width: w + 12 * sc, height: 8 * sc }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.4');
      } else {
        const ch = 40 * sc;
        S('path', { d: `M${cx - w / 2},${top + ch} L${cx - w / 2 - 6 * sc},${top + 8 * sc} L${cx + w / 2 + 6 * sc},${top + 8 * sc} L${cx + w / 2},${top + ch} Z` }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.4');
        for (let r = 0; r < 2; r++) for (let l = -2; l <= 2; l++) { const lx = cx + l * w / 5, ly = top + ch - r * 14 * sc; S('path', { d: `M${lx},${ly} q${-7 * sc},${-10 * sc} ${-2 * sc},${-18 * sc} q${5 * sc},${6 * sc} ${2 * sc},${18 * sc} q${7 * sc},${-10 * sc} ${2 * sc},${-18 * sc}` }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.2'); }
        [-1, 1].forEach(sd => S('path', { d: `M${cx + sd * w / 4},${top + 14 * sc} q${sd * 12 * sc},${-6 * sc} ${sd * 16 * sc},${2 * sc}` }, g, 'fill:none;stroke:' + c + ';stroke-width:1.4'));
        S('rect', { x: cx - w / 2 - 10 * sc, y: top, width: w + 20 * sc, height: 8 * sc }, g, 'fill:var(--paper-2);stroke:' + c + ';stroke-width:1.4');
      }
      txt(g, O.find(o => o.k === k).n, cx, 30, 14, 'font-weight:700;fill:' + c);
    };
    const show = (i) => {
      svg.innerHTML = '';
      ctl.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.i === String(i)));
      if (i === 'all') { O.forEach((o, k) => col(S('g', {}, svg), o.k, 120 + k * 200, o.c, 0.9)); out.innerHTML = '左から、ドーリア式・イオニア式・コリント式。柱頭の形で見分けるのが最も分かりやすい。'; return; }
      const o = O[i]; col(S('g', {}, svg), o.k, 320, o.c, 1.3);
      out.innerHTML = '<b>' + o.n + '</b>：' + o.t + '<br><small>代表例：' + o.ex + '</small>';
    };
    ctl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => show(b.dataset.i === 'all' ? 'all' : +b.dataset.i)));
    show(0);
  };

  /* ================= eratosthenes: measuring the earth ================= */
  W.eratosthenes = function (host, p) {
    const ctl = H('div', 'wctl', host, '<span class="wlab">影の角度</span><input type="range" class="wang" min="2" max="15" step="0.1" value="7.2" aria-label="アレクサンドリアの影の角度"><b class="wa"></b><span class="wlab">2都市の距離</span><input type="range" class="wdist" min="3000" max="8000" step="100" value="5000" aria-label="距離（スタディオン）"><b class="wd"></b>');
    const svg = svgBox(host, 640, 330);
    const out = H('div', 'wout', host);
    const angEl = ctl.querySelector('.wang'), distEl = ctl.querySelector('.wdist');
    const cx = 230, cy = 190, R = 120;
    const draw = () => {
      const a = +angEl.value, d = +distEl.value; ctl.querySelector('.wa').textContent = a.toFixed(1) + '°'; ctl.querySelector('.wd').textContent = d + 'スタディオン';
      svg.innerHTML = '';
      // sun rays
      for (let y = 40; y <= 320; y += 28) { const dy = y - cy, xe = Math.abs(dy) < R ? cx + Math.sqrt(R * R - dy * dy) : 40; S('path', { d: `M630,${y} H${xe}` }, svg, 'stroke:var(--gold);stroke-width:1.2;stroke-dasharray:6 5;opacity:.7'); }
      txt(svg, '太陽の光（平行とみなす）', 560, 22, 11.5, 'fill:var(--gold);font-weight:700');
      S('circle', { cx, cy, r: R }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
      const sy = [cx + R, cy];
      const ar = a * Math.PI / 180 * 3; // exaggerate for visibility
      const al = [cx + R * Math.cos(-ar), cy + R * Math.sin(-ar)];
      // radii
      S('path', { d: `M${cx},${cy} L${sy[0]},${sy[1]} M${cx},${cy} L${al[0]},${al[1]}` }, svg, 'stroke:var(--accent);stroke-width:1.6');
      S('path', { d: `M${cx + 34},${cy} A34,34 0 0,0 ${cx + 34 * Math.cos(-ar)},${cy + 34 * Math.sin(-ar)}` }, svg, 'fill:none;stroke:var(--accent);stroke-width:2');
      txt(svg, a.toFixed(1) + '°', cx + 52, cy - 12, 12, 'fill:var(--accent);font-weight:700');
      // well at Syene
      S('path', { d: `M${sy[0]},${sy[1] - 7} h12 v14 h-12` }, svg, 'fill:none;stroke:var(--navy);stroke-width:2');
      txt(svg, 'シエネ（アスワン）：井戸の底まで日が差す', sy[0] + 18, sy[1] + 22, 11.5, 'fill:var(--navy);font-weight:700', 'start');
      // gnomon at Alexandria
      const n = [Math.cos(-ar), Math.sin(-ar)], g1 = [al[0] + n[0] * 34, al[1] + n[1] * 34];
      S('path', { d: `M${al[0]},${al[1]} L${g1[0]},${g1[1]}` }, svg, 'stroke:var(--ink);stroke-width:3');
      S('path', { d: `M${g1[0]},${g1[1]} L${g1[0] + 300},${g1[1]}` }, svg, 'stroke:var(--gold);stroke-width:1.2');
      S('path', { d: `M${g1[0]},${g1[1]} L${al[0] - 34 * Math.sin(ar) * 0.9},${al[1] - 2}` }, svg, 'stroke:var(--ink-3);stroke-width:1;stroke-dasharray:3 3');
      txt(svg, 'アレクサンドリア：棒の影の角度', al[0] + 12, al[1] - 46, 11.5, 'font-weight:700', 'start');
      txt(svg, '（角度は見やすく3倍に誇張）', 120, 322, 10, 'fill:var(--ink-3)');
      const C = d * 360 / a;
      out.innerHTML = '夏至の正午、シエネでは太陽が真上にあり、アレクサンドリアでは垂直な棒の影が<b>' + a.toFixed(1) + '°</b>傾いた。光が平行なら、この角度は2都市が地球の中心で作る角度に等しい。<br>地球一周 ＝ ' + d + ' ×（360 ÷ ' + a.toFixed(1) + '）＝ <b>約' + Math.round(C).toLocaleString() + 'スタディオン</b>' + (Math.abs(a - 7.2) < 0.05 && d === 5000 ? '。エラトステネスの値は25万スタディオン（1スタディオン＝約157〜185mとすると、約3万9000〜4万6000km。実際は約4万km）。' : '。初期値（7.2°・5000スタディオン）に戻すと、エラトステネスの値になる。');
    };
    angEl.addEventListener('input', draw); distEl.addEventListener('input', draw); draw();
  };

  /* ================= romannum: Roman numeral converter ================= */
  W.romannum = function (host, p) {
    const ctl = H('div', 'wctl', host, '<label>数 <input type="number" class="wnum" min="1" max="3999" value="' + (p.n || 2026) + '"></label><span class="wpre">' + [4, 9, 14, 40, 90, 400, 1999, 2026].map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('') + '</span>');
    const out = H('div', 'wout', host);
    const big = H('div', 'wbig', host);
    big.style.cssText = 'font-family:var(--font-display);font-size:42px;letter-spacing:.08em;text-align:center;margin:8px 0';
    const steps = H('div', 'wout', host);
    const V = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    const conv = (n) => { let r = '', parts = []; for (const [v, s] of V) { while (n >= v) { r += s; n -= v; parts.push(s + '（' + v + '）'); } } return [r, parts]; };
    const num = ctl.querySelector('.wnum');
    const draw = () => {
      const n = Math.max(1, Math.min(3999, num.value | 0)); const [r, parts] = conv(n);
      big.textContent = r;
      steps.innerHTML = '分解：' + parts.join(' ＋ ') + '<br><small>I＝1、V＝5、X＝10、L＝50、C＝100、D＝500、M＝1000。小さい数を大きい数の左に置くと引き算（IV＝5−1＝4）になる。ただし、この引き算の書き方が定着したのは主に中世以降で、古代ローマの碑文ではIIII（4）のような書き方も多い。0を表す記号はなかった。</small>';
    };
    num.addEventListener('input', draw);
    ctl.querySelectorAll('button[data-n]').forEach(b => b.addEventListener('click', () => { num.value = b.dataset.n; draw(); }));
    out.innerHTML = '';
    draw();
  };

  /* ================= aqueduct: gradient and flow ================= */
  W.aqueduct = function (host, p) {
    const ctl = H('div', 'wctl', host, '<span class="wlab">勾配</span><input type="range" class="wg" min="1" max="60" value="' + (p.g || 25) + '" aria-label="勾配（1kmあたりの落差 cm）"><b class="wgv"></b>');
    const svg = svgBox(host, 640, 250);
    const out = H('div', 'wout', host);
    const g = ctl.querySelector('.wg');
    const drops = [];
    let t = 0;
    const draw = () => {
      const cmPerKm = +g.value; ctl.querySelector('.wgv').textContent = '1kmあたり ' + cmPerKm + ' cm（1：' + Math.round(100000 / cmPerKm).toLocaleString() + '）';
      svg.innerHTML = '';
      const x0 = 30, x1 = 610, y0 = 70, ex = 40; // exaggerate
      const y1 = y0 + cmPerKm * 0.9 + 6;
      // hills & valley
      S('path', { d: `M0,250 L0,${y0 + 12} Q60,${y0 + 14} 120,${y0 + 40} L180,230 L460,230 L520,${y1 + 30} Q580,${y1 + 14} 640,${y1 + 12} L640,250 Z` }, svg, 'fill:var(--paper-2);stroke:var(--ink-3)');
      // arches over valley
      const cyAt = (x) => y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      for (let a = 0; a < 7; a++) { const ax = 190 + a * 40, bx = ax + 40, ya = cyAt(ax), yb = cyAt(bx), ym = cyAt(ax + 20); S('path', { d: `M${ax},230 L${ax},${ya + 24} Q${ax + 20},${ym + 4} ${bx},${yb + 24} L${bx},230` }, svg, 'fill:none;stroke:var(--gold);stroke-width:2'); S('path', { d: `M${ax},${ya + 4} L${ax},${ya + 24} M${bx},${yb + 4} L${bx},${yb + 24} M${ax},${ya + 5} L${bx},${yb + 5}` }, svg, 'stroke:var(--gold);stroke-width:2.5'); }
      // channel
      S('path', { d: `M${x0},${y0} L${x1},${y1}` }, svg, 'stroke:var(--ink-2);stroke-width:8;stroke-linecap:round');
      S('path', { d: `M${x0},${y0} L${x1},${y1}` }, svg, 'stroke:var(--navy);stroke-width:4;stroke-linecap:round;opacity:.6');
      txt(svg, '水源（山の泉）', x0 + 10, y0 - 20, 12, 'font-weight:700', 'start');
      txt(svg, '都市', x1 - 10, y1 - 20, 12, 'font-weight:700', 'end');
      txt(svg, '水道橋（谷を渡る）', 330, 245 - 4, 11, 'fill:var(--gold)');
      txt(svg, '（傾きは見やすく大きく誇張）', 120, 22, 10, 'fill:var(--ink-3)');
      drops.length = 0; for (let i = 0; i < 14; i++) { const f = ((t + i / 14) % 1); drops.push(S('circle', { r: 3.2, cx: x0 + (x1 - x0) * f, cy: y0 + (y1 - y0) * f - 1 }, svg, 'fill:#8cc8f0;stroke:#fff;stroke-width:1')); }
      const v = Math.sqrt(cmPerKm / 25);
      let msg;
      if (cmPerKm < 8) msg = '<b>傾きが小さすぎる：</b>水の流れが遅く、泥がたまって詰まりやすい。';
      else if (cmPerKm > 45) msg = '<b>傾きが大きすぎる：</b>流れが速すぎて、水路の底や壁が削られて壊れやすい。また、途中で高さが足りなくなり、遠くまで引けない。';
      else msg = '<b>ちょうどよい傾き。</b>南フランスのポン＝デュ＝ガール水道橋を含むニーム水道（全長約50km）は、全体の落差がわずか約12m、平均すると1kmあたり約25cmだった。ローマの技術者は、水準器などを使って、これほどゆるやかな傾きを何十kmにもわたって保った。';
      out.innerHTML = msg + '<br><small>ローマの水道は、ポンプを使わず、重力だけで水を流した。地形に合わせて、地下のトンネルや、谷を渡る水道橋を組み合わせて、一定の下り坂を保った。</small>';
      draw.v = v; draw.y0 = y0; draw.y1 = y1; draw.x0 = x0; draw.x1 = x1;
    };
    g.addEventListener('input', draw);
    animate(host, (dt) => { t += dt * (draw.v || 1) * 0.12; drops.forEach((d, i) => { const f = ((t + i / drops.length) % 1); d.setAttribute('cx', draw.x0 + (draw.x1 - draw.x0) * f); d.setAttribute('cy', draw.y0 + (draw.y1 - draw.y0) * f - 1); }); });
    draw();
  };
  /* ================= monsoon: seasonal winds and the Red Sea - India voyage ================= */
  W.monsoon = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ 1年を再生</button><span class="wlab">月</span><input type="range" class="wm" min="0" max="11.95" step="0.05" value="' + ((p.m || 7) - 1) + '" aria-label="月"><b class="wmv"></b>');
    const svg = svgBox(host, 640, 320);
    const out = H('div', 'wout', host);
    const m = ctl.querySelector('.wm');
    S('rect', { x: 0, y: 0, width: 640, height: 320 }, svg, 'fill:#b9d3e3;opacity:.55');
    const land = 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1';
    S('path', { d: 'M0,0 L70,0 L95,60 L125,125 L160,180 L195,205 L170,250 L140,320 L0,320 Z' }, svg, land);
    S('path', { d: 'M85,0 L360,0 L370,50 L330,100 L270,135 L210,165 L170,172 L135,120 L105,60 Z' }, svg, land);
    S('path', { d: 'M470,0 L640,0 L640,320 L610,320 L585,295 L560,250 L530,190 L505,120 L480,60 Z' }, svg, land);
    txt(svg, 'エジプト', 40, 40, 12, 'fill:var(--ink-2);font-weight:700');
    txt(svg, 'アラビア半島', 250, 60, 12, 'fill:var(--ink-2);font-weight:700');
    txt(svg, 'アフリカ', 70, 250, 12, 'fill:var(--ink-2);font-weight:700');
    txt(svg, 'インド', 590, 120, 13, 'fill:var(--ink-2);font-weight:700');
    txt(svg, 'アラビア海（インド洋）', 300, 309, 12, 'fill:var(--navy);font-style:italic');
    txt(svg, '紅海', 90, 120, 10, 'fill:var(--navy)', 'end');
    const pt = (x, y, t, a, dx) => { S('circle', { cx: x, cy: y, r: 4 }, svg, 'fill:var(--ink)'); txt(svg, t, x + (a === 'end' ? -(dx || 7) : (dx || 7)), y - 9, 11, 'font-weight:700', a || 'start'); };
    pt(108, 86, 'ベレニケ', 'end', 16); pt(548, 234, 'ムジリス', 'end'); pt(496, 96, 'バリュガザ', 'end');
    txt(svg, '（概念図。陸地の形は簡略化）', 630, 312, 10, 'fill:var(--ink-3)', 'end');
    const OUT = [[108, 86], [140, 150], [166, 178], [230, 196], [330, 202], [450, 216], [546, 232]];
    const RET = [[546, 238], [450, 230], [330, 216], [232, 208], [168, 186], [142, 156], [112, 92]];
    const pd = (P) => 'M' + P.map(q => q.join(',')).join(' L');
    S('path', { d: pd(OUT) }, svg, 'fill:none;stroke:var(--accent);stroke-width:2;stroke-dasharray:6 4;opacity:.7');
    S('path', { d: pd(RET) }, svg, 'fill:none;stroke:var(--navy);stroke-width:2;stroke-dasharray:6 4;opacity:.7');
    const arrows = S('g', {}, svg);
    const ship = S('g', {}, svg);
    S('path', { d: 'M-11,0 L9,0 L13,-4 L-13,-4 Z' }, ship, 'fill:var(--ink-2)');
    S('path', { d: 'M0,-4 L0,-22 M0,-21 L10,-8 L0,-8' }, ship, 'fill:#f3ead7;stroke:var(--ink-2);stroke-width:1.4');
    const ML = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    // wind: [dir (+1 = from SW, -1 = from NE), strength]
    const WIND = [[-1, .8], [-1, .6], [-1, .25], [0, .1], [1, .4], [1, 1], [1, 1], [1, .9], [1, .6], [0, .15], [-1, .55], [-1, .8]];
    const along = (P, f) => { const L = []; let T = 0; for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); T += d; } let r = f * T; for (let i = 0; i < L.length; i++) { if (r <= L[i]) { const k = r / L[i]; return [P[i][0] + (P[i + 1][0] - P[i][0]) * k, P[i][1] + (P[i + 1][1] - P[i][1]) * k]; } r -= L[i]; } return P[P.length - 1]; };
    const shipAt = (t) => { // t: months from Jan 1 (0..12)
      if (t >= 6.5 && t < 8.8) return [along(OUT, (t - 6.5) / 2.3), '往路：南西の季節風を背に受けてインドへ', 1];
      if (t >= 8.8 && t < 11.8) return [OUT[OUT.length - 1], 'インドの港で取引（コショウ・宝石・綿布を買い付け）', 0];
      const u = t >= 11.8 ? t - 11.8 : t + 0.2;
      if (u < 2.2) return [along(RET, u / 2.2), '復路：北東の季節風に乗ってエジプトへ', -1];
      return [[108, 86], 'エジプトの港で荷を降ろし、次の夏の出航を待つ', 0];
    };
    let run = false;
    const draw = () => {
      const t = +m.value, mi = Math.floor(t) % 12, w = WIND[mi];
      ctl.querySelector('.wmv').textContent = ML[mi] + (t - Math.floor(t) < 0.5 ? '（前半）' : '（後半）');
      arrows.innerHTML = '';
      const ang = w[0] > 0 ? -38 : w[0] < 0 ? 142 : 0, len = 12 + 26 * w[1];
      for (let x = 230; x <= 470; x += 60) for (let y = 165; y <= 275; y += 55) {
        if (w[0] === 0) { S('circle', { cx: x, cy: y, r: 2.5 }, arrows, 'fill:var(--ink-3)'); continue; }
        const g = S('g', { transform: 'translate(' + x + ',' + y + ') rotate(' + ang + ')' }, arrows);
        S('path', { d: 'M' + (-len / 2) + ',0 L' + (len / 2) + ',0 M' + (len / 2 - 6) + ',-4 L' + (len / 2) + ',0 L' + (len / 2 - 6) + ',4' }, g, 'fill:none;stroke:' + (w[0] > 0 ? 'var(--accent)' : 'var(--navy)') + ';stroke-width:' + (1.2 + 1.6 * w[1]) + ';stroke-linecap:round');
      }
      const [pos, st] = shipAt(t);
      ship.setAttribute('transform', 'translate(' + pos[0] + ',' + (pos[1] - 2) + ')');
      const wt = w[0] > 0 ? '<b>南西の季節風</b>（夏）：インド亜大陸が熱せられて低気圧となり、海から湿った風が吹き込む。' : w[0] < 0 ? '<b>北東の季節風</b>（冬）：冷えた大陸から海へ向かって、乾いた風が吹き出す。' : '<b>風の向きが入れ替わる時期</b>：風は弱く、向きが定まらない。';
      out.innerHTML = '<b>' + ML[mi] + '</b>　' + wt + '<br>船：' + st + '<br><small>1世紀のプリニウスによれば、船はエジプトのベレニケを真夏に出航し、紅海を下って、約40日でインド西岸のムジリスに着いた。帰りは12月から1月にかけてインドを出航した。季節風を利用すれば、往復を約1年で行うことができた。</small>';
    };
    m.addEventListener('input', draw);
    ctl.querySelector('.wplay').addEventListener('click', (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 1年を再生'; });
    animate(host, (dt) => { if (!run) return; m.value = ((+m.value + dt * 0.8) % 12).toFixed(2); draw(); });
    draw();
  };
  /* ================= seaway: India–China sea routes through Southeast Asia (staged voyage) ================= */
  // p.routes: [{label, pts:[[lon,lat],...], stages:[{to:ptIndex, t:'title', text:'...', wind:'sw'|'ne'|'', land:bool, stay:bool}]}]
  // p.places: [[lon,lat,'name','start'|'end']]
  W.seaway = function (host, p) {
    const W0 = 640, L0 = 78, T0 = 24.5, K = 13, H0 = Math.round((T0 + 9) * K);
    const X = (lon) => (lon - L0) * K, Y = (lat) => (T0 - lat) * K;
    const routes = p.routes || [];
    const ctl = H('div', 'wctl', host, routes.map((r, i) => '<button type="button" class="wrt" data-i="' + i + '">' + r.label + '</button>').join('') + '<span style="flex:1"></span><button type="button" class="wprev" aria-label="前へ">◀</button><button type="button" class="wnext">次へ ▶</button>');
    const svg = svgBox(host, W0, H0);
    const out = H('div', 'wout', host);
    S('rect', { x: 0, y: 0, width: W0, height: H0 }, svg, 'fill:#b9d3e3;opacity:.55');
    const land = 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1;stroke-linejoin:round';
    const poly = (P) => S('path', { d: 'M' + P.map(q => X(q[0]).toFixed(1) + ',' + Y(q[1]).toFixed(1)).join(' L') + ' Z' }, svg, land);
    // simplified coastlines (lon, lat)
    poly([[78, 24.5], [78, 10], [79.8, 10.3], [80.3, 13.5], [80.1, 15.5], [82.3, 16.8], [84.9, 19.3], [86.9, 20.8], [88.2, 21.8], [90, 22], [91.8, 22.4], [92.6, 20.6], [94.3, 18.3], [94.4, 16.2], [95.4, 15.8], [97.7, 16.5], [98.5, 13.2], [98.4, 10.5], [98.3, 8], [99.5, 6.5], [100.3, 5], [101, 3.5], [102.5, 2], [103.5, 1.3], [104.2, 1.5], [103.5, 3.5], [103.4, 5], [102.2, 6.2], [100.5, 7.2], [100.2, 9], [99.3, 10.5], [99.2, 12.5], [100, 13.4], [100.9, 12.7], [102.3, 12.2], [103.5, 10.5], [104.4, 10.4], [104.8, 8.6], [106.5, 9.6], [107, 10.4], [108.8, 11.3], [109.3, 13], [108.9, 15.3], [107.5, 16.6], [106.5, 18], [105.7, 19], [106.6, 20.4], [107.5, 21.3], [108.5, 21.6], [109.7, 21.5], [110.4, 20.4], [110.6, 21.2], [111.6, 21.6], [113.3, 22.2], [114.2, 22.3], [116.5, 23], [118, 24.3], [118.6, 24.5]]);
    poly([[79.8, 6], [80.1, 9.8], [81.2, 8.5], [81.8, 7.2], [81.6, 6.4], [80.6, 5.9]]);
    poly([[95.3, 5.6], [97.5, 5.2], [98.7, 3.8], [100.4, 2.2], [101.4, 2], [103.7, 0.7], [104.5, -1], [106, -3], [105.8, -5.8], [104.5, -5.6], [102.3, -4], [100.9, -2.1], [99.2, 0.2], [98.5, 1.8], [97.2, 2.8], [95.4, 4.8]]);
    poly([[105.2, -6.8], [106.8, -6.1], [108.6, -6.7], [110.4, -6.9], [112.7, -6.9], [114.6, -7.7], [114.4, -8.6], [112, -8.3], [110, -8.1], [108, -7.8], [106.4, -7.4]]);
    poly([[109, 1.5], [109.6, 2], [111, 1.6], [113, 3.2], [115.5, 5.4], [117, 7], [118.9, 5.3], [118, 4.3], [117.6, 1], [116.5, -1.4], [116, -3.8], [114.5, -3.6], [113, -3.1], [111.7, -3], [110.2, -2.9], [110, -1.2], [109, 0]]);
    poly([[108.6, 19.2], [109.7, 20], [110.6, 20.1], [111, 19.6], [110.3, 18.7], [109.5, 18.2], [108.7, 18.5]]);
    poly([[120.1, 23], [121, 24.5], [121.9, 24.5], [121, 22.2], [120.7, 22]]);
    poly([[119.8, 16], [120.6, 18.5], [122.2, 18.5], [122.3, 17], [121.5, 15.2], [124, 13], [122.5, 13.8], [120.6, 14.3], [120, 15]]);
    poly([[117.2, 8.3], [118.4, 9.6], [119.5, 10.8], [119.3, 11.2], [118, 10], [117, 8.6]]);
    (p.labels || []).forEach(([lon, lat, t, sz, it]) => txt(svg, t, X(lon), Y(lat), sz || 12, 'fill:' + (it ? 'var(--navy);font-style:italic' : 'var(--ink-2);font-weight:700')));
    const windG = S('g', {}, svg), pathG = S('g', {}, svg), dotG = S('g', {}, svg);
    (p.places || []).forEach(([lon, lat, t, a]) => { S('circle', { cx: X(lon), cy: Y(lat), r: 3.6 }, dotG, 'fill:var(--ink)'); txt(dotG, t, X(lon) + (a === 'end' ? -6 : 6), Y(lat) - 8, 11, 'font-weight:700;paint-order:stroke;stroke:var(--paper);stroke-width:3px', a || 'start'); });
    txt(svg, '（概念図。海岸線は簡略化）', W0 - 8, H0 - 8, 10, 'fill:var(--ink-3)', 'end');
    const ship = S('g', {}, svg);
    S('path', { d: 'M-11,0 L9,0 L13,-4 L-13,-4 Z' }, ship, 'fill:var(--ink-2)');
    S('path', { d: 'M0,-4 L0,-22 M0,-21 L10,-8 L0,-8' }, ship, 'fill:#f3ead7;stroke:var(--ink-2);stroke-width:1.4');
    const porter = S('g', {}, svg);
    S('circle', { cx: 0, cy: -16, r: 3.2 }, porter, 'fill:var(--ink-2)');
    S('path', { d: 'M0,-12 L0,-3 M0,-3 L-4,4 M0,-3 L4,4 M-7,-11 L7,-11 M-7,-11 L-7,-6 L-3,-6 L-3,-11 M7,-11 L7,-6 L3,-6 L3,-11' }, porter, 'fill:none;stroke:var(--ink-2);stroke-width:1.6;stroke-linecap:round');
    let ri = 0, si = -1, anim = null;
    const P = () => routes[ri].pts.map(q => [X(q[0]), Y(q[1])]);
    const segPts = (a, b) => P().slice(a, b + 1);
    const along = (Q, f) => { const L = []; let T = 0; for (let i = 1; i < Q.length; i++) { const d = Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]); L.push(d); T += d; } let r = f * T; for (let i = 0; i < L.length; i++) { if (r <= L[i]) { const k = L[i] ? r / L[i] : 0; return [Q[i][0] + (Q[i + 1][0] - Q[i][0]) * k, Q[i][1] + (Q[i + 1][1] - Q[i][1]) * k]; } r -= L[i]; } return Q[Q.length - 1]; };
    const winds = (w) => {
      windG.innerHTML = ''; if (!w) return;
      const ang = w === 'sw' ? -40 : 140, col = w === 'sw' ? 'var(--accent)' : 'var(--navy)';
      [[88, 14], [90, 7], [111, 13], [113, 8], [107, 4], [94, 11], [116, 18]].forEach(([lon, lat]) => {
        const g = S('g', { transform: 'translate(' + X(lon) + ',' + Y(lat) + ') rotate(' + ang + ')' }, windG);
        S('path', { d: 'M-16,0 L16,0 M10,-5 L16,0 L10,5' }, g, 'fill:none;stroke:' + col + ';stroke-width:2.4;stroke-linecap:round;opacity:.75');
      });
    };
    const place = (pt, onLand) => { ship.style.display = onLand ? 'none' : ''; porter.style.display = onLand ? '' : 'none'; (onLand ? porter : ship).setAttribute('transform', 'translate(' + pt[0] + ',' + (pt[1] - 2) + ')'); };
    const drawPath = () => {
      pathG.innerHTML = ''; const r = routes[ri], st = r.stages; let a = 0;
      st.forEach((s, k) => {
        const Q = segPts(a, s.to); a = s.to;
        if (Q.length < 2) return;
        S('path', { d: 'M' + Q.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' L') }, pathG, 'fill:none;stroke:' + (s.land ? 'var(--ink-2)' : 'var(--accent)') + ';stroke-width:' + (k <= si ? 3 : 1.6) + ';stroke-dasharray:' + (s.land ? '2 4' : '7 5') + ';opacity:' + (k <= si ? .95 : .4));
      });
    };
    const show = (k, animateIt) => {
      const r = routes[ri], st = r.stages; si = Math.max(-1, Math.min(st.length - 1, k));
      ctl.querySelectorAll('.wrt').forEach(b => b.classList.toggle('on', +b.dataset.i === ri));
      drawPath();
      if (si < 0) { winds(''); place(P()[0], false); out.innerHTML = '<b>' + r.label + '</b><br>' + (r.intro || '') + '<br><small>「次へ」で、航海を段階ごとにたどる。</small>'; return; }
      const s = st[si], from = si ? st[si - 1].to : 0, Q = segPts(from, s.to);
      winds(s.wind);
      out.innerHTML = '<b>' + (si + 1) + '. ' + s.t + '</b>　' + s.text + (s.wind === 'sw' ? '<br><small>赤い矢印：夏の南西の季節風</small>' : s.wind === 'ne' ? '<br><small>青い矢印：冬の北東の季節風</small>' : '');
      if (anim) cancelAnimationFrame(anim);
      if (!animateIt || Q.length < 2 || s.stay) { place(Q[Q.length - 1], !!s.land); return; }
      const t0 = performance.now(), dur = 1600;
      const step = (now) => { const f = Math.min(1, (now - t0) / dur); place(along(Q, f), !!s.land); if (f < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    };
    ctl.querySelectorAll('.wrt').forEach(b => b.addEventListener('click', () => { ri = +b.dataset.i; show(-1); }));
    ctl.querySelector('.wnext').addEventListener('click', () => show(si + 1, true));
    ctl.querySelector('.wprev').addEventListener('click', () => show(si - 1, false));
    show(-1);
  };
  /* ================= qibla: direction of Mecca from cities (great circle vs rhumb line) ================= */
  W.qibla = function (host, p) {
    const MK = [21.4225, 39.8262], R = Math.PI / 180, cities = p.cities || [];
    const ctl = H('div', 'wctl', host, '<span class="wlab">都市</span><select class="wcity">' + cities.map((c, i) => '<option value="' + i + '"' + (i === (p.start || 0) ? ' selected' : '') + '>' + c[0] + '</option>').join('') + '</select>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const sel = ctl.querySelector('.wcity');
    const gc = (a, b) => { const f1 = a[0] * R, f2 = b[0] * R, dl = (b[1] - a[1]) * R; const y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl); const d = Math.acos(Math.min(1, Math.sin(f1) * Math.sin(f2) + Math.cos(f1) * Math.cos(f2) * Math.cos(dl))) * 6371; return [(Math.atan2(y, x) / R + 360) % 360, d]; };
    const rh = (a, b) => { const f1 = a[0] * R, f2 = b[0] * R; let dl = (b[1] - a[1]) * R; if (dl > Math.PI) dl -= 2 * Math.PI; if (dl < -Math.PI) dl += 2 * Math.PI; const dp = Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2)); return (Math.atan2(dl, dp) / R + 360) % 360; };
    const dirName = (b) => ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'][Math.round(b / 22.5) % 16];
    const cx = 160, cy = 150, r = 110;
    const draw = () => {
      svg.innerHTML = '';
      const c = cities[+sel.value], P = [c[1], c[2]], [b1, d] = gc(P, MK), b2 = rh(P, MK);
      S('circle', { cx, cy, r }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
      for (let a = 0; a < 360; a += 15) { const L = a % 90 ? 6 : 12, s = Math.sin(a * R), co = -Math.cos(a * R); S('path', { d: 'M' + (cx + s * r) + ',' + (cy + co * r) + ' L' + (cx + s * (r - L)) + ',' + (cy + co * (r - L)) }, svg, 'stroke:var(--ink-3);stroke-width:1'); }
      [['北', 0], ['東', 90], ['南', 180], ['西', 270]].forEach(([t, a]) => txt(svg, t, cx + Math.sin(a * R) * (r + 16), cy - Math.cos(a * R) * (r + 16), 13, 'font-weight:700;fill:var(--ink-2)'));
      const arrow = (b, col, dash, w) => { const s = Math.sin(b * R), co = -Math.cos(b * R), ex = cx + s * (r - 16), ey = cy + co * (r - 16); S('path', { d: 'M' + cx + ',' + cy + ' L' + ex + ',' + ey }, svg, 'stroke:' + col + ';stroke-width:' + w + ';' + (dash ? 'stroke-dasharray:6 5;' : '') + 'stroke-linecap:round'); const g = S('g', { transform: 'translate(' + ex + ',' + ey + ') rotate(' + b + ')' }, svg); S('path', { d: 'M0,-9 L-7,5 L7,5 Z' }, g, 'fill:' + col); };
      arrow(b2, 'var(--ink-3)', true, 2);
      arrow(b1, 'var(--accent)', false, 3.5);
      S('circle', { cx, cy, r: 5 }, svg, 'fill:var(--ink)');
      const x0 = 320;
      txt(svg, c[0] + ' → メッカ', x0, 40, 16, 'font-weight:700', 'start');
      txt(svg, '大円（最短経路）の方向：' + b1.toFixed(0) + '°（' + dirName(b1) + '）', x0, 80, 13, 'fill:var(--accent);font-weight:700', 'start');
      txt(svg, 'メルカトル図法の地図上の直線の方向：' + b2.toFixed(0) + '°（' + dirName(b2) + '）', x0, 108, 12, 'fill:var(--ink-3)', 'start');
      txt(svg, '最短距離：約' + Math.round(d / 10) * 10 + 'km', x0, 140, 13, '', 'start');
      txt(svg, '（方位は真北から時計回りの角度）', x0, 166, 11, 'fill:var(--ink-3)', 'start');
      S('path', { d: 'M' + x0 + ',200 l28,0' }, svg, 'stroke:var(--accent);stroke-width:3.5');
      txt(svg, 'キブラ（礼拝の方向）＝大円の方向', x0 + 36, 200, 12, '', 'start');
      S('path', { d: 'M' + x0 + ',226 l28,0' }, svg, 'stroke:var(--ink-3);stroke-width:2;stroke-dasharray:6 5');
      txt(svg, '平面の地図で直線を引いた方向', x0 + 36, 226, 12, 'fill:var(--ink-3)', 'start');
      out.innerHTML = (c[3] || '') + (Math.abs(((b1 - b2 + 540) % 360) - 180) > 25 ? '<br><small>この都市では、地球儀の上での最短経路の方向と、平面の地図の上で直線を引いた方向が大きく異なる。どちらをキブラとするかをめぐって、議論が起こったことがある。</small>' : '');
    };
    sel.addEventListener('change', draw); draw();
  };
  /* ================= ramadan: tabular Hijri calendar – where Ramadan falls in a given Gregorian year ================= */
  W.ramadan = function (host, p) {
    const y0 = p.from || 1990, y1 = p.to || 2060;
    const ctl = H('div', 'wctl', host, '<span class="wlab">西暦</span><input type="range" class="wy" min="' + y0 + '" max="' + y1 + '" value="' + (p.start || 2026) + '" aria-label="年"><b class="wyv"></b><button type="button" class="wplay">▶ 再生</button>');
    const svg = svgBox(host, 640, 260);
    const out = H('div', 'wout', host);
    const yi = ctl.querySelector('.wy');
    // tabular (civil) Islamic calendar: JD of y/m/d AH
    const hjd = (y, m, d) => d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + 1948439.5 - 1;
    const jdg = (jd) => { const Z = Math.floor(jd + 0.5), a = Math.floor((Z - 1867216.25) / 36524.25), A = Z + 1 + a - Math.floor(a / 4), B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001); const day = B - D - Math.floor(30.6001 * E), mon = E < 14 ? E - 1 : E - 13, yr = mon > 2 ? C - 4716 : C - 4715; return [yr, mon, day]; };
    const doy = (y, m, d) => (Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5;
    const X0 = 40, X1 = 600, W0 = X1 - X0;
    const draw = () => {
      const Y = +yi.value; ctl.querySelector('.wyv').textContent = Y + '年';
      svg.innerHTML = '';
      const seas = [[0, 59, '冬', '#9fb7d4'], [59, 151, '春', '#b9d4a3'], [151, 243, '夏', '#e3b98a'], [243, 334, '秋', '#d6a9a0'], [334, 365, '冬', '#9fb7d4']];
      seas.forEach(([a, b, t, c]) => { S('rect', { x: X0 + W0 * a / 365, y: 70, width: W0 * (b - a) / 365, height: 60 }, svg, 'fill:' + c + ';opacity:.55'); txt(svg, t, X0 + W0 * (a + b) / 730, 145, 11, 'fill:var(--ink-3)'); });
      for (let m = 0; m < 12; m++) { const x = X0 + W0 * doy(2001, m + 1, 1) / 365; S('path', { d: 'M' + x + ',66 L' + x + ',134' }, svg, 'stroke:var(--paper);stroke-width:1.5'); txt(svg, (m + 1) + '月', x + 22, 58, 11, 'fill:var(--ink-2)'); }
      // Ramadan(s) starting in this Gregorian year
      let hy = Math.floor((Y - 622) * 33 / 32) - 2, found = [];
      for (let k = 0; k < 5; k++, hy++) { const s = jdg(hjd(hy, 9, 1)), e = jdg(hjd(hy, 10, 1) - 1); if (s[0] === Y || e[0] === Y) found.push([hy, s, e]); }
      found.forEach(([h, s, e], k) => {
        const a = s[0] < Y ? 0 : doy(...s), b = e[0] > Y ? 365 : doy(...e) + 1;
        S('rect', { x: X0 + W0 * a / 365, y: 76, width: Math.max(2, W0 * (b - a) / 365), height: 48, rx: 4 }, svg, 'fill:var(--accent);opacity:.85');
        const lx = Math.min(X1 - 90, Math.max(X0 + 90, X0 + W0 * (a + b) / 730));
        txt(svg, 'ラマダーン月（ヒジュラ暦' + h + '年）', lx, 30 - k * 16, 12, 'fill:var(--accent);font-weight:700');
        S('path', { d: 'M' + (X0 + W0 * (a + b) / 730) + ',40 L' + (X0 + W0 * (a + b) / 730) + ',72' }, svg, 'stroke:var(--accent);stroke-width:1.2');
      });
      // drift line: Ramadan start over the decades
      txt(svg, '各年のラマダーンの始まり（縦は年。上が' + y0 + '年、下が' + y1 + '年）', X0, 178, 11, 'fill:var(--ink-3)', 'start');
      txt(svg, String(y0), X0 - 6, 192, 9, 'fill:var(--ink-3)', 'end'); txt(svg, String(y1), X0 - 6, 248, 9, 'fill:var(--ink-3)', 'end');
      let pts = [];
      for (let h = Math.floor((y0 - 622) * 33 / 32) - 2; ; h++) { const s = jdg(hjd(h, 9, 1)); if (s[0] > y1) break; if (s[0] < y0) continue; pts.push([s[0], doy(...s)]); }
      pts.forEach(([yy, d]) => S('circle', { cx: X0 + W0 * d / 365, cy: 192 + (yy - y0) / (y1 - y0) * 56, r: yy === Y ? 4.5 : 2 }, svg, 'fill:' + (yy === Y ? 'var(--accent)' : 'var(--ink-3)')));
      const f = found.find(q => q[1][0] === Y) || found[0];
      out.innerHTML = f ? '<b>' + Y + '年のラマダーン月</b>（ヒジュラ暦' + f[0] + '年第9月）：' + f[1][1] + '月' + f[1][2] + '日ごろ〜' + f[2][1] + '月' + f[2][2] + '日ごろ' + (found.length > 1 ? '。この年には、ラマダーン月が2回ある。' : '') + '<br><small>ヒジュラ暦は月の満ち欠けだけで1年（約354日）を数えるため、ラマダーン月は太陽暦の上で毎年約11日ずつ早まり、約33年で季節を一巡する。日付は計算による目安で、実際には新月の観測などによって、地域ごとに1〜2日ずれる。夏のラマダーンは、日の出から日の入りまでの断食の時間が長く、暑さのため特に厳しい。</small>' : '';
    };
    let run = false;
    yi.addEventListener('input', draw);
    ctl.querySelector('.wplay').addEventListener('click', (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 再生'; });
    let acc = 0; animate(host, (dt) => { if (!run) return; acc += dt; if (acc > 0.35) { acc = 0; yi.value = +yi.value >= y1 ? y0 : +yi.value + 1; draw(); } });
    draw();
  };
  /* ================= roundcity: al-Mansur's Round City of Baghdad (schematic) with scale comparison ================= */
  W.roundcity = function (host, p) {
    const cmp = p.compare || [];
    const ctl = H('div', 'wctl', host, '<button type="button" data-c="-1" class="on">円城だけを見る</button>' + cmp.map((c, i) => '<button type="button" data-c="' + i + '">' + c.btn + '</button>').join(''));
    const VW = 640, VH = 470, svg = svgBox(host, VW, VH);
    const out = H('div', 'wout', host, p.hint || '');
    const D = p.d || 2600; // diameter in metres
    const feats = p.features || [];
    const draw = (ci) => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: VW, height: VH }, svg, 'fill:var(--card)');
      const c = cmp[ci];
      const spanM = c ? c.span : D * 1.5, k = (VH - 40) / spanM, cx = c ? VW * 0.42 : VW / 2, cy = VH / 2 - 6;
      const m2 = (x, y) => [cx + x * k, cy + y * k];
      // Tigris to the east
      const tx = cx + (D * 0.5 + 700) * k;
      S('path', { d: 'M' + (tx - 30) + ',-10 C' + (tx + 25) + ',' + VH * 0.3 + ' ' + (tx - 40) + ',' + VH * 0.6 + ' ' + (tx + 10) + ',' + (VH + 10) }, svg, 'fill:none;stroke:#8fb3cc;stroke-width:' + Math.max(6, 250 * k) + ';stroke-linecap:round;opacity:.8');
      txt(svg, 'ティグリス川', tx + 18, 34, 12, 'fill:var(--navy);font-style:italic', 'start');
      if (c) {
        const [x0, y0] = m2(-c.w / 2 + c.dx, -c.h / 2 + c.dy);
        S('rect', { x: x0, y: y0, width: c.w * k, height: c.h * k }, svg, 'fill:' + CM.sideColor(c.c || 'e') + ';fill-opacity:.12;stroke:' + CM.sideColor(c.c || 'e') + ';stroke-width:2;stroke-dasharray:7 5');
        txt(svg, c.label, x0 + 6, y0 + 16, 12, 'font-weight:700;fill:' + CM.sideColor(c.c || 'e'), 'start');
      }
      const R = D / 2 * k;
      S('circle', { cx, cy, r: R + 9 * Math.max(.4, k * 30) }, svg, 'fill:none;stroke:#8fb3cc;stroke-width:' + Math.max(2, 20 * k));
      S('circle', { cx, cy, r: R }, svg, 'fill:var(--paper);stroke:var(--ink-2);stroke-width:3');
      S('circle', { cx, cy, r: R * 0.8 }, svg, 'fill:none;stroke:var(--ink-2);stroke-width:1.6');
      S('circle', { cx, cy, r: R * 0.55 }, svg, 'fill:' + CM.sideColor('d') + ';fill-opacity:.12;stroke:var(--ink-3);stroke-width:1.2');
      const items = [];
      const show = (f, el) => { items.forEach(q => q.style.opacity = q === el ? 1 : .6); out.innerHTML = '<b>' + f.t + '</b>　' + f.note; };
      // radial roads + gates
      (p.gates || []).forEach((g) => {
        const a = g.a * Math.PI / 180, ex = Math.sin(a), ey = -Math.cos(a);
        S('path', { d: 'M' + (cx + ex * R * 0.55) + ',' + (cy + ey * R * 0.55) + ' L' + (cx + ex * (R + 6)) + ',' + (cy + ey * (R + 6)) }, svg, 'stroke:' + CM.sideColor('e') + ';stroke-width:' + Math.max(3, 8 * k * 20) + ';opacity:.55');
        const gg = S('g', {}, svg, 'cursor:pointer');
        S('rect', { x: cx + ex * R - 7, y: cy + ey * R - 7, width: 14, height: 14, rx: 2 }, gg, 'fill:' + CM.sideColor('a') + ';stroke:var(--paper);stroke-width:2');
        if (!c || k > 0.06) txt(gg, g.t, cx + ex * (R + 30), cy + ey * (R + 22), 11.5, 'font-weight:700;paint-order:stroke;stroke:var(--card);stroke-width:3', ex > 0.2 ? 'start' : ex < -0.2 ? 'end' : 'middle');
        gg.onclick = () => show(g, gg); items.push(gg);
      });
      feats.forEach(f => {
        const gg = S('g', {}, svg, 'cursor:pointer');
        if (f.kind === 'ring') { S('circle', { cx, cy, r: R * f.r }, gg, 'fill:none;stroke:transparent;stroke-width:14'); }
        else { const [x, y] = m2(f.x * D / 2, f.y * D / 2); S(f.round ? 'circle' : 'rect', f.round ? { cx: x, cy: y, r: Math.max(5, f.s * D / 2 * k) } : { x: x - Math.max(5, f.s * D / 2 * k), y: y - Math.max(5, f.s * D / 2 * k), width: 2 * Math.max(5, f.s * D / 2 * k), height: 2 * Math.max(5, f.s * D / 2 * k), rx: 2 }, gg, 'fill:' + CM.sideColor(f.c || 'g') + ';fill-opacity:.55;stroke:' + CM.sideColor(f.c || 'g') + ';stroke-width:1.5'); }
        if (!c) { const [lx, ly] = f.kind === 'ring' ? [cx, cy - R * f.r] : m2(f.lx * D / 2, f.ly * D / 2); txt(gg, f.t, lx, ly, 11, 'font-weight:700;paint-order:stroke;stroke:var(--paper);stroke-width:3;fill:' + CM.sideColor(f.c || 'g')); }
        gg.onclick = () => show(f, gg); items.push(gg);
      });
      // scale bar
      const sb = c ? 2000 : 500;
      S('path', { d: 'M20,' + (VH - 18) + ' l' + sb * k + ',0' }, svg, 'stroke:var(--ink);stroke-width:3');
      txt(svg, (sb >= 1000 ? sb / 1000 + 'km' : sb + 'm'), 20 + sb * k / 2, VH - 30, 11, '', 'middle');
      txt(svg, '（模式図。円城の直径は約' + (D / 1000).toFixed(1) + 'kmとした）', VW - 10, VH - 10, 10, 'fill:var(--ink-3)', 'end');
      out.innerHTML = c ? c.note : (p.hint || '');
    };
    ctl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { ctl.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); draw(+b.dataset.c); }));
    draw(-1);
  };
  /* ================= algebra: al-Khwarizmi's geometric completion of the square for x^2 + b x = c ================= */
  W.algebra = function (host, p) {
    const ctl = H('div', 'wctl', host, '<span class="wlab">x² +</span><select class="wb">' + [2, 4, 6, 8, 10, 12].map(v => '<option' + (v === (p.b || 10) ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><span class="wlab">x =</span><select class="wc">' + [11, 24, 39, 56, 64, 75].map(v => '<option' + (v === (p.c || 39) ? ' selected' : '') + '>' + v + '</option>').join('') + '</select><span style="flex:1"></span><button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button>');
    const svg = svgBox(host, 640, 330);
    const out = H('div', 'wout', host);
    let st = 0;
    const draw = () => {
      const b = +ctl.querySelector('.wb').value, c = +ctl.querySelector('.wc').value, h = b / 2, x = Math.sqrt(c + h * h) - h;
      svg.innerHTML = '';
      const U = 250 / (x + h), ox = 60, oy = 40;
      const rect = (X0, Y0, w, hh, fill, lab, show) => { if (!show) return; S('rect', { x: ox + X0 * U, y: oy + Y0 * U, width: w * U, height: hh * U }, svg, 'fill:' + fill + ';fill-opacity:.35;stroke:var(--ink-2);stroke-width:1.5'); if (lab) txt(svg, lab, ox + (X0 + w / 2) * U, oy + (Y0 + hh / 2) * U, 13, 'font-weight:700'); };
      rect(0, 0, x, x, CM.sideColor('a'), 'x²', true);
      rect(x, 0, h, x, CM.sideColor('b'), (h) + 'x', st >= 1);
      rect(0, x, x, h, CM.sideColor('b'), (h) + 'x', st >= 1);
      rect(x, x, h, h, CM.sideColor('d'), st >= 2 ? (h * h) : '', st >= 2);
      if (st >= 3) S('rect', { x: ox, y: oy, width: (x + h) * U, height: (x + h) * U }, svg, 'fill:none;stroke:var(--accent);stroke-width:3;stroke-dasharray:8 5');
      // dimension labels
      txt(svg, 'x', ox + x * U / 2, oy - 12, 13, 'font-style:italic'); if (st >= 1) txt(svg, String(h), ox + (x + h / 2) * U, oy - 12, 13);
      txt(svg, 'x', ox - 14, oy + x * U / 2, 13, 'font-style:italic'); if (st >= 1) txt(svg, String(h), ox - 14, oy + (x + h / 2) * U, 13);
      const tx = 360, lines = [
        ['x² + ' + b + 'x = ' + c, '問題：「平方と、その根の' + b + '倍を合わせると' + c + 'になる」'],
        ['x² + 2×' + h + 'x = ' + c, '根の' + b + '倍を、幅' + h + 'の長方形2つに分ける'],
        ['x² + ' + b + 'x + ' + (h * h) + ' = ' + c + ' + ' + (h * h) + ' = ' + (c + h * h), '欠けた隅に' + h + '×' + h + '＝' + (h * h) + 'の正方形を「補う」（ジャブル）'],
        ['(x + ' + h + ')² = ' + (c + h * h) + ' → x + ' + h + ' = ' + Math.sqrt(c + h * h).toFixed(Number.isInteger(Math.sqrt(c + h * h)) ? 0 : 3), '全体は1辺が x + ' + h + ' の大きな正方形になる'],
        ['x = ' + (Number.isInteger(x) ? x : x.toFixed(3)), '大きな正方形の1辺から' + h + 'を引けば、根が求まる']];
      lines.slice(0, st + 1).forEach((l, i) => { txt(svg, l[0], tx, 50 + i * 58, 15, 'font-weight:700;fill:' + (i === st ? 'var(--accent)' : 'var(--ink)'), 'start'); txt(svg, l[1], tx, 70 + i * 58, 10.5, 'fill:var(--ink-3)', 'start'); });
      out.innerHTML = ['<b>1. 問題</b>　フワーリズミーの『ジャブルとムカーバラの計算の書』の有名な例題は「平方と、その根の10倍を合わせると39ディルハムになる」（x² + 10x = 39）であった。当時は記号を使わず、すべて言葉で書かれていた。',
        '<b>2. 長方形を分ける</b>　根（x）の' + b + '倍を、半分ずつ2つの長方形として、正方形の2辺に貼りつける。',
        '<b>3. 欠けた部分を補う</b>　右下の欠けた部分に正方形を補い、等式の両辺に同じだけ加える。「アル・ジャブル」（補う・元に戻す）という言葉が、英語の「アルジェブラ」（代数学）の語源となった。',
        '<b>4. 大きな正方形</b>　全体は1つの大きな正方形となり、その面積から1辺の長さが求まる。',
        '<b>5. 答え</b>　x = ' + (Number.isInteger(x) ? x : x.toFixed(3)) + '。フワーリズミーは、負の数の解は考えなかった。' + (Number.isInteger(x) ? '' : '<br><small>この組み合わせでは、答えは整数にならない。</small>')][st];
    };
    ctl.querySelector('.wnext').addEventListener('click', () => { st = Math.min(4, st + 1); draw(); });
    ctl.querySelector('.wprev').addEventListener('click', () => { st = Math.max(0, st - 1); draw(); });
    ctl.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { st = 0; draw(); }));
    draw();
  };
  /* ================= horarium: 24-hour dial of a monastic day (Rule of St Benedict) ================= */
  W.horarium = function (host, p) {
    const sets = p.sets || [], cats = p.cats || {};
    let cur = 0;
    const ctl = H('div', 'wctl', host, sets.map((o, i) => '<button type="button" data-i="' + i + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(o.btn) + '</button>').join(''));
    const svg = svgBox(host, 640, 380);
    const out = H('div', 'wout', host, p.hint || '');
    const CX = 190, CY = 190, R0 = 70, R1 = 150;
    const ang = (h) => (h / 24) * Math.PI * 2 - Math.PI / 2;
    const pt = (h, r) => [CX + r * Math.cos(ang(h)), CY + r * Math.sin(ang(h))];
    const fmt = (h) => { const hh = Math.floor(h + 1e-6) % 24, mm = Math.round((h - Math.floor(h + 1e-6)) * 60); return hh + ':' + String(mm).padStart(2, '0'); };
    const draw = () => {
      svg.innerHTML = '';
      const set = sets[cur], segs = set.segs || [];
      S('circle', { cx: CX, cy: CY, r: R1 + 4 }, svg, 'fill:var(--paper);stroke:var(--rule);stroke-width:1');
      const items = [];
      segs.forEach(sg => {
        let a = sg.a, b = sg.b; if (b <= a) b += 24;
        const big = (b - a) > 12 ? 1 : 0, [x0, y0] = pt(a, R1), [x1, y1] = pt(b, R1), [x2, y2] = pt(b, R0), [x3, y3] = pt(a, R0);
        const c = CM.sideColor((cats[sg.k] || {}).c);
        const path = S('path', { d: `M${x0},${y0} A${R1},${R1} 0 ${big} 1 ${x1},${y1} L${x2},${y2} A${R0},${R0} 0 ${big} 0 ${x3},${y3} Z` }, svg, 'fill:' + c + ';fill-opacity:.8;stroke:var(--paper);stroke-width:1.5;cursor:pointer');
        items.push(path);
        if (sg.lab) { const m = (a + b) / 2, r = (b - a) < 1.2 ? R1 + 22 : (R0 + R1) / 2, [lx, ly] = pt(m, r); const t = txt(svg, sg.t, lx, ly, (b - a) < 1.2 ? 10.5 : 11.5, 'font-weight:700;pointer-events:none;' + ((b - a) < 1.2 ? 'fill:' + c : 'fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:2px')); }
        path.onclick = () => { items.forEach(q => q.style.fillOpacity = q === path ? 1 : .35); out.innerHTML = '<b>' + esc(sg.t) + '</b>　<small>' + fmt(sg.a) + '〜' + fmt(sg.b) + '</small><br>' + (sg.note || ''); };
      });
      for (let h = 0; h < 24; h += 3) { const [x, y] = pt(h, R0 - 12); txt(svg, h + '時', x, y, 10, 'fill:var(--ink-3)'); }
      txt(svg, set.center || '', CX, CY - 6, 12, 'font-weight:700'); txt(svg, set.sub || '', CX, CY + 12, 10, 'fill:var(--ink-3)');
      // totals by category
      const tot = {}; segs.forEach(sg => { let d = sg.b - sg.a; if (d <= 0) d += 24; tot[sg.k] = (tot[sg.k] || 0) + d; });
      const keys = Object.keys(cats), bx = 400, bw = 200;
      txt(svg, '1日の時間の配分', bx, 40, 12.5, 'font-weight:700', 'start');
      keys.forEach((k, i) => {
        const y = 70 + i * 44, v = tot[k] || 0, c = CM.sideColor(cats[k].c);
        txt(svg, cats[k].t, bx, y, 11.5, 'font-weight:700;fill:' + c, 'start');
        S('rect', { x: bx, y: y + 9, width: bw * v / 10, height: 12, rx: 2 }, svg, 'fill:' + c);
        txt(svg, (Math.round(v * 4) / 4) + '時間', bx + bw * v / 10 + 6, y + 15, 10.5, 'fill:var(--ink-2)', 'start');
      });
      out.innerHTML = set.text || p.hint || '';
    };
    ctl.querySelectorAll('button').forEach(b => b.onclick = () => { cur = +b.dataset.i; ctl.querySelectorAll('button').forEach(q => q.classList.toggle('on', q === b)); draw(); });
    draw();
  };
  /* ================= pingzhun: Han price-stabilization (平準法) simulator ================= */
  W.pingzhun = function (host, p) {
    const ctl = H('div', 'wctl', host, '<span class="wlab">国家の介入</span><input type="range" class="wk" min="0" max="100" value="' + (p.k == null ? 0 : p.k) + '" aria-label="介入の強さ"><b class="wkv"></b><label style="margin-left:10px"><input type="checkbox" class="wsh" checked> 2年目にききん</label>');
    const W0 = 640, H0 = 270, svg = svgBox(host, W0, H0);
    const out = H('div', 'wout', host);
    const k = ctl.querySelector('.wk'), sh = ctl.querySelector('.wsh');
    const N = 24, x0 = 50, x1 = 620, yT = 22, yB = 172;
    const X = (t) => x0 + (x1 - x0) * t / (N - 1);
    const Y = (v) => yB - (v - 40) / (200 - 40) * (yB - yT);
    const draw = () => {
      const kk = +k.value / 100;
      ctl.querySelector('.wkv').textContent = kk === 0 ? 'なし（商人まかせ）' : Math.round(kk * 100) + '%';
      const base = [], sim = [], stock = []; let st = 60, profit = 0, minSt = 60;
      for (let t = 0; t < N; t++) {
        // harvest in month 9-10: cheap after harvest, dear before
        let v = 100 + 28 * Math.sin(2 * Math.PI * (t - 1) / 12) + (sh.checked && t >= 15 && t <= 19 ? [0, 45, 70, 55, 25][t - 15] : 0);
        base.push(v);
        // government buys when cheap (below 100), sells when dear, limited by stock
        let gap = v - 100, act = -gap * kk * 1.0; // + = buy (raises price), - = sell (lowers price)
        if (act < 0 && st + act < 0) act = -st;
        st += act * 0.6; profit += -act * v * 0.01;
        sim.push(v + act * 0.85);
        stock.push(st); minSt = Math.min(minSt, st);
      }
      svg.innerHTML = '';
      for (let v = 50; v <= 200; v += 50) { S('path', { d: 'M' + x0 + ',' + Y(v) + ' H' + x1 }, svg, 'stroke:var(--rule);stroke-width:1'); txt(svg, String(v), x0 - 8, Y(v), 10, 'fill:var(--ink-3)', 'end'); }
      txt(svg, '穀物の価格（ふだん＝100）', x0, 10, 11, 'fill:var(--ink-2);font-weight:700', 'start');
      for (let t = 0; t < N; t += 3) txt(svg, (t < 12 ? '1年目' : '2年目') + ((t % 12) + 1) + '月', X(t), yB + 13, 9.5, 'fill:var(--ink-3)');
      // stock bars
      const sMax = Math.max(60, ...stock);
      stock.forEach((v, t) => S('rect', { x: X(t) - 8, y: H0 - 6 - v / sMax * 46, width: 16, height: Math.max(0, v / sMax * 46) }, svg, 'fill:var(--gold);opacity:.55'));
      txt(svg, '国家の倉の穀物（在庫）', x0 - 40, 200, 10, 'fill:var(--gold);font-weight:700', 'start');
      const pl = (arr) => 'M' + arr.map((v, t) => X(t).toFixed(1) + ',' + Y(v).toFixed(1)).join(' L');
      S('path', { d: pl(base) }, svg, 'fill:none;stroke:var(--ink-3);stroke-width:2;stroke-dasharray:5 4');
      S('path', { d: pl(sim) }, svg, 'fill:none;stroke:var(--accent);stroke-width:3;stroke-linejoin:round');
      if (sh.checked) txt(svg, 'ききん', X(17), Y(Math.max(...base.slice(15, 20))) - 10, 11, 'fill:var(--ink-2);font-weight:700');
      const mx = Math.max(...sim), mn = Math.min(...sim), bmx = Math.max(...base), bmn = Math.min(...base);
      out.innerHTML = '<span style="color:var(--ink-3)">点線＝国家が介入しない場合</span>　<b style="color:var(--accent)">実線＝平準法で介入した場合</b><br>価格の幅：介入なし ' + Math.round(bmn) + '〜' + Math.round(bmx) + ' → 介入あり <b>' + Math.round(mn) + '〜' + Math.round(mx) + '</b>　／　国家の利益（概算）：<b>' + (profit > 0 ? '+' : '') + profit.toFixed(0) + '</b>' +
        (kk > 0 && minSt <= 0.5 ? '<br><b>倉が空になった！</b> 在庫が尽きると、ききんのときに価格を抑えられない。' : '') +
        '<br><small>平準法では、国家が、物価が安いときに買い入れて倉に蓄え、高いときに売り出した。物価は安定し、その差額は国家の収入となった。それまでこの差額で利益を上げていた大商人には、大きな打撃となった。（数値は仕組みを示すための架空のもの）</small>';
    };
    k.addEventListener('input', draw); sh.addEventListener('change', draw);
    draw();
  };
  /* ================= seismoscope: Zhang Heng's houfeng didong yi (top view) ================= */
  W.seismoscope = function (host, p) {
    const DIRS = [['北', 0], ['北東', 45], ['東', 90], ['南東', 135], ['南', 180], ['南西', 225], ['西', 270], ['北西', 315]];
    const ctl = H('div', 'wctl', host, '<span class="wlab">震源の方向</span>' + DIRS.map((d, i) => '<button type="button" data-i="' + i + '">' + d[0] + '</button>').join('') + ' <button type="button" class="wrnd">？ ランダム</button> <button type="button" class="wreset">玉を戻す</button>');
    const svg = svgBox(host, 640, 330), out = H('div', 'wout', host);
    const cx = 330, cy = 165, R = 96;
    const body = S('g', {}, svg);
    S('circle', { cx, cy, r: R + 8 }, body, 'fill:var(--gold);fill-opacity:.18;stroke:var(--gold);stroke-width:3');
    S('circle', { cx, cy, r: 26 }, body, 'fill:var(--paper-2);stroke:var(--ink-3)');
    
    const pend = S('circle', { cx, cy, r: 9 }, body, 'fill:var(--ink-2)');
    const balls = [], toads = [];
    DIRS.forEach((d, i) => {
      const a = (d[1] - 90) * Math.PI / 180, x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      S('circle', { cx: x, cy: y, r: 13 }, body, 'fill:#5f7f62;stroke:var(--ink-2)');
      txt(body, d[0], cx + (R - 34) * Math.cos(a), cy + (R - 34) * Math.sin(a), 10.5, 'fill:var(--ink-2);font-weight:700');
      const tx = cx + (R + 40) * Math.cos(a), ty = cy + (R + 40) * Math.sin(a);
      toads.push(S('ellipse', { cx: tx, cy: ty, rx: 15, ry: 11 }, svg, 'fill:#8a9a5b;stroke:var(--ink-2)'));
      balls.push(S('circle', { cx: x, cy: y, r: 6 }, body, 'fill:#d4a017;stroke:#7a5a00'));
      balls[i].home = [x, y]; balls[i].dest = [tx, ty];
    });
    txt(svg, '竜（玉をくわえる）', 14, 24, 11, 'fill:#5f7f62;font-weight:700', 'start');
    txt(svg, 'ひきがえる（口を開けて待つ）', 14, 42, 11, 'fill:#8a9a5b;font-weight:700', 'start');
    txt(svg, '中央の黒丸：都柱（振り子）', 14, 60, 11, 'fill:var(--ink-2);font-weight:700', 'start');
    txt(svg, '上から見た図（復元の一案に基づく概念図）', 630, 322, 10, 'fill:var(--ink-3)', 'end');
    let anim = null, dropped = new Set();
    const reset = () => { dropped.clear(); balls.forEach(b => { b.setAttribute('cx', b.home[0]); b.setAttribute('cy', b.home[1]); }); toads.forEach(t => t.style.fill = '#8a9a5b'); out.innerHTML = '方向を選ぶと、その方向で地震が起きたときの様子を再現する。'; };
    const quake = (i) => {
      if (anim) return; const a = (DIRS[i][1] - 90) * Math.PI / 180; let t = 0;
      anim = (dt) => {
        t += dt;
        const sh = t < 1.4 ? Math.sin(t * 40) * 6 * (1 - t / 1.4) : 0;
        body.setAttribute('transform', 'translate(' + (sh * Math.cos(a)).toFixed(2) + ',' + (sh * Math.sin(a)).toFixed(2) + ')');
        const tilt = t < 0.9 ? Math.min(1, t / 0.5) * 18 : 18 * Math.max(0, 1 - (t - 0.9) / 1.2);
        pend.setAttribute('cx', cx + tilt * Math.cos(a)); pend.setAttribute('cy', cy + tilt * Math.sin(a));
        if (t > 0.6 && !dropped.has(i)) {
          const k = Math.min(1, (t - 0.6) / 0.5), b = balls[i];
          b.setAttribute('cx', b.home[0] + (b.dest[0] - b.home[0]) * k); b.setAttribute('cy', b.home[1] + (b.dest[1] - b.home[1]) * k);
          if (k >= 1) { dropped.add(i); toads[i].style.fill = '#d4a017'; }
        }
        if (t > 2.2) { anim = null; body.setAttribute('transform', ''); }
      };
      out.innerHTML = '<b>' + DIRS[i][0] + 'の方向で地震。</b>器の中の振り子（都柱）が揺れて、しかけを押し、<b>' + DIRS[i][0] + '</b>の竜の口から玉が落ちて、下のひきがえるの口に入る。音で地震が起きたことと、その方向が分かる。<br><small>『後漢書』張衡伝によれば、138年、洛陽では誰も揺れを感じないのに、器の竜の一つが玉を落とした。数日後、はるか西方の隴西（甘粛）から地震の知らせが届き、人々はその精妙さに驚いたという。内部のしくみの記録は失われており、近代以降さまざまな復元案が出されている【諸説】。</small>';
    };
    ctl.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => quake(+b.dataset.i)));
    ctl.querySelector('.wrnd').addEventListener('click', () => quake(Math.floor(Math.random() * 8)));
    ctl.querySelector('.wreset').addEventListener('click', reset);
    animate(host, (dt) => { if (anim) anim(dt); });
    reset();
  };
  /* ================= familytree: genealogy with succession stepper ================= */
  // p.people: [{id,n,sub,x,y,c,r(ruler order),note,w}] (x,y in a 1000-wide canvas, node centre)
  // p.links: [[a,b,type,label]] type: 'bio' parent->child, 'adopt' adoptive parent->child, 'mar' spouses
  // p.steps: [{on:[ids], text}] optional succession walkthrough
  W.familytree = function (host, p) {
    const NW = p.nw || 128, NH = p.nh || 48, ppl = p.people || [], byId = {};
    ppl.forEach(q => byId[q.id] = q);
    const maxY = Math.max(...ppl.map(q => q.y)) + NH / 2 + 26, minX = Math.min(...ppl.map(q => q.x - (q.w || NW) / 2)) - 14, VW = Math.max(...ppl.map(q => q.x + (q.w || NW) / 2)) + 14 - minX;
    const steps = p.steps || [];
    const ctl = steps.length ? H('div', 'wctl', host, '<button type="button" class="wprev" aria-label="前へ">◀</button><button type="button" class="wnext">' + (p.stepLabel || '次の統治者へ') + ' ▶</button><span class="wstep"></span><button type="button" class="wall">全体を表示</button>') : null;
    const svg = S('svg', { viewBox: minX + ' ' + (-14) + ' ' + VW + ' ' + (maxY + 14), width: '100%', role: 'img' }, host, 'display:block;max-width:' + VW + 'px;margin:0 auto;font-family:var(--font-body)');
    const out = H('div', 'wout', host);
    const gL = S('g', {}, svg), gN = S('g', {}, svg);
    const col = (c) => c ? CM.sideColor(c) : 'var(--ink-3)';
    const linkEls = [];
    (p.links || []).forEach(([a, b, t, lab, ymo]) => {
      const A = byId[a], B = byId[b]; if (!A || !B) return;
      let d, st;
      if (t === 'mar') {
        const y = A.y, x1 = Math.min(A.x, B.x) + (A.w || NW) / 2 * 0, xa = A.x < B.x ? A.x + (A.w || NW) / 2 : A.x - (A.w || NW) / 2, xb = A.x < B.x ? B.x - (B.w || NW) / 2 : B.x + (B.w || NW) / 2;
        d = 'M' + xa + ',' + (y - 3) + ' H' + xb + ' M' + xa + ',' + (y + 3) + ' H' + xb; st = 'stroke:var(--ink-3);stroke-width:1.6;fill:none';
      } else {
        const y1 = A.y + NH / 2, y2 = B.y - NH / 2, ym = ymo != null ? ymo : y1 + (y2 - y1) * 0.5;
        d = 'M' + A.x + ',' + y1 + ' V' + ym + ' H' + B.x + ' V' + y2;
        st = 'fill:none;stroke-linejoin:round;stroke:' + (t === 'adopt' ? 'var(--accent)' : t === 'claim' ? 'var(--ink-3)' : 'var(--ink-2)') + ';stroke-width:' + (t === 'adopt' ? 2.2 : t === 'claim' ? 1.3 : 1.6) + (t === 'adopt' ? ';stroke-dasharray:7 5' : t === 'claim' ? ';stroke-dasharray:2 4' : '');
      }
      const e = S('path', { d }, gL, st); e.dataset.a = a; e.dataset.b = b; linkEls.push(e);
      if (lab) { const mx = t === 'mar' ? (A.x + B.x) / 2 : B.x + 6, my = t === 'mar' ? A.y - 8 : (ymo != null ? ymo : A.y + NH / 2 + (B.y - NH / 2 - A.y - NH / 2) * 0.5) - 5; txt(gL, lab, mx, my, 11, 'fill:' + (t === 'adopt' ? 'var(--accent)' : 'var(--ink-3)') + ';font-weight:700', t === 'mar' ? 'middle' : 'start'); }
    });
    const nodes = {};
    ppl.forEach(q => {
      const w = q.w || NW, g = S('g', { transform: 'translate(' + (q.x - w / 2) + ',' + (q.y - NH / 2) + ')', tabindex: 0, role: 'button' }, gN, 'cursor:pointer');
      const ruler = q.r != null;
      S('rect', { x: 0, y: 0, width: w, height: NH, rx: 7 }, g, 'fill:var(--paper);stroke:' + col(q.c) + ';stroke-width:' + (ruler ? 2.6 : 1.3) + (q.dash ? ';stroke-dasharray:4 3' : ''));
      if (ruler) S('rect', { x: 0, y: 0, width: 6, height: NH, rx: 3 }, g, 'fill:' + col(q.c));
      txt(g, q.n, w / 2 + (ruler ? 3 : 0), q.sub ? 18 : NH / 2, q.fs || 15, 'font-weight:700;fill:' + (ruler ? col(q.c) : 'var(--ink)'));
      if (q.sub) txt(g, q.sub, w / 2 + (ruler ? 3 : 0), 36, 11.5, 'fill:var(--ink-3)');
      if (ruler && q.r !== '') { S('circle', { cx: w - 2, cy: 2, r: 10 }, g, 'fill:' + col(q.c)); txt(g, String(q.r), w - 2, 2.5, 11, 'fill:#fff;font-weight:700'); }
      const show = () => { out.innerHTML = '<b>' + CM.esc(q.n) + '</b>' + (q.sub ? '　<span style="color:var(--ink-3)">' + CM.esc(q.sub) + '</span>' : '') + (q.note ? '<br>' + q.note : ''); };
      g.addEventListener('click', show); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') show(); });
      nodes[q.id] = g;
    });
    // legend
    const lg = H('div', 'wlegend', host, '<span><i style="background:var(--ink-2);height:2px"></i>実の親子</span><span><i style="background:repeating-linear-gradient(90deg,var(--accent) 0 5px,transparent 5px 9px);height:2px"></i>養子</span><span><i style="border-top:2px solid var(--ink-3);border-bottom:2px solid var(--ink-3);height:3px;background:none"></i>婚姻</span>' + ((p.links || []).some(l => l[2] === 'claim') ? '<span><i style="background:repeating-linear-gradient(90deg,var(--ink-3) 0 2px,transparent 2px 6px);height:2px"></i>系譜上の主張・遠い関係</span>' : '') + '<span><i style="background:var(--paper);border:2px solid var(--ink-2)"></i>太枠＝統治者（数字は即位の順）</span>');
    let k = -1;
    const apply = () => {
      if (k < 0) { Object.values(nodes).forEach(n => n.style.opacity = 1); linkEls.forEach(l => l.style.opacity = 1); out.innerHTML = p.hint || '人物をクリック（タップ）すると説明が表示される。' + (steps.length ? '「' + (p.stepLabel || '次の統治者へ') + '」で、継承の流れを順にたどることができる。' : ''); if (ctl) ctl.querySelector('.wstep').textContent = ''; return; }
      const st = steps[k], on = new Set(st.on || []);
      Object.entries(nodes).forEach(([id, n]) => n.style.opacity = on.has(id) ? 1 : 0.22);
      linkEls.forEach(l => l.style.opacity = on.has(l.dataset.a) && on.has(l.dataset.b) ? 1 : 0.12);
      out.innerHTML = st.text; ctl.querySelector('.wstep').textContent = (k + 1) + ' / ' + steps.length;
    };
    if (ctl) {
      ctl.querySelector('.wnext').addEventListener('click', () => { k = Math.min(steps.length - 1, k + 1); apply(); });
      ctl.querySelector('.wprev').addEventListener('click', () => { k = Math.max(-1, k - 1); apply(); });
      ctl.querySelector('.wall').addEventListener('click', () => { k = -1; apply(); });
    }
    apply();
    familyChrono(host, p, ppl, byId, nodes, linkEls, out, NW, NH, svg, () => { k = -1; apply(); });
  };

  /* ---- chronological playback for family trees: births, accessions, reigns, deaths ---- */
  function parseYears(q) {
    const r = { reigns: [] };
    const num = (pre, n) => n === '?' || n == null ? null : (pre === '前' ? -(+n) : +n);
    const src = (q.sub || '');
    const re = /(位\s*)?(前)?(\d{1,4}|\?)\s*\??\s*(?:ごろ|頃)?\s*[〜～\-–]\s*(前|後)?(\d{1,4}|\?)/g;
    let m;
    while ((m = re.exec(src))) {
      let a = num(m[2], m[3]), b = num(m[4] === '前' ? '前' : (m[2] && !m[4] && +m[5] < +m[3] ? '前' : ''), m[5]);
      if (m[2] && m[4] === '後') b = +m[5];
      if (m[1] || /位|在位/.test(src.slice(Math.max(0, m.index - 2), m.index + 1))) r.reigns.push([a, b]);
      else { if (r.b == null) r.b = a; if (r.d == null) r.d = b; }
      // a second range after "、" belongs to the same kind as the first (e.g. 位642〜645、655〜661)
      const tail = src.slice(re.lastIndex);
      const m2 = /^[、,]\s*(前)?(\d{1,4})\s*[〜～\-–]\s*(前)?(\d{1,4})/.exec(tail);
      if (m2 && (m[1])) { r.reigns.push([num(m2[1], m2[2]), num(m2[3], m2[4])]); re.lastIndex += m2[0].length; }
    }
    if (q.b != null) r.b = q.b; if (q.d != null) r.d = q.d;
    if (q.reigns) r.reigns = q.reigns; else if (q.rs != null) r.reigns = [[q.rs, q.re]];
    r.reigns = r.reigns.filter(x => x[0] != null);
    return r;
  }
  function familyChrono(host, p, ppl, byId, nodes, linkEls, out, NW, NH, svg, reset) {
    const Y = {};
    ppl.forEach(q => { Y[q.id] = parseYears(q); });
    const known = ppl.filter(q => Y[q.id].b != null || Y[q.id].reigns.length);
    if (known.length < 2 || p.chrono === false) return;
    const parents = {}, spouses = {}, kids = {};
    (p.links || []).forEach(([a, b, t]) => {
      if (t === 'mar') { (spouses[a] = spouses[a] || []).push(b); (spouses[b] = spouses[b] || []).push(a); }
      else { (parents[b] = parents[b] || []).push(a); (kids[a] = kids[a] || []).push(b); }
    });
    // appearance (A) and exit (E) years, inferred where unknown
    const A = {}, E = {};
    ppl.forEach(q => { const y = Y[q.id]; A[q.id] = y.b != null ? y.b : (y.reigns.length ? y.reigns[0][0] : null); E[q.id] = y.d != null ? y.d : null; });
    for (let it = 0; it < 6; it++) ppl.forEach(q => {
      if (A[q.id] != null) return;
      const ps = (parents[q.id] || []).map(i => A[i]).filter(v => v != null), sp = (spouses[q.id] || []).map(i => A[i]).filter(v => v != null), ks = (kids[q.id] || []).map(i => A[i]).filter(v => v != null);
      if (ps.length) A[q.id] = Math.max(...ps) + 22; else if (sp.length) A[q.id] = Math.min(...sp); else if (ks.length) A[q.id] = Math.min(...ks) - 25;
    });
    // a parent whose birth is unknown should appear before the children
    for (let it = 0; it < 6; it++) ppl.forEach(q => {
      if (Y[q.id].b != null) return;
      const ks = (kids[q.id] || []).map(i => A[i]).filter(v => v != null);
      if (ks.length && (A[q.id] == null || A[q.id] > Math.min(...ks) - 18)) A[q.id] = Math.min(...ks) - 20;
    });
    const allA = Object.values(A).filter(v => v != null);
    let t0 = Math.min(...allA), t1 = Math.max(...ppl.map(q => Math.max(E[q.id] != null ? E[q.id] : -1e9, ...Y[q.id].reigns.map(r => r[1] != null ? r[1] : r[0]), A[q.id] != null ? A[q.id] : -1e9)));
    ppl.forEach(q => { if (A[q.id] == null) A[q.id] = t0; });
    t0 -= 2; t1 += 3;
    const fy = (y) => CM.fmtYear ? CM.fmtYear(Math.round(y)) : Math.round(y) + '年';
    // events list
    const evs = [];
    ppl.forEach(q => {
      const y = Y[q.id];
      if (y.b != null) evs.push({ y: y.b, k: 'b', q, t: q.n + 'が生まれる' });
      y.reigns.forEach((r, i) => {
        evs.push({ y: r[0], k: 'r', q, t: q.n + (i ? 'が再び位に就く' : 'が位に就く') + (r[1] != null ? '（在位' + (r[1] - r[0]) + '年）' : '') });
        if (r[1] != null && (y.d == null || r[1] < y.d - 0)) evs.push({ y: r[1], k: 'x', q, t: q.n + 'の治世が終わる' });
      });
      if (y.d != null) evs.push({ y: y.d, k: 'd', q, t: q.n + 'が亡くなる' });
    });
    evs.sort((a, b) => a.y - b.y || 'bdxr'.indexOf(a.k) - 'bdxr'.indexOf(b.k));
    // UI
    const bar = H('div', 'wctl wchrono', host, '<button type="button" class="cplay">▶ 年代順に再生</button><span class="cyear num" style="font-weight:700;min-width:5.5em;display:inline-block;text-align:center"></span><input type="range" class="cseek" min="0" max="1000" value="0" aria-label="年代" style="flex:1;min-width:120px"><select class="cspd" aria-label="速さ"><option value="0.5">ゆっくり</option><option value="1" selected>標準</option><option value="2">速く</option></select>');
    host.insertBefore(bar, host.querySelector('svg'));
    // gantt strip of reigns
    const rulers = ppl.filter(q => Y[q.id].reigns.length).sort((a, b) => Y[a.id].reigns[0][0] - Y[b.id].reigns[0][0]);
    const GW = 640, rowH = 15, GH = 22 + rulers.length * rowH + 16;
    const gs = S('svg', { viewBox: '0 0 ' + GW + ' ' + GH, width: '100%' }, null, 'display:block;max-width:' + GW + 'px;margin:8px auto 0;font-family:var(--font-body)');
    host.insertBefore(gs, out);
    const GX0 = 150, GX1 = GW - 12, gx = (y) => GX0 + (GX1 - GX0) * (y - t0) / (t1 - t0);
    const span = t1 - t0, tick = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find(s => span / s <= 9) || 1000;
    for (let y = Math.ceil(t0 / tick) * tick; y <= t1; y += tick) { S('path', { d: 'M' + gx(y) + ',16 V' + (GH - 8) }, gs, 'stroke:var(--rule);stroke-width:1'); txt(gs, y < 0 ? '前' + (-y) : String(y), gx(y), 9, 10, 'fill:var(--ink-3)'); }
    const gbars = {};
    rulers.forEach((q, i) => {
      const y0 = 22 + i * rowH, col = q.c ? CM.sideColor(q.c) : 'var(--ink-2)';
      txt(gs, q.n, GX0 - 6, y0 + 5, 11, 'fill:var(--ink-2)', 'end');
      const yy = Y[q.id];
      if (yy.b != null || yy.d != null) S('path', { d: 'M' + gx(yy.b != null ? yy.b : yy.reigns[0][0]) + ',' + (y0 + 5) + ' H' + gx(yy.d != null ? yy.d : (yy.reigns[yy.reigns.length - 1][1] || yy.reigns[0][0])) }, gs, 'stroke:var(--ink-3);stroke-width:1;stroke-dasharray:2 3');
      gbars[q.id] = yy.reigns.map(r => S('rect', { x: gx(r[0]), y: y0, width: Math.max(2, gx(r[1] != null ? r[1] : r[0] + 1) - gx(r[0])), height: 10, rx: 2 }, gs, 'fill:' + col + ';opacity:.35'));
    });
    const cur = S('path', { d: '' }, gs, 'stroke:var(--accent);stroke-width:2');
    // node decorations
    const deco = {};
    ppl.forEach(q => {
      const g = nodes[q.id], w = q.w || NW;
      const prog = S('rect', { x: 6, y: NH - 5, width: 0, height: 4, rx: 2 }, g, 'fill:var(--accent);opacity:0');
      const dag = txt(g, '†', 9, 9, 12, 'fill:var(--ink-3);opacity:0;font-weight:700');
      const halo = S('rect', { x: -4, y: -4, width: w + 8, height: NH + 8, rx: 10 }, null, 'fill:none;stroke:var(--accent);stroke-width:3;opacity:0');
      g.insertBefore(halo, g.firstChild);
      g.style.transition = 'opacity .35s'; deco[q.id] = { prog, dag, halo, w };
    });
    linkEls.forEach(l => { l.style.transition = 'opacity .35s'; });
    let t = t0, run = false, active = false, lastIdx = -1;
    const log = [];
    const state = (q, y) => {
      const yy = Y[q.id];
      if (y < A[q.id]) return 'pre';
      const rg = yy.reigns.find(r => y >= r[0] && y < (r[1] != null ? r[1] + 0.999 : r[0] + 1));
      if (rg) return 'reign';
      if (E[q.id] != null && y >= E[q.id]) return 'dead';
      if (yy.reigns.length && yy.reigns.every(r => r[1] != null && y > r[1]) && E[q.id] == null) return 'after';
      return 'alive';
    };
    const draw = () => {
      bar.querySelector('.cyear').textContent = fy(t);
      bar.querySelector('.cseek').value = Math.round(1000 * (t - t0) / (t1 - t0));
      cur.setAttribute('d', 'M' + gx(t) + ',14 V' + (GH - 6));
      ppl.forEach(q => {
        const st = state(q, t), g = nodes[q.id], d = deco[q.id], yy = Y[q.id];
        g.style.opacity = st === 'pre' ? 0.06 : st === 'dead' ? 0.4 : st === 'after' ? 0.6 : 1;
        d.halo.style.opacity = st === 'reign' ? 1 : 0;
        d.dag.style.opacity = st === 'dead' ? 1 : 0;
        const rg = yy.reigns.find(r => t >= r[0] && t < (r[1] != null ? r[1] + 0.999 : r[0] + 1));
        if (rg && rg[1] != null && rg[1] > rg[0]) { d.prog.style.opacity = 1; d.prog.setAttribute('width', Math.max(0, (d.w - 12) * Math.min(1, (t - rg[0]) / (rg[1] - rg[0])))); } else d.prog.style.opacity = 0;
        (gbars[q.id] || []).forEach(b => b.style.opacity = st === 'reign' ? 1 : (st === 'pre' ? 0.15 : 0.35));
      });
      linkEls.forEach(l => { const a = l.dataset.a, b = l.dataset.b; l.style.opacity = (t >= A[a] && t >= A[b]) ? 1 : 0.05; });
      // event log
      let idx = -1; for (let i = 0; i < evs.length; i++) if (evs[i].y <= t) idx = i;
      if (idx !== lastIdx) {
        lastIdx = idx;
        const recent = evs.slice(Math.max(0, idx - 3), idx + 1).reverse();
        const top = recent[0];
        out.innerHTML = recent.length ? recent.map((e, i) => '<div style="' + (i ? 'opacity:.55;font-size:.92em' : '') + '"><span class="num" style="color:var(--accent);font-weight:700">' + fy(e.y) + '</span>　' + (e.k === 'r' ? '<b>♛ ' : e.k === 'd' ? '<b>† ' : e.k === 'b' ? '<b>＋ ' : '<b>') + CM.esc(e.t) + '</b>' + (i === 0 && e.k === 'r' && e.q.note ? '<br><span style="color:var(--ink-2)">' + e.q.note + '</span>' : '') + '</div>').join('') : '<span style="color:var(--ink-3)">' + fy(t) + '</span>';
        void top;
      }
    };
    const stop = () => { run = false; bar.querySelector('.cplay').textContent = '▶ 年代順に再生'; };
    const begin = () => { if (!active) { active = true; reset(); } };
    bar.querySelector('.cplay').addEventListener('click', () => {
      begin();
      if (run) { stop(); return; }
      if (t >= t1) t = t0;
      run = true; bar.querySelector('.cplay').textContent = '❚❚ 一時停止'; lastIdx = -2; draw();
    });
    bar.querySelector('.cseek').addEventListener('input', (e) => { begin(); t = t0 + (t1 - t0) * (+e.target.value) / 1000; lastIdx = -2; draw(); });
    gs.addEventListener('click', (e) => { const r = gs.getBoundingClientRect(), x = (e.clientX - r.left) * GW / r.width; if (x < GX0) return; begin(); t = CM.clamp(t0 + (x - GX0) / (GX1 - GX0) * (t1 - t0), t0, t1); lastIdx = -2; draw(); });
    const allBtn = host.querySelector('.wall');
    const exit = () => { active = false; stop(); ppl.forEach(q => { nodes[q.id].style.opacity = 1; const d = deco[q.id]; d.halo.style.opacity = 0; d.dag.style.opacity = 0; d.prog.style.opacity = 0; }); linkEls.forEach(l => l.style.opacity = 1); };
    if (allBtn) allBtn.addEventListener('click', exit);
    host.querySelectorAll('.wnext,.wprev').forEach(b => b.addEventListener('click', () => { if (active) { active = false; stop(); ppl.forEach(q => { const d = deco[q.id]; d.halo.style.opacity = 0; d.dag.style.opacity = 0; d.prog.style.opacity = 0; }); } }, true));
    // ~40 s for the whole span at normal speed
    animate(host, (dt) => {
      if (!run) return;
      const sp = +bar.querySelector('.cspd').value;
      t += dt * sp * (t1 - t0) / 40;
      if (t >= t1) { t = t1; stop(); }
      draw();
    });
    // initial static strip
    cur.setAttribute('d', 'M' + gx(t0) + ',14 V' + (GH - 6));
    bar.querySelector('.cyear').textContent = fy(t0);
  }

  /* ================= cosmos: world models and the retrograde motion of Mars ================= */
  W.cosmos = function (host, p) {
    const M = { aristotle: 'アリストテレス（同心天球）', geo: 'プトレマイオス（天動説・周転円）', helio: 'コペルニクス（地動説・円軌道）', tycho: 'ティコ＝ブラーエ（修正天動説）', kepler: 'ケプラー（楕円軌道）' };
    const models = (p.models || ['aristotle', 'geo', 'helio', 'tycho', 'kepler']).filter(m => M[m]);
    let mode = p.start && models.includes(p.start) ? p.start : models[0];
    const ctl = H('div', 'wctl', host, models.map(m => '<button type="button" data-m="' + m + '"' + (m === mode ? ' class="on"' : '') + '>' + M[m].split('（')[0] + '</button>').join('') + ' <button type="button" class="wplay">❚❚ 止める</button><span class="wlab">速さ</span><input type="range" class="wsp" min="0.2" max="3" step="0.1" value="1" aria-label="速さ">');
    const svg = svgBox(host, 640, 380), out = H('div', 'wout', host);
    const cx = 200, cy = 210, SC = 62; // orbit view
    const sx0 = 400, sx1 = 630, sy0 = 40, sy1 = 360; // sky strip (longitude vs time)
    let t = 0, run = true, trail = [];
    const TE = 1, TM = 1.88, RM = 1.524;
    const kepE = (Mn, e) => { let E = Mn; for (let i = 0; i < 6; i++) E = E - (E - e * Math.sin(E) - Mn) / (1 - e * Math.cos(E)); return E; };
    const pos = (yrs) => {
      const aE = 2 * Math.PI * yrs / TE, aM = 2 * Math.PI * yrs / TM + 0.6;
      if (mode === 'kepler') {
        const e = 0.25, EE = kepE(aE, 0.05), EM = kepE(aM, e);
        const ex = Math.cos(EE) - 0.05, ey = Math.sqrt(1 - 0.0025) * Math.sin(EE);
        const mx = RM * (Math.cos(EM) - e), my = RM * Math.sqrt(1 - e * e) * Math.sin(EM);
        return { sun: [0, 0], earth: [ex, ey], mars: [mx, my], center: 'sun' };
      }
      const E = [Math.cos(aE), Math.sin(aE)], Mh = [RM * Math.cos(aM), RM * Math.sin(aM)];
      if (mode === 'helio') return { sun: [0, 0], earth: E, mars: Mh, center: 'sun' };
      if (mode === 'aristotle') return { sun: [-E[0], -E[1]], earth: [0, 0], mars: [RM * Math.cos(aM), RM * Math.sin(aM)], center: 'earth', simple: true };
      // geo & tycho give the same Earth-relative geometry
      const sun = [-E[0], -E[1]], mars = [Mh[0] - E[0], Mh[1] - E[1]];
      return { sun, earth: [0, 0], mars, center: 'earth', defer: [Mh[0], Mh[1]] };
    };
    const P = (v) => [cx + v[0] * SC, cy - v[1] * SC];
    const draw = () => {
      const q = pos(t); svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: 640, height: 380 }, svg, 'fill:#0e1526');
      txt(svg, M[mode], 200, 22, 13, 'fill:#e9e2c8;font-weight:700');
      // orbits / spheres
      const C = q.center === 'sun' ? P(q.sun) : P(q.earth);
      if (mode === 'aristotle') {
        [0.45, 0.7, 1.0, 1.524, 2.3, 2.75].forEach((r, i) => S('circle', { cx: C[0], cy: C[1], r: r * SC }, svg, 'fill:none;stroke:#4a5d86;stroke-width:1'));
        txt(svg, '恒星天', C[0], C[1] - 2.75 * SC - 8 + 0, 10, 'fill:#8fa3c9');
      } else if (mode === 'helio') {
        S('circle', { cx: C[0], cy: C[1], r: SC }, svg, 'fill:none;stroke:#4a6fae;stroke-dasharray:3 4');
        S('circle', { cx: C[0], cy: C[1], r: RM * SC }, svg, 'fill:none;stroke:#ae5a4a;stroke-dasharray:3 4');
      } else if (mode === 'kepler') {
        const e = 0.25, a = RM * SC, b = a * Math.sqrt(1 - e * e);
        S('ellipse', { cx: C[0] - e * a, cy: C[1], rx: a, ry: b }, svg, 'fill:none;stroke:#ae5a4a;stroke-dasharray:3 4');
        S('ellipse', { cx: C[0] - 0.05 * SC, cy: C[1], rx: SC, ry: SC * 0.9987 }, svg, 'fill:none;stroke:#4a6fae;stroke-dasharray:3 4');
        // area sweep (Kepler's 2nd law)
        const Mp = P(q.mars), q2 = pos(t - 0.12), Mp2 = P(q2.mars);
        S('path', { d: 'M' + C[0] + ',' + C[1] + ' L' + Mp2[0] + ',' + Mp2[1] + ' L' + Mp[0] + ',' + Mp[1] + ' Z' }, svg, 'fill:#ae5a4a;opacity:.35');
      } else {
        // deferent (Ptolemy) or Sun's orbit around Earth (Tycho)
        S('circle', { cx: C[0], cy: C[1], r: SC }, svg, 'fill:none;stroke:#c9a640;stroke-dasharray:3 4');
        if (mode === 'geo') {
          S('circle', { cx: C[0], cy: C[1], r: RM * SC }, svg, 'fill:none;stroke:#ae5a4a;stroke-dasharray:3 4');
          const D = P(q.defer); S('circle', { cx: D[0], cy: D[1], r: SC }, svg, 'fill:none;stroke:#e08a6a;stroke-width:1.4');
          S('path', { d: 'M' + C[0] + ',' + C[1] + ' L' + D[0] + ',' + D[1] }, svg, 'stroke:#ae5a4a;stroke-width:1');
          S('circle', { cx: D[0], cy: D[1], r: 2.5 }, svg, 'fill:#e08a6a');
          txt(svg, '周転円', D[0], D[1] - SC - 6, 10, 'fill:#e08a6a');
        } else {
          const Sn = P(q.sun); S('circle', { cx: Sn[0], cy: Sn[1], r: RM * SC }, svg, 'fill:none;stroke:#ae5a4a;stroke-dasharray:3 4');
        }
      }
      // bodies
      const Sn = P(q.sun), Ea = P(q.earth), Ma = P(q.mars);
      { const dx = Ma[0] - Ea[0], dy = Ma[1] - Ea[1], dl = Math.hypot(dx, dy) || 1; S('line', { x1: Ea[0], y1: Ea[1], x2: Ea[0] + dx / dl * 175, y2: Ea[1] + dy / dl * 175 }, svg, 'stroke:#e08a6a;stroke-width:1;opacity:.45'); }
      S('circle', { cx: Sn[0], cy: Sn[1], r: 11 }, svg, 'fill:#f5c542'); txt(svg, '太陽', Sn[0], Sn[1] + 21, 10.5, 'fill:#f5c542');
      S('circle', { cx: Ea[0], cy: Ea[1], r: 7 }, svg, 'fill:#5b8fe0'); txt(svg, '地球', Ea[0], Ea[1] + 17, 10.5, 'fill:#9cc0f5');
      S('circle', { cx: Ma[0], cy: Ma[1], r: 6 }, svg, 'fill:#e0653f'); txt(svg, '火星', Ma[0], Ma[1] - 12, 10.5, 'fill:#f0a080');
      // sky strip: apparent longitude of Mars from Earth over the last ~2.2 years
      const lon = (Math.atan2(q.mars[1] - q.earth[1], q.mars[0] - q.earth[0]) * 180 / Math.PI + 360) % 360;
      trail.push([t, lon]); while (trail.length && t - trail[0][0] > 1.3) trail.shift();
      S('rect', { x: sx0, y: sy0, width: sx1 - sx0, height: sy1 - sy0 }, svg, 'fill:#121c33;stroke:#34446a');
      txt(svg, '地球から見た火星の位置（星座の中での動き）', (sx0 + sx1) / 2, sy0 - 12, 10.5, 'fill:#cfd8ea;font-weight:700');
      txt(svg, '← 東', sx0 + 4, sy1 + 12, 10, 'fill:#8fa3c9', 'start'); txt(svg, '西 →', sx1 - 4, sy1 + 12, 10, 'fill:#8fa3c9', 'end');
      txt(svg, '下ほど新しい', sx1 + 4, sy1 - 6, 9, 'fill:#8fa3c9', 'end');
      // unwrap longitudes relative to current
      let pts = [], prev = null, off = 0;
      for (const [tt, L] of trail) { let v = L + off; if (prev != null) { if (v - prev > 180) { off -= 360; v -= 360; } else if (prev - v > 180) { off += 360; v += 360; } } pts.push([tt, v]); prev = v; }
      const last = pts.length ? pts[pts.length - 1][1] : 0;
      const vs = pts.map(q => q[1]), vmin = Math.min(...vs, last - 30), vmax = Math.max(...vs, last + 30);
      const X = (v) => sx0 + 10 + (vmax - v) / (vmax - vmin) * (sx1 - sx0 - 20), Y = (tt) => sy1 - (t - tt) / 1.3 * (sy1 - sy0);
      let d = ''; let retro = false;
      pts.forEach(([tt, v], i) => { const x = X(v), y = Y(tt); if (x > sx0 && x < sx1) d += (d ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1); });
      if (pts.length > 3) retro = pts[pts.length - 1][1] < pts[pts.length - 3][1];
      S('path', { d }, svg, 'fill:none;stroke:#e0653f;stroke-width:2');
      S('circle', { cx: X(last), cy: sy1, r: 5 }, svg, 'fill:#e0653f');
      if (retro) txt(svg, '逆行中！', X(last), sy1 - 14, 12, 'fill:#ffd27a;font-weight:700');
      const EX = {
        aristotle: '地球を中心に、天体をのせた透明な天球が何重にも重なって回転すると考えた。各天体は一定の速さで円運動するので、この模型では、火星はいつも同じ向きに進み、<b>逆行を説明できない</b>。そこで、天球の数を増やすなどの工夫が重ねられた。',
        geo: '地球を中心とする大きな円（導円）の上を、小さな円（<b>周転円</b>）の中心が回り、火星はその周転円の上を回る。地球から見ると、火星はときどき後戻りする（<b>逆行</b>）。周転円の向きはいつも太陽の方向と連動している。プトレマイオスは、さらに離心円やエカント（等速点）を加えて、観測と高い精度で一致させた。',
        helio: '太陽を中心に、地球と火星が円を描いて回る。内側を速く回る地球が、外側の火星を追い越すとき、地球から見た火星は<b>後戻りして見える</b>。逆行は、地球自身が動いていることの「見かけ」として、周転円を使わずに自然に説明できた。ただし、コペルニクスも円軌道にこだわったため、精度を上げるには小さな周転円が必要だった。',
        tycho: '地球は動かず、太陽が地球の周りを回り、火星などの惑星は太陽の周りを回る。地球と太陽の相対的な位置関係はコペルニクスの模型と同じなので、<b>見かけの動きはまったく同じ</b>になる。地動説の利点を取り入れながら、「地球が動く」ことを認めなかった折衷案である。',
        kepler: '惑星は太陽を一つの焦点とする<b>楕円</b>を描いて回り（第1法則）、太陽に近いところでは速く、遠いところではゆっくり動く。太陽と惑星を結ぶ線が一定時間に描く面積は等しい（第2法則、赤い扇形）。この模型では楕円を誇張している。ティコ＝ブラーエの精密な火星の観測データから導かれた。'
      };
      out.innerHTML = EX[mode] + '<br><small>左：太陽系の模型（大きさ・距離は概略）。右：地球から見た、星座を背景にした火星の位置の移り変わり。天動説（周転円）・地動説・ティコの体系は、どれも同じ「見かけの動き」を再現できる。どれが正しいかは、見かけの動きだけでは決められなかったのである。</small>';
    };
    ctl.querySelectorAll('button[data-m]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.m; trail = []; ctl.querySelectorAll('button[data-m]').forEach(x => x.classList.toggle('on', x === b)); prefill(); }));
    ctl.querySelector('.wplay').addEventListener('click', (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 動かす'; });
    const sp = ctl.querySelector('.wsp');
    animate(host, (dt) => { if (!run) return; t += dt * 0.35 * (+sp.value); draw(); });
    // pre-fill trail
    const prefill = () => { for (let i = 0; i < 110; i++) { t += 0.02; draw(); } };
    prefill();
  };
  /* ================= ascrew: Archimedes' screw (side view) ================= */
  W.ascrew = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ ハンドルを回す</button><span class="wlab">回す向き</span><button type="button" class="wdir on" data-d="1">正しい向き</button><button type="button" class="wdir" data-d="-1">逆向き</button>');
    const svg = svgBox(host, 640, 300), out = H('div', 'wout', host);
    const ang = -26 * Math.PI / 180, L = 430, R = 34, x0 = 110, y0 = 250; // tube axis from (x0,y0) upward-right
    const ax = Math.cos(ang), ay = Math.sin(ang), nx = -ay, ny = ax;
    let ph = 0, run = false, dir = 1, lifted = 0;
    const water = []; for (let i = 0; i < 9; i++) water.push(i / 9);
    const at = (s, off) => [x0 + ax * s + nx * off, y0 + ay * s + ny * off];
    const draw = () => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 230, width: 170, height: 70 }, svg, 'fill:#7fb2d8;opacity:.6'); txt(svg, '下の水路', 60, 290, 11, 'fill:var(--navy);font-weight:700');
      S('rect', { x: 470, y: 50, width: 170, height: 40 }, svg, 'fill:#7fb2d8;opacity:.6'); txt(svg, '高い畑の用水路', 575, 106, 11, 'fill:var(--navy);font-weight:700');
      // tube
      const a1 = at(0, -R), a2 = at(L, -R), b1 = at(0, R), b2 = at(L, R);
      S('path', { d: 'M' + a1 + ' L' + a2 + ' L' + b2 + ' L' + b1 + ' Z' }, svg, 'fill:var(--paper-2);stroke:var(--ink-2);stroke-width:2;opacity:.9');
      // helix: visible front strands as sloped stripes moving with phase
      const pitch = 52;
      for (let s0 = -pitch; s0 < L + pitch; s0 += pitch) {
        const s = s0 + (ph % 1) * pitch * dir;
        const p1 = at(s, -R), p2 = at(s + pitch * 0.5, R);
        if (s < 0 || s + pitch * 0.5 > L) continue;
        S('path', { d: 'M' + p1 + ' L' + p2 }, svg, 'stroke:#8a6a3a;stroke-width:5;stroke-linecap:round');
      }
      // water pockets: trapped between blades, at the lower side of each turn
      if (dir > 0) water.forEach((w) => { const s = ((w + ph * pitch / L) % 1) * L; const c = at(s + pitch * 0.25, R * 0.45); S('ellipse', { cx: c[0], cy: c[1], rx: 14, ry: 8, transform: 'rotate(' + (ang * 180 / Math.PI) + ' ' + c[0] + ' ' + c[1] + ')' }, svg, 'fill:#3c7fc0;opacity:.85'); });
      else water.forEach((w) => { const c = at(18 + w * 10, R * 0.4); S('ellipse', { cx: c[0], cy: c[1], rx: 12, ry: 7 }, svg, 'fill:#3c7fc0;opacity:.6'); });
      // handle
      const h = at(L + 18, 0); S('circle', { cx: h[0], cy: h[1], r: 16 }, svg, 'fill:none;stroke:var(--ink-2);stroke-width:3');
      const hh = [h[0] + 16 * Math.cos(ph * 2 * Math.PI * dir), h[1] + 16 * Math.sin(ph * 2 * Math.PI * dir)];
      S('path', { d: 'M' + h + ' L' + hh }, svg, 'stroke:var(--ink-2);stroke-width:3'); S('circle', { cx: hh[0], cy: hh[1], r: 4 }, svg, 'fill:var(--accent)');
      if (dir > 0 && run) { const o = at(L, 0); for (let i = 0; i < 3; i++) S('circle', { cx: o[0] + 8 + i * 6, cy: o[1] + 6 + ((ph * 3 + i) % 1) * 30, r: 3 }, svg, 'fill:#3c7fc0'); }
      txt(svg, '（断面を省略した模式図。らせん状の羽根が筒の中に入っている）', 630, 290, 10, 'fill:var(--ink-3)', 'end');
      out.innerHTML = '水をくみ上げた量（目安）：<b>' + Math.round(lifted) + ' 杯</b><br>' + (dir > 0 ? '筒を回すと、らせんの羽根と羽根の間に閉じ込められた水が、回転とともに少しずつ上へ送られ、最後に上の水路にこぼれ出る。羽根の各部分は、水から見ると常に「下り坂」になっているので、水は自分の重さで低い方に留まり続け、結果として持ち上げられていく。' : '逆向きに回すと、羽根の「下り坂」が下向きに進むため、水は持ち上がらない。') + '<br><small>アルキメデス（前3世紀）が発明したと伝えられる揚水機で、ナイル川流域の灌漑や鉱山の排水、船底の水のくみ出しに使われた。現在も、下水処理場などで同じ原理の装置が使われている。</small>';
    };
    ctl.querySelector('.wplay').addEventListener('click', (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ ハンドルを回す'; });
    ctl.querySelectorAll('.wdir').forEach(b => b.addEventListener('click', () => { dir = +b.dataset.d; ctl.querySelectorAll('.wdir').forEach(x => x.classList.toggle('on', x === b)); draw(); }));
    animate(host, (dt) => { if (!run) return; ph += dt * 0.5; if (dir > 0) lifted += dt * 2; draw(); });
    draw();
  };
  /* ================= fidel: Ge'ez abugida (consonant + vowel order) ================= */
  W.fidel = function (host, p) {
    p = p || {};
    const CONS = p.cons || [['h', 0x1200], ['l', 0x1208], ['m', 0x1218], ['s', 0x1230], ['r', 0x1228], ['b', 0x1260], ['t', 0x1270], ['n', 0x1290], ['k', 0x12A8], ['w', 0x12C8], ['d', 0x12F0], ['g', 0x1308]];
    const V = ['ä', 'u', 'i', 'a', 'e', 'ə', 'o'];
    const VJ = ['第1形（基本形）', '第2形', '第3形', '第4形', '第5形', '第6形', '第7形'];
    const FONT = "font-family:'Noto Sans Ethiopic','Nyala','Ebrima','Kefa','Abyssinica SIL',serif";
    const box = H('div', '', host, '');
    box.style.cssText = 'display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start';
    const big = H('div', '', box, '');
    big.style.cssText = 'flex:0 0 200px;text-align:center;padding:10px;border:1px solid var(--rule);border-radius:8px;background:var(--card)';
    const glyph = H('div', '', big, '');
    glyph.style.cssText = FONT + ';font-size:88px;line-height:1.15;color:var(--gold);transition:opacity .25s';
    const rom = H('div', '', big, '');
    rom.style.cssText = 'font-size:20px;font-weight:700';
    const ord = H('div', '', big, '');
    ord.style.cssText = 'font-size:12px;color:var(--ink-3)';
    const ctl = H('div', 'wctl', big, '<button type="button">▶ 母音を順に変える</button>');
    const tbl = H('table', '', box, '');
    tbl.style.cssText = 'flex:1 1 360px;border-collapse:collapse;text-align:center;font-size:13px';
    let html = '<tr><th></th>' + V.map(v => '<th style="padding:2px 4px;color:var(--ink-3)">' + v + '</th>').join('') + '</tr>';
    CONS.forEach(([c, b], r) => {
      html += '<tr><th style="color:var(--ink-3);padding:2px 6px">' + c + '</th>';
      for (let i = 0; i < 7; i++) html += '<td data-r="' + r + '" data-i="' + i + '" style="' + FONT + ';font-size:22px;padding:2px 4px;cursor:pointer;border:1px solid var(--rule)">' + String.fromCodePoint(b + i) + '</td>';
      html += '</tr>';
    });
    tbl.innerHTML = html;
    const out = H('div', 'wout', host, p.hint || '表の文字をクリックすると拡大表示される。同じ行（子音）の文字は、基本の形に小さな記号を付けたり、形の一部を変えたりして母音を表している。');
    let cur = [1, 0], timer = null;
    const show = (r, i) => {
      cur = [r, i];
      const [c, b] = CONS[r];
      glyph.style.opacity = 0;
      setTimeout(() => { glyph.textContent = String.fromCodePoint(b + i); glyph.style.opacity = 1; }, 120);
      rom.textContent = (i === 5 ? c + '（または ' + c + 'ə）' : c + V[i]);
      ord.textContent = VJ[i];
      tbl.querySelectorAll('td').forEach(td => { td.style.background = (+td.dataset.r === r ? (+td.dataset.i === i ? 'var(--accent)' : 'var(--paper-2, rgba(127,127,127,.12))') : ''); td.style.color = (+td.dataset.r === r && +td.dataset.i === i) ? '#fff' : ''; });
    };
    tbl.addEventListener('click', (e) => { const td = e.target.closest('td'); if (!td) return; stop(); show(+td.dataset.r, +td.dataset.i); });
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    ctl.querySelector('button').addEventListener('click', () => {
      stop(); let i = 0; show(cur[0], 0);
      timer = setInterval(() => { i++; if (i > 6) { stop(); return; } show(cur[0], i); }, 900);
    });
    show(1, 0);
  };

  /* ================= sealclay: how a Han seal was used with sealing clay (封泥) ================= */
  W.sealclay = function (host, p) {
    p = p || {};
    const cols = p.cols || [['漢'], ['委', '奴'], ['國', '王']]; // right-to-left reading order
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button><span class="wstep"></span>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const MINCHO = 'font-family:var(--font-mincho);font-weight:700;';
    // --- left: cross-section
    txt(svg, '横から見た断面', 180, 16, 12, 'fill:var(--ink-3);font-weight:700');
    S('rect', { x: 30, y: 230, width: 300, height: 26, rx: 2 }, svg, 'fill:#c9a36b;stroke:#7a5a2e');
    txt(svg, '木簡の束', 180, 243, 11, 'fill:#4a3417');
    S('path', { d: 'M40,206 H140 V180 H220 V206 H320 V230 H40 Z' }, svg, 'fill:#a87c45;stroke:#6b4a22');
    txt(svg, '木の蓋（検）', 70, 220, 10.5, 'fill:#fff');
    const cord = S('path', { d: 'M20,250 C40,262 60,262 80,250 L140,200 H220 L280,250 C300,262 320,262 340,250' }, svg, 'fill:none;stroke:#e9e0c9;stroke-width:3;stroke-dasharray:4 2');
    const clayG = S('g', {}, svg, 'opacity:0;transition:opacity .5s');
    S('rect', { x: 142, y: 170, width: 76, height: 36 }, clayG, 'fill:#9a5a3c;stroke:#5c3220');
    const bumps = S('g', {}, svg, 'opacity:0;transition:opacity .4s');
    [150, 166, 182, 198].forEach(x => S('rect', { x, y: 162, width: 10, height: 9, rx: 1 }, bumps, 'fill:#9a5a3c;stroke:#5c3220'));
    txt(clayG, '粘土', 180, 190, 11, 'fill:#fff');
    const seal = S('g', {}, svg, 'transition:transform .9s ease-in-out');
    S('path', { d: 'M152,62 Q180,30 208,62 Z' }, seal, 'fill:#d4a017;stroke:#7a5b00');
    S('path', { d: 'M160,60 q8,-14 20,-6 q12,8 20,-4' }, seal, 'fill:none;stroke:#7a5b00;stroke-width:2');
    let d = 'M146,62 H214 V110';
    const teeth = [];
    for (let x = 214; x > 146; x -= 8) teeth.push(x);
    d += ' H210 V102 H202 V110 H194 V102 H186 V110 H178 V102 H170 V110 H162 V102 H154 V110 H146 Z';
    S('path', { d }, seal, 'fill:#e6b422;stroke:#7a5b00');
    txt(seal, '金印', 180, 84, 12, 'fill:#5a4300;font-weight:700');
    const lab = txt(svg, '', 280, 120, 11.5, 'fill:var(--ink-2)');
    // --- right: faces
    const face = (x0, title, mirrored, raised) => {
      const g = S('g', {}, svg, 'transition:opacity .5s');
      txt(g, title, x0 + 60, 16, 12, 'fill:var(--ink-3);font-weight:700');
      S('rect', { x: x0, y: 34, width: 120, height: 120, rx: 4 }, g, raised ? 'fill:#9a5a3c;stroke:#5c3220' : 'fill:#e6b422;stroke:#7a5b00');
      const order = mirrored ? cols.slice() : cols.slice().reverse(); // left→right on screen
      order.forEach((c, i) => {
        const cx = x0 + 22 + i * 38;
        c.forEach((ch, k) => {
          const cy = c.length === 1 ? 94 : 66 + k * 56;
          const fs = c.length === 1 ? 72 : 44;
          const sy = c.length === 1 ? 1.5 : 1;
          const t = txt(g, ch, 0, 0, fs, MINCHO + (raised ? 'fill:#f3c7a6;stroke:#5c3220;stroke-width:.6;filter:drop-shadow(1px 1px 0 #3a1e10)' : 'fill:#5a4300;opacity:.85'));
          t.setAttribute('transform', `translate(${cx},${cy}) scale(${mirrored ? -0.5 : 0.5},${0.5 * sy})`);
        });
      });
      return g;
    };
    const fSeal = face(375, '印面（左右反転）', true, false);
    const fClay = face(510, '封泥（文字が浮き出る）', false, true);
    txt(svg, '→', 497, 94, 20, 'fill:var(--ink-3)');
    txt(svg, '右の列から縦に読む：漢 / 委奴 / 國王', 507, 176, 11.5, 'fill:var(--ink-2)');
    txt(svg, '印面は一辺約2.3cm（後漢の1寸）', 507, 196, 11.5, 'fill:var(--ink-2)');
    const ST = [
      ['<b>1. 文書を縛る</b>　木簡の文書（または品物の袋や箱）を紐で縛り、木の蓋（検）に彫った溝に紐を通す。紙が普及する前の中国では、これが「封をする」方法だった。', 0, 0, 0, '紐で縛る'],
      ['<b>2. 粘土を詰める</b>　溝に粘土を詰めて、紐の結び目を覆い隠す。粘土を壊さなければ、紐をほどくことはできない。', 1, 0, 0, '溝に粘土'],
      ['<b>3. 印を押す</b>　粘土が柔らかいうちに、上から印を押しつける。印面の文字は、彫りくぼめた「白文（陰刻）」で、左右反転している。', 1, 1, 0, '押しつける'],
      ['<b>4. 封泥の完成</b>　印を外すと、彫りくぼめた文字の部分に粘土が入り込み、文字が盛り上がって正しい向きで読める。受け取った者は、封泥が壊れていないかを見て、途中で開けられていないことを確かめた。漢の印が粘土に押す前提で作られていたため、「漢委奴国王」の金印も、朱肉で紙に押すと文字が白く抜ける。', 1, 0, 1, '文字が浮き出る']
    ];
    let i = 0;
    const draw = () => {
      const [t, clay, down, done] = ST[i];
      out.innerHTML = t;
      ctl.querySelector('.wstep').textContent = (i + 1) + ' / ' + ST.length;
      clayG.style.opacity = clay; bumps.style.opacity = done;
      seal.style.transform = down ? 'translate(0px,60px)' : 'translate(0px,0px)';
      fClay.style.opacity = done ? 1 : 0.15;
      lab.textContent = ST[i][4];
    };
    ctl.querySelector('.wnext').addEventListener('click', () => { i = (i + 1) % ST.length; draw(); });
    ctl.querySelector('.wprev').addEventListener('click', () => { i = (i + ST.length - 1) % ST.length; draw(); });
    draw();
  };

  /* ================= Maya helpers: bar-and-dot digit, calendar math ================= */
  const MAYA = {
    TZ: ['イミシュ', 'イク', 'アクバル', 'カン', 'チクチャン', 'キミ', 'マニク', 'ラマト', 'ムルク', 'オク', 'チュウェン', 'エブ', 'ベン', 'イシュ', 'メン', 'キブ', 'カバン', 'エツナブ', 'カワク', 'アハウ'],
    HB: ['ポプ', 'ウォ', 'シプ', 'ソツ', 'セク', 'シュル', 'ヤシュキン', 'モル', 'チェン', 'ヤシュ', 'サク', 'ケフ', 'マク', 'カンキン', 'ムワン', 'パシュ', 'カヤブ', 'クムク', 'ワイェブ'],
    GMT: 584283,
    lc(d) { const r = []; [144000, 7200, 360, 20, 1].forEach(u => { r.push(Math.floor(d / u)); d %= u; }); return r; },
    tz(d) { return [((3 + d) % 13 + 13) % 13 + 1, ((19 + d) % 20 + 20) % 20]; },
    hb(d) { const p = ((348 + d) % 365 + 365) % 365; return [p % 20, Math.floor(p / 20)]; },
    date(jd) { // Julian before 1582-10-15 (JD 2299161), Gregorian after
      let a = jd;
      if (jd >= 2299161) { const al = Math.floor((jd - 1867216.25) / 36524.25); a = jd + 1 + al - Math.floor(al / 4); }
      const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), dd = Math.floor(365.25 * c), e = Math.floor((b - dd) / 30.6001);
      const day = b - dd - Math.floor(30.6001 * e), mon = e < 14 ? e - 1 : e - 13, yr = mon > 2 ? c - 4716 : c - 4715;
      return { y: yr, m: mon, d: day, greg: jd >= 2299161 };
    },
    ystr(o) { return (o.y <= 0 ? '前' + (1 - o.y) : String(o.y)) + '年' + o.m + '月' + o.d + '日' + (o.greg ? '' : '（ユリウス暦）'); },
    digit(g, x, y, v, s, col) { // centered at x, bottom at y
      s = s || 1; col = col || 'var(--ink)';
      if (v === 0) {
        S('ellipse', { cx: x, cy: y - 9 * s, rx: 16 * s, ry: 8 * s }, g, 'fill:none;stroke:' + col + ';stroke-width:' + 2 * s);
        S('path', { d: `M${x - 9 * s},${y - 9 * s} q${9 * s},${-6 * s} ${18 * s},0 M${x - 9 * s},${y - 6 * s} q${9 * s},${-6 * s} ${18 * s},0` }, g, 'fill:none;stroke:' + col + ';stroke-width:' + 1.4 * s);
        return;
      }
      const bars = Math.floor(v / 5), dots = v % 5;
      for (let i = 0; i < bars; i++) S('rect', { x: x - 18 * s, y: y - (i + 1) * 9 * s, width: 36 * s, height: 6 * s, rx: 2 * s }, g, 'fill:' + col);
      const dy = y - bars * 9 * s - 6 * s;
      for (let i = 0; i < dots; i++) S('circle', { cx: x + (i - (dots - 1) / 2) * 9 * s, cy: dy, r: 3.3 * s }, g, 'fill:' + col);
    }
  };

  /* ================= mayanum: vigesimal place-value numerals with zero ================= */
  W.mayanum = function (host, p) {
    p = p || {};
    const ctl = H('div', 'wctl', host, '<label>数 <input type="number" min="0" max="159999" value="' + (p.n || 365) + '" class="wnum" style="width:7em"></label>' +
      '<span class="wpre">' + (p.pre || [19, 20, 100, 365, 400, 2026]).map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('') + '</span>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const PL = [8000, 400, 20, 1];
    const draw = (n) => {
      n = Math.max(0, Math.min(159999, Math.floor(+n || 0)));
      svg.innerHTML = '';
      let r = n; const ds = PL.map(u => { const q = Math.floor(r / u); r %= u; return q; });
      let st = ds.findIndex(v => v > 0); if (st < 0) st = 3;
      const rows = PL.slice(st);
      txt(svg, '位（下から1・20・400・8000）', 150, 18, 12, 'fill:var(--ink-3);font-weight:700');
      txt(svg, 'マヤ数字', 380, 18, 12, 'fill:var(--ink-3);font-weight:700');
      txt(svg, '計算', 540, 18, 12, 'fill:var(--ink-3);font-weight:700');
      const H0 = 62, top = 40;
      rows.forEach((u, i) => {
        const y = top + i * H0, v = ds[st + i];
        S('rect', { x: 290, y, width: 180, height: H0 - 6, rx: 6 }, svg, 'fill:var(--card);stroke:var(--rule)');
        txt(svg, u + ' の位', 150, y + H0 / 2 - 3, 14, 'fill:var(--ink-2)');
        MAYA.digit(svg, 380, y + H0 - 14, v, 1.15, v === 0 ? 'var(--accent)' : 'var(--ink)');
        txt(svg, v + ' × ' + u + ' = ' + (v * u), 540, y + H0 / 2 - 3, 14, v === 0 ? 'fill:var(--accent)' : 'fill:var(--ink)');
      });
      svg.setAttribute('viewBox', '0 0 640 ' + (top + rows.length * H0 + 10));
      const hasZero = ds.slice(st).some(v => v === 0);
      out.innerHTML = '<b>' + n + '</b> ＝ ' + rows.map((u, i) => ds[st + i] + '×' + u).join(' ＋ ') +
        '　　点（・）は1、棒（―）は5、貝の形は0を表す。' + (hasZero ? '<b>空いた位に0（貝の記号）を置くことで、位取りがずれない。</b>' : '');
    };
    const inp = ctl.querySelector('.wnum');
    inp.addEventListener('input', () => draw(inp.value));
    ctl.querySelectorAll('button[data-n]').forEach(b => b.addEventListener('click', () => { inp.value = b.dataset.n; draw(b.dataset.n); }));
    draw(inp.value);
  };

  /* ================= mayacal: Long Count + Calendar Round gears ================= */
  W.mayacal = function (host, p) {
    p = p || {};
    const PRE = p.pre || [['天地創造（起点）', 0], ['ティカルにシヤフ・カフク到来', 1274852], ['13バクトゥンの完了（2012年）', 1872000]];
    const ctl = H('div', 'wctl', host, PRE.map((q, i) => '<button type="button" data-i="' + i + '">' + q[0] + '</button>').join('') +
      '<button type="button" data-s="-1">−1日</button><button type="button" data-s="1">＋1日</button><button type="button" data-s="20">＋20日</button><button type="button" class="wplay">▶ 日を進める</button><button type="button" data-s="18980">＋52年（18980日）</button>');
    const svg = svgBox(host, 640, 330);
    const out = H('div', 'wout', host);
    let d = p.start != null ? p.start : PRE[1][1], timer = null;
    // gears
    const C13 = [165, 125, 50], C20 = [292, 125, 82], CH = [490, 175, 135];
    const g13 = S('g', {}, svg), g20 = S('g', {}, svg), gH = S('g', {}, svg);
    S('circle', { cx: 0, cy: 0, r: C13[2] }, g13, 'fill:var(--card);stroke:var(--gold);stroke-width:2');
    for (let i = 0; i < 13; i++) { const a = i / 13 * 2 * Math.PI; txt(g13, String(i + 1), Math.sin(a) * (C13[2] - 13), -Math.cos(a) * (C13[2] - 13), 11, 'font-weight:700;fill:var(--gold)'); }
    S('circle', { cx: 0, cy: 0, r: C20[2] }, g20, 'fill:var(--card);stroke:var(--accent);stroke-width:2');
    const radial = (g, label, deg, r, size, col) => { const gg = S('g', { transform: 'rotate(' + deg + ')' }, g); const t = S('text', { x: 0, y: -r, 'text-anchor': 'start' }, gg, 'writing-mode:tb;glyph-orientation-vertical:0;font-size:' + size + 'px;fill:' + col + ';letter-spacing:-0.5px'); t.textContent = label; };
    for (let i = 0; i < 20; i++) radial(g20, MAYA.TZ[i], i * 18, C20[2] - 4, 9, 'var(--accent)');
    S('circle', { cx: 0, cy: 0, r: CH[2] }, gH, 'fill:var(--card);stroke:var(--verdigris);stroke-width:2');
    for (let m = 0; m < 19; m++) {
      const a0 = m * 20 / 365 * 2 * Math.PI, am = (m * 20 + (m < 18 ? 10 : 2.5)) / 365 * 2 * Math.PI;
      S('line', { x1: Math.sin(a0) * (CH[2] - 22), y1: -Math.cos(a0) * (CH[2] - 22), x2: Math.sin(a0) * CH[2], y2: -Math.cos(a0) * CH[2] }, gH, 'stroke:var(--verdigris)');
      radial(gH, MAYA.HB[m], am * 180 / Math.PI, CH[2] - 4, 9.5, 'var(--verdigris)');
    }
    txt(svg, 'ツォルキン（260日）', 220, 222, 12, 'font-weight:700;fill:var(--ink-2)');
    txt(svg, '13の数 × 20の日の名前', 220, 238, 11, 'fill:var(--ink-3)');
    txt(svg, 'ハアブ（365日）', 470, 322, 12, 'font-weight:700;fill:var(--ink-2)');
    // pointers (fixed)
    S('path', { d: `M${C13[0]},${C13[1] - C13[2] - 2} l-6,-10 h12 z` }, svg, 'fill:var(--ink)');
    S('path', { d: `M${C20[0]},${C20[1] - C20[2] - 2} l-6,-10 h12 z` }, svg, 'fill:var(--ink)');
    S('path', { d: `M${CH[0]},${CH[1] - CH[2] - 2} l-6,-10 h12 z` }, svg, 'fill:var(--ink)');
    // long count column
    const lcG = S('g', {}, svg);
    const lcT = txt(svg, '', 70, 252, 12, 'fill:var(--ink-2);font-weight:700');
    const LCN = ['バクトゥン', 'カトゥン', 'トゥン', 'ウィナル', 'キン'];
    const draw = () => {
      const a13 = -((MAYA.tz(d)[0] - 1) / 13) * 360, a20 = -(MAYA.tz(d)[1] / 20) * 360, h = MAYA.hb(d), aH = -((h[1] * 20 + h[0] + 0.5) / 365) * 360;
      g13.setAttribute('transform', `translate(${C13[0]},${C13[1]}) rotate(${a13})`);
      g20.setAttribute('transform', `translate(${C20[0]},${C20[1]}) rotate(${a20})`);
      gH.setAttribute('transform', `translate(${CH[0]},${CH[1]}) rotate(${aH})`);
      lcG.innerHTML = '';
      const L = MAYA.lc(d);
      const t = MAYA.tz(d), dt = MAYA.date(d + MAYA.GMT);
      lcT.textContent = '長期暦 ' + L.join('.');
      L.forEach((v, i) => { MAYA.digit(lcG, 30, 30 + i * 44 + 30, v, 0.75); txt(lcG, LCN[i], 70, 30 + i * 44 + 22, 10, 'fill:var(--ink-3)', 'start'); });
      lcG.setAttribute('transform', 'translate(-12,0)');
      lcT.setAttribute('x', 60); lcT.setAttribute('y', 300);
      out.innerHTML = '<b>長期暦 ' + L.join('.') + '</b>（起点から ' + d.toLocaleString() + ' 日目）　' +
        '<b>' + t[0] + ' ' + MAYA.TZ[t[1]] + '　' + h[0] + ' ' + MAYA.HB[h[1]] + '</b>　＝ ' + MAYA.ystr(dt) +
        '<br><span style="font-size:.9em;color:var(--ink-3)">西暦への換算は、最も広く使われているGMT相関（584283）による。ツォルキンの2つの歯車とハアブの歯車が同じ組み合わせに戻るのは、18980日（約52年）ごとである。</span>';
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; ctl.querySelector('.wplay').textContent = '▶ 日を進める'; } };
    ctl.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.classList.contains('wplay')) { if (timer) { stop(); return; } b.textContent = '■ 止める'; timer = setInterval(() => { d++; draw(); }, 250); return; }
      stop();
      if (b.dataset.i != null) d = PRE[+b.dataset.i][1];
      else if (b.dataset.s) d = Math.max(0, d + (+b.dataset.s));
      draw();
    });
    draw();
  };

  /* ================= geoglyph: how the Nazca figures were laid out and made ================= */
  W.geoglyph = function (host, p) {
    p = p || {};
    const PTS = p.pts || [[50,2],[50,22],[46,26],[47,32],[40,34],[10,30],[6,36],[38,42],[42,52],[44,64],[38,80],[42,82],[46,72],[48,90],[52,90],[54,72],[58,82],[62,80],[56,64],[58,52],[62,42],[94,36],[90,30],[60,34],[53,32],[54,26],[50,22]];
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button><span class="wstep"></span>');
    const svg = svgBox(host, 640, 330);
    const out = H('div', 'wout', host);
    const path = (ox, oy, sc) => 'M' + PTS.map(q => (ox + q[0] * sc).toFixed(1) + ',' + (oy + q[1] * sc).toFixed(1)).join(' L');
    // left: sketch
    const L = { x: 20, y: 60, s: 1.6 };
    txt(svg, '① 小さな下絵', 100, 26, 12, 'font-weight:700;fill:var(--ink-2)');
    S('rect', { x: L.x, y: L.y, width: 160, height: 160, rx: 4 }, svg, 'fill:#f3ead6;stroke:var(--rule)');
    const gridL = S('g', {}, svg, 'transition:opacity .4s');
    for (let i = 0; i <= 4; i++) { S('line', { x1: L.x + i * 40, y1: L.y, x2: L.x + i * 40, y2: L.y + 160 }, gridL, 'stroke:#b7a27a;stroke-width:.8'); S('line', { x1: L.x, y1: L.y + i * 40, x2: L.x + 160, y2: L.y + i * 40 }, gridL, 'stroke:#b7a27a;stroke-width:.8'); }
    S('path', { d: path(L.x, L.y, L.s) }, svg, 'fill:none;stroke:#6b3b1f;stroke-width:1.6;stroke-linejoin:round');
    const hlL = S('rect', { x: L.x + 40, y: L.y, width: 40, height: 40 }, svg, 'fill:rgba(255,190,60,.35);stroke:#d48a00;stroke-width:1.5;opacity:0;transition:all .5s');
    // right: ground
    const G = { x: 250, y: 40, w: 370, s: 3.6 };
    txt(svg, '② 地面に拡大して描く（実物は全長約96m）', G.x + 185, 26, 12, 'font-weight:700;fill:var(--ink-2)');
    S('rect', { x: G.x, y: G.y, width: G.w, height: G.w * 0.76, rx: 4 }, svg, 'fill:#a8644a');
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const stones = S('g', {}, svg);
    for (let i = 0; i < 420; i++) S('circle', { cx: G.x + 4 + rnd() * (G.w - 8), cy: G.y + 4 + rnd() * (G.w * 0.76 - 8), r: 1 + rnd() * 1.6 }, stones, 'fill:#5b2f22;opacity:.75');
    const ox = G.x + 5, oy = G.y + 3, sc = 2.75;
    const gridG = S('g', {}, svg, 'transition:opacity .4s;opacity:0');
    for (let i = 0; i <= 4; i++) {
      S('line', { x1: ox + i * 25 * sc, y1: oy, x2: ox + i * 25 * sc, y2: oy + 100 * sc }, gridG, 'stroke:#f6e7c8;stroke-width:1;stroke-dasharray:3 3');
      S('line', { x1: ox, y1: oy + i * 25 * sc, x2: ox + 100 * sc, y2: oy + i * 25 * sc }, gridG, 'stroke:#f6e7c8;stroke-width:1;stroke-dasharray:3 3');
      for (let j = 0; j <= 4; j++) S('circle', { cx: ox + i * 25 * sc, cy: oy + j * 25 * sc, r: 2.2 }, gridG, 'fill:#fff3d6;stroke:#3a1e10');
    }
    const hlG = S('rect', { x: ox + 25 * sc, y: oy, width: 25 * sc, height: 25 * sc }, svg, 'fill:rgba(255,190,60,.25);stroke:#ffcf5a;stroke-width:2;opacity:0;transition:all .5s');
    const d = path(ox, oy, sc);
    const edge = S('path', { d }, svg, 'fill:none;stroke:#3e1d12;stroke-width:9;stroke-linejoin:round;stroke-linecap:round');
    const line = S('path', { d }, svg, 'fill:none;stroke:#ecd9b4;stroke-width:5;stroke-linejoin:round;stroke-linecap:round');
    const guide = S('path', { d }, svg, 'fill:none;stroke:#fff3d6;stroke-width:1;stroke-dasharray:2 4;opacity:0;transition:opacity .4s');
    const lenP = () => line.getTotalLength ? line.getTotalLength() : 2000;
    // cross-section inset
    const cs = S('g', { transform: 'translate(20,250)' }, svg, 'transition:opacity .4s;opacity:0');
    txt(cs, '断面', 30, 6, 11, 'fill:var(--ink-3);font-weight:700');
    S('rect', { x: 0, y: 40, width: 200, height: 26 }, cs, 'fill:#e8d2a6');
    for (let i = 0; i < 18; i++) { const x = 6 + i * 11; if (x > 80 && x < 120) continue; S('ellipse', { cx: x, cy: 36, rx: 5, ry: 4 }, cs, 'fill:#5b2f22'); }
    [70, 76, 124, 130].forEach(x => S('ellipse', { cx: x, cy: 30, rx: 5, ry: 4 }, cs, 'fill:#5b2f22'));
    txt(cs, '黒っぽい石', 40, 18, 10, 'fill:var(--ink-2)');
    txt(cs, '明るい地面', 100, 54, 10, 'fill:#6b4a22');
    txt(cs, '石を両側へ', 160, 18, 10, 'fill:var(--ink-2)');
    let anim = null;
    const setDraw = (frac, dur) => {
      const L0 = lenP();
      [edge, line].forEach(el => { el.style.transition = dur ? 'stroke-dashoffset ' + dur + 's linear' : 'none'; el.style.strokeDasharray = L0; el.style.strokeDashoffset = L0 * (1 - frac); });
    };
    const ST = [
      ['<b>1. 下絵を描く</b>　まず、小さな下絵を描く。ナスカの土器や織物にも、地上絵と同じハチドリやサル、クモなどの図柄が描かれており、地上絵の図柄は、ナスカの人々の美術と共通している。', 0, 0, 0, 0, 0],
      ['<b>2. 下絵に方眼を引く</b>　下絵を方眼（マス目）で区切る。マス目ごとに、線がどこを通るかを確かめられるようにするためである。', 1, 0, 1, 0, 0],
      ['<b>3. 地面に杭と縄で方眼をつくる</b>　地面に杭を打ち、縄を張って、大きな方眼をつくる。下絵のマス目と地面のマス目を一つずつ対応させ、線の位置を写していく。杭の跡と考えられる木片が、地上絵の線の端で見つかっている。', 1, 1, 1, 1, 0],
      ['<b>4. 石を取り除いて線を描く</b>　ナスカの台地の表面は、酸化して黒っぽくなった石でおおわれている。線の部分の石を取り除いて両側に寄せると、その下の明るい色の地面が現れ、線になる。特別な道具は必要なく、少人数でも数日あれば大きな図を描けることが、実験で確かめられている。', 1, 1, 0, 1, 1],
      ['<b>5. なぜ残ったのか</b>　ナスカの台地は、年間の降水量がほとんどなく、風も弱い、世界有数の乾燥地帯である。そのため、1000年以上たっても線が消えずに残った。地上絵は、上空からでなければ全体が見えないが、線は一筆書きになっているものが多く、人々が線の上を歩いて儀式を行ったとする説が有力である【諸説】。', 0, 0, 0, 1, 1]
    ];
    let i = 0;
    const draw = (animate) => {
      const [t, gl, gg, hl, drawn, sec] = ST[i];
      out.innerHTML = t; ctl.querySelector('.wstep').textContent = (i + 1) + ' / ' + ST.length;
      gridL.style.opacity = gl ? 1 : 0; gridG.style.opacity = gg; hlL.style.opacity = hl; hlG.style.opacity = hl; guide.style.opacity = (i === 2) ? 0.9 : 0; cs.style.opacity = sec;
      if (anim) clearTimeout(anim);
      if (drawn && i === 3 && animate) { setDraw(0, 0); anim = setTimeout(() => setDraw(1, 4), 60); }
      else setDraw(drawn ? 1 : 0, 0);
    };
    ctl.querySelector('.wnext').addEventListener('click', () => { i = (i + 1) % ST.length; draw(true); });
    ctl.querySelector('.wprev').addEventListener('click', () => { i = (i + ST.length - 1) % ST.length; draw(false); });
    draw(false);
  };

  /* ================= chuno: freeze-drying potatoes in the high Andes ================= */
  W.chuno = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ 再生</button><button type="button" class="wreset">はじめから</button><span class="wstep"></span>');
    const svg = svgBox(host, 640, 280);
    const out = H('div', 'wout', host);
    const sky = S('rect', { x: 0, y: 0, width: 640, height: 200 }, svg, 'fill:#7fb2e5;transition:fill 1s');
    const sun = S('circle', { cx: 540, cy: 55, r: 26 }, svg, 'fill:#ffd34d;transition:opacity 1s');
    const moon = S('path', { d: 'M100,40 a22,22 0 1,0 22,30 a17,17 0 1,1 -22,-30z' }, svg, 'fill:#f4f1c9;opacity:0;transition:opacity 1s');
    const stars = S('g', {}, svg, 'opacity:0;transition:opacity 1s');
    [[60, 90], [180, 30], [250, 70], [330, 25], [420, 80], [610, 30], [480, 120]].forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 1.6 }, stars, 'fill:#fff'));
    S('path', { d: 'M0,150 L90,90 L160,140 L260,70 L360,135 L450,85 L560,140 L640,100 V200 H0 Z' }, svg, 'fill:#8f8a7c;opacity:.6');
    S('path', { d: 'M230,82 L260,70 L290,84 Z M430,92 L450,85 L470,94 Z' }, svg, 'fill:#fff');
    S('rect', { x: 0, y: 200, width: 640, height: 80 }, svg, 'fill:#8b7a55');
    S('rect', { x: 60, y: 196, width: 520, height: 10, rx: 4 }, svg, 'fill:#b5c48a');
    txt(svg, '標高約4000m', 600, 190, 11, 'fill:#fff;font-weight:700', 'end');
    const pots = [];
    for (let k = 0; k < 7; k++) {
      const g = S('g', { transform: `translate(${110 + k * 65},186)` }, svg);
      const body = S('ellipse', { cx: 0, cy: 0, rx: 22, ry: 15 }, g, 'fill:#c8a165;stroke:#6e5126;stroke-width:1.5;transition:all 1s');
      const ice = S('g', {}, g, 'opacity:0;transition:opacity .8s');
      [[-12, -8], [0, -12], [12, -6], [-4, 2], [8, 4]].forEach(([x, y]) => S('path', { d: `M${x - 4},${y} h8 M${x},${y - 4} v8 M${x - 3},${y - 3} l6,6 M${x + 3},${y - 3} l-6,6` }, ice, 'stroke:#e9f6ff;stroke-width:1.3'));
      const drops = S('g', {}, g, 'opacity:0;transition:opacity .8s');
      [[-14, 14], [2, 17], [16, 13]].forEach(([x, y]) => S('path', { d: `M${x},${y - 5} q4,5 0,7 q-4,-2 0,-7z` }, drops, 'fill:#5fb7ff'));
      pots.push({ g, body, ice, drops });
    }
    const foot = S('g', {}, svg, 'opacity:0;transition:opacity .5s, transform .5s');
    S('path', { d: 'M300,120 q-10,30 0,52 h46 q6,-8 -6,-14 l-20,-6 q-4,-18 4,-32 z' }, foot, 'fill:#6b4a2f;stroke:#3a2716');
    txt(foot, '足で踏んで水分をしぼり出す', 320, 105, 12, 'fill:#fff;font-weight:700;paint-order:stroke;stroke:#3a2716;stroke-width:3px');
    const PH = [
      // [sky, night, label, ice, drops, size, color, foot, text]
      ['#1c2a4a', 1, '1日目の夜', 1, 0, 1, '#c8a165', 0, '<b>夜：凍る</b>　収穫したジャガイモを地面に広げておく。標高4000m前後の高原では、乾季（6〜7月ごろ）の夜は氷点下10℃近くまで冷え込み、イモの中の水分が凍る。'],
      ['#7fb2e5', 0, '1日目の昼', 0, 1, 1, '#c09056', 0, '<b>昼：とける</b>　昼は強い日差しで気温が上がり、氷がとけて水がしみ出す。凍るときにできた氷の結晶で、イモの細胞が壊れているので、水分が抜けやすくなる。'],
      ['#1c2a4a', 1, '2〜3日目', 1, 0, 0.9, '#a77b48', 0, '<b>凍結と解凍のくり返し</b>　夜に凍り、昼にとけることを数日くり返すと、イモはぶよぶよになっていく。'],
      ['#7fb2e5', 0, '4日目', 0, 1, 0.8, '#8c6a43', 1, '<b>踏んで水分をしぼる</b>　人々は、柔らかくなったイモを足で踏んで、水分をしぼり出す。このとき、イモの皮もむける。'],
      ['#7fb2e5', 0, '5日目以降', 0, 0, 0.62, '#4e4038', 0, '<b>チューニョの完成</b>　さらに数日、天日で乾かすと、軽くて固い保存食「チューニョ」ができる。チューニョは、数年から10年以上も保存できるといわれ、凶作に備える食料や、遠征する軍隊の食料として蓄えられた。高地の寒さと乾燥を利用した、天然の「フリーズドライ」である。']
    ];
    let i = 0, timer = null;
    const draw = () => {
      const [sk, night, lab, ice, drops, size, col, ft, text] = PH[i];
      sky.style.fill = sk; sun.style.opacity = night ? 0 : 1; moon.style.opacity = night; stars.style.opacity = night;
      pots.forEach(q => { q.ice.style.opacity = ice; q.drops.style.opacity = drops; q.body.setAttribute('rx', 22 * size); q.body.setAttribute('ry', 15 * size * (i >= 3 ? 0.85 : 1)); q.body.style.fill = col; });
      foot.style.opacity = ft;
      ctl.querySelector('.wstep').textContent = lab;
      out.innerHTML = text;
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; ctl.querySelector('.wplay').textContent = '▶ 再生'; } };
    ctl.querySelector('.wplay').addEventListener('click', (e) => {
      if (timer) { stop(); return; }
      e.target.textContent = '■ 止める';
      timer = setInterval(() => { if (i >= PH.length - 1) { stop(); return; } i++; draw(); }, 2200);
    });
    ctl.querySelector('.wreset').addEventListener('click', () => { stop(); i = 0; draw(); });
    draw();
  };

  /* ================= debase: silver content of Roman coinage over time ================= */
  W.debase = function (host, p) {
    p = p || {};
    const D = p.data || [[14, 97, 'アウグストゥス', 'デナリウス銀貨'], [64, 93, 'ネロの改鋳', ''], [107, 89, 'トラヤヌス', ''], [180, 79, 'マルクス＝アウレリウスの死', ''], [192, 73, 'コンモドゥスの死', ''], [211, 55, 'セプティミウス＝セウェルスの死', '軍隊の増給'], [215, 51, 'カラカラ', 'アントニニアヌス貨（2デナリウス）を導入'], [240, 42, 'ゴルディアヌス3世', ''], [253, 30, 'トレボニアヌス＝ガルス', ''], [260, 15, 'ウァレリアヌスの捕囚', ''], [268, 3, 'ガリエヌス・クラウディウス2世', '銀めっきの銅貨に'], [274, 5, 'アウレリアヌスの改革', ''], [294, 90, 'ディオクレティアヌスの改革', '良質の新銀貨（アルゲンテウス）']];
    const ctl = H('div', 'wctl', host, '<input type="range" min="0" max="' + (D.length - 1) + '" value="0" class="wrange" style="flex:1" aria-label="年代"><button type="button" class="wplay">▶ 再生</button>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const X0 = 60, X1 = 430, Y0 = 250, Y1 = 30;
    const sx = y => X0 + (y - 0) / 300 * (X1 - X0), sy = v => Y0 - v / 100 * (Y0 - Y1);
    for (let v = 0; v <= 100; v += 25) { S('line', { x1: X0, y1: sy(v), x2: X1, y2: sy(v) }, svg, 'stroke:var(--rule)'); txt(svg, v + '%', X0 - 8, sy(v), 10.5, 'fill:var(--ink-3)', 'end'); }
    for (let y = 0; y <= 300; y += 50) txt(svg, y + '年', sx(y), Y0 + 16, 10.5, 'fill:var(--ink-3)');
    txt(svg, '銀の含有率', X0 - 30, Y1 - 14, 11, 'fill:var(--ink-3);font-weight:700', 'start');
    S('rect', { x: sx(235), y: Y1, width: sx(284) - sx(235), height: Y0 - Y1 }, svg, 'fill:var(--accent);opacity:.08');
    txt(svg, '軍人皇帝時代', (sx(235) + sx(284)) / 2, Y1 + 10, 10.5, 'fill:var(--accent)');
    const pts = D.map(d => sx(d[0]) + ',' + sy(d[1]));
    const poly = S('polyline', { points: '' }, svg, 'fill:none;stroke:var(--gold);stroke-width:3;stroke-linejoin:round');
    const dot = S('circle', { cx: 0, cy: 0, r: 6 }, svg, 'fill:var(--gold);stroke:var(--ink);stroke-width:1.5');
    // coin
    const CX = 540, CY = 120;
    const coin = S('circle', { cx: CX, cy: CY, r: 62 }, svg, 'stroke-width:4');
    S('circle', { cx: CX, cy: CY, r: 52 }, svg, 'fill:none;stroke:rgba(0,0,0,.25);stroke-dasharray:2 3');
    S('path', { d: `M${CX - 16},${CY + 30} q-6,-30 6,-48 q14,-14 26,0 q8,12 2,22 q10,6 4,14 q-8,4 -6,12 z` }, svg, 'fill:rgba(0,0,0,.18)');
    const pct = txt(svg, '', CX, CY + 88, 22, 'font-weight:700');
    const lab = txt(svg, '', CX, CY + 112, 11.5, 'fill:var(--ink-2)');
    const mix = (v) => { const a = [196, 202, 208], b = [150, 92, 52]; const t = v / 100; return 'rgb(' + a.map((c, i) => Math.round(b[i] + (c - b[i]) * t)).join(',') + ')'; };
    let k = 0, timer = null;
    const draw = () => {
      const d = D[k];
      poly.setAttribute('points', pts.slice(0, k + 1).join(' '));
      dot.setAttribute('cx', sx(d[0])); dot.setAttribute('cy', sy(d[1]));
      coin.style.fill = mix(d[1]); coin.style.stroke = d[1] > 50 ? '#8a8f96' : '#6e3f1f';
      pct.textContent = '銀 約' + d[1] + '%'; lab.textContent = d[0] + '年ごろ';
      out.innerHTML = '<b>' + d[0] + '年ごろ　' + d[2] + '</b>' + (d[3] ? '　' + d[3] : '') + '<br><span style="font-size:.9em;color:var(--ink-3)">数値は研究にもとづくおおよその推定値で、研究者や個々の貨幣によって差がある。銀の量が減っても、皇帝は同じ額面で通用させようとしたため、人々は良貨をため込み、物価は上がっていった。</span>';
      ctl.querySelector('.wrange').value = k;
    };
    ctl.querySelector('.wrange').addEventListener('input', (e) => { k = +e.target.value; draw(); });
    const stop = () => { if (timer) { clearInterval(timer); timer = null; ctl.querySelector('.wplay').textContent = '▶ 再生'; } };
    ctl.querySelector('.wplay').addEventListener('click', (e) => {
      if (timer) { stop(); return; }
      if (k >= D.length - 1) k = 0;
      e.target.textContent = '■ 止める';
      timer = setInterval(() => { if (k >= D.length - 1) { stop(); return; } k++; draw(); }, 1100);
      draw();
    });
    draw();
  };

  /* ================= cbow: composite bow of the steppe (sinew / wood / horn) ================= */
  W.cbow = function (host, p) {
    p = p || {};
    const ctl = H('div', 'wctl', host, '<label style="flex:1;display:flex;gap:8px;align-items:center">引く <input type="range" min="0" max="100" value="0" class="wrange" style="flex:1"></label><button type="button" class="wplay">▶ 射る</button><button type="button" class="wmode">木だけの短い弓と比べる</button>');
    const svg = svgBox(host, 640, 330);
    const out = H('div', 'wout', host);
    const CX = 330, CY = 165, L = 130, Lup = 140, Ldn = 118; // asymmetric limbs (upper longer)
    let t = 0, self = false, timer = null;
    const gBow = S('g', {}, svg);
    const lab = S('g', {}, svg);
    const arrow = S('g', {}, svg);
    S('line', { x1: 0, y1: 0, x2: 150, y2: 0 }, arrow, 'stroke:var(--ink-2);stroke-width:2.5');
    S('path', { d: 'M150,0 l-12,-5 l0,10 z' }, arrow, 'fill:var(--ink-2)');
    S('path', { d: 'M0,0 l-10,-6 M0,0 l-10,6 M8,0 l-10,-6 M8,0 l-10,6' }, arrow, 'stroke:var(--accent);stroke-width:2');
    // energy bars
    const bar = (y, label) => { txt(svg, label, 470, y - 10, 11.5, 'fill:var(--ink-2)', 'start'); S('rect', { x: 470, y, width: 150, height: 14, rx: 3 }, svg, 'fill:var(--card);stroke:var(--rule)'); return S('rect', { x: 470, y, width: 0, height: 14, rx: 3 }, svg, 'fill:var(--gold)'); };
    const b1 = bar(70, '蓄えられるエネルギー（目安）');
    const warn = txt(svg, '', 545, 112, 11.5, 'fill:var(--accent);font-weight:700');
    // legend
    const lg = [['#c0392b', '腱（背側：引くと伸びる）'], ['#b08850', '木の芯'], ['#4a7fc1', '角（腹側：引くと縮む）'], ['#e8e2d0', '骨の板（握りと先端）']];
    lg.forEach(([c, s], i) => { S('rect', { x: 470, y: 160 + i * 22, width: 18, height: 8, rx: 2 }, svg, 'fill:' + c + ';stroke:var(--rule)'); txt(svg, s, 494, 165 + i * 22, 11.5, 'fill:var(--ink-2)', 'start'); });
    const limb = (sign, len, tt, off) => {
      const pts = [];
      const bend = (self ? 40 : 18) + (self ? 70 : 85) * tt;
      for (let i = 0; i <= 20; i++) {
        const s = i / 20;
        let x, y;
        if (self || s <= 0.78) { x = CX - bend * s * s; y = CY + sign * len * s; }
        else { const s0 = 0.78, x0 = CX - bend * s0 * s0, y0 = CY + sign * len * s0; const ang = (0.9 - 1.1 * tt) ; const d = (s - s0) * len; x = x0 + Math.sin(ang) * d; y = y0 + sign * Math.cos(ang) * d; }
        pts.push([x + off, y]);
      }
      return pts;
    };
    const draw = () => {
      gBow.innerHTML = '';
      const len1 = self ? 105 : Lup, len2 = self ? 105 : Ldn;
      const layers = self ? [[0, '#b08850', 6]] : [[3.2, '#c0392b', 2.6], [0, '#b08850', 3.4], [-3.2, '#4a7fc1', 2.6]];
      layers.forEach(([off, col, w]) => {
        [[-1, len1], [1, len2]].forEach(([sg, ln]) => {
          const pts = limb(sg, ln, t, off);
          const k = off > 0 ? t : off < 0 ? t : 0;
          S('polyline', { points: pts.map(q => q.join(',')).join(' ') }, gBow, 'fill:none;stroke-linecap:round;stroke:' + col + ';stroke-width:' + (w + (off ? k * 1.5 : 0)) + ';opacity:' + (off ? 0.55 + 0.45 * t : 1));
        });
      });
      if (!self) {
        [[-1, len1], [1, len2]].forEach(([sg, ln]) => { const pts = limb(sg, ln, t, 0); const a = pts[16], b = pts[20]; S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, gBow, 'stroke:#e8e2d0;stroke-width:4;stroke-linecap:round'); });
        S('rect', { x: CX - 6, y: CY - 16, width: 12, height: 32, rx: 3 }, gBow, 'fill:#e8e2d0;stroke:#9c927a');
      } else S('rect', { x: CX - 5, y: CY - 14, width: 10, height: 28, rx: 3 }, gBow, 'fill:#8a6a3a');
      const top = limb(-1, len1, t, 0)[20], bot = limb(1, len2, t, 0)[20];
      const nockX = Math.min(top[0], bot[0]) - (self ? 50 : 45) - (self ? 120 : 175) * t, nockY = CY;
      S('polyline', { points: [top, [nockX, nockY], bot].map(q => q.join(',')).join(' ') }, gBow, 'fill:none;stroke:var(--ink);stroke-width:1.4');
      arrow.setAttribute('transform', `translate(${nockX},${nockY})`);
      const eMax = self ? 0.55 : 1, broke = self && t > 0.72;
      const e = Math.min(t, self ? 0.72 : 1);
      b1.setAttribute('width', 150 * eMax * e * e / (self ? 1 : 1));
      b1.style.fill = broke ? 'var(--accent)' : 'var(--gold)';
      warn.textContent = broke ? 'これ以上引くと折れる' : '';
      out.innerHTML = self
        ? '<b>木だけの短い弓</b>　馬上で扱えるように短くした木の弓は、深く引くと木が耐えきれずに折れてしまう。そのため、引ける長さが短く、蓄えられるエネルギーも小さい。ヨーロッパのロングボウ（長弓）が2m近くもあるのは、木だけで強い弓をつくるには長さが必要だからである。'
        : '<b>複合弓</b>　背側（的の側）には、引っ張られると縮もうとする動物の腱を、腹側（射手の側）には、押し縮められると元に戻ろうとする動物の角を、木の芯に膠で貼り合わせてある。引くと腱は伸び、角は縮み、両方がばねのように力を蓄える。先端の反り返った部分（骨の板で補強）はてこの働きをして、短い弓でも深く引ける。そのため、馬上で扱える短さで、強力な矢を放つことができた。フン人の弓は、上下の長さが異なる非対称形であったと考えられている。';
    };
    const rng = ctl.querySelector('.wrange');
    rng.addEventListener('input', () => { t = rng.value / 100; draw(); });
    ctl.querySelector('.wmode').addEventListener('click', (e) => { self = !self; e.target.textContent = self ? '複合弓に戻す' : '木だけの短い弓と比べる'; draw(); });
    ctl.querySelector('.wplay').addEventListener('click', () => {
      if (timer) return;
      let ph = 0; t = 0;
      timer = setInterval(() => {
        ph++;
        if (ph <= 30) { t = ph / 30 * (self ? 0.72 : 1); rng.value = t * 100; draw(); }
        else if (ph <= 40) { }
        else {
          t = 0; rng.value = 0; draw();
          const x0 = parseFloat(arrow.getAttribute('transform').match(/translate\(([-\d.]+)/)[1]);
          let k = 0; const sp = self ? 9 : 16;
          const fly = setInterval(() => { k++; arrow.setAttribute('transform', `translate(${x0 + k * sp},${CY})`); if (k > 40) { clearInterval(fly); draw(); } }, 25);
          clearInterval(timer); timer = null;
        }
      }, 40);
    });
    draw();
  };

  /* ================= qanat: underground gravity-fed irrigation channel ================= */
  W.qanat = function (host, p) {
    p = p || {};
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button><span class="wstep"></span>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const gy = x => 70 + x * 0.22;                 // ground surface
    const ty = x => 175 + (x - 60) * 0.035;        // tunnel bed (gentle slope)
    const X0 = 60, X1 = 560;                        // mother well .. outlet
    const outletX = (() => { for (let x = 300; x < 640; x++) if (gy(x) >= ty(x)) return x; return 600; })();
    S('rect', { x: 0, y: 0, width: 640, height: 300 }, svg, 'fill:#cfe3f3');
    S('path', { d: `M0,${gy(0)} L640,${gy(640)} L640,300 L0,300 Z` }, svg, 'fill:#c9a978');
    S('path', { d: `M0,150 C150,160 260,190 360,222 L360,300 L0,300 Z` }, svg, 'fill:#6fa3c9;opacity:.45');
    txt(svg, '帯水層（地下水）', 90, 235, 12, 'fill:#1f4f73;font-weight:700');
    txt(svg, '山麓', 40, 55, 12, 'fill:var(--ink-2);font-weight:700');
    txt(svg, '村と畑', 610, 175, 12, 'fill:var(--ink-2);font-weight:700', 'end');
    for (let x = 575; x < 635; x += 14) S('path', { d: `M${x},${gy(x) - 2} l4,-10 l4,10` }, svg, 'fill:#5f9a4f');
    const tunnel = S('path', { d: `M${X0},${ty(X0)} L${outletX},${ty(outletX)}` }, svg, 'stroke:#5a4630;stroke-width:9;stroke-linecap:round;opacity:.15');
    const water = S('path', { d: `M${X0},${ty(X0)} L${outletX},${ty(outletX)} L630,${ty(outletX) + 3}` }, svg, 'fill:none;stroke:#2f7fc0;stroke-width:4;stroke-dasharray:6 8;opacity:0');
    const mother = S('rect', { x: X0 - 4, y: gy(X0), width: 8, height: ty(X0) - gy(X0) }, svg, 'fill:#5a4630;opacity:.15');
    const shafts = [];
    for (let x = 110; x < outletX - 20; x += 50) {
      const g = S('g', {}, svg, 'opacity:.12;transition:opacity .4s');
      S('rect', { x: x - 3, y: gy(x), width: 6, height: ty(x) - gy(x) }, g, 'fill:#5a4630');
      S('ellipse', { cx: x, cy: gy(x) - 2, rx: 11, ry: 4 }, g, 'fill:#a98a5c;stroke:#7a6040');
      shafts.push(g);
    }
    const lbl = (x, y, t, a) => txt(svg, t, x, y, 11.5, 'fill:var(--ink);font-weight:700;paint-order:stroke;stroke:#f4ead8;stroke-width:3px', a);
    const L1 = lbl(X0 + 8, gy(X0) - 10, '母井戸', 'start');
    const L2 = lbl(260, gy(260) - 14, '竪坑（掘削と換気・保守用）');
    const L3 = lbl(330, ty(330) + 22, '地下水路（ゆるい勾配）');
    const L4 = lbl(outletX - 6, ty(outletX) + 24, '出口', 'end');
    let flowT = null, off = 0;
    const flow = (on) => { water.style.opacity = on ? 1 : 0; if (on && !flowT) flowT = setInterval(() => { off -= 2; water.style.strokeDashoffset = off; }, 50); if (!on && flowT) { clearInterval(flowT); flowT = null; } };
    const ST = [
      ['<b>1. 母井戸を掘る</b>　まず、山のふもとで試し掘りをして、地下水のある深さを探す。地下水に届いた井戸が「母井戸」となる。母井戸の深さは、数十mから、深いものでは100mを超える。', [1, 0, 0, 0]],
      ['<b>2. 竪坑を並べて掘る</b>　村や畑のある低い土地から母井戸に向かって、一定の間隔で竪坑（縦穴）を掘り進める。竪坑は、掘った土を運び出し、地下に空気を送り、完成後は水路の掃除や修理に使う。地上から見ると、掘り出した土の山が、点々と一列に並んで見える。', [1, 1, 0, 0]],
      ['<b>3. 下流から水路を掘る</b>　竪坑の底どうしを、横穴でつないでいく。掘削は、出口のある下流側から上流の母井戸に向かって進める。こうすれば、掘っている途中にしみ出した水が自然に流れ出し、作業する人がおぼれずにすむ。水路の勾配は、水がゆっくり流れるように、ごくゆるやかにつくる。急すぎると、水の勢いで水路が削られて崩れてしまうからである。', [1, 1, 1, 0]],
      ['<b>4. 重力で水が流れる</b>　完成すると、地下水は、ポンプなどの動力を使わずに、重力だけで出口まで流れ続ける。水路が地下にあるため、乾燥した砂漠でも水が蒸発しにくい。イランでは、数千年前から、このような地下水路（カナート）がつくられ、長さ数十kmに及ぶものもある。ササン朝の時代にも、カナートによる灌漑が農業を支えた。', [1, 1, 1, 1]]
    ];
    let i = 0;
    const draw = () => {
      const [t, v] = ST[i];
      out.innerHTML = t; ctl.querySelector('.wstep').textContent = (i + 1) + ' / ' + ST.length;
      mother.style.opacity = v[0] ? 1 : 0.15; L1.style.opacity = v[0];
      shafts.forEach(g => g.style.opacity = v[1] ? 1 : 0.12); L2.style.opacity = v[1];
      tunnel.style.opacity = v[2] ? 1 : 0.15; L3.style.opacity = v[2]; L4.style.opacity = v[2];
      flow(!!v[3]);
    };
    ctl.querySelector('.wnext').addEventListener('click', () => { i = (i + 1) % ST.length; draw(); });
    ctl.querySelector('.wprev').addEventListener('click', () => { i = (i + ST.length - 1) % ST.length; draw(); });
    draw();
  };

  /* ================= pendentive: how a round dome sits on a square (Hagia Sophia) ================= */
  W.pendentive = function (host, p) {
    p = p || {};
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button><span class="wstep"></span><label style="margin-left:auto;font-size:12px">回転 <input type="range" min="-40" max="40" value="0" class="wrot"></label>');
    const svg = svgBox(host, 640, 390);
    const out = H('div', 'wout', host);
    const S0 = 76, CX = 320, CY = 292, h = 1.15;
    const hull = (A) => { A = A.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; A.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }); A.slice().reverse().forEach(p => { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }); return lo.slice(0, -1).concat(up.slice(0, -1)); };
    const hpoly = (A) => hull(A).map(q => q.map(v => v.toFixed(1)).join(',')).join(' ');
    let rot = 0, step = 0;
    const P = (x, y, z) => { const a = rot * Math.PI / 180, X = x * Math.cos(a) - y * Math.sin(a), Y = x * Math.sin(a) + y * Math.cos(a); return [CX + (X - Y) * 0.866 * S0, CY + (X + Y) * 0.5 * S0 - z * S0]; };
    const poly = (pts) => pts.map(q => P(...q).map(v => v.toFixed(1)).join(',')).join(' ');
    const depth = (x, y) => { const a = rot * Math.PI / 180; return x * Math.sin(a) + y * Math.cos(a) + x * Math.cos(a) - y * Math.sin(a); };
    const g = S('g', {}, svg);
    const N = 18;
    const draw = () => {
      g.innerHTML = '';
      // floor
      S('polygon', { points: poly([[-1.2, -1.2, 0], [1.2, -1.2, 0], [1.2, 1.2, 0], [-1.2, 1.2, 0]]) }, g, 'fill:var(--card);stroke:var(--rule)');
      // dashed circle on floor (plan of dome)
      const fc = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * 2 * Math.PI; fc.push([Math.cos(t), Math.sin(t), 0]); }
      S('polyline', { points: poly(fc) }, g, 'fill:none;stroke:var(--ink-3);stroke-dasharray:3 3');
      // semi-domes (step 3)
      if (step >= 3) {
        [-1, 1].forEach((sx) => {
          const pts = []; for (let a = 0; a <= 18; a++) for (let b = 0; b <= 6; b++) { const th = -Math.PI / 2 + Math.PI * a / 18, ph = Math.PI / 2 * b / 6; pts.push(P(sx * (1 + 0.95 * Math.cos(ph) * Math.cos(th)), 0.95 * Math.cos(ph) * Math.sin(th), h - 0.3 + 0.95 * Math.sin(ph))); }
          for (let a = 0; a <= 18; a++) { const th = -Math.PI / 2 + Math.PI * a / 18; pts.push(P(sx * (1 + 0.95 * Math.cos(th)), 0.95 * Math.sin(th), 0)); }
          S('polygon', { points: hpoly(pts) }, g, 'fill:#c9b48a;stroke:#8a7650;opacity:.8');
        });
      }
      const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]].sort((a, b) => depth(...a) - depth(...b));
      // piers & arches
      const arch = (side) => { const pts = []; for (let i = 0; i <= N; i++) { const u = -1 + 2 * i / N; const z = h + Math.sqrt(Math.max(0, 1 - u * u)); pts.push(side === 'x+' ? [1, u, z] : side === 'x-' ? [-1, u, z] : side === 'y+' ? [u, 1, z] : [u, -1, z]); } return pts; };
      corners.forEach(([cx, cy]) => {
        const b = []; [0, h].forEach(z => [[cx, cy], [cx * 0.8, cy], [cx * 0.8, cy * 0.8], [cx, cy * 0.8]].forEach(([x, y]) => b.push(P(x, y, z))));
        S('polygon', { points: hpoly(b) }, g, 'fill:#b9a27a;stroke:#7a6648');
      });
      ['y-', 'x-', 'x+', 'y+'].forEach(sd => S('polyline', { points: poly(arch(sd)) }, g, 'fill:none;stroke:#7a6648;stroke-width:5;stroke-linejoin:round'));
      // pendentives
      if (step >= 1) {
        corners.forEach(([cx, cy]) => {
          const pts = [];
          for (let i = 0; i <= N; i++) { const u = cx * (1 - i / N); pts.push([u, cy, h + Math.sqrt(Math.max(0, 1 - u * u))]); }
          const t0 = Math.atan2(cy, 0), t1 = Math.atan2(0, cx);
          for (let i = 0; i <= N; i++) { const t = t0 + (t1 - t0 + (Math.abs(t1 - t0) > Math.PI ? -Math.sign(t1 - t0) * 2 * Math.PI : 0)) * i / N; pts.push([Math.cos(t), Math.sin(t), h + 1]); }
          for (let i = 0; i <= N; i++) { const v = cy * (i / N); pts.push([cx, v, h + Math.sqrt(Math.max(0, 1 - v * v))]); }
          S('polygon', { points: poly(pts) }, g, 'fill:#e3bd5c;stroke:#a07a20;stroke-width:1.2;opacity:' + (step === 1 ? 0.95 : 0.85));
        });
        const ring = []; for (let i = 0; i <= 64; i++) { const t = i / 64 * 2 * Math.PI; ring.push([Math.cos(t), Math.sin(t), h + 1]); }
        S('polyline', { points: poly(ring) }, g, 'fill:none;stroke:var(--accent);stroke-width:3');
      }
      // dome
      if (step >= 2) {
        const dh = 0.75; // shallow dome (rise ratio)
        const sil = [];
        for (let i = 0; i <= 64; i++) { const t = i / 64 * 2 * Math.PI; sil.push(P(Math.cos(t), Math.sin(t), h + 1)); }
        // outline: top silhouette approximated by sampling sphere points and taking upper envelope
        const pts = []; for (let a = 0; a <= 36; a++) for (let b = 0; b <= 12; b++) { const t = a / 36 * 2 * Math.PI, ph = b / 12 * Math.PI / 2; pts.push(P(Math.cos(t) * Math.cos(ph), Math.sin(t) * Math.cos(ph), h + 1 + 0.12 + Math.sin(ph) * dh)); }
        // convex hull
        const hull2 = (A) => { A = A.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; A.forEach(p => { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }); A.slice().reverse().forEach(p => { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }); return lo.slice(0, -1).concat(up.slice(0, -1)); };
        const H2 = hull(pts.concat(sil));
        S('polygon', { points: H2.map(q => q.map(v => v.toFixed(1)).join(',')).join(' ') }, g, 'fill:#d8c79e;stroke:#8a7650;stroke-width:1.5');
        for (let a = 0; a < 16; a++) { const t = a / 16 * 2 * Math.PI; const m = []; for (let b = 0; b <= 12; b++) { const ph = b / 12 * Math.PI / 2; m.push([Math.cos(t) * Math.cos(ph), Math.sin(t) * Math.cos(ph), h + 1 + 0.12 + Math.sin(ph) * dh]); } if (depth(Math.cos(t), Math.sin(t)) > -0.2) S('polyline', { points: poly(m) }, g, 'fill:none;stroke:#a89263;stroke-width:1'); }
        for (let a = 0; a < 40; a++) { const t = a / 40 * 2 * Math.PI; if (depth(Math.cos(t), Math.sin(t)) < -0.1) continue; const [x0, y0] = P(Math.cos(t), Math.sin(t), h + 1.02), [x1, y1] = P(Math.cos(t), Math.sin(t), h + 1.1); S('line', { x1: x0, y1: y0, x2: x1, y2: y1 }, g, 'stroke:#fff6c9;stroke-width:3'); }
      }
      const lab = (t, x, y, z, c) => { const [a, b] = P(x, y, z); txt(g, t, a, b, 12, 'font-weight:700;paint-order:stroke;stroke:var(--paper);stroke-width:3px;fill:' + (c || 'var(--ink)')); };
      if (step === 0) { lab('正方形の柱と4つのアーチ', 0, 0, 0.55); lab('この上に丸いドームを載せたい', 0, 0, 2.6, 'var(--accent)'); }
      if (step === 1) lab('ペンデンティヴ（球面三角形）', 1, 1, h + 0.75, '#7a5600');
      if (step >= 1) lab('円形の土台', -0.2, -1.05, h + 1.25, 'var(--accent)');
      if (step >= 2) lab('40の窓', 0.7, 0.75, h + 1.35);
      if (step >= 3) lab('半ドーム', 1.9, 0, h + 0.6);
    };
    const ST = [
      '<b>1. 正方形の上に円を</b>　4本の太い柱を正方形に立て、柱どうしをアーチで結ぶ。しかし、アーチの上端は正方形を描くので、そのままでは円形のドームを載せることができない。古代ローマのパンテオンは、円形の壁の上にドームを載せていたが、それでは内部が壁で閉ざされてしまう。',
      '<b>2. ペンデンティヴ</b>　四隅のすき間を、下がとがり、上が円弧になった球面の三角形で埋める。これを「ペンデンティヴ」という。4つのペンデンティヴの上端がつながると、正方形の上に、円形の土台（赤い円）ができる。ドームの重さは、ペンデンティヴを通じて4本の柱に集められる。',
      '<b>3. ドームを載せる</b>　円形の土台の上にドームを載せる。ハギア＝ソフィア聖堂のドームは直径約31m、床からの高さは約55mに達する。ドームの付け根には40の窓が一列に並び、そこから差し込む光で、ドームが宙に浮いているように見える。同時代の歴史家プロコピオスは、ドームが「天から金の鎖でつり下げられているようだ」と書いた。',
      '<b>4. 半ドームで支える</b>　ハギア＝ソフィアでは、東西にさらに大きな半ドームを置き、ドームの横に押し広げる力を受け止めた。それでも、地震の多いコンスタンティノープルでは、558年の地震で最初のドームが崩れ落ち、より高い形に建て直された。ペンデンティヴの上にドームを載せる技術は、のちのビザンツ建築や、オスマン帝国のモスクにも受け継がれた。'
    ];
    const show = () => { out.innerHTML = ST[step]; ctl.querySelector('.wstep').textContent = (step + 1) + ' / ' + ST.length; draw(); };
    ctl.querySelector('.wnext').addEventListener('click', () => { step = (step + 1) % ST.length; show(); });
    ctl.querySelector('.wprev').addEventListener('click', () => { step = (step + ST.length - 1) % ST.length; show(); });
    ctl.querySelector('.wrot').addEventListener('input', (e) => { rot = +e.target.value; draw(); });
    show();
  };

  /* ================= greekfire: siphon projecting liquid fire (reconstruction) ================= */
  W.greekfire = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button><span class="wstep"></span>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    S('rect', { x: 0, y: 0, width: 640, height: 210 }, svg, 'fill:#bcd6ea');
    S('rect', { x: 0, y: 210, width: 640, height: 90 }, svg, 'fill:#3f6f99');
    for (let x = 0; x < 640; x += 28) S('path', { d: `M${x},${214} q7,-4 14,0 t14,0` }, svg, 'fill:none;stroke:#8fb6d6;stroke-width:1.5');
    // dromon hull (left)
    S('path', { d: 'M10,205 L250,205 L232,236 L40,236 Z' }, svg, 'fill:#7a5532;stroke:#4a321c;stroke-width:2');
    S('rect', { x: 120, y: 60, width: 5, height: 145 }, svg, 'fill:#5a3e22');
    S('path', { d: 'M125,70 L190,175 L125,175 Z' }, svg, 'fill:#efe6d0;stroke:#a89878');
    for (let i = 0; i < 9; i++) S('line', { x1: 40 + i * 22, y1: 236, x2: 30 + i * 22, y2: 258 }, svg, 'stroke:#4a321c;stroke-width:2');
    // apparatus on bow
    const g = S('g', {}, svg);
    const brazier = S('g', {}, g, 'opacity:.2;transition:opacity .4s');
    S('rect', { x: 160, y: 188, width: 34, height: 14, rx: 2 }, brazier, 'fill:#3a2a1a');
    for (let i = 0; i < 4; i++) S('path', { d: `M${165 + i * 8},188 q3,-10 6,0` }, brazier, 'fill:#ff7a1a');
    const tank = S('rect', { x: 160, y: 150, width: 34, height: 38, rx: 8 }, g, 'fill:#b0742f;stroke:#6b4518;stroke-width:2;transition:fill .6s');
    txt(g, '容器', 177, 140, 11, 'font-weight:700;fill:var(--ink)');
    const pump = S('g', {}, g, 'opacity:.2;transition:opacity .4s');
    S('rect', { x: 140, y: 150, width: 14, height: 30, rx: 2 }, pump, 'fill:#8a6a3a;stroke:#5a3e22');
    const handle = S('line', { x1: 147, y1: 150, x2: 147, y2: 130 }, pump, 'stroke:#5a3e22;stroke-width:4;stroke-linecap:round');
    txt(pump, 'ポンプ', 120, 128, 11, 'font-weight:700;fill:var(--ink)');
    const tube = S('path', { d: 'M194,165 L230,165 L246,172' }, g, 'fill:none;stroke:#8a5a1a;stroke-width:7;stroke-linecap:round');
    S('path', { d: 'M240,164 l16,5 l-4,8 l-16,-3 z' }, g, 'fill:#c9a24a;stroke:#6b4518');
    txt(g, 'サイフォン（噴射管）', 262, 128, 11, 'font-weight:700;fill:var(--ink)', 'start');
    const gauge = S('rect', { x: 200, y: 178, width: 0, height: 6 }, g, 'fill:#c0392b');
    S('rect', { x: 200, y: 178, width: 30, height: 6 }, g, 'fill:none;stroke:#333');
    // enemy ship
    S('path', { d: 'M470,205 L630,205 L615,232 L490,232 Z' }, svg, 'fill:#6a5a4a;stroke:#3a2e22;stroke-width:2');
    S('rect', { x: 550, y: 90, width: 5, height: 115 }, svg, 'fill:#3a2e22');
    S('path', { d: 'M555,100 L605,180 L555,180 Z' }, svg, 'fill:#dcd3bd;stroke:#998e74');
    txt(svg, '敵の船', 550, 250, 11, 'font-weight:700;fill:#fff');
    // jet + fire
    const jet = S('path', { d: 'M256,170 Q360,120 480,205' }, svg, 'fill:none;stroke:#ff8c1a;stroke-width:6;stroke-linecap:round;stroke-dasharray:420;stroke-dashoffset:420;opacity:0');
    const glow = S('path', { d: 'M256,170 Q360,120 480,205' }, svg, 'fill:none;stroke:#ffd25a;stroke-width:2;stroke-dasharray:420;stroke-dashoffset:420;opacity:0');
    const fires = S('g', {}, svg, 'opacity:0;transition:opacity .6s');
    for (let i = 0; i < 12; i++) { const x = 400 + i * 18; S('path', { d: `M${x},${212} q6,-${18 + (i % 3) * 8} 12,0 z` }, fires, 'fill:' + (i % 2 ? '#ff6a00' : '#ffb000')); }
    for (let i = 0; i < 5; i++) { const x = 505 + i * 22; S('path', { d: `M${x},${205} q8,-30 16,0 z` }, fires, 'fill:#ff7a00'); }
    let anim = null;
    const ST = [
      ['<b>1. 「液体の火」</b>　「ギリシアの火」は、ビザンツ帝国が7世紀後半から用いた焼夷兵器である。テオファネスの年代記によれば、672年ごろ、シリアから逃れてきた建築家カリニコスが製法をもたらしたという。原料は、黒海沿岸などで採れる原油に、松やになどを混ぜたものと考えられているが、正確な製法は国家の最高機密とされ、現在では失われている【諸説】。', 0, 0, 0, 0],
      ['<b>2. 加熱する</b>　船首に置いた青銅の容器に液体を入れ、下から火であぶって温める。温めると液体は流れやすくなり、容器の中の圧力も高まる。', 1, 0, 0, 0],
      ['<b>3. ポンプで圧力をかける</b>　手押しのポンプ（ふいごとする説もある）で、容器にさらに圧力をかける。容器の中の圧力が高まった状態で、噴射管の栓を開く準備をする。', 1, 1, 0, 0],
      ['<b>4. 噴射する</b>　栓を開くと、液体が噴射管から勢いよく噴き出し、管の先の火で点火されて、炎の流れとなって敵の船に浴びせかけられる。噴射管の先は、しばしば獅子などの動物の頭の形に飾られていた。', 1, 1, 1, 0],
      ['<b>5. 水の上で燃え続ける</b>　ギリシアの火は、油を含むため水に浮き、海の上でも燃え続けた。水をかけても消えず、砂や酢、尿などでなければ消せなかったと伝えられる【諸説】。木造の帆船にとって、これは恐るべき兵器であった。678年と718年のアラブ軍のコンスタンティノープル包囲では、ギリシアの火がアラブの艦隊を焼き払い、都を救ったとされる。', 1, 1, 1, 1]
    ];
    let i = 0;
    const draw = () => {
      const [t, heat, pmp, fire, burn] = ST[i];
      out.innerHTML = t; ctl.querySelector('.wstep').textContent = (i + 1) + ' / ' + ST.length;
      brazier.style.opacity = heat ? 1 : 0.2; tank.style.fill = heat ? '#c9662a' : '#b0742f';
      pump.style.opacity = pmp ? 1 : 0.2; gauge.setAttribute('width', heat ? (pmp ? 30 : 15) : 0);
      if (anim) { clearInterval(anim); anim = null; handle.setAttribute('y2', 130); }
      if (pmp && !fire) { let k = 0; anim = setInterval(() => { k++; handle.setAttribute('y2', 130 + (k % 2) * 14); }, 300); }
      [jet, glow].forEach(el => { el.style.transition = 'none'; el.style.opacity = fire ? 1 : 0; el.style.strokeDashoffset = 420; });
      if (fire) setTimeout(() => [jet, glow].forEach(el => { el.style.transition = 'stroke-dashoffset 1.2s ease-out'; el.style.strokeDashoffset = 0; }), 50);
      fires.style.opacity = burn ? 1 : 0;
    };
    ctl.querySelector('.wnext').addEventListener('click', () => { i = (i + 1) % ST.length; draw(); });
    ctl.querySelector('.wprev').addEventListener('click', () => { i = (i + ST.length - 1) % ST.length; draw(); });
    draw();
  };

  /* ================= repeater: repeating crossbow (lever-cocked magazine) ================= */
  W.repeater = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ レバーを引いて連射</button><button type="button" class="wreset">矢を補充</button><span class="wstep"></span>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host, '<b>連弩</b>　弓の上に、10本ほどの矢を入れた箱（弾倉）を載せた弩。手前のレバーを引くと、弾倉が後ろに滑って弦を引き絞り、いちばん後ろまで来ると弦が自動的に外れて矢が飛ぶ。レバーを前に押し戻すと、弾倉が前に出て弦を再びとらえ、次の矢が溝に落ちる。この動作を繰り返せば、狙いをつけずに次々と矢を放つことができた。');
    S('rect', { x: 0, y: 0, width: 640, height: 300 }, svg, 'fill:var(--card)');
    const SY = 190, X0 = 90, X1 = 470;
    S('rect', { x: X0, y: SY, width: X1 - X0, height: 18, rx: 4 }, svg, 'fill:#8a6338;stroke:#5a3e22');
    S('line', { x1: X0 + 40, y1: SY + 2, x2: X1, y2: SY + 2 }, svg, 'stroke:#5a3e22;stroke-width:1;stroke-dasharray:4 3');
    const bowG = S('g', {}, svg);
    const bow = S('path', {}, bowG, 'fill:none;stroke:#6b4a2a;stroke-width:7;stroke-linecap:round');
    const str = S('polyline', {}, bowG, 'fill:none;stroke:var(--ink);stroke-width:1.6');
    const mag = S('g', {}, svg);
    S('rect', { x: 0, y: -62, width: 150, height: 58, rx: 3 }, mag, 'fill:#b08a55;stroke:#5a3e22;stroke-width:1.5');
    const bolts = S('g', {}, mag);
    S('rect', { x: -6, y: -8, width: 10, height: 10 }, mag, 'fill:#5a3e22');
    txt(mag, '弾倉', 75, -70, 11, 'font-weight:700;fill:var(--ink)');
    const lever = S('line', {}, svg, 'stroke:#5a3e22;stroke-width:6;stroke-linecap:round');
    const link = S('line', {}, svg, 'stroke:#7a5a32;stroke-width:3');
    S('circle', { cx: X1 - 10, cy: SY + 26, r: 5 }, svg, 'fill:#333');
    txt(svg, 'レバー', X1 - 10, SY + 100, 11, 'font-weight:700;fill:var(--ink)');
    const arrows = S('g', {}, svg);
    const counter = txt(svg, '', 560, 40, 13, 'font-weight:700;fill:var(--accent)');
    let n = 10, u = 0, timer = null, flying = [];
    const drawBolts = () => { bolts.innerHTML = ''; for (let i = 0; i < Math.min(n, 9); i++) S('line', { x1: 10, y1: -10 - i * 5.5, x2: 140, y2: -10 - i * 5.5 }, bolts, 'stroke:#444;stroke-width:2'); counter.textContent = '残りの矢：' + n; };
    const draw = () => {
      const mx = 300 - u * 140; // magazine rear x
      mag.setAttribute('transform', `translate(${mx},${SY})`);
      const nock = mx; const tipX = X1 + 40 - u * 16;
      bow.setAttribute('d', `M${tipX},${SY - 90} Q${X1 + 55},${SY + 9} ${tipX},${SY + 108}`);
      str.setAttribute('points', `${tipX},${SY - 90} ${n > 0 || u > 0 ? nock : X1 + 30},${SY + 9} ${tipX},${SY + 108}`);
      const lx = X1 - 10 - Math.sin(u * 1.1) * 110, ly = SY + 26 + Math.cos(u * 1.1) * 70;
      lever.setAttribute('x1', X1 - 10); lever.setAttribute('y1', SY + 26); lever.setAttribute('x2', lx); lever.setAttribute('y2', ly);
      link.setAttribute('x1', mx); link.setAttribute('y1', SY - 4); link.setAttribute('x2', X1 - 10 - Math.sin(u * 1.1) * 40); link.setAttribute('y2', SY + 26 + Math.cos(u * 1.1) * 25);
    };
    const fire = (x0) => {
      const a = S('g', {}, arrows); S('line', { x1: 0, y1: 0, x2: 70, y2: 0 }, a, 'stroke:#333;stroke-width:2.5'); S('path', { d: 'M70,0 l-8,-4 l0,8 z' }, a, 'fill:#333');
      let x = x0; const it = setInterval(() => { x += 30; a.setAttribute('transform', `translate(${x},${SY - 2})`); if (x > 700) { clearInterval(it); a.remove(); } }, 25);
    };
    const cycle = () => {
      if (n <= 0) { stop(); out.innerHTML = '<b>矢が尽きた</b>　「矢を補充」を押すと、弾倉に矢が補充される。連弩は、一本一本の矢の威力や射程は普通の弩に劣ったが、短い時間に多くの矢を浴びせることができ、城の防衛などに向いていた。'; return; }
      let ph = 0;
      const it = setInterval(() => {
        ph++;
        if (ph <= 12) { u = ph / 12; draw(); }
        else if (ph === 13) { n--; drawBolts(); fire(160); u = 1; draw(); }
        else if (ph <= 25) { u = 1 - (ph - 13) / 12; draw(); }
        else { clearInterval(it); if (timer) cycle(); }
      }, 45);
    };
    const stop = () => { timer = null; ctl.querySelector('.wplay').textContent = '▶ レバーを引いて連射'; };
    ctl.querySelector('.wplay').addEventListener('click', (e) => { if (timer) { stop(); return; } timer = 1; e.target.textContent = '■ 止める'; cycle(); });
    ctl.querySelector('.wreset').addEventListener('click', () => { n = 10; drawBolts(); draw(); });
    drawBolts(); draw();
  };

  /* ================= stirrup: why stirrups mattered for mounted shock combat ================= */
  W.stirrup = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wa">▶ あぶみなしで突撃</button><button type="button" class="wb">▶ あぶみありで突撃</button>');
    const svg = svgBox(host, 640, 260);
    const out = H('div', 'wout', host, 'ボタンを押すと、槍を構えた騎兵が標的に突撃する。あぶみ（鐙）の有無で、ぶつかった瞬間に何が起こるかを比べてみよう。');
    S('rect', { x: 0, y: 0, width: 640, height: 260 }, svg, 'fill:var(--card)');
    S('rect', { x: 0, y: 220, width: 640, height: 40 }, svg, 'fill:#b9a27a');
    const post = S('g', {}, svg);
    S('rect', { x: 540, y: 120, width: 16, height: 100 }, post, 'fill:#7a5a32');
    S('rect', { x: 528, y: 125, width: 40, height: 40, rx: 4 }, post, 'fill:#c0392b;stroke:#7a1d10');
    const horse = S('g', {}, svg);
    // horse body
    S('path', { d: 'M-70,0 Q-60,-30 -10,-30 L40,-30 Q60,-50 70,-62 L82,-58 L74,-30 Q70,-12 52,-4 L50,40 L42,40 L40,4 L-40,6 L-44,40 L-52,40 L-56,4 Q-74,0 -88,10 L-90,4 Q-80,-6 -70,0 Z' }, horse, 'fill:#7b5a3a;stroke:#3e2a18');
    S('path', { d: 'M-20,-30 L-20,-18 L20,-18 L20,-30' }, horse, 'fill:#8a2b1a');
    const rider = S('g', { transform: 'translate(0,-30)' }, horse);
    const stir = S('g', {}, rider, 'opacity:0');
    S('line', { x1: 4, y1: 0, x2: 4, y2: 36 }, stir, 'stroke:#333;stroke-width:1.5');
    S('path', { d: 'M-2,36 h12 l-2,5 h-8 z' }, stir, 'fill:#555');
    S('path', { d: 'M0,0 L-6,22 L6,38' }, rider, 'fill:none;stroke:#2c3e70;stroke-width:6;stroke-linecap:round;stroke-linejoin:round');
    S('line', { x1: 0, y1: 0, x2: -4, y2: -40 }, rider, 'stroke:#2c3e70;stroke-width:9;stroke-linecap:round');
    S('circle', { cx: -5, cy: -50, r: 8 }, rider, 'fill:#e8c9a0;stroke:#333');
    S('path', { d: 'M-12,-55 Q-5,-66 2,-55' }, rider, 'fill:#555');
    S('line', { x1: -30, y1: -24, x2: 130, y2: -30 }, rider, 'stroke:#6b4a2a;stroke-width:3.5');
    S('path', { d: 'M130,-30 l-10,-4 l0,8 z' }, rider, 'fill:#888');
    const fArrow = S('g', {}, svg, 'opacity:0');
    S('line', { x1: 0, y1: 0, x2: -60, y2: 0 }, fArrow, 'stroke:var(--accent);stroke-width:4');
    S('path', { d: 'M-60,0 l10,-6 l0,12 z' }, fArrow, 'fill:var(--accent)');
    const fLab = txt(fArrow, '衝撃', -30, -10, 12, 'font-weight:700;fill:var(--accent)');
    let busy = false;
    const run = (withS) => {
      if (busy) return; busy = true;
      stir.style.opacity = withS ? 1 : 0;
      let x = 70, rot = 0, rx = 0, ry = -30, t = 0;
      post.setAttribute('transform', '');
      const it = setInterval(() => {
        t++;
        if (x < 400) { x += 9; }
        else if (t < 80) {
          if (!fArrow._shown) { fArrow._shown = 1; fArrow.style.opacity = 1; fArrow.setAttribute('transform', `translate(${x + 120},${190 - 60})`); }
          if (withS) { x += 2; post.setAttribute('transform', `rotate(${Math.min(60, (t - 37) * 5)},556,220)`); }
          else { rot = Math.max(-70, rot - 6); rx -= 4; ry = Math.min(30, ry + 3); }
        } else { clearInterval(it); busy = false; fArrow._shown = 0; setTimeout(() => { fArrow.style.opacity = 0; }, 800);
          out.innerHTML = withS
            ? '<b>あぶみあり</b>　足をあぶみにかけて踏ん張ることができるので、騎兵は馬と一体になったまま、馬の突進の勢いを槍に乗せて標的にぶつけることができる。重い鎧を着た騎兵（重装騎兵）が、槍を構えて集団で突撃する戦法が可能になった。'
            : '<b>あぶみなし</b>　鞍にまたがっているだけでは、槍がぶつかった瞬間の衝撃で、騎兵は後ろに押されて落馬してしまう。そのため、あぶみのない時代の騎兵は、馬上から弓を射たり、腕の力だけで槍を突いたりする戦い方が中心であった。'; }
        horse.setAttribute('transform', `translate(${x},190)`);
        rider.setAttribute('transform', `translate(${rx},${ry}) rotate(${rot})`);
      }, 30);
    };
    ctl.querySelector('.wa').addEventListener('click', () => run(false));
    ctl.querySelector('.wb').addEventListener('click', () => run(true));
    horse.setAttribute('transform', 'translate(70,190)');
  };

  /* ================= pi: Liu Hui / Zu Chongzhi polygon method ================= */
  W.pi = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wa">▶ 辺の数を2倍にする</button><button type="button" class="wb">最初に戻す</button>');
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host, '');
    S('rect', { x: 0, y: 0, width: 640, height: 300 }, svg, 'fill:var(--card)');
    const CX = 150, CY = 150, R = 120;
    S('circle', { cx: CX, cy: CY, r: R }, svg, 'fill:none;stroke:var(--ink-3);stroke-width:1.5');
    S('circle', { cx: CX, cy: CY, r: 2.5 }, svg, 'fill:var(--ink-2)');
    const poly = S('polygon', {}, svg, 'fill:var(--accent);fill-opacity:.12;stroke:var(--accent);stroke-width:1.8;stroke-linejoin:round');
    const tri = S('path', {}, svg, 'fill:none;stroke:var(--ink-2);stroke-width:1;stroke-dasharray:3 3');
    const PI = '3.14159265358979';
    const g = S('g', {}, svg);
    txt(svg, '内接正多角形による円周率の計算', 300, 26, 14, 'fill:var(--ink);font-weight:700', 'start');
    const tN = txt(g, '', 300, 62, 15, 'fill:var(--ink);font-weight:700', 'start');
    const tV = txt(g, '', 300, 98, 22, 'fill:var(--accent);font-weight:700;font-family:var(--font-mono,monospace)', 'start');
    const tT = txt(g, '', 300, 128, 12, 'fill:var(--ink-3)', 'start');
    txt(svg, '祖沖之の結果：3.1415926 ＜ π ＜ 3.1415927', 300, 196, 13, 'fill:var(--ink-2);font-weight:700', 'start');
    txt(svg, '約率（簡単な近似）  22/7 ＝ 3.142857…', 300, 224, 13, 'fill:var(--ink-2)', 'start');
    txt(svg, '密率（精密な近似）355/113 ＝ 3.1415929…', 300, 250, 13, 'fill:var(--ink-2)', 'start');
    txt(svg, '本当の値  π ＝ 3.14159265…', 300, 276, 13, 'fill:var(--ink-3)', 'start');
    let n, s;
    const draw = () => {
      const pts = [], m = Math.min(n, 768);
      for (let k = 0; k < m; k++) { const a = -Math.PI / 2 + 2 * Math.PI * k / m; pts.push((CX + R * Math.cos(a)).toFixed(2) + ',' + (CY + R * Math.sin(a)).toFixed(2)); }
      poly.setAttribute('points', pts.join(' '));
      const a0 = -Math.PI / 2, a1 = a0 + 2 * Math.PI / m;
      tri.setAttribute('d', n <= 96 ? 'M' + CX + ',' + CY + ' L' + (CX + R * Math.cos(a0)) + ',' + (CY + R * Math.sin(a0)) + ' M' + CX + ',' + CY + ' L' + (CX + R * Math.cos(a1)) + ',' + (CY + R * Math.sin(a1)) : '');
      const v = n * s / 2; // half perimeter of inscribed n-gon, unit radius
      const str = v.toFixed(10);
      let k = 0; while (k < str.length && str[k] === PI[k]) k++;
      tN.textContent = '正' + n.toLocaleString() + '角形';
      tV.textContent = '';
      S('tspan', {}, tV).textContent = str.slice(0, k);
      S('tspan', {}, tV, 'fill:var(--ink-3)').textContent = str.slice(k);
      tT.textContent = '周の長さ÷直径（色の部分が π と一致する桁）';
      const msg = {
        6: '円に内接する正六角形から始める。正六角形の1辺は半径に等しいので、周の長さ÷直径は 3 になる。古代中国では、円周率は「3」とされていた（周三径一）。',
        12: '辺の数を2倍にすると、正多角形は円に近づく。三平方の定理（中国では「勾股定理」）を使えば、前の辺の長さから、新しい辺の長さを計算できる。',
        96: '3世紀、魏の劉徽は、この方法（割円術）で正96角形まで計算し、3.14 という値を得た。さらに正3072角形まで進めて、3.1416 を得たとされる。',
        3072: '劉徽が到達したとされる正3072角形。ここまでで、小数第4位まで正しい値が得られる。',
        24576: '5世紀、南朝の宋・斉に仕えた祖沖之は、正24576角形にあたる計算をして、π が 3.1415926 と 3.1415927 の間にあることを示したと考えられている。この精度が初めて超えられたのは、約950年後の1424年、ティムール朝のサマルカンドの天文学者カーシーによってであった。'
      };
      out.innerHTML = '<b>正' + n.toLocaleString() + '角形</b>　' + (msg[n] || '辺を2倍にするたびに、値は少しずつ π に近づいていく。そろばんも筆算もない時代に、平方根の計算を何度も繰り返す必要があった。');
      ctl.querySelector('.wa').disabled = n >= 24576;
    };
    const reset = () => { n = 6; s = 1; draw(); };
    ctl.querySelector('.wa').onclick = () => { s = s / Math.sqrt(2 + Math.sqrt(4 - s * s)); n *= 2; draw(); };
    ctl.querySelector('.wb').onclick = reset;
    reset();
  };

  /* ================= canallock: slipway (dai) vs pound lock ================= */
  W.canallock = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wa">▶ 埭（船を引き上げる）</button><button type="button" class="wb">▶ 閘門（水位を変える）</button>');
    const svg = svgBox(host, 640, 250);
    const out = H('div', 'wout', host, '運河は、土地の高低差のある所を通るため、水位の違う区間をつながなければならない。2つの方法を比べてみよう。');
    S('rect', { x: 0, y: 0, width: 640, height: 250 }, svg, 'fill:var(--card)');
    const LOW = 186, HIGH = 120, D = 18, W0 = 'fill:#7fb1d6;fill-opacity:.75';
    const land = S('path', {}, svg, 'fill:#b9a27a');
    const wL = S('rect', {}, svg, W0), wR = S('rect', {}, svg, W0), wC = S('rect', {}, svg, W0);
    const g1 = S('rect', { width: 8 }, svg, 'fill:#5b4630'), g2 = S('rect', { width: 8 }, svg, 'fill:#5b4630');
    const ramp = S('path', {}, svg, 'fill:#a08660;stroke:#6b5434');
    const winch = S('g', {}, svg);
    S('circle', { cx: 0, cy: 0, r: 13 }, winch, 'fill:#8a6a44;stroke:#4a3420');
    S('ellipse', { cx: 38, cy: 4, rx: 20, ry: 10 }, winch, 'fill:#6b5b4b');
    S('circle', { cx: 56, cy: -2, r: 6 }, winch, 'fill:#6b5b4b');
    const rope = S('line', {}, svg, 'stroke:#4a3420;stroke-width:1.5');
    const boat = S('g', {}, svg);
    S('path', { d: 'M-40,0 L40,0 L30,14 L-30,14 Z' }, boat, 'fill:#8a5a2b;stroke:#4a2f15');
    S('rect', { x: -18, y: -14, width: 30, height: 14 }, boat, 'fill:#d9c08f;stroke:#7a6a4a');
    S('line', { x1: 0, y1: -14, x2: 0, y2: -40 }, boat, 'stroke:#4a2f15;stroke-width:2');
    const labs = S('g', {}, svg);
    const lab = (s, x, y) => txt(labs, s, x, y, 12, 'fill:var(--ink-2);font-weight:700');
    let timer = null;
    const setBoat = (x, y, rot) => boat.setAttribute('transform', 'translate(' + x + ',' + y + ') rotate(' + (rot || 0) + ')');
    const stop = () => { if (timer) cancelAnimationFrame(timer); timer = null; };
    const anim = (frames, done) => { stop(); let i = 0, t0 = null; const step = (ts) => { if (t0 == null) t0 = ts; const f = frames[i]; const k = Math.min(1, (ts - t0) / f.d); f.fn(k); if (k >= 1) { i++; t0 = null; if (i >= frames.length) { timer = null; if (done) done(); return; } } timer = requestAnimationFrame(step); }; timer = requestAnimationFrame(step); };
    const lerp = (a, b, k) => a + (b - a) * k;
    function sceneDai() {
      labs.innerHTML = '';
      land.setAttribute('d', 'M0,250 L0,' + (LOW + D) + ' L250,' + (LOW + D) + ' L330,' + (HIGH + D) + ' L640,' + (HIGH + D) + ' L640,250 Z');
      wL.setAttribute('x', 0); wL.setAttribute('y', LOW); wL.setAttribute('width', 260); wL.setAttribute('height', D);
      wR.setAttribute('x', 320); wR.setAttribute('y', HIGH); wR.setAttribute('width', 320); wR.setAttribute('height', D);
      wC.setAttribute('width', 0); g1.setAttribute('height', 0); g2.setAttribute('height', 0);
      ramp.setAttribute('d', 'M245,' + (LOW + D) + ' L335,' + (HIGH + D) + ' L335,' + (LOW + D) + ' Z');
      winch.setAttribute('transform', 'translate(420,' + (HIGH - 10) + ')'); winch.style.opacity = 1;
      lab('低い水路', 90, 232); lab('高い水路', 520, 232); lab('埭（土の斜面）', 290, 232);
      setBoat(120, LOW - 6, 0); rope.setAttribute('x1', 420); rope.setAttribute('y1', HIGH - 10); rope.setAttribute('x2', 160); rope.setAttribute('y2', LOW - 4);
    }
    function sceneLock() {
      labs.innerHTML = '';
      land.setAttribute('d', 'M0,250 L0,' + (LOW + D) + ' L230,' + (LOW + D) + ' L230,' + (LOW + D) + ' L410,' + (LOW + D) + ' L410,' + (HIGH + D) + ' L640,' + (HIGH + D) + ' L640,250 Z');
      wL.setAttribute('x', 0); wL.setAttribute('y', LOW); wL.setAttribute('width', 230); wL.setAttribute('height', D);
      wR.setAttribute('x', 410); wR.setAttribute('y', HIGH); wR.setAttribute('width', 230); wR.setAttribute('height', D);
      wC.setAttribute('x', 230); wC.setAttribute('y', LOW); wC.setAttribute('width', 180); wC.setAttribute('height', D);
      ramp.setAttribute('d', ''); winch.style.opacity = 0; rope.setAttribute('x1', 0); rope.setAttribute('x2', 0); rope.setAttribute('y1', 0); rope.setAttribute('y2', 0);
      g1.setAttribute('x', 226); g1.setAttribute('y', HIGH - 20); g1.setAttribute('height', 0);
      g2.setAttribute('x', 406); g2.setAttribute('y', HIGH - 20); g2.setAttribute('height', LOW + D - HIGH + 20);
      lab('低い水路', 100, 232); lab('閘室', 320, 232); lab('高い水路', 530, 232);
      setBoat(100, LOW - 6, 0);
    }
    ctl.querySelector('.wa').onclick = () => {
      sceneDai();
      out.innerHTML = '<b>埭（たい）</b>　水位の違う区間の間に土の斜面を築き、船を牛や人の力で引き上げる。隋・唐の運河では、このような埭や堰が多く用いられた。積み荷を降ろさなければならないことも多く、船体が傷みやすかった。';
      anim([
        { d: 1200, fn: k => { setBoat(lerp(120, 240, k), LOW - 6, 0); rope.setAttribute('x2', lerp(160, 280, k)); } },
        { d: 2600, fn: k => { const x = lerp(240, 340, k), y = lerp(LOW - 6, HIGH - 6, k); setBoat(x, y, -33 * Math.sin(Math.PI * Math.min(1, k * 1.1))); rope.setAttribute('x2', x + 40); rope.setAttribute('y2', y + 2); winch.firstChild.setAttribute('transform', 'rotate(' + (k * 720) + ')'); } },
        { d: 1000, fn: k => { setBoat(lerp(340, 370, k), HIGH - 6, 0); rope.setAttribute('x2', lerp(380, 410, k)); rope.setAttribute('y2', HIGH - 4); } }
      ]);
    };
    ctl.querySelector('.wb').onclick = () => {
      sceneLock();
      out.innerHTML = '<b>閘門（こうもん）</b>　2つの門の間に閘室を設け、門を開閉して閘室の水位を上下させ、船を浮かせたまま高さの違う水路へ移す。中国では、984年、北宋の喬維岳が淮河の近くの運河に初めて設けたとされる。ヨーロッパで同じしくみが現れるのは14世紀のことである。';
      const gH = LOW + D - HIGH + 20;
      anim([
        { d: 1400, fn: k => setBoat(lerp(100, 320, k), LOW - 6, 0) },
        { d: 700, fn: k => g1.setAttribute('height', gH * k) },
        { d: 2400, fn: k => { const y = lerp(LOW, HIGH, k); wC.setAttribute('y', y); wC.setAttribute('height', LOW + D - y); setBoat(320, y - 6, 0); } },
        { d: 700, fn: k => g2.setAttribute('height', gH * (1 - k)) },
        { d: 1400, fn: k => setBoat(lerp(320, 540, k), HIGH - 6, 0) }
      ]);
    };
    sceneLock();
  };

  /* ================= rings: concentric order diagram ================= */
  W.rings = function (host, p) {
    const rs = p.rings || [], n = rs.length;
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev" aria-label="前へ">◀</button><button type="button" class="wnext">' + (p.stepLabel || '外側へ') + ' ▶</button><span class="wstep"></span><button type="button" class="wall">全体を表示</button>');
    const VW = 640, VH = p.h || 360, CX = p.cx || 200, CY = VH / 2, R0 = p.r0 || 46, DR = p.dr || 30;
    const svg = svgBox(host, VW, VH);
    const out = H('div', 'wout', host, p.hint || '');
    S('rect', { x: 0, y: 0, width: VW, height: VH }, svg, 'fill:var(--card)');
    const col = (c) => c ? CM.sideColor(c) : 'var(--ink-3)';
    const circ = [], labs = [];
    for (let i = n - 1; i >= 0; i--) {
      const r = R0 + DR * i;
      circ[i] = S('circle', { cx: CX, cy: CY, r }, svg, 'fill:' + col(rs[i].c) + ';fill-opacity:.16;stroke:' + col(rs[i].c) + ';stroke-width:1.5;cursor:pointer;transition:fill-opacity .3s');
    }
    for (let i = 0; i < n; i++) {
      const r = R0 + DR * i, ly = i === 0 ? CY : CY - r + DR / 2;
      const t = txt(svg, rs[i].t, CX, i === 0 ? CY : ly + 2, i === 0 ? 14 : 12, 'font-weight:700;pointer-events:none;fill:' + col(rs[i].c));
      labs.push(t);
      const ex = rs[i].ex || '';
      const yy = 34 + i * ((VH - 50) / Math.max(1, n - 1));
      const lx = CX + R0 + DR * (n - 1) + 24;
      const line = S('path', { d: 'M' + (CX + (i === 0 ? R0 * 0.7 : r - DR / 2)) + ',' + (CY + (i === 0 ? 0 : 0)) + ' L' + (lx - 6) + ',' + yy }, svg, 'stroke:' + col(rs[i].c) + ';stroke-width:1;stroke-dasharray:3 3;fill:none;opacity:.7');
      const g = S('g', {}, svg, 'cursor:pointer');
      txt(g, rs[i].t, lx, yy - 7, 13, 'font-weight:700;fill:' + col(rs[i].c), 'start');
      txt(g, ex, lx, yy + 10, 11, 'fill:var(--ink-2)', 'start');
      g.onclick = circ[i].onclick = () => show(i);
      rs[i]._g = g; rs[i]._l = line;
    }
    let cur = -1;
    const stepEl = ctl.querySelector('.wstep');
    function show(i) {
      cur = i;
      rs.forEach((q, k) => { circ[k].style.fillOpacity = (i < 0 || k === i) ? (k === i ? .42 : .16) : .05; q._g.style.opacity = (i < 0 || k === i) ? 1 : .35; q._l.style.opacity = (i < 0 || k === i) ? .8 : .2; });
      out.innerHTML = i < 0 ? (p.hint || '') : '<b>' + rs[i].t + '</b>　' + (rs[i].html || '');
      stepEl.textContent = i < 0 ? '' : (i + 1) + ' / ' + n;
    }
    ctl.querySelector('.wnext').onclick = () => show(Math.min(n - 1, cur + 1));
    ctl.querySelector('.wprev').onclick = () => show(Math.max(0, cur - 1));
    ctl.querySelector('.wall').onclick = () => show(-1);
    show(-1);
  };

  /* ================= bars: simple animated bar chart ================= */
  W.bars = function (host, p) {
    const bs = p.bars || [], n = bs.length, VW = 640, VH = p.h || 300;
    const svg = svgBox(host, VW, VH);
    const out = H('div', 'wout', host, p.hint || '棒をクリック（タップ）すると説明が表示される。');
    S('rect', { x: 0, y: 0, width: VW, height: VH }, svg, 'fill:var(--card)');
    const L = 70, R = 20, T = 30, B = 46, PW = VW - L - R, PH = VH - T - B;
    const max = p.max || Math.max(...bs.map(b => b.v)) * 1.1;
    const fmt = p.fmt || ((v) => v.toLocaleString());
    const ticks = p.ticks || 5;
    for (let k = 0; k <= ticks; k++) {
      const v = max * k / ticks, y = T + PH - PH * k / ticks;
      S('line', { x1: L, y1: y, x2: VW - R, y2: y }, svg, 'stroke:var(--rule);stroke-width:1');
      txt(svg, (p.tickFmt ? p.tickFmt(v) : Math.round(v / (p.tickDiv || 1)).toLocaleString()) , L - 8, y, 11, 'fill:var(--ink-3)', 'end');
    }
    if (p.unit) txt(svg, p.unit, L - 8, T - 16, 11, 'fill:var(--ink-3)', 'end');
    const col = (c) => c ? CM.sideColor(c) : 'var(--accent)';
    const bw = Math.min(54, PW / n * 0.62);
    const rects = [];
    bs.forEach((b, i) => {
      const cx = L + PW * (i + 0.5) / n, h = PH * b.v / max;
      const r = S('rect', { x: cx - bw / 2, y: T + PH, width: bw, height: 0, rx: 2 }, svg, 'fill:' + col(b.c) + ';cursor:pointer;transition:y .9s ease,height .9s ease,opacity .3s');
      rects.push(r);
      setTimeout(() => { r.setAttribute('y', T + PH - h); r.setAttribute('height', h); }, 80 + i * 90);
      txt(svg, b.l, cx, T + PH + 16, 11, 'fill:var(--ink-2);font-weight:700');
      if (b.s) txt(svg, b.s, cx, T + PH + 31, 10, 'fill:var(--ink-3)');
      const vt = txt(svg, (b.vl || fmt(b.v)), cx, T + PH - h - 9, 10.5, 'fill:var(--ink);font-weight:700;opacity:0;transition:opacity .4s');
      setTimeout(() => vt.style.opacity = 1, 900 + i * 90);
      r.onclick = () => { rects.forEach((q, k) => q.style.opacity = k === i ? 1 : .45); out.innerHTML = '<b>' + b.l + (b.s ? '（' + b.s + '）' : '') + '</b>　' + (b.note || ''); };
    });
  };

  /* ================= cityplan: schematic city plan with overlays ================= */
  W.cityplan = function (host, p) {
    const ov = p.overlays || [];
    const ctl = H('div', 'wctl', host, ov.map((o, i) => '<button type="button" data-o="' + i + '">' + o.btn + '</button>').join('') + (ov.length ? '<button type="button" data-o="-1">重ねない</button>' : ''));
    const VW = 640, VH = p.vh || 520, M = 30, TOP = p.top || 30;
    const svg = svgBox(host, VW, VH);
    const out = H('div', 'wout', host, p.hint || '');
    S('rect', { x: 0, y: 0, width: VW, height: VH }, svg, 'fill:var(--card)');
    const W0 = VW - 2 * M, H0 = W0 * p.h / p.w;
    const X = (fx) => M + W0 * fx / 100, Y = (fy) => TOP + H0 * fy / 100;
    const col = (c) => c ? CM.sideColor(c) : 'var(--ink-3)';
    S('rect', { x: X(0), y: Y(0), width: W0, height: H0 }, svg, 'fill:var(--paper);stroke:var(--ink-2);stroke-width:2.5');
    const g = p.grid;
    if (g) {
      for (let i = 1; i < g.cols; i++) { const x = X(100 * i / g.cols); S('line', { x1: x, y1: Y(g.y0 || 0), x2: x, y2: Y(100) }, svg, 'stroke:var(--rule);stroke-width:1'); }
      for (let j = 1; j < g.rows; j++) { const y = Y((g.y0 || 0) + (100 - (g.y0 || 0)) * j / g.rows); S('line', { x1: X(0), y1: y, x2: X(100), y2: y }, svg, 'stroke:var(--rule);stroke-width:1'); }
    }
    const items = [];
    const show = (f, el) => { items.forEach(q => q.style.opacity = q === el ? 1 : .55); out.innerHTML = '<b>' + f.t + '</b>　' + (f.note || ''); };
    (p.features || []).forEach(f => {
      const gg = S('g', {}, svg, 'cursor:pointer');
      if (f.kind === 'line') {
        S('line', { x1: X(f.x0), y1: Y(f.y0), x2: X(f.x1), y2: Y(f.y1) }, gg, 'stroke:' + col(f.c) + ';stroke-width:' + (f.sw || 5) + ';opacity:.85');
      } else if (f.kind === 'pt') {
        S('circle', { cx: X(f.x0), cy: Y(f.y0), r: 6 }, gg, 'fill:' + col(f.c) + ';stroke:var(--paper);stroke-width:2');
      } else {
        S('rect', { x: X(f.x0), y: Y(f.y0), width: X(f.x1) - X(f.x0), height: Y(f.y1) - Y(f.y0), rx: 3 }, gg, 'fill:' + col(f.c) + ';fill-opacity:.28;stroke:' + col(f.c) + ';stroke-width:1.5');
      }
      const lx = f.lp ? X(f.lp[0]) : (f.kind === 'pt' ? X(f.x0) + 9 : (X(f.x0) + X(f.x1)) / 2), ly = f.lp ? Y(f.lp[1]) : (f.kind === 'pt' ? Y(f.y0) : (Y(f.y0) + Y(f.y1)) / 2);
      txt(gg, f.t, lx, ly, f.fs || 11.5, 'font-weight:700;paint-order:stroke;stroke:var(--paper);stroke-width:3;fill:' + col(f.c), f.kind === 'pt' && !f.lp ? 'start' : 'middle');
      gg.onclick = () => show(f, gg); items.push(gg);
    });
    if (p.scale) { const len = W0 * p.scale.m / p.w, y = Y(100) + 18; S('path', { d: 'M' + X(0) + ',' + (y - 4) + ' V' + y + ' H' + (X(0) + len) + ' V' + (y - 4) }, svg, 'fill:none;stroke:var(--ink-2);stroke-width:1.5'); txt(svg, p.scale.t, X(0) + len + 8, y - 2, 11, 'fill:var(--ink-2)', 'start'); }
    const og = S('g', {}, svg, 'pointer-events:none');
    ctl.querySelectorAll('button').forEach(b => b.onclick = () => {
      const i = +b.dataset.o; og.innerHTML = '';
      ctl.querySelectorAll('button').forEach(q => q.classList.toggle('on', q === b));
      if (i < 0) { out.innerHTML = p.hint || ''; return; }
      const o = ov[i];
      (o.rects || []).forEach(r => S('rect', { x: X(r[0]), y: Y(r[1]), width: X(r[2]) - X(r[0]), height: Y(r[3]) - Y(r[1]) }, og, 'fill:' + col(o.c) + ';fill-opacity:.18;stroke:' + col(o.c) + ';stroke-width:2.5;stroke-dasharray:8 5'));
      txt(og, o.t, X(o.lp[0]), Y(o.lp[1]), 13, 'font-weight:700;paint-order:stroke;stroke:var(--paper);stroke-width:3.5;fill:' + col(o.c));
      out.innerHTML = '<b>' + o.t + '</b>　' + (o.note || '');
    });
  };

  /* ================= eclipse: Aryabhata's shadow explanation of eclipses ================= */
  W.eclipse = function (host, p) {
    p = p || {};
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">❚❚ 停止</button> <button type="button" class="wsol">日食の位置へ</button> <button type="button" class="wlun">月食の位置へ</button> <label style="font-size:13px;margin-left:8px"><input type="checkbox" class="wmyth"> 神話の説明を表示</label>');
    const svg = svgBox(host, 640, 280);
    const out = H('div', 'wout', host, '');
    const SX = 70, SY = 140, EX = 360, EY = 140, R = 120, SQ = 0.38;
    // sun rays region
    S('circle', { cx: SX, cy: SY, r: 46 }, svg, 'fill:#f2b632;stroke:#e08a1e;stroke-width:2');
    txt(svg, '太陽', SX, SY + 64, 13, 'font-weight:700');
    S('ellipse', { cx: EX, cy: EY, rx: R, ry: R * SQ }, svg, 'fill:none;stroke:var(--rule);stroke-dasharray:4 4');
    // earth umbra (always to the right of earth)
    S('path', { d: `M${EX},${EY - 17} L${EX + 230},${EY - 4} L${EX + 230},${EY + 4} L${EX},${EY + 17} Z` }, svg, 'fill:var(--ink);opacity:.13');
    txt(svg, '地球の影', EX + 205, EY + 26, 11, 'fill:var(--ink-3)');
    const moonSh = S('path', {}, svg, 'fill:var(--ink);opacity:0');
    const earth = S('circle', { cx: EX, cy: EY, r: 17 }, svg, 'fill:#3a78b5;stroke:#245a8a;stroke-width:2');
    const spot = S('circle', { cx: EX - 15, cy: EY, r: 4 }, svg, 'fill:#111;opacity:0');
    txt(svg, '地球', EX, EY + 32, 13, 'font-weight:700');
    const moon = S('circle', { r: 8 }, svg, 'fill:#cfcab8;stroke:#8d8775;stroke-width:1.5');
    const mlab = txt(svg, '月', 0, 0, 12, 'font-weight:700');
    const rahu = txt(svg, '', 320, 30, 13, 'fill:var(--accent);font-weight:700');
    const status = txt(svg, '', 320, 262, 14, 'font-weight:700');
    let th = 2.2, run = true, target = null;
    const norm = (a) => { a %= 2 * Math.PI; return a < 0 ? a + 2 * Math.PI : a; };
    const draw = () => {
      const mx = EX + R * Math.cos(th), my = EY - R * SQ * Math.sin(th);
      moon.setAttribute('cx', mx); moon.setAttribute('cy', my);
      mlab.setAttribute('x', mx); mlab.setAttribute('y', my - 16);
      const a = norm(th), myth = ctl.querySelector('.wmyth').checked;
      const sol = Math.abs(a - Math.PI) < 0.11, lun = a < 0.11 || a > 2 * Math.PI - 0.11;
      moonSh.setAttribute('d', `M${mx},${my - 8} L${EX - 15},${EY - 3} L${EX - 15},${EY + 3} L${mx},${my + 8} Z`);
      moonSh.style.opacity = sol ? .35 : 0; spot.style.opacity = sol ? .85 : 0;
      moon.style.fill = lun ? '#a5492f' : '#cfcab8';
      status.textContent = sol ? '日食：月が太陽を覆い、月の影が地球に落ちる' : lun ? '月食：地球の大きな影が月を覆う（月は赤黒く見える）' : '';
      rahu.textContent = myth && (sol || lun) ? '神話：魔神ラーフ（の首）が' + (sol ? '太陽' : '月') + 'を飲み込む' : '';
    };
    ctl.querySelector('.wplay').addEventListener('click', (e) => { run = !run; target = null; e.target.textContent = run ? '❚❚ 停止' : '▶ 動かす'; });
    ctl.querySelector('.wsol').addEventListener('click', () => { target = Math.PI; run = true; ctl.querySelector('.wplay').textContent = '❚❚ 停止'; });
    ctl.querySelector('.wlun').addEventListener('click', () => { target = 0; run = true; ctl.querySelector('.wplay').textContent = '❚❚ 停止'; });
    ctl.querySelector('.wmyth').addEventListener('change', draw);
    out.innerHTML = p.note || '';
    animate(host, (dt) => {
      if (!run) return;
      const step = dt * 0.55;
      if (target != null && norm(target - th) <= step + 1e-6) { th = target; run = false; target = null; ctl.querySelector('.wplay').textContent = '▶ 動かす'; }
      else th = norm(th + step);
      draw();
    });
    draw();
  };

  /* ================= rope: Egyptian rope-stretchers, 12-knot rope forms a triangle ================= */
  W.rope = function (host, p) {
    const shapes = p.shapes || [[3, 4, 5], [4, 4, 4], [2, 5, 5]];
    const ctl = H('div', 'wctl', host, '<span class="wlab">縄の張り方</span>' + shapes.map((sh, i) => '<button type="button" data-i="' + i + '"' + (i ? '' : ' class="on"') + '>' + sh.join('・') + '</button>').join('') + ' <button type="button" class="wreset">縄をゆるめる</button>');
    const W0 = 640, H0 = 300, svg = svgBox(host, W0, H0);
    const out = H('div', 'wout', host);
    const U = 40, N = 12, cx = 320, cy = 160;
    const ground = S('path', { d: 'M20,270 H620' }, svg, 'stroke:var(--rule);stroke-width:2');
    const poly = S('path', {}, svg, 'fill:var(--gold);fill-opacity:.12;stroke:var(--gold);stroke-width:3;stroke-linejoin:round');
    const ang = S('path', {}, svg, 'fill:none;stroke:var(--accent);stroke-width:2');
    const angT = txt(svg, '', 0, 0, 13, 'fill:var(--accent);font-weight:700');
    const knots = []; for (let i = 0; i < N; i++) knots.push(S('circle', { r: 5.5 }, svg, 'fill:var(--ink);stroke:var(--paper);stroke-width:1.5'));
    const men = []; for (let i = 0; i < 3; i++) { const g = S('g', {}, svg); S('circle', { r: 7, cy: -24 }, g, 'fill:var(--ink-2)'); S('path', { d: 'M0,-17 V2 M-8,-10 H8 M0,2 L-6,16 M0,2 L6,16' }, g, 'stroke:var(--ink-2);stroke-width:2.5;fill:none;stroke-linecap:round'); men.push(g); }
    const labs = [0, 1, 2].map(() => txt(svg, '', 0, 0, 12, 'fill:var(--ink-2);font-weight:700'));
    const circ = []; for (let i = 0; i < N; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / N; circ.push([cx + 85 * Math.cos(a), cy + 10 + 85 * Math.sin(a)]); }
    function tri(sh) {
      const [a, b, c] = sh.map(v => v * U); // a: base, b: vertical-ish side, c: hypotenuse-ish
      const cosC = (a * a + b * b - c * c) / (2 * a * b), C = Math.acos(Math.max(-1, Math.min(1, cosC)));
      const P0 = [cx - a / 2, 250], P1 = [cx + a / 2, 250], P2 = [P0[0] + b * Math.cos(-C) * 1, 250 + b * Math.sin(-C)];
      // vertex order around the loop: P0 -> P1 (a) -> P2 (c) -> P0 (b)
      const V = [P0, P1, P2], L = [a, c, b], pts = [];
      let seg = 0, acc = 0;
      for (let i = 0; i < N; i++) {
        const d = i * U; while (d > acc + L[seg] + 1e-6) { acc += L[seg]; seg++; }
        const A = V[seg], B = V[(seg + 1) % 3], t = (d - acc) / L[seg];
        pts.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]);
      }
      return { pts, V, deg: C * 180 / Math.PI };
    }
    let from = circ, to = circ, t = 1, cur = null, sel = 0;
    function draw() {
      const e = t < 1 ? 0.5 - 0.5 * Math.cos(Math.PI * t) : 1;
      const P = from.map((q, i) => [q[0] + (to[i][0] - q[0]) * e, q[1] + (to[i][1] - q[1]) * e]);
      P.forEach((q, i) => { knots[i].setAttribute('cx', q[0]); knots[i].setAttribute('cy', q[1]); });
      poly.setAttribute('d', 'M' + P.map(q => q.join(',')).join('L') + 'Z');
      const show = cur && t >= 1;
      [ang, angT].forEach(el => el.style.opacity = show ? 1 : 0);
      men.forEach((m, i) => { const v = cur ? cur.V[i] : circ[i * 4]; const q = [from[i * 4][0] + (v[0] - from[i * 4][0]) * e, from[i * 4][1] + (v[1] - from[i * 4][1]) * e]; m.setAttribute('transform', 'translate(' + q[0] + ',' + (q[1] + (i === 2 ? -10 : 0)) + ')'); m.style.opacity = cur ? 1 : 0.35; });
      if (show) {
        const [P0, P1, P2] = cur.V, r = 22;
        const u1 = [(P1[0] - P0[0]), (P1[1] - P0[1])], u2 = [(P2[0] - P0[0]), (P2[1] - P0[1])];
        const n1 = Math.hypot(...u1), n2 = Math.hypot(...u2);
        const a1 = [P0[0] + u1[0] / n1 * r, P0[1] + u1[1] / n1 * r], a2 = [P0[0] + u2[0] / n2 * r, P0[1] + u2[1] / n2 * r];
        const right = Math.abs(cur.deg - 90) < 0.5;
        ang.setAttribute('d', right ? `M${a1[0]},${a1[1]} L${a1[0] + a2[0] - P0[0]},${a1[1] + a2[1] - P0[1]} L${a2[0]},${a2[1]}` : `M${a1[0]},${a1[1]} A${r},${r} 0 0 0 ${a2[0]},${a2[1]}`);
        angT.setAttribute('x', P0[0] - 34); angT.setAttribute('y', P0[1] - 26); angT.textContent = Math.round(cur.deg) + '°';
        const sh = shapes[sel];
        labs[0].setAttribute('x', (P0[0] + P1[0]) / 2); labs[0].setAttribute('y', P0[1] + 16); labs[0].textContent = sh[0] + '区間';
        labs[1].setAttribute('x', (P1[0] + P2[0]) / 2 + 26); labs[1].setAttribute('y', (P1[1] + P2[1]) / 2); labs[1].textContent = sh[2] + '区間';
        labs[2].setAttribute('x', (P0[0] + P2[0]) / 2 - 30); labs[2].setAttribute('y', (P0[1] + P2[1]) / 2); labs[2].textContent = sh[1] + '区間';
        out.innerHTML = right ? '<b>直角ができた。</b> 3・4・5の長さで張ると、3と4の辺のあいだが必ず直角になる（3²＋4²＝5²）。等間隔に結び目をつけた縄さえあれば、畑の境界や建物の基礎に正確な直角を引くことができる。ただし、古代エジプトの測量人がこの方法を使ったという直接の証拠はなく、後世の推測である（諸説あり）。' : '<b>' + Math.round(cur.deg) + '°――直角にならない。</b> 結び目の数（辺の長さの組合せ）を変えると、角の大きさが変わる。直角が得られるのは3・4・5のような特別な組合せだけである。';
      } else { labs.forEach(l => l.textContent = ''); out.innerHTML = '12区間に等しく結び目をつけた縄。3人で結び目を持って張ると……（上のボタンを押す）'; }
    }
    ctl.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
      ctl.querySelectorAll('button[data-i]').forEach(x => x.classList.toggle('on', x === b));
      sel = +b.dataset.i; const tt = tri(shapes[sel]);
      from = cur ? cur.pts : circ; cur = tt; to = tt.pts; t = 0;
    }));
    ctl.querySelector('.wreset').addEventListener('click', () => { from = cur ? cur.pts : circ; to = circ; cur = null; t = 0; });
    animate(host, (dt) => { if (t < 1) { t = Math.min(1, t + dt / 1.4); draw(); } });
    draw();
  };

  /* ================= finger60: counting to 60 with two hands (sexagesimal) ================= */
  W.finger60 = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ 数える</button><label>数 <input type="number" class="wnum" min="0" max="60" value="' + (p.n || 0) + '"></label><input type="range" class="wrange" min="0" max="60" value="' + (p.n || 0) + '" aria-label="数を選ぶ">');
    const svg = svgBox(host, 640, 250);
    const out = H('div', 'wout', host);
    // left hand: 4 fingers x 3 phalanges, counted with the thumb; right hand: 5 fingers record dozens
    const segs = [], fing = [];
    txt(svg, '片手（親指で指の節を数える）', 160, 20, 12.5, 'font-weight:700;fill:var(--ink-2)');
    txt(svg, 'もう片方の手（12ごとに指を1本折る）', 470, 20, 12.5, 'font-weight:700;fill:var(--ink-2)');
    S('path', { d: 'M70,215 Q70,150 90,140 L230,140 Q252,150 252,215 Z' }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
    S('path', { d: 'M70,180 Q40,170 38,140 Q40,125 52,128 Q60,150 78,160' }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
    for (let f = 0; f < 4; f++) {
      const x = 100 + f * 38;
      for (let k = 0; k < 3; k++) {
        const y = 126 - k * 29;
        const r = S('rect', { x: x - 15, y: y - 13, width: 30, height: 27, rx: 8 }, svg, 'fill:var(--card);stroke:var(--ink-3);stroke-width:1.3');
        const tt = txt(svg, '', x, y + 1, 11, 'fill:var(--ink-3)');
        segs.push({ r, tt });
      }
    }
    S('path', { d: 'M360,215 Q360,150 385,140 L560,140 Q580,150 580,215 Z' }, svg, 'fill:var(--paper-2);stroke:var(--ink-3);stroke-width:1.5');
    for (let f = 0; f < 5; f++) {
      const x = 400 + f * 34, hgt = f === 0 ? 55 : 90;
      const r = S('rect', { x: x - 13, y: 140 - hgt, width: 26, height: hgt, rx: 12 }, svg, 'fill:var(--card);stroke:var(--ink-3);stroke-width:1.3');
      const tt = txt(svg, (f + 1) * 12, x, 140 - hgt - 10, 11, 'fill:var(--ink-3)');
      fing.push({ r, tt, x, hgt });
    }
    const big = txt(svg, '', 320, 238, 16, 'font-weight:700;fill:var(--accent)');
    const num = ctl.querySelector('.wnum'), rng = ctl.querySelector('.wrange');
    let n = +num.value, run = false, acc = 0;
    function draw() {
      const dz = Math.floor(n / 12), rem = n % 12;
      segs.forEach((s, i) => {
        // order: finger 1 bottom..top, finger 2 bottom..top ... (thumb touches each phalanx in turn)
        const on = i < rem || (n > 0 && rem === 0 && false);
        s.r.style.fill = on ? 'var(--gold)' : 'var(--card)'; s.tt.textContent = i + 1; s.tt.style.fill = on ? 'var(--paper)' : 'var(--ink-3)';
      });
      fing.forEach((f, i) => { const folded = i < dz; f.r.setAttribute('height', folded ? 26 : f.hgt); f.r.setAttribute('y', folded ? 114 : 140 - f.hgt); f.r.style.fill = folded ? 'var(--accent)' : 'var(--card)'; f.tt.style.opacity = folded ? 1 : 0.5; f.tt.setAttribute('y', folded ? 104 : 140 - f.hgt - 10); });
      big.textContent = n + ' ＝ 12 × ' + dz + ' ＋ ' + rem;
      out.innerHTML = n === 60 ? '<b>両手で60。</b> 片手の4本の指の節（3×4＝12）を親指で数え、12になるたびにもう片方の手の指を1本折る。5本すべて折ると12×5＝60になる。60は2・3・4・5・6・10・12・15・20・30で割り切れるため、時間や角度、重さの単位を分けるのに便利だった。' : '片手の節で12まで数え、12ごとにもう片方の指を折る。これは60進法の起源についての<b>仮説の一つ</b>である（起源には諸説ある）。';
    }
    const set = (v) => { n = Math.max(0, Math.min(60, v | 0)); num.value = n; rng.value = n; draw(); };
    num.addEventListener('input', () => set(+num.value)); rng.addEventListener('input', () => set(+rng.value));
    ctl.querySelector('.wplay').addEventListener('click', (e) => { if (n >= 60) set(0); run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 数える'; });
    animate(host, (dt) => { if (!run) return; acc += dt; if (acc > 0.18) { acc = 0; set(n + 1); if (n >= 60) { run = false; ctl.querySelector('.wplay').textContent = '▶ もう一度'; } } });
    draw();
  };
  /* ================= numerals: sexagesimal cuneiform vs Egyptian decimal ================= */
  W.numerals = function (host, p) {
    const ctl = H('div', 'wctl', host);
    ctl.innerHTML = '<label>数 <input type="number" min="1" max="99999" value="' + (p.n || 75) + '" class="wnum"></label>' +
      '<input type="range" min="1" max="4000" value="' + (p.n || 75) + '" class="wrange" aria-label="数を選ぶ">' +
      '<span class="wpre">' + [60, 75, 360, 1000, 3600, 2026].map(n => '<button type="button" data-n="' + n + '">' + n + '</button>').join('') + '</span>';
    const grid = H('div', 'wgrid2', host);
    const boxM = H('div', 'wpanel', grid, '<h5>メソポタミア（60進法・楔形文字）</h5>');
    const boxE = H('div', 'wpanel', grid, '<h5>エジプト（10進法・ヒエログリフ）</h5>');
    const svgM = svgBox(boxM, 420, 130), svgE = svgBox(boxE, 420, 130);
    const outM = H('div', 'wout', boxM), outE = H('div', 'wout', boxE);
    const inp = ctl.querySelector('.wnum'), rng = ctl.querySelector('.wrange');
    const ink = 'fill:var(--ink);stroke:var(--ink)';
    const nail = (g, x, y, s) => { S('path', { d: `M${x - 5 * s},${y} L${x + 5 * s},${y} L${x},${y + 7 * s} Z` }, g, ink); S('path', { d: `M${x},${y + 6 * s} L${x},${y + 24 * s}` }, g, 'stroke:var(--ink);stroke-width:' + (1.8 * s)); };
    const corner = (g, x, y, s) => { S('path', { d: `M${x},${y} L${x + 7 * s},${y - 4 * s} L${x + 5 * s},${y} L${x + 7 * s},${y + 4 * s} Z` }, g, ink); S('path', { d: `M${x + 6 * s},${y - 4 * s} L${x + 15 * s},${y - 11 * s} M${x + 6 * s},${y + 4 * s} L${x + 15 * s},${y + 11 * s}` }, g, 'stroke:var(--ink);stroke-width:' + (1.6 * s) + ';fill:none'); };
    const drawDigitM = (g, d, x0, y0) => { // returns width
      const tens = Math.floor(d / 10), ones = d % 10;
      let x = x0;
      for (let i = 0; i < tens; i++) { const col = Math.floor(i / 3), row = i % 3; corner(g, x + col * 15, y0 + 8 + row * 18, 1); }
      x += tens ? (Math.ceil(tens / 3) * 15 + 8) : 0;
      const rows = ones <= 3 ? [ones] : ones <= 6 ? [Math.ceil(ones / 2), Math.floor(ones / 2)] : [3, 3, ones - 6];
      const sc = ones > 6 ? 0.62 : ones > 3 ? 0.8 : 1;
      rows.forEach((n, r) => { for (let i = 0; i < n; i++) nail(g, x + 6 + i * 12 * sc, y0 + r * 26 * sc - (rows.length - 1) * 6, sc); });
      const ow = ones ? Math.max(...rows) * 12 * sc + 4 : 0;
      return Math.max(14, x - x0 + ow);
    };
    const egy = {
      1: (g, x, y) => S('path', { d: `M${x},${y - 14} L${x},${y + 14}` }, g, 'stroke:var(--ink);stroke-width:2.4;stroke-linecap:round'),
      10: (g, x, y) => S('path', { d: `M${x - 8},${y + 14} L${x - 8},${y - 2} Q${x - 8},${y - 14} ${x},${y - 14} Q${x + 8},${y - 14} ${x + 8},${y - 2} L${x + 8},${y + 14}` }, g, 'stroke:var(--ink);stroke-width:2.2;fill:none'),
      100: (g, x, y) => S('path', { d: `M${x},${y + 14} L${x},${y - 2} M${x},${y - 2} m-1,0 a3,3 0 1,1 3,3 a6,6 0 1,1 -6,-6 a9,9 0 1,1 9,9` }, g, 'stroke:var(--ink);stroke-width:1.8;fill:none'),
      1000: (g, x, y) => { S('path', { d: `M${x - 9},${y + 14} L${x + 9},${y + 14} M${x},${y + 14} L${x},${y - 4}` }, g, 'stroke:var(--ink);stroke-width:2;fill:none'); S('path', { d: `M${x},${y - 4} Q${x - 9},${y - 8} ${x - 6},${y - 16} Q${x},${y - 10} ${x},${y - 16} Q${x},${y - 10} ${x + 6},${y - 16} Q${x + 9},${y - 8} ${x},${y - 4} Z` }, g, 'fill:var(--olive);stroke:var(--ink);stroke-width:1'); },
      10000: (g, x, y) => S('path', { d: `M${x - 3},${y + 14} L${x - 3},${y - 10} Q${x - 3},${y - 15} ${x + 1},${y - 15} Q${x + 4},${y - 15} ${x + 4},${y - 10} L${x + 4},${y - 4} Q${x + 10},${y - 6} ${x + 8},${y + 2}` }, g, 'stroke:var(--ink);stroke-width:2;fill:none')
    };
    const EGN = { 1: '縦棒', 10: '足かせ（牛をつなぐ道具）', 100: '縄の輪', 1000: 'ハスの花', 10000: '指' };
    function draw(n) {
      n = Math.max(1, Math.min(99999, Math.round(n) || 1));
      svgM.innerHTML = ''; svgE.innerHTML = '';
      // sexagesimal digits
      const dig = []; let m = n; while (m > 0) { dig.unshift(m % 60); m = Math.floor(m / 60); }
      const names = ['×1', '×60', '×3600', '×216000'];
      let x = 12; const parts = [];
      dig.forEach((d, i) => {
        const g = S('g', {}, svgM), pos = dig.length - 1 - i;
        const w = d ? drawDigitM(g, d, x, 32) : 22;
        if (!d) txt(svgM, '（空白）', x + 11, 52, 10, 'fill:var(--ink-3)');
        S('rect', { x: x - 4, y: 14, width: w + 8, height: 76, rx: 4 }, svgM, 'fill:none;stroke:var(--rule);stroke-dasharray:3 3');
        txt(svgM, names[pos] || '', x + w / 2, 104, 11, 'fill:var(--ink-3)');
        txt(svgM, String(d), x + w / 2, 120, 12, 'fill:var(--accent);font-weight:700');
        parts.push(d + (pos ? '×' + (pos === 1 ? '60' : pos === 2 ? '3600' : '216000') : ''));
        x += w + 18;
      });
      outM.innerHTML = esc(n) + ' ＝ ' + parts.join(' ＋ ') + '<br><small>位取り記数法だが、0を表す記号はなかった（のちに区切り記号が生まれる）。1と60が同じ形になるので、文脈で読み分けた。</small>';
      // egyptian
      let r = n, xe = 14; const used = [];
      [10000, 1000, 100, 10, 1].forEach(u => {
        const c = Math.floor(r / u); r %= u; if (!c) return;
        used.push(c + '×' + u);
        const per = c > 4 ? Math.ceil(c / 2) : c;
        for (let i = 0; i < c; i++) { const col = i % per, row = Math.floor(i / per); egy[u](svgE, xe + col * (u === 1 ? 9 : 20), c > 4 ? 40 + row * 34 : 56); }
        xe += per * (u === 1 ? 9 : 20) + 14;
      });
      svgE.setAttribute('viewBox', '0 0 ' + Math.max(240, xe + 6) + ' 130');
      svgM.setAttribute('viewBox', '0 0 ' + Math.max(240, x) + ' 130');
      outE.innerHTML = esc(n) + ' ＝ ' + used.join(' ＋ ') + '<br><small>記号を必要な数だけ並べる方式（位取りではない）。' + Object.keys(EGN).map(k => k + '＝' + EGN[k]).join('、') + '。実際は右から左に書くことが多い。</small>';
      inp.value = n; if (n <= 4000) rng.value = n;
    }
    inp.addEventListener('input', () => draw(+inp.value));
    rng.addEventListener('input', () => draw(+rng.value));
    ctl.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => draw(+b.dataset.n)));
    draw(p.n || 75);
  };

  /* ================= nile: the Nile year, Sirius, flood height and tax ================= */
  W.nile = function (host) {
    const ctl = H('div', 'wctl', host);
    ctl.innerHTML = '<button type="button" class="wplay">▶ 1年を再生</button>' +
      '<label>月 <input type="range" min="0" max="11.99" step="0.01" value="0" class="wm"></label>' +
      '<label>その年の増水の高さ <input type="range" min="11" max="18" step="1" value="15" class="wh"> <b class="whv">15</b>キュビト</label>';
    const svg = svgBox(host, 640, 300);
    const out = H('div', 'wout', host);
    const MON = ['7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月', '4月', '5月', '6月'];
    const season = (m) => m < 4 ? ['アケト（増水季）', 'var(--verdigris)'] : m < 8 ? ['ペレト（播種・生育季）', 'var(--olive)'] : ['シェムウ（収穫・渇水季）', 'var(--gold)'];
    // static scene
    const sky = S('rect', { x: 0, y: 0, width: 640, height: 150 }, svg, 'fill:var(--paper-2)');
    const sirius = S('g', {}, svg); S('path', { d: 'M0,-9 L2,-2 L9,0 L2,2 L0,9 L-2,2 L-9,0 L-2,-2 Z' }, sirius, 'fill:var(--accent)');
    const sLab = txt(sirius, 'ソプデト（シリウス）が夜明け前に昇る', 0, -18, 12, 'fill:var(--accent);font-weight:700');
    // terrain cross-section (west desert / floodplain / river / floodplain / east desert)
    const ground = 'M0,150 L60,150 L90,205 L250,215 L292,222 L300,262 L340,262 L348,222 L390,215 L550,205 L580,150 L640,150 L640,300 L0,300 Z';
    const water = S('path', {}, svg, 'fill:var(--sea);stroke:var(--verdigris);stroke-width:1.5');
    S('path', { d: ground }, svg, 'fill:var(--map-land);stroke:var(--ink-3);stroke-width:1');
    const crops = S('g', {}, svg);
    for (let i = 0; i < 26; i++) { const xl = 100 + i * 7.3, xr = 360 + i * 7.3; [xl, xr].forEach(x => S('path', { d: `M${x},0 l0,-9 M${x},-5 l-3,-4 M${x},-5 l3,-4` }, crops)); }
    const mud = S('g', {}, svg);
    txt(svg, '西の砂漠（赤い土地）', 6, 140, 11, 'fill:var(--ink-3)', 'start');
    txt(svg, '東の砂漠', 500, 140, 11, 'fill:var(--ink-3)', 'end');
    txt(svg, 'ナイル川', 320, 285, 12, 'fill:var(--verdigris);font-weight:700');
    const mLab = txt(svg, '', 20, 22, 18, 'font-weight:700', 'start');
    const seaLab = txt(svg, '', 20, 46, 13, 'font-weight:700', 'start');
    const gauge = S('g', { transform: 'translate(605,160)' }, svg);
    S('rect', { x: -10, y: -10, width: 22, height: 120 }, gauge, 'fill:var(--card);stroke:var(--ink-3)');
    for (let c = 0; c <= 18; c += 2) { S('path', { d: `M-10,${100 - c * 5.5} h7` }, gauge, 'stroke:var(--ink-3)'); txt(gauge, String(c), -16, 100 - c * 5.5, 8, 'fill:var(--ink-3)', 'end'); }
    const gfill = S('rect', { x: -9, width: 20 }, gauge, 'fill:var(--verdigris);opacity:.6');
    txt(gauge, 'ナイロメーター', 1, 122, 10, 'fill:var(--ink-3)');
    let m = 0, playing = false;
    const hEl = ctl.querySelector('.wh'), mEl = ctl.querySelector('.wm'), hv = ctl.querySelector('.whv');
    // flood level curve: low in Jun, rises Jul, peaks Sep, recedes Oct-Nov
    const level = (mm, Hc) => { const f = mm < 2.5 ? mm / 2.5 : mm < 4.5 ? 1 - (mm - 2.5) / 2 * 0.85 : Math.max(0, 0.15 - (mm - 4.5) * 0.05); return Math.max(0, Math.min(1, f)) * Hc; };
    const yOf = (c) => 262 - c * 4.2; // cubits -> svg y at river
    function verdict(Hc) {
      if (Hc <= 12) return ['飢饉', 'var(--accent)', 0.2];
      if (Hc === 13) return ['飢え', 'var(--accent)', 0.45];
      if (Hc === 14) return ['喜び', 'var(--gold)', 0.75];
      if (Hc === 15) return ['安心', 'var(--olive)', 0.9];
      if (Hc === 16) return ['歓喜（豊作）', 'var(--olive)', 1];
      return ['大洪水の危険（堤防や村が流される）', 'var(--accent)', 0.7];
    }
    function render() {
      const Hc = +hEl.value; hv.textContent = Hc;
      const lv = level(m, Hc), y = yOf(lv);
      // water polygon clipped by ground: draw rect from y down; the ground drawn on top hides the rest
      water.setAttribute('d', `M0,${Math.min(y, 262)} L640,${Math.min(y, 262)} L640,300 L0,300 Z`);
      gfill.setAttribute('y', 100 - lv * 5.5); gfill.setAttribute('height', lv * 5.5);
      const mi = Math.floor(m), [sn, sc] = season(m);
      mLab.textContent = MON[mi]; seaLab.textContent = sn; seaLab.setAttribute('style', 'font-size:13px;font-weight:700;fill:' + sc);
      // sirius: visible near dawn in July only
      const sv = m < 0.9 ? 1 - m / 0.9 : 0;
      sirius.setAttribute('transform', 'translate(520,' + (90 - sv * 40) + ')'); sirius.setAttribute('opacity', sv);
      const [vt, vc, yieldF] = verdict(Hc);
      // flooded fraction of the plain at peak
      const reach = Math.max(0, Math.min(1, (Hc - 10) / 6));
      const after = m >= 4 && m < 12;
      // crops: placed on plain surface, grow during Peret, golden in Shemu, harvested in May-Jun
      crops.setAttribute('opacity', after && m < 10.5 ? 1 : 0);
      const grow = Math.max(0, Math.min(1, (m - 4.2) / 3.5));
      [...crops.children].forEach((c, i) => {
        const left = i % 2 === 0, k = Math.floor(i / 2), xs = left ? 100 + k * 7.3 : 360 + k * 7.3;
        const fromRiver = left ? (292 - xs) / 192 : (xs - 348) / 192;
        const ok = fromRiver <= reach * yieldF + 0.02;
        const ys = left ? 205 + (xs - 90) / 160 * 10 : 215 - (xs - 390) / 160 * 10;
        c.setAttribute('transform', `translate(0,${ys}) scale(1,${ok ? 0.3 + 0.7 * grow : 0.2})`);
        c.setAttribute('style', 'fill:none;stroke-width:1.6;stroke:' + (!ok ? 'var(--ink-3)' : m >= 8 ? 'var(--gold)' : 'var(--olive)'));
      });
      mud.innerHTML = '';
      if (m >= 3.5 && m < 4.6) S('path', { d: `M${292 - 192 * reach},214 L292,220 M${348 + 192 * reach},214 L348,220` }, mud, 'stroke:#4a3a2a;stroke-width:4;opacity:.7');
      const area = Math.round(100 * Math.min(1, reach * yieldF));
      const harvest = area, tax = Math.round(harvest / 5);
      out.innerHTML = '<b>増水 ' + Hc + 'キュビト</b>（1キュビト≒52cm）：大プリニウスの記録では「<b style="color:' + vc + '">' + vt + '</b>」。' +
        '水が行き渡る畑の割合（目安） <b>' + area + '%</b> → 収穫 <b>' + harvest + '</b> → 税 <b>' + tax + '</b>（例として収穫の5分の1で計算）' +
        '<br><small>役人はナイロメーターで水位を測って、その年の収穫と税額を見積もった。水が引くと（10〜11月）、境界の消えた畑を測り直して種をまいた。数値は理解のための模式で、実際の税率や面積の比率ではない。</small>';
      mEl.value = m;
    }
    ctl.querySelector('.wplay').addEventListener('click', (e) => { playing = !playing; e.target.textContent = playing ? '❚❚ 停止' : '▶ 1年を再生'; });
    mEl.addEventListener('input', () => { m = +mEl.value; playing = false; ctl.querySelector('.wplay').textContent = '▶ 1年を再生'; render(); });
    hEl.addEventListener('input', render);
    animate(host, (dt) => { if (!playing) return; m = (m + dt * 0.8) % 12; render(); });
    render();
  };

  /* ================= network: clickable relation diagram (e.g. Amarna great powers) ================= */
  W.network = function (host, p) {
    const w = p.w || 640, h = p.h || 380;
    const svg = svgBox(host, w, h);
    const info = H('div', 'wout winfo', host, p.hint || '国をクリック（タップ）すると説明が表示される。');
    const leg = H('div', 'wlegend', host);
    const ST = {
      peer: 'stroke:var(--verdigris);stroke-width:2.6', marry: 'stroke:var(--plum);stroke-width:2.6;stroke-dasharray:1 0',
      war: 'stroke:var(--accent);stroke-width:2.6;stroke-dasharray:7 5', vassal: 'stroke:var(--ink-3);stroke-width:2;stroke-dasharray:2 4', trade: 'stroke:var(--gold);stroke-width:2.4'
    };
    const LN = { peer: '対等の書簡（「兄弟」）', marry: '王女の結婚・同盟', war: '対立・戦争', vassal: '臣従（「わが主、わが太陽」）', trade: '交易（銅など）' };
    Object.assign(LN, p.legend || {});
    const used = new Set();
    const N = {}; (p.nodes || []).forEach(n => N[n.id] = n);
    const eg = S('g', {}, svg), ng = S('g', {}, svg);
    (p.edges || []).forEach(e => {
      const a = N[e[0]], b = N[e[1]]; if (!a || !b) return; used.add(e[2]);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, bend = e[3] || 0;
      const path = S('path', { d: `M${a.x},${a.y} Q${mx - dy * bend},${my + dx * bend} ${b.x},${b.y}` }, eg, 'fill:none;' + ST[e[2]]);
      path.dataset.a = e[0]; path.dataset.b = e[1];
      if (e[2] === 'marry') S('path', { d: `M${a.x},${a.y} Q${mx - dy * bend},${my + dx * bend} ${b.x},${b.y}` }, eg, 'fill:none;stroke:var(--card);stroke-width:0.9');
      if (e[4]) { const t = txt(eg, e[4], mx - dy * bend / 2, my + dx * bend / 2 - 8, 10.5, 'fill:var(--ink-2);paint-order:stroke;stroke:var(--card);stroke-width:3px'); t.dataset.a = e[0]; t.dataset.b = e[1]; }
    });
    leg.innerHTML = [...used].map(k => '<span><svg width="28" height="8"><path d="M0,4 H28" style="' + ST[k] + '"/></svg>' + LN[k] + '</span>').join('');
    const sel = (id) => {
      eg.querySelectorAll('[data-a]').forEach(el => { const on = !id || el.dataset.a === id || el.dataset.b === id; el.style.opacity = on ? 1 : 0.15; });
      ng.querySelectorAll('g[data-id]').forEach(g => g.querySelector('rect').style.strokeWidth = g.dataset.id === id ? '3' : '1.2');
      const n = N[id]; if (!n) { info.innerHTML = p.hint || ''; return; }
      info.innerHTML = '<b>' + esc(n.label) + '</b>' + (n.sub ? '　<small>' + esc(n.sub) + '</small>' : '') + '<br>' + (n.html || esc(n.text || ''));
    };
    (p.nodes || []).forEach(n => {
      const g = S('g', { 'data-id': n.id, tabindex: 0, role: 'button' }, ng, 'cursor:pointer');
      const tw = Math.max(70, n.label.length * 14 + 18);
      S('rect', { x: n.x - tw / 2, y: n.y - 17, width: tw, height: 34, rx: 6 }, g, 'fill:var(--card);stroke:' + (n.c ? CM.sideColor(n.c) : 'var(--ink)') + ';stroke-width:1.2');
      txt(g, n.label, n.x, n.y - (n.sub ? 5 : 0), 13.5, 'font-weight:700;fill:' + (n.c ? CM.sideColor(n.c) : 'var(--ink)'));
      if (n.sub) txt(g, n.sub, n.x, n.y + 9, 9.5, 'fill:var(--ink-3)');
      const go = () => sel(n.id);
      g.addEventListener('click', go); g.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    });
    svg.addEventListener('click', (e) => { if (e.target === svg) sel(null); });
  };

  /* ================= choice: pick options -> lookup result (e.g. Hammurabi penalties) ================= */
  W.choice = function (host, p) {
    const state = {};
    const box = H('div', 'wchoice', host);
    (p.axes || []).forEach(ax => {
      state[ax.k] = ax.opts[0][0];
      const row = H('div', 'wctl', box, '<span class="wlab">' + esc(ax.label) + '</span>');
      ax.opts.forEach(o => {
        const b = H('button', o[0] === state[ax.k] ? 'on' : '', row, esc(o[1])); b.type = 'button';
        b.addEventListener('click', () => { state[ax.k] = o[0]; row.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); render(); });
      });
    });
    const out = H('div', 'wout wresult', host);
    function render() {
      const key = (p.axes || []).map(ax => state[ax.k]).join('|');
      const r = (p.results || {})[key] || p.fallback || ['—', ''];
      out.innerHTML = '<div class="wbig">' + esc(r[0]) + '</div><div>' + (r[1] || '') + '</div>';
    }
    render();
  };

  /* ================= timeline: horizontal bars of polities/dynasties ================= */
  W.timeline = function (host, p) {
    const rows = p.rows || [], from = p.from, to = p.to, rh = 22, top = 26, left = p.labelW || 150;
    const w = 680, h = top + rows.length * rh + 30;
    const svg = svgBox(host, w, h);
    const info = H('div', 'wout winfo', host, p.hint || 'バーにカーソルを合わせる（タップする）と説明が出る。縦線を動かすと、その年に並び立つ国が分かる。');
    const X = (y) => left + (y - from) / (to - from) * (w - left - 12);
    const fmt = (y) => y < 0 ? '前' + (-y) : String(y);
    for (let y = Math.ceil(from / (p.tick || 500)) * (p.tick || 500); y <= to; y += (p.tick || 500)) {
      S('path', { d: `M${X(y)},${top - 6} V${h - 22}` }, svg, 'stroke:var(--rule);stroke-width:1');
      txt(svg, fmt(y), X(y), top - 14, 10.5, 'fill:var(--ink-3)');
    }
    const G = p.groups || {};
    rows.forEach((r, i) => {
      const y = top + i * rh;
      txt(svg, r[0], left - 8, y + rh / 2, 12, 'fill:var(--ink-2)', 'end');
      const segs = Array.isArray(r[1]) ? r[1] : [[r[1], r[2], r[4]]];
      const col = G[r[3]] ? CM.sideColor(G[r[3]]) : CM.sideColor(r[3] || 'b');
      segs.forEach(sg => {
        const b = S('rect', { x: X(sg[0]), y: y + 4, width: Math.max(2, X(sg[1]) - X(sg[0])), height: rh - 8, rx: 3 }, svg, 'fill:' + col + ';opacity:.85;cursor:pointer');
        const show = () => { info.innerHTML = '<b>' + esc(r[0]) + '</b>（' + fmt(sg[0]) + '〜' + fmt(sg[1]) + '年ごろ）　' + esc(sg[2] || r[4] || ''); };
        b.addEventListener('mouseenter', show); b.addEventListener('click', show);
      });
    });
    const cur = S('path', {}, svg, 'stroke:var(--accent);stroke-width:1.6');
    const curT = txt(svg, '', 0, h - 10, 11.5, 'fill:var(--accent);font-weight:700');
    const setCur = (yr) => {
      cur.setAttribute('d', `M${X(yr)},${top - 4} V${h - 22}`); curT.setAttribute('x', X(yr)); curT.textContent = fmt(Math.round(yr));
      const act = rows.filter(r => (Array.isArray(r[1]) ? r[1] : [[r[1], r[2]]]).some(sg => sg[0] <= yr && yr <= sg[1])).map(r => r[0]);
      return act;
    };
    const ctl = H('div', 'wctl', host, '<label>年 <input type="range" min="' + from + '" max="' + to + '" value="' + (p.start || from) + '" class="wy"></label> <span class="wact"></span>');
    const yr = ctl.querySelector('.wy'), act = ctl.querySelector('.wact');
    const upd = () => { const a = setCur(+yr.value); act.textContent = '並び立つ国：' + (a.join('・') || 'なし'); };
    yr.addEventListener('input', upd); upd();
  };

  /* ================= relay: courier relay vs walking along a road ================= */
  W.relay = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wplay">▶ 出発</button> <span class="wday"></span>');
    const svg = svgBox(host, 640, 170);
    const out = H('div', 'wout', host, p.note || '');
    const L = 40, R = 600, Y1 = 60, Y2 = 120, st = p.stations || 111, walk = p.walk || 90, ride = p.ride || 7;
    txt(svg, p.a || 'サルデス', L, 28, 13, 'font-weight:700'); txt(svg, p.b || 'スサ', R, 28, 13, 'font-weight:700');
    txt(svg, (p.km || 2500) + 'km', (L + R) / 2, 28, 12, 'fill:var(--ink-3)');
    [Y1, Y2].forEach(y => { S('path', { d: `M${L},${y} H${R}` }, svg, 'stroke:var(--rule);stroke-width:6;stroke-linecap:round'); });
    for (let i = 0; i <= st; i += 1) { const x = L + (R - L) * i / st; S('path', { d: `M${x},${Y1 - 5} v10` }, svg, 'stroke:var(--gold);stroke-width:' + (i % 10 ? 0.8 : 1.6)); }
    txt(svg, '駅伝（宿駅' + st + 'か所で馬と人を交代）', L, Y1 - 18, 11.5, 'fill:var(--gold);font-weight:700', 'start');
    txt(svg, '徒歩の旅人', L, Y2 - 18, 11.5, 'fill:var(--ink-2);font-weight:700', 'start');
    const c1 = S('circle', { r: 7, cy: Y1 }, svg, 'fill:var(--accent)'), c2 = S('circle', { r: 7, cy: Y2 }, svg, 'fill:var(--navy)');
    const dayEl = ctl.querySelector('.wday');
    let d = 0, run = false;
    const draw = () => {
      c1.setAttribute('cx', L + (R - L) * Math.min(1, d / ride)); c2.setAttribute('cx', L + (R - L) * Math.min(1, d / walk));
      dayEl.textContent = '経過 ' + Math.floor(d) + '日' + (d >= ride ? '　駅伝の急使は到着（約' + ride + '日）' : '') + (d >= walk ? '　徒歩も到着（約' + walk + '日）' : '');
    };
    ctl.querySelector('.wplay').addEventListener('click', (e) => { if (d >= walk) d = 0; run = !run; e.target.textContent = run ? '❚❚ 停止' : '▶ 出発'; });
    animate(host, (dt) => { if (!run) return; d = Math.min(walk, d + dt * (d < ride ? 2.5 : 18)); if (d >= walk) { run = false; ctl.querySelector('.wplay').textContent = '▶ もう一度'; } draw(); });
    draw();
  };

  /* ================= alphabet: letter shapes from pictograph to Latin ================= */
  W.alphabet = W.evolve = function (host, p) {
    p = p || {};
    const L0 = [
      { n: 'アレフ（牛）', snd: '声門の子音 → ギリシア人が母音Aに転用', pic: 'M20,32 C20,20 40,20 40,32 L36,46 L24,46 Z M21,26 Q9,18 13,6 M39,26 Q51,18 47,6', ph: 'M8,30 L48,12 M8,30 L48,48 M36,8 L36,52', gr: 'M12,52 L30,8 L48,52 M19,36 L41,36', la: 'M12,52 L30,8 L48,52 M19,36 L41,36' },
      { n: 'ベト（家）', snd: 'b', pic: 'M10,14 H50 V50 H10 Z M24,50 V34 H36 V50', ph: 'M42,52 V22 L22,22 Q14,16 22,10 L42,10', gr: 'M16,8 V52 M16,8 H32 Q44,8 44,19 Q44,30 16,30 M16,30 H34 Q46,30 46,41 Q46,52 16,52', la: 'M16,8 V52 M16,8 H32 Q44,8 44,19 Q44,30 16,30 M16,30 H34 Q46,30 46,41 Q46,52 16,52' },
      { n: 'メム（水）', snd: 'm', pic: 'M4,32 L14,20 L24,32 L34,20 L44,32 L54,20', ph: 'M8,20 L18,10 L28,20 L38,10 L38,52', gr: 'M10,52 V8 L30,34 L50,8 V52', la: 'M10,52 V8 L30,34 L50,8 V52' },
      { n: 'アイン（目）', snd: '喉の子音 → ギリシア人が母音Oに転用', pic: 'M6,30 Q30,8 54,30 Q30,52 6,30 Z M30,22 a8,8 0 1,0 0.1,0', ph: 'M30,14 a16,16 0 1,0 0.1,0', gr: 'M30,10 a20,20 0 1,0 0.1,0', la: 'M30,10 a20,20 0 1,0 0.1,0' },
      { n: 'レーシュ（頭）', snd: 'r', pic: 'M30,10 a12,12 0 1,0 0.1,0 M30,34 V52', ph: 'M40,52 V10 L22,10 Q14,18 22,26 L40,26', gr: 'M18,52 V8 H32 Q44,8 44,20 Q44,32 18,32', la: 'M18,52 V8 H32 Q44,8 44,20 Q44,32 18,32 M30,32 L46,52' }
    ];
    const L = p.rows ? p.rows.map(r => ({ n: r.n, snd: r.snd, st: r.st })) : L0.map(l => ({ n: l.n, snd: l.snd, st: [l.pic, l.ph, l.gr, l.la] }));
    const COL = p.cols || ['原シナイ文字（絵）', 'フェニキア文字', 'ギリシア文字', 'ラテン文字'];
    const svg = svgBox(host, 640, 60 + L.length * 74);
    COL.forEach((c, i) => { const ls = String(c).split('\n'); ls.forEach((ln, k) => txt(svg, ln, 190 + i * 115, (ls.length > 1 ? 13 : 22) + k * 15, ls.length > 1 && k ? 11 : 12, 'fill:var(--ink-3);font-weight:700')); });
    const out = H('div', 'wout', host, p.hint || '行をクリックすると、文字の形が変わっていく様子がアニメーションで表示される。フェニキア文字は横向き・右から左に書かれたため、ギリシア人は文字の向きを変えて取り入れた。');
    const SC = p.colors || ['var(--gold)', 'var(--accent)', 'var(--ink)', 'var(--ink)'];
    L.forEach((l, r) => {
      const y = 44 + r * 74;
      const row = S('g', { tabindex: 0, role: 'button' }, svg, 'cursor:pointer');
      S('rect', { x: 6, y: y - 4, width: 628, height: 70, rx: 6 }, row, 'fill:var(--card);stroke:var(--rule)');
      txt(row, l.n, 70, y + 31, 12.5, 'font-weight:700');
      const gs = l.st.map((d, i) => {
        const g = S('g', { transform: `translate(${160 + i * 115},${y + 2})` }, row);
        if (d.slice(0, 2) === 'T:') txt(g, d.slice(2), 30, 31, 46, 'fill:' + SC[i] + ';font-family:var(--font-mincho)');
        else S('path', { d }, g, 'fill:none;stroke:' + SC[i] + ';stroke-width:3;stroke-linecap:round;stroke-linejoin:round');
        if (i < l.st.length - 1) txt(row, '→', 160 + i * 115 + 88, y + 31, 16, 'fill:var(--ink-3)');
        return g;
      });
      const play = () => {
        out.innerHTML = '<b>' + esc(l.n) + '</b>　' + (p.rows ? '' : '音：') + esc(l.snd);
        gs.forEach((g, i) => { g.style.transition = 'none'; g.style.opacity = 0.12; setTimeout(() => { g.style.transition = 'opacity .5s'; g.style.opacity = 1; }, 120 + i * 450); });
      };
      row.addEventListener('click', play); row.addEventListener('keydown', (e) => { if (e.key === 'Enter') play(); });
    });
  };

  /* ================= cycle: step-through concept diagram (boxes + arrows, highlighted in turn) ================= */
  W.steps = function (host, p) {
    const ctl = H('div', 'wctl', host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次へ ▶</button><span class="wstep"></span>');
    const w = p.w || 640, h = p.h || 300;
    const svg = svgBox(host, w, h);
    const out = H('div', 'wout', host);
    const defs = S('defs', {}, svg);
    const mk = S('marker', { id: 'wah' + Math.random().toString(36).slice(2, 7), viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    S('path', { d: 'M0,0 L10,5 L0,10 Z' }, mk, 'fill:var(--ink-2)');
    const B = {};
    (p.boxes || []).forEach(b => {
      const g = S('g', {}, svg); B[b.id] = { g, b };
      S('rect', { x: b.x - b.w / 2, y: b.y - (b.h || 44) / 2, width: b.w, height: b.h || 44, rx: 7 }, g, 'fill:var(--card);stroke:' + (b.c ? CM.sideColor(b.c) : 'var(--ink-2)') + ';stroke-width:1.5');
      const lines = b.t.split('\n'); lines.forEach((ln, i) => txt(g, ln, b.x, b.y + (i - (lines.length - 1) / 2) * 15, i ? 11 : 13, i ? 'fill:var(--ink-3)' : 'font-weight:700;fill:' + (b.c ? CM.sideColor(b.c) : 'var(--ink)')));
    });
    const A = (p.arrows || []).map(a => {
      const f = B[a[0]].b, t = B[a[1]].b;
      const p1 = edgePt(f, t), p2 = edgePt(t, f);
      const g = S('g', {}, svg);
      S('path', { d: `M${p1[0]},${p1[1]} Q${(p1[0] + p2[0]) / 2 + (a[3] || 0)},${(p1[1] + p2[1]) / 2 - (a[4] || 0)} ${p2[0]},${p2[1]}`, 'marker-end': 'url(#' + mk.id + ')' }, g, 'fill:none;stroke:var(--ink-2);stroke-width:2');
      if (a[2]) txt(g, a[2], (p1[0] + p2[0]) / 2 + (a[3] || 0) / 2, (p1[1] + p2[1]) / 2 - (a[4] || 0) / 2 - 9, 11, 'fill:var(--ink-2);paint-order:stroke;stroke:var(--paper);stroke-width:3px');
      return g;
    });
    function edgePt(a, b) { const dx = b.x - a.x, dy = b.y - a.y, hw = a.w / 2 + 3, hh = (a.h || 44) / 2 + 3; const s = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6)); return [a.x + dx * s, a.y + dy * s]; }
    const steps = p.steps || [];
    let i = 0;
    const show = () => {
      const s = steps[i] || {};
      Object.keys(B).forEach(k => B[k].g.style.opacity = !s.on || s.on.includes(k) ? 1 : 0.22);
      A.forEach((g, k) => g.style.opacity = !s.arrows || s.arrows.includes(k) ? 1 : 0.12);
      out.innerHTML = s.text || '';
      ctl.querySelector('.wstep').textContent = (i + 1) + ' / ' + steps.length;
    };
    ctl.querySelector('.wnext').addEventListener('click', () => { i = (i + 1) % steps.length; show(); });
    ctl.querySelector('.wprev').addEventListener('click', () => { i = (i - 1 + steps.length) % steps.length; show(); });
    show();
  };
})();
