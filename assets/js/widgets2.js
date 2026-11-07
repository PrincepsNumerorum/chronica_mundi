/* Animated explainer diagrams (2): printing press, steam engine, phalanx vs legion, volley fire,
   trade-flow maps, Chinese tax systems, the expanding universe. Same contract as widgets.js. */
(function () {
  'use strict';
  const W = CM.widgets = CM.widgets || {};
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs, parent, style) => { const e = document.createElementNS(NS, tag); for (const k in (attrs || {})) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (style) e.setAttribute('style', style); if (parent) parent.appendChild(e); return e; };
  const H = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  const svgBox = (host, w, h) => S('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', role: 'img' }, host, 'display:block;max-width:' + w + 'px;margin:0 auto;font-family:var(--font-body)');
  const txt = (p, s, x, y, size, style, anchor) => { const t = S('text', { x, y, 'text-anchor': anchor || 'middle', 'dominant-baseline': 'middle' }, p, 'font-size:' + (size || 13) + 'px;fill:var(--ink);' + (style || '')); t.textContent = s; return t; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function animate(host, fn) {
    let on = false, last = 0, raf = 0;
    const tick = (now) => { if (!host.isConnected) { on = false; return; } const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now; fn(dt); if (on) raf = requestAnimationFrame(tick); };
    const io = new IntersectionObserver((es) => { const v = es.some(e => e.isIntersecting); if (v && !on) { on = true; last = 0; raf = requestAnimationFrame(tick); } else if (!v) { on = false; cancelAnimationFrame(raf); } });
    io.observe(host);
  }
  const ctlBar = (host, html) => H('div', 'wctl', host, html);

  /* ================= press: Gutenberg's movable-type printing ================= */
  W.press = function (host, p) {
    const ctl = ctlBar(host, '<button type="button" class="wplay">❚❚ 止める</button><span class="wlab">速さ</span><input type="range" class="wsp" min="0.3" max="3" step="0.1" value="1" aria-label="速さ">');
    const svg = svgBox(host, 640, 330), out = H('div', 'wout', host);
    const STEPS = [
      ['活字を鋳造する', '鉛・スズ・アンチモンの合金を、文字ごとの鋳型に流し込んで、同じ形の活字を大量につくる。活字は、くり返し使うことができた。'],
      ['活字を組む（植字）', '植字工が、活字棚から1文字ずつ拾って、左右が逆の「鏡文字」の状態で行に並べ、ページの版（組版）をつくる。'],
      ['インクを塗る', '革のたんぽで、油性のインクを組版にたたいて塗る。グーテンベルクは、金属の活字によくのる、油を使ったインクを工夫した。'],
      ['紙をのせて圧す', 'ぶどう搾り機をもとにしたねじ式の印刷機で、紙を組版に押しつける。1回で、ページ全体が一度に刷られる。'],
      ['刷り上がり', '紙の上では、文字は正しい向きになる。同じ版から、何百枚でも、まったく同じものを刷ることができた。']
    ];
    // layout
    S('rect', { x: 0, y: 0, width: 640, height: 330 }, svg, 'fill:var(--card)');
    // type case
    const cs = S('g', { transform: 'translate(20,40)' }, svg);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) S('rect', { x: c * 22, y: r * 22, width: 20, height: 20, rx: 2 }, cs, 'fill:var(--paper-2);stroke:var(--rule)');
    'ABCDEFGHILMNOPRSTV'.split('').forEach((ch, i) => txt(cs, ch, (i % 6) * 22 + 10, Math.floor(i / 6) * 22 + 11, 11, 'fill:var(--ink-3);font-family:serif'));
    txt(svg, '活字棚', 85, 28, 11, 'fill:var(--ink-3)');
    // mould
    const mould = S('g', { transform: 'translate(40,170)' }, svg);
    S('rect', { x: 0, y: 0, width: 70, height: 46, rx: 4 }, mould, 'fill:#8a8f99;stroke:var(--ink-2)');
    S('rect', { x: 28, y: -6, width: 14, height: 30 }, mould, 'fill:var(--card);stroke:var(--ink-2)');
    const metal = S('rect', { x: 29, y: 23, width: 12, height: 0 }, mould, 'fill:#c9a24a');
    txt(svg, '鋳型', 75, 232, 11, 'fill:var(--ink-3)');
    // forme on the bed
    const bedY = 250;
    S('rect', { x: 210, y: bedY, width: 230, height: 14 }, svg, 'fill:#6b5a44');
    const forme = S('g', {}, svg);
    const word = 'VERBVM', letters = [];
    word.split('').forEach((ch, i) => {
      const g = S('g', { transform: 'translate(' + (240 + i * 28) + ',' + (bedY - 18) + ')' }, forme);
      S('rect', { x: -12, y: -10, width: 24, height: 26, rx: 2 }, g, 'fill:#b8bcc6;stroke:#6f7480');
      const t = txt(g, ch, 0, 3, 18, 'font-family:serif;font-weight:700;fill:#2a2d33');
      t.setAttribute('transform', 'scale(-1,1)');
      g.style.opacity = 0; letters.push(g);
    });
    const inkLayer = S('rect', { x: 226, y: bedY - 30, width: 170, height: 6, rx: 3 }, svg, 'fill:#111;opacity:0');
    // press frame & screw
    S('rect', { x: 200, y: 40, width: 14, height: 230 }, svg, 'fill:#7a5b3a'); S('rect', { x: 436, y: 40, width: 14, height: 230 }, svg, 'fill:#7a5b3a');
    S('rect', { x: 200, y: 40, width: 250, height: 18 }, svg, 'fill:#7a5b3a');
    const screw = S('g', {}, svg);
    for (let k = 0; k < 6; k++) S('line', { x1: 315, y1: 62 + k * 10, x2: 335, y2: 66 + k * 10 }, screw, 'stroke:#4b3a28;stroke-width:3');
    const bar = S('line', { x1: 325, y1: 95, x2: 395, y2: 95 }, svg, 'stroke:#4b3a28;stroke-width:5;stroke-linecap:round');
    const platen = S('g', {}, svg);
    S('rect', { x: 230, y: 0, width: 190, height: 18, rx: 2 }, platen, 'fill:#9a7a52;stroke:#4b3a28');
    S('line', { x1: 325, y1: -60, x2: 325, y2: 0 }, platen, 'stroke:#4b3a28;stroke-width:8');
    const sheet = S('g', {}, svg);
    S('rect', { x: -95, y: -4, width: 190, height: 8 }, sheet, 'fill:#f6f1e3;stroke:#b9ab88');
    // output stack
    const stack = S('g', { transform: 'translate(520,270)' }, svg);
    const page = S('g', { transform: 'translate(520,120)' }, svg);
    S('rect', { x: -55, y: -50, width: 110, height: 140, rx: 2 }, page, 'fill:#f6f1e3;stroke:#b9ab88');
    const ptxt = txt(page, 'VERBVM', 0, -20, 18, 'font-family:serif;font-weight:700;fill:#1b1b1b;opacity:0');
    for (let k = 0; k < 7; k++) S('line', { x1: -42, y1: 2 + k * 11, x2: 42 - (k === 6 ? 30 : 0), y2: 2 + k * 11 }, page, 'stroke:#555;stroke-width:2;opacity:.35');
    txt(svg, '刷り上がったページ', 520, 52, 11, 'fill:var(--ink-3)');
    const cnt = txt(svg, '', 520, 300, 12, 'font-weight:700;fill:var(--ink-2)');
    const label = txt(svg, '', 320, 20, 14, 'font-weight:700;fill:var(--accent)');
    let t = 0, run = true, sp = 1, printed = 0;
    ctl.querySelector('.wplay').onclick = (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 動かす'; };
    ctl.querySelector('.wsp').oninput = (e) => { sp = +e.target.value; };
    let lastStep = -1;
    const draw = () => {
      const cyc = 10, u = (t % cyc) / cyc * 5, st = Math.floor(u), f = u - st; // 5 stages of 2 s
      if (st !== lastStep) { lastStep = st; label.textContent = (st + 1) + '. ' + STEPS[st][0]; out.innerHTML = '<b>' + STEPS[st][0] + '</b>　' + STEPS[st][1]; if (st === 4) { printed++; cnt.textContent = '刷った枚数：' + printed + '枚'; S('rect', { x: -50, y: -printed * 2.2, width: 100, height: 2, rx: 1 }, stack, 'fill:#f6f1e3;stroke:#b9ab88;stroke-width:.6'); if (printed > 20) { stack.innerHTML = ''; printed = 0; } } }
      metal.setAttribute('height', st === 0 ? 24 * ease(clamp(f * 1.4, 0, 1)) : 24); metal.setAttribute('y', st === 0 ? 23 - 24 * ease(clamp(f * 1.4, 0, 1)) : -1);
      letters.forEach((g, i) => { g.style.opacity = st === 0 ? (t % cyc < 0.05 ? 0 : g.style.opacity) : st === 1 ? (f * letters.length > i ? 1 : 0) : 1; });
      if (st === 0 && f < 0.05) letters.forEach(g => g.style.opacity = 0);
      inkLayer.style.opacity = st === 2 ? 0.25 + 0.25 * Math.sin(f * 20) : 0;
      const down = st === 3 ? Math.sin(Math.PI * f) : 0;
      platen.setAttribute('transform', 'translate(0,' + (110 + down * (bedY - 30 - 128 - 6)) + ')');
      const sy = st === 3 ? bedY - 30 + 0 : st === 4 ? bedY - 30 - f * 60 : -100;
      sheet.setAttribute('transform', 'translate(' + (st === 4 ? 325 + f * 190 : 325) + ',' + sy + ')'); sheet.style.opacity = st >= 3 ? 1 : 0;
      bar.setAttribute('x2', 325 + 70 * Math.cos(down * 1.2)); bar.setAttribute('y2', 95 + 30 * Math.sin(down * 1.2));
      ptxt.style.opacity = st === 4 ? f : (st === 0 ? 1 - clamp(f * 3, 0, 1) : 0);
    };
    animate(host, (dt) => { if (run) t += dt * sp; draw(); });
    draw();
  };

  /* ================= steam: Newcomen vs Watt ================= */
  W.steam = function (host, p) {
    const ctl = ctlBar(host, '<button type="button" data-m="n" class="on">ニューコメン機関（1712年）</button><button type="button" data-m="w">ワットの改良（1769年）</button><button type="button" class="wplay">❚❚ 止める</button>');
    const svg = svgBox(host, 640, 400), out = H('div', 'wout', host);
    S('rect', { x: 0, y: 0, width: 640, height: 400 }, svg, 'fill:var(--card)');
    let mode = 'n', run = true, t = 0;
    const G = S('g', {}, svg);
    // static parts
    S('rect', { x: 60, y: 250, width: 110, height: 60, rx: 18 }, G, 'fill:#8a8f99;stroke:var(--ink-2)'); txt(G, 'ボイラー', 115, 282, 11, 'fill:#fff;font-weight:700');
    const fire = S('path', { d: 'M75,318 q10,-18 20,0 q10,-22 20,0 q10,-16 20,0 q10,-20 20,0z' }, G, 'fill:#d9661f;opacity:.85');
    S('rect', { x: 92, y: 120, width: 46, height: 120 }, G, 'fill:none;stroke:var(--ink-2);stroke-width:3');
    const cylFill = S('rect', { x: 94, y: 122, width: 42, height: 116 }, G, 'fill:#d9661f;opacity:.25');
    txt(G, 'シリンダー', 165, 135, 11, 'fill:var(--ink-3)', 'start');
    S('line', { x1: 115, y1: 240, x2: 115, y2: 250 }, G, 'stroke:var(--ink-2);stroke-width:5');
    const piston = S('rect', { x: 95, y: 150, width: 40, height: 12 }, G, 'fill:#555');
    const rod = S('line', { x1: 115, y1: 150, x2: 115, y2: 70 }, G, 'stroke:#555;stroke-width:5');
    S('path', { d: 'M300,70 L300,250' }, G, 'stroke:#7a5b3a;stroke-width:16'); S('path', { d: 'M285,250 L315,250' }, G, 'stroke:#7a5b3a;stroke-width:8');
    const beam = S('line', { x1: 115, y1: 70, x2: 485, y2: 70 }, G, 'stroke:#7a5b3a;stroke-width:12;stroke-linecap:round');
    const pump = S('line', { x1: 485, y1: 70, x2: 485, y2: 300 }, G, 'stroke:#555;stroke-width:5');
    S('rect', { x: 470, y: 250, width: 30, height: 80 }, G, 'fill:none;stroke:var(--ink-3);stroke-dasharray:4 3'); txt(G, '鉱山の排水ポンプ', 520, 300, 11, 'fill:var(--ink-3)', 'start');
    const water = S('rect', { x: 472, y: 300, width: 26, height: 28 }, G, 'fill:#6fa3c9;opacity:.6');
    const spray = S('g', {}, G); for (let k = 0; k < 6; k++) S('circle', { cx: 100 + k * 6, cy: 200, r: 2 }, spray, 'fill:#4f8fc0');
    const cond = S('g', {}, G); S('rect', { x: 170, y: 200, width: 46, height: 40, rx: 4 }, cond, 'fill:#cfe2ef;stroke:#4f8fc0'); S('line', { x1: 136, y1: 225, x2: 170, y2: 225 }, cond, 'stroke:#4f8fc0;stroke-width:4'); txt(cond, '復水器', 193, 252, 10.5, 'fill:#2f6f9f;font-weight:700');
    const jacket = S('rect', { x: 88, y: 116, width: 54, height: 128, rx: 3 }, G, 'fill:none;stroke:#d9661f;stroke-width:3;stroke-dasharray:6 4');
    const phase = txt(G, '', 320, 22, 13.5, 'font-weight:700;fill:var(--accent)');
    // coal gauges
    const gg = S('g', { transform: 'translate(160,352)' }, G);
    txt(gg, '同じ量の水をくみ上げるのに使う石炭（目安）', -80, -16, 11, 'fill:var(--ink-3)', 'start');
    S('rect', { x: 0, y: -2, width: 260, height: 14, rx: 3 }, gg, 'fill:#555'); S('rect', { x: 0, y: 20, width: 65, height: 14, rx: 3 }, gg, 'fill:#b2432a'); txt(gg, '約4分の1', 72, 27, 11, 'fill:#b2432a;font-weight:700', 'start');
    txt(gg, 'ニューコメン', -6, 5, 10.5, 'fill:var(--ink-2)', 'end'); txt(gg, 'ワット', -6, 27, 10.5, 'fill:var(--ink-2)', 'end');
    const set = (m) => { mode = m; ctl.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b.dataset.m === m)); cond.style.display = m === 'w' ? '' : 'none'; jacket.style.display = m === 'w' ? '' : 'none';
      out.innerHTML = m === 'n' ? '<b>ニューコメン機関</b>　シリンダーに蒸気を入れたあと、<b>シリンダーの中に冷たい水を噴きこんで</b>蒸気を水に戻す（復水）。中が真空に近くなり、外の大気の圧力がピストンを押し下げる。しかし、そのたびにシリンダー全体が冷えてしまい、次の蒸気で温め直すために、大量の石炭がむだになった。'
        : '<b>ワットの改良</b>　蒸気を、シリンダーとは別の<b>復水器</b>に導いて冷やす。シリンダーは上部も閉じられて保温の覆い（蒸気ジャケット）で包まれ、いつも熱いままに保たれる。ピストンを押し下げるのも、大気ではなく、上から入れた蒸気の圧力である。同じ仕事をするのに必要な石炭は、ニューコメン機関のおよそ4分の1ですんだ。のちに回転運動を取り出す装置も加えられ、蒸気機関は、鉱山の排水から工場の動力へと広がっていった。'; };
    ctl.querySelectorAll('[data-m]').forEach(b => b.onclick = () => set(b.dataset.m));
    ctl.querySelector('.wplay').onclick = (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 動かす'; };
    set('n');
    const draw = () => {
      const cyc = 4, u = (t % cyc) / cyc; // 0-0.45 steam in (piston up), 0.45-0.55 condense, 0.55-1 power stroke (down)
      let y; if (u < 0.45) y = 1 - ease(u / 0.45); else if (u < 0.55) y = 0; else y = ease((u - 0.55) / 0.45);
      const py = 150 + y * 76; piston.setAttribute('y', py); rod.setAttribute('y1', py);
      const ang = (y - 0.5) * 0.18; const dyL = Math.sin(ang) * 185, dyR = -Math.sin(ang) * 185;
      beam.setAttribute('y1', 70 + dyL); beam.setAttribute('y2', 70 + dyR); rod.setAttribute('y2', 70 + dyL); pump.setAttribute('y1', 70 + dyR); pump.setAttribute('y2', 300 + dyR);
      water.setAttribute('y', 300 + dyR * 0.6);
      const cold = mode === 'n' ? (u > 0.45 && u < 0.85 ? 1 : u >= 0.85 ? 1 - (u - 0.85) / 0.15 : u < 0.2 ? 0.5 - u * 2.5 : 0) : 0;
      cylFill.setAttribute('fill', cold > 0.3 ? '#4f8fc0' : '#d9661f'); cylFill.style.opacity = 0.18 + 0.3 * Math.max(cold, 1 - cold);
      spray.style.opacity = mode === 'n' && u > 0.45 && u < 0.6 ? 1 : 0;
      cond.querySelector('rect').style.fill = mode === 'w' && u > 0.45 && u < 0.7 ? '#9ec5e2' : '#cfe2ef';
      fire.style.opacity = 0.6 + 0.3 * Math.sin(t * 9);
      phase.textContent = u < 0.45 ? '① 蒸気を入れる（おもりの重みでピストンが上がる）' : u < 0.55 ? (mode === 'n' ? '② シリンダーに冷水を噴きこむ' : '② 蒸気を復水器へ逃がして冷やす') : (mode === 'n' ? '③ 大気の圧力がピストンを押し下げる＝仕事をする' : '③ 上から入れた蒸気の圧力がピストンを押し下げる＝仕事をする');
    };
    animate(host, (dt) => { if (run) t += dt; draw(); });
    draw();
  };

  /* ================= phalanx vs legion ================= */
  W.phalanx = function (host, p) {
    const ctl = ctlBar(host, '<button type="button" data-g="flat" class="on">平らな土地</button><button type="button" data-g="rough">起伏のある土地</button><button type="button" class="wreplay">↺ もう一度</button>');
    const svg = svgBox(host, 640, 340), out = H('div', 'wout', host);
    let ground = 'flat', t = 0;
    const draw = () => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: 640, height: 340 }, svg, 'fill:var(--card)');
      if (ground === 'rough') { [[150, 175, 90, 30], [430, 180, 70, 26], [300, 190, 40, 18]].forEach(h => S('ellipse', { cx: h[0], cy: h[1], rx: h[2], ry: h[3] }, svg, 'fill:#cdbb94;opacity:.6')); [[220, 182], [365, 186]].forEach(q => S('path', { d: 'M' + (q[0] - 30) + ',' + q[1] + ' q30,-14 60,0' }, svg, 'fill:none;stroke:#a38d61;stroke-width:2')); }
      const k = clamp(t / 6, 0, 1), adv = ease(k);
      // phalanx: 16 deep x 32 wide schematically drawn as 8x32 dots, advancing up
      const py = 270 - adv * 70;
      txt(svg, 'マケドニアのファランクス（長槍の密集隊形）', 320, 328, 11.5, 'fill:#6c4a7d;font-weight:700');
      for (let c = 0; c < 32; c++) {
        let off = 0;
        if (ground === 'rough') { const x = 100 + c * 14; off = (Math.abs(x - 300) < 30 ? 1 : 0) * adv * 26 + Math.sin(c * 0.9) * adv * 6; }
        const gap = ground === 'rough' && c >= 14 && c <= 17;
        for (let r = 0; r < 6; r++) {
          const x = 100 + c * 14, y = py + r * 8 + off + (gap ? adv * 18 : 0);
          S('circle', { cx: x, cy: y, r: 2.6 }, svg, 'fill:#6c4a7d');
        }
        if (!gap || adv < 0.3) S('line', { x1: 100 + c * 14, y1: py + off - 2, x2: 100 + c * 14, y2: py + off - 22 }, svg, 'stroke:#6c4a7d;stroke-width:1;opacity:.7');
      }
      if (ground === 'rough' && adv > 0.5) { S('rect', { x: 290, y: py + 4, width: 60, height: 56, rx: 4 }, svg, 'fill:none;stroke:#b2432a;stroke-width:2;stroke-dasharray:4 3'); txt(svg, '↑ 隊列に穴が開く', 320, 311, 11, 'fill:#b2432a;font-weight:700'); }
      // legion: maniples in checkerboard, 3 lines, coming down
      txt(svg, 'ローマのレギオン（中隊ごとの市松模様の隊形）', 320, 14, 11.5, 'fill:#b2432a;font-weight:700');
      const ly = 40 + adv * 40;
      for (let line = 0; line < 3; line++) for (let m = 0; m < 10; m++) {
        let x = 80 + m * 40 + (line % 2) * 20, y = ly + line * 28;
        if (ground === 'rough' && line === 1 && (m === 5 || m === 6) && k > 0.55) { const f = ease(clamp((k - 0.55) / 0.45, 0, 1)); x += (317 + (m === 5 ? -15 : 15) - x) * f; y += f * (py + 30 - y); }
        S('rect', { x: x - 14, y: y - 6, width: 28, height: 12, rx: 2 }, svg, 'fill:#b2432a;opacity:' + (line === 2 ? .55 : .85));
      }
      ['ハスタティ（若い兵）', 'プリンキペス（壮年の兵）', 'トリアリイ（古参兵）'].forEach((s, i) => txt(svg, s, 492, ly + i * 28, 10, 'fill:var(--ink-3)', 'start'));
    };
    const msg = () => { out.innerHTML = ground === 'flat' ? '<b>平らな土地</b>　長さ5m以上の長槍（サリッサ）を構えた兵士が、何列にも重なって前進するファランクスは、正面からの攻撃には圧倒的に強かった。槍の穂先の壁に、ローマ兵は近づくことができない。' : '<b>起伏のある土地</b>　ファランクスは、隊列が乱れると弱かった。前197年のキュノスケファライの戦いでは、丘の起伏で隊列に隙間ができ、その穴に、ローマ軍の小さな中隊（マニプルス）が入り込んで、側面や背後から攻撃した。歴史家ポリュビオスは、ファランクスは平らで障害物のない土地でしか力を発揮できないが、ローマ軍はどんな土地でも戦える、と両者を比べている。'; };
    ctl.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { ground = b.dataset.g; t = 0; ctl.querySelectorAll('[data-g]').forEach(x => x.classList.toggle('on', x === b)); msg(); });
    ctl.querySelector('.wreplay').onclick = () => { t = 0; };
    msg();
    animate(host, (dt) => { if (t < 7) { t += dt; draw(); } });
    draw();
  };

  /* ================= volley: countermarch volley fire ================= */
  W.volley = function (host, p) {
    const ctl = ctlBar(host, '<button type="button" data-m="cm" class="on">反転行進による連続射撃</button><button type="button" data-m="all">全員が一斉に撃つと…</button>');
    const svg = svgBox(host, 640, 300), out = H('div', 'wout', host);
    let mode = 'cm', t = 0;
    const R = 5, F = 8, reload = 5; // ranks, files, seconds to reload
    const shots = [];
    const draw = () => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: 640, height: 300 }, svg, 'fill:var(--card)');
      S('line', { x1: 470, y1: 20, x2: 470, y2: 240 }, svg, 'stroke:var(--accent);stroke-dasharray:5 4');
      txt(svg, '敵', 560, 130, 16, 'fill:var(--accent);font-weight:700');
      for (let f = 0; f < F; f++) {
        for (let r = 0; r < R; r++) {
          let slot, prog, firing = false, moving = 0, ry;
          if (mode === 'cm') {
            const per = reload / R, phase = ((t / per) + (R - r)) % R; // which slot (0=front)
            slot = Math.floor(phase); const u = phase - slot;
            ry = slot === 0 ? 0 : (R - slot) - ease(clamp((u - 0.3) / 0.5, 0, 1));
            firing = slot === 0 && u < 0.2; moving = slot === 0 && u >= 0.2 ? ease(clamp((u - 0.2) / 0.6, 0, 1)) : 0;
            prog = slot === 0 ? 0 : (slot - 1 + u) / (R - 1);
          } else {
            const u = (t % (reload + 0.6)) / (reload + 0.6); slot = r; ry = r; firing = u < 0.06; prog = u;
          }
          const xFront = 420, gap = 34;
          let x = xFront - ry * gap, y = 30 + f * 26;
          if (moving) { x = xFront - moving * (R - 1) * gap; y += Math.sin(moving * Math.PI) * 13; }
          const g = S('g', { transform: 'translate(' + x + ',' + y + ')' }, svg);
          S('circle', { cx: 0, cy: 0, r: 7 }, g, 'fill:' + (firing ? '#b2432a' : '#2f4f7a'));
          S('line', { x1: 4, y1: 0, x2: 18, y2: 0 }, g, 'stroke:#333;stroke-width:2');
          if (firing) { S('circle', { cx: 24, cy: 0, r: 6 }, g, 'fill:#f3c14b;opacity:.9'); }
          S('rect', { x: -8, y: 9, width: 16, height: 3 }, g, 'fill:var(--rule)'); S('rect', { x: -8, y: 9, width: 16 * clamp(prog, 0, 1), height: 3 }, g, 'fill:#5f6d2c');
        }
      }
      // fire timeline
      txt(svg, '射撃のタイミング（最近10秒）', 20, 262, 11, 'fill:var(--ink-3)', 'start');
      S('line', { x1: 20, y1: 284, x2: 620, y2: 284 }, svg, 'stroke:var(--rule)');
      shots.forEach(s => { const x = 620 - (t - s) * 60; if (x > 20) S('rect', { x: x - 2, y: 272, width: 4, height: 12 }, svg, 'fill:#b2432a'); });
      txt(svg, '緑の帯＝弾ごめの進み具合', 620, 262, 10, 'fill:#5f6d2c', 'end');
    };
    let lastFire = -1;
    const msg = () => { out.innerHTML = mode === 'cm' ? '<b>反転行進（カウンターマーチ）</b>　先頭の列が撃ち終わると、隊列の間を通って最後尾に下がり、弾をこめ直す。その間に次の列が前に出て撃つ。こうして、弾ごめに時間のかかる火縄銃でも、途切れなく射撃を続けることができた。1594年、オランダのナッサウ伯ウィレム・ローデウェイクが、古代ローマの著述家アイリアノスが記した投石兵・投げ槍兵の戦法にヒントを得て、この方法を従兄弟のマウリッツへの手紙に書き残しており、のちのグスタフ＝アドルフのスウェーデン軍などに受け継がれた。日本の長篠の戦いの「三段撃ち」の話はよく知られているが、史料の裏づけが乏しく、実際に行われたかどうかは疑問視されている【諸説】。' : '<b>全員が一斉に撃つと</b>　強力な一撃にはなるが、全員が弾をこめ直す間、射撃が途切れてしまう。その間に、敵の騎兵や歩兵に突撃されれば、ひとたまりもない。'; };
    ctl.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; t = 0; shots.length = 0; lastFire = -1; ctl.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); msg(); });
    msg();
    animate(host, (dt) => {
      t += dt;
      if (mode === 'cm') { const per = reload / R, k = Math.floor(t / per); if (k !== lastFire) { lastFire = k; shots.push(t); } }
      else { const k = Math.floor(t / (reload + 0.6)); if (k !== lastFire) { lastFire = k; shots.push(t); } }
      while (shots.length && t - shots[0] > 10.5) shots.shift();
      draw();
    });
    draw();
  };

  /* ================= flowmap: trade flows on the historical map, step by step ================= */
  // p: {view:[lon,lat,zoom], year, places:{id:{ja,lon,lat,k}}, flows:[{pts:[[lon,lat],...], c, label, text}], h}
  W.flowmap = function (host, p) {
    const flows = p.flows || [];
    const ctl = ctlBar(host, '<button type="button" class="wprev">◀</button><button type="button" class="wnext">次の流れへ ▶</button><button type="button" class="wall">すべて表示</button><span class="wstep"></span>');
    const box = H('div', '', host); box.style.cssText = 'position:relative;height:' + (p.h || 360) + 'px;border:1px solid var(--rule);border-radius:8px;overflow:hidden';
    const out = H('div', 'wout', host, p.hint || '「次の流れへ」で、モノとお金の流れを一つずつ表示する。');
    if (!CM.MapView) { box.innerHTML = '<p class="muted" style="padding:12px">地図を読み込めませんでした。</p>'; return; }
    const mv = new CM.MapView(box, { hud: false });
    mv.labelsOn = !!p.labels;
    const places = Object.entries(p.places || {}).map(([id, q]) => Object.assign({ id }, q));
    let k = -1, ready = false;
    const show = () => {
      if (!ready) return;
      const vis = k < 0 ? flows : flows.slice(0, k + 1);
      mv.setOverlays({ places, routes: vis.map((f, i) => ({ id: 'f' + i, pts: f.pts, c: f.c || 'a', w: 3.2, label: f.label, flow: 1, dur: 1.6 })) });
      const f = k >= 0 ? flows[k] : null;
      out.innerHTML = f ? '<b>' + CM.esc(f.label) + '</b>　' + (f.text || '') : (p.summary || p.hint || '');
      ctl.querySelector('.wstep').textContent = k >= 0 ? (k + 1) + ' / ' + flows.length : '';
    };
    ctl.querySelector('.wnext').onclick = () => { k = (k + 1) % flows.length; show(); };
    ctl.querySelector('.wprev').onclick = () => { k = Math.max(0, k - 1); show(); };
    ctl.querySelector('.wall').onclick = () => { k = -1; show(); };
    mv.setView(p.view[0], p.view[1], p.view[2]); mv.year = p.year || 1700;
    mv.ready.then(() => mv.setYear(p.year || 1700)).then(() => { ready = true; k = 0; show(); });
    new ResizeObserver(() => { try { mv.resize(); } catch (e) { /* */ } }).observe(box);
  };

  /* ================= taxes: Chinese tax systems ================= */
  W.taxes = function (host, p) {
    const ERAS = {
      zyd: { t: '租庸調（唐の前半）', note: '均田制で、成年の男子一人ひとりに、国が土地を分け与えた。その代わりに、一人あたり決まった量の穀物（<b>租</b>）、労役またはその代わりの絹布（<b>庸</b>）、絹や麻などの布（<b>調</b>）を納める。税は、<b>人の数</b>にかかった。土地の広さや貧富の差は考えに入れられていない。', calc: (m, land) => ({ grain: m * 2, cloth: m * 2, labor: m, coin: 0, silver: 0 }) },
      ls: { t: '両税法（780年〜）', note: '均田制が崩れ、土地を持たない人が増えると、唐は780年、宰相楊炎の献策で<b>両税法</b>に切り替えた。実際に住んでいる土地で、<b>その家の資産と耕地の広さ</b>に応じて税額を決め、夏と秋の<b>年2回</b>、銭で納めさせるものである（実際には穀物や布で納めることも多かった）。', calc: (m, land) => ({ grain: 0, cloth: 0, labor: 0, coin: 1 + land * 2.2 + m * 0.4, silver: 0 }) },
      yt: { t: '一条鞭法（16世紀、明）', note: '日本やアメリカ大陸から大量の銀が流れ込むと、明は16世紀、土地の税と、男子にかかる労役などを<b>一本にまとめ、銀で納めさせる</b>一条鞭法を、各地で実施した。張居正の時代に全国に広がった。', calc: (m, land) => ({ grain: 0, cloth: 0, labor: 0, coin: 0, silver: land * 2 + m * 1 }) },
      dd: { t: '地丁銀（18世紀、清）', note: '清の康熙帝は1712年、その年の人頭税の額を固定し、それ以後に増えた人口には課税しないと定めた。続く雍正帝の時代には、人頭税（丁税）を土地の税（地税）に繰り入れて一本化した（<b>地丁銀</b>）。<b>人の数は、税に関係なくなった</b>のである。人口を隠す必要がなくなり、清の人口は急増した。', calc: (m, land) => ({ grain: 0, cloth: 0, labor: 0, coin: 0, silver: land * 2.6 }) }
    };
    const keys = Object.keys(ERAS);
    const ctl = ctlBar(host, keys.map((k, i) => '<button type="button" data-e="' + k + '"' + (i ? '' : ' class="on"') + '>' + ERAS[k].t.split('（')[0] + '</button>').join(''));
    const ctl2 = ctlBar(host, '<span class="wlab">成年の男子</span><input type="range" class="wm" min="1" max="4" value="2" aria-label="成年の男子の数"><span class="wmv num"></span><span class="wlab" style="margin-left:12px">耕地</span><input type="range" class="wl" min="0" max="3" value="1" aria-label="耕地の広さ"><span class="wlv"></span>');
    const svg = svgBox(host, 640, 280), out = H('div', 'wout', host);
    let era = 'zyd', men = 2, land = 1, t = 0;
    const LAND = ['ほとんどない', '小さい', '中くらい', '広い'];
    const tokens = [];
    const ICON = { grain: ['#c9a24a', '穀'], cloth: ['#b48ac0', '布'], labor: ['#5f6d2c', '役'], coin: ['#8a6a3a', '銭'], silver: ['#b9c2cc', '銀'] };
    const rebuild = () => {
      tokens.length = 0;
      const c = ERAS[era].calc(men, land);
      Object.keys(ICON).forEach(k => { const n = Math.round(c[k]); for (let i = 0; i < n; i++) tokens.push({ k, d: i * 0.28 + Object.keys(ICON).indexOf(k) * 0.1 }); });
      out.innerHTML = '<b>' + ERAS[era].t + '</b>　' + ERAS[era].note;
      ctl2.querySelector('.wmv').textContent = men + '人'; ctl2.querySelector('.wlv').textContent = LAND[land];
      t = 0;
    };
    const draw = () => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: 640, height: 280 }, svg, 'fill:var(--card)');
      // household
      S('path', { d: 'M40,150 L110,100 L180,150 Z' }, svg, 'fill:#a0522d;opacity:.8'); S('rect', { x: 55, y: 150, width: 110, height: 70 }, svg, 'fill:#e7d9bd;stroke:#8a6a3a');
      for (let i = 0; i < men; i++) { const x = 70 + i * 26; S('circle', { cx: x, cy: 172, r: 6 }, svg, 'fill:#2f4f7a'); S('rect', { x: x - 6, y: 179, width: 12, height: 18, rx: 3 }, svg, 'fill:#2f4f7a'); }
      txt(svg, '農民の家', 110, 236, 11.5, 'font-weight:700;fill:var(--ink-2)');
      for (let i = 0; i <= land; i++) if (land) S('rect', { x: 20 + i * 40, y: 245, width: 36, height: 20 }, svg, 'fill:#8fae6b;opacity:' + (i < land ? .8 : 0));
      if (land) txt(svg, '耕地', 20 + land * 20, 274, 10, 'fill:#5f6d2c');
      // state
      S('rect', { x: 470, y: 90, width: 140, height: 110, rx: 6 }, svg, 'fill:var(--paper-2);stroke:var(--accent);stroke-width:2'); txt(svg, '国家（役所・倉）', 540, 80, 12, 'font-weight:700;fill:var(--accent)');
      // flying tokens
      const c = ERAS[era].calc(men, land), counts = {};
      tokens.forEach(tk => {
        const u = clamp((t - tk.d) / 1.4, 0, 1), e = ease(u);
        const x0 = 180, y0 = 170, x1 = 490 + (counts[tk.k] || 0) % 6 * 18, y1 = 105 + Object.keys(ICON).indexOf(tk.k) * 19;
        if (u >= 1) counts[tk.k] = (counts[tk.k] || 0) + 1;
        const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - Math.sin(Math.PI * e) * 50;
        if (u <= 0) return;
        S('circle', { cx: x, cy: y, r: 7.5 }, svg, 'fill:' + ICON[tk.k][0] + ';stroke:#fff;stroke-width:1'); txt(svg, ICON[tk.k][1], x, y + 0.5, 8.5, 'fill:#fff;font-weight:700');
      });
      if (era === 'ls') { txt(svg, '夏', 300, 52, 13, 'font-weight:700;fill:#b2432a'); txt(svg, '秋', 340, 52, 13, 'font-weight:700;fill:#8a6a3a'); txt(svg, '年2回、銭で納める', 320, 70, 10.5, 'fill:var(--ink-3)'); }
      if (era === 'dd') txt(svg, '人の数を増やしても、税は変わらない', 320, 60, 11.5, 'font-weight:700;fill:#2f6f9f');
      if (era === 'zyd') txt(svg, '土地の広さを変えても、税は変わらない', 320, 60, 11.5, 'font-weight:700;fill:#2f6f9f');
      // legend
      Object.keys(ICON).forEach((k, i) => { if (!Math.round(c[k])) return; S('circle', { cx: 250 + i * 0, cy: 0 }, svg); });
      const names = { grain: '穀物（租）', cloth: '布（調）', labor: '労役（庸）', coin: '銭', silver: '銀' };
      let lx = 210; Object.keys(ICON).forEach(k => { if (!Math.round(c[k])) return; S('circle', { cx: lx, cy: 255, r: 6 }, svg, 'fill:' + ICON[k][0]); txt(svg, names[k] + '×' + Math.round(c[k]), lx + 10, 256, 10.5, 'fill:var(--ink-2)', 'start'); lx += 92; });
    };
    ctl.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { era = b.dataset.e; ctl.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x === b)); rebuild(); });
    ctl2.querySelector('.wm').oninput = (e) => { men = +e.target.value; rebuild(); };
    ctl2.querySelector('.wl').oninput = (e) => { land = +e.target.value; rebuild(); };
    if (p.start && ERAS[p.start]) { era = p.start; ctl.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x.dataset.e === era)); }
    rebuild();
    animate(host, (dt) => { t += dt; draw(); });
    draw();
  };

  /* ================= universe: the expanding universe and Hubble's law ================= */
  W.universe = function (host, p) {
    const ctl = ctlBar(host, '<button type="button" class="wplay">❚❚ 止める</button><button type="button" class="wback">↺ 最初から</button><span class="wlab">宇宙の歴史</span><input type="range" class="wt" min="0" max="1000" value="0" aria-label="宇宙の年齢" style="flex:1;min-width:120px">');
    const svg = svgBox(host, 640, 360), out = H('div', 'wout', host);
    const N = 70, rnd = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const gal = []; for (let i = 0; i < N; i++) gal.push([rnd(i + 1) * 2 - 1, rnd(i + 101) * 2 - 1, rnd(i + 201)]);
    let run = true, u = 0; // u: 0..1 cosmic time (0 = 0.4 Gyr, 1 = 13.8 Gyr)
    const EV = [[0, 'ビッグバン（138億年前）'], [0.0005, '約38万年後：「宇宙の晴れ上がり」――光がまっすぐ進めるようになる'], [0.015, '約2億年後：最初の星が輝き始める（諸説）'], [0.07, '約10億年後までに、銀河が次々に生まれる'], [0.67, '約46億年前：太陽系が生まれる'], [1, '現在：宇宙の年齢は約138億年']];
    ctl.querySelector('.wplay').onclick = (e) => { run = !run; e.target.textContent = run ? '❚❚ 止める' : '▶ 動かす'; };
    ctl.querySelector('.wback').onclick = () => { u = 0; };
    ctl.querySelector('.wt').oninput = (e) => { u = +e.target.value / 1000; };
    const draw = () => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: 640, height: 360 }, svg, 'fill:#0b1020');
      const a = 0.08 + 0.92 * Math.pow(u, 0.66); // scale factor (schematic)
      const cx = 170, cy = 160, R = 140;
      S('circle', { cx, cy, r: R + 4 }, svg, 'fill:none;stroke:#2a3456');
      gal.forEach((g, i) => {
        const x = cx + g[0] * R * a, y = cy + g[1] * R * a; if (Math.hypot(x - cx, y - cy) > R + 2) return;
        const age = u * 13.4 + 0.4, born = g[2] * 2.5 < age;
        if (!born) return;
        S('ellipse', { cx: x, cy: y, rx: 3.2, ry: 1.8, transform: 'rotate(' + (i * 37) + ' ' + x + ' ' + y + ')' }, svg, 'fill:' + (i === 0 ? '#ffd27a' : '#cfd8ff') + ';opacity:.9');
        if (i > 0 && u > 0.05 && i % 7 === 0) { const vx = g[0] * 26 * (0.4 + u), vy = g[1] * 26 * (0.4 + u); S('line', { x1: x, y1: y, x2: x + vx, y2: y + vy, 'marker-end': '' }, svg, 'stroke:#e57b5b;stroke-width:1.2;opacity:.8'); }
      });
      S('circle', { cx, cy, r: 5 }, svg, 'fill:#ffd27a'); txt(svg, '私たちの銀河', cx, cy + 16, 10, 'fill:#ffd27a');
      txt(svg, '空間そのものが広がり、銀河どうしの距離が大きくなる', cx, 318, 10.5, 'fill:#9fb0d9');
      // Hubble diagram
      const X0 = 360, Y0 = 280, Wd = 250, Hd = 190;
      S('line', { x1: X0, y1: Y0, x2: X0 + Wd, y2: Y0 }, svg, 'stroke:#8090b8'); S('line', { x1: X0, y1: Y0, x2: X0, y2: Y0 - Hd }, svg, 'stroke:#8090b8');
      txt(svg, '銀河までの距離 →', X0 + Wd, Y0 + 14, 10, 'fill:#9fb0d9', 'end'); txt(svg, '遠ざかる速さ', X0 + 4, Y0 - Hd - 10, 10, 'fill:#9fb0d9', 'start');
      gal.forEach((g, i) => { if (i % 3) return; const d = Math.hypot(g[0], g[1]); if (d > 1) return; const x = X0 + d * Wd * 0.95, y = Y0 - d * Hd * 0.85 * (0.2 + 0.8 * clamp(u * 1.5, 0, 1)); S('circle', { cx: x, cy: y, r: 2.6 }, svg, 'fill:#e57b5b'); });
      S('line', { x1: X0, y1: Y0, x2: X0 + Wd * 0.95, y2: Y0 - Hd * 0.85 * (0.2 + 0.8 * clamp(u * 1.5, 0, 1)) }, svg, 'stroke:#e57b5b;stroke-dasharray:4 3;opacity:.7');
      txt(svg, 'ハッブル＝ルメートルの法則：遠い銀河ほど速く遠ざかる', X0 + Wd / 2, 46, 10.5, 'fill:#e9e2c8;font-weight:700');
      // timeline
      S('line', { x1: 30, y1: 345, x2: 610, y2: 345 }, svg, 'stroke:#2a3456;stroke-width:6;stroke-linecap:round');
      S('line', { x1: 30, y1: 345, x2: 30 + 580 * u, y2: 345 }, svg, 'stroke:#e57b5b;stroke-width:6;stroke-linecap:round');
      const ev = EV.filter(e => e[0] <= u + 1e-6).pop();
      txt(svg, ev[1], 320, 22, 12.5, 'fill:#fff;font-weight:700');
      txt(svg, '宇宙の年齢：約' + (u * 138 < 1 ? Math.max(0.004, u * 138).toFixed(u * 138 < 0.1 ? 3 : 1) : (u * 138).toFixed(0)) + '億年', 320, 330, 11, 'fill:#cfd8ff', 'middle');
      ctl.querySelector('.wt').value = Math.round(u * 1000);
    };
    out.innerHTML = p.hint || '<b>膨張する宇宙</b>　1929年、アメリカの天文学者ハッブルは、遠くの銀河ほど速い速さで私たちから遠ざかっていることを示した（ベルギーのルメートルも、1927年に同じ関係を導いていた）。これは、宇宙の空間そのものが膨張していることを意味する。時間をさかのぼれば、宇宙はかつて、とても小さく、熱い状態にあったことになる――これが「ビッグバン」の考え方である。1965年に、その名残の電波（宇宙マイクロ波背景放射）が発見されて、ビッグバン理論は広く受け入れられた。現在、宇宙の年齢は約138億年と考えられている。';
    animate(host, (dt) => { if (run) { u += dt / 30; if (u > 1) u = 1; } draw(); });
    draw();
  };

  /* ================= fission: chain reaction, A-bomb designs, H-bomb ================= */
  W.fission = function (host, p) {
    const ctl = ctlBar(host, '<button type="button" data-m="sub" class="on">臨界量より少ない</button><button type="button" data-m="sup">臨界量を超える</button><button type="button" data-m="gun">原爆①ガン型</button><button type="button" data-m="imp">原爆②爆縮型</button><button type="button" data-m="h">水爆</button><button type="button" class="wreplay">↺ もう一度</button>');
    const cv = H('canvas', '', host); cv.width = 1280; cv.height = 640; cv.style.cssText = 'width:100%;max-width:640px;display:block;margin:0 auto;border-radius:8px;background:#0e1320';
    const g = cv.getContext('2d'); g.scale(2, 2);
    const out = H('div', 'wout', host);
    let mode = 'sub', t = 0, nuclei = [], neut = [], frags = [], flashes = [], fis = 0, esc = 0;
    const TXT = {
      sub: '<b>核分裂の連鎖反応（臨界量より少ない場合）</b>　ウラン235の原子核に中性子が当たると、原子核は二つに割れ（核分裂）、大きなエネルギーと、2〜3個の新しい中性子を放出する。しかし、ウランの量が少ないと、飛び出した中性子の多くは、次の原子核に当たる前に外へ逃げてしまい、反応は続かない。',
      sup: '<b>核分裂の連鎖反応（臨界量を超える場合）</b>　ウランの量が一定（臨界量）を超えると、飛び出した中性子が次々に別の原子核を分裂させ、分裂の数は、2倍、4倍、8倍……と、ねずみ算式に増えていく。この連鎖反応が、100万分の1秒ほどの間に一気に進むのが、原子爆弾である。1kgのウラン235がすべて分裂すると、TNT火薬約1万7000トン分のエネルギーが出る。広島の原爆には約64kgのウランが詰められていたが、実際に分裂したのは、そのうちの1kgほどにすぎなかったとされる。',
      gun: '<b>原爆①ガン型（広島の「リトルボーイ」）</b>　臨界量に満たないウラン235の塊を二つに分けておき、火薬の力で一方を砲身の中で撃ち出して、もう一方にぶつける。二つが合わさって臨界量を超えた瞬間に、連鎖反応が始まる。しくみが単純なため、実験をしないまま広島で使われた。',
      imp: '<b>原爆②爆縮型（長崎の「ファットマン」、トリニティ実験）</b>　プルトニウム239の球を、周りに並べた火薬で四方から同時に押しつぶし、密度を高めて臨界を超えさせる（爆縮）。プルトニウムはガン型では早すぎる反応を起こしてしまうため、この複雑な方式が開発された。1945年7月のトリニティ実験は、この方式が働くかどうかを確かめるためのものであった。',
      h: '<b>水素爆弾（水爆）のしくみ</b>　まず、内部の原爆（第1段）を爆発させる。その強烈なX線が容器の中に満ち、第2段の重水素化リチウムなどの燃料を押しつぶして、太陽の中心のような超高温・超高圧の状態をつくる。すると、水素の仲間（重水素と三重水素）の原子核どうしが融合して（核融合）、さらに巨大なエネルギーを生む。核融合の燃料は、理論上いくらでも増やせるため、水爆の威力には、事実上の上限がない。1952年のアメリカの最初の水爆実験の威力は、広島の原爆の約700倍に達した。'
    };
    const reset = () => {
      t = 0; nuclei = []; neut = []; frags = []; flashes = []; fis = 0; esc = 0;
      if (mode === 'sub' || mode === 'sup') {
        const R = mode === 'sub' ? 52 : 118, cx = 320, cy = 165, step = 15;
        for (let y = -R; y <= R; y += step) for (let x = -R; x <= R; x += step) if (x * x + y * y <= R * R) nuclei.push({ x: cx + x + (Math.random() - .5) * 4, y: cy + y + (Math.random() - .5) * 4, alive: true });
        neut.push({ x: 40, y: cy, vx: 120, vy: 0, life: 6 });
      }
      out.innerHTML = TXT[mode];
    };
    const fission = (n) => {
      n.alive = false; fis++;
      flashes.push({ x: n.x, y: n.y, r: 0 });
      const a = Math.random() * 6.28;
      frags.push({ x: n.x, y: n.y, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 1.2 }, { x: n.x, y: n.y, vx: -Math.cos(a) * 40, vy: -Math.sin(a) * 40, life: 1.2 });
      const k = Math.random() < .5 ? 2 : 3;
      for (let i = 0; i < k; i++) { const b = Math.random() * 6.28; neut.push({ x: n.x, y: n.y, vx: Math.cos(b) * 110, vy: Math.sin(b) * 110, life: 4 }); }
    };
    const stepChain = (dt) => {
      neut.forEach(q => {
        q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
        for (const n of nuclei) { if (n.alive && (n.x - q.x) ** 2 + (n.y - q.y) ** 2 < 30) { fission(n); q.life = 0; break; } }
        if (q.life > 0 && (q.x < 0 || q.x > 640 || q.y < 0 || q.y > 320)) { q.life = 0; esc++; }
      });
      neut = neut.filter(q => q.life > 0).slice(-400);
      frags.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt; }); frags = frags.filter(f => f.life > 0);
      flashes.forEach(f => f.r += dt * 60); flashes = flashes.filter(f => f.r < 18);
    };
    const drawChain = () => {
      nuclei.forEach(n => { if (!n.alive) return; g.fillStyle = '#7fb069'; g.beginPath(); g.arc(n.x, n.y, 4.2, 0, 7); g.fill(); });
      flashes.forEach(f => { g.fillStyle = 'rgba(255,220,120,' + (1 - f.r / 18) + ')'; g.beginPath(); g.arc(f.x, f.y, f.r, 0, 7); g.fill(); });
      frags.forEach(f => { g.fillStyle = '#e57b5b'; g.beginPath(); g.arc(f.x, f.y, 3, 0, 7); g.fill(); });
      neut.forEach(q => { g.fillStyle = '#9fd3ff'; g.beginPath(); g.arc(q.x, q.y, 1.8, 0, 7); g.fill(); });
      g.fillStyle = '#cfd8ff'; g.font = '12px sans-serif'; g.textAlign = 'left';
      g.fillText('分裂した原子核：' + fis + '　外へ逃げた中性子：' + esc, 12, 18);
      g.fillStyle = '#7fb069'; g.fillText('● ウラン235の原子核', 12, 308); g.fillStyle = '#9fd3ff'; g.fillText('・ 中性子', 150, 308); g.fillStyle = '#e57b5b'; g.fillText('● 分裂してできた破片', 220, 308);
    };
    const lbl = (s, x, y, c, al) => { g.fillStyle = c || '#cfd8ff'; g.font = '12px sans-serif'; g.textAlign = al || 'center'; g.fillText(s, x, y); };
    const drawGun = () => {
      const u = Math.min(1, t / 3), hit = t > 3;
      g.fillStyle = '#3a4560'; g.fillRect(60, 135, 520, 50);
      g.fillStyle = '#5a6788'; g.fillRect(60, 145, 520, 30);
      g.fillStyle = '#c96'; g.fillRect(70, 147, 30, 26); lbl('火薬', 85, 200);
      const bx = 110 + u * 380;
      g.fillStyle = '#7fb069'; g.fillRect(bx, 149, 50, 22); lbl('ウランの弾丸', 135, 125);
      g.fillStyle = '#7fb069'; g.fillRect(520, 140, 50, 40); lbl('ウランの標的', 545, 125);
      lbl('どちらも臨界量に満たない', 330, 240, '#9fb0d9');
      if (hit) { const k = Math.min(1, (t - 3) / 1.2); g.fillStyle = 'rgba(255,230,140,' + (1 - k * .6) + ')'; g.beginPath(); g.arc(545, 160, 20 + k * 150, 0, 7); g.fill(); lbl('合わさって臨界を超え、連鎖反応が始まる', 330, 275, '#ffd27a'); }
      lbl('リトルボーイ（全長約3m・重さ約4トン）', 330, 30, '#fff');
    };
    const drawImp = () => {
      const cx = 320, cy = 165, u = Math.min(1, t / 2.6), k = Math.max(0, (t - 2.6) / 1.2);
      const Rexp = 120, Rpu = 46 - u * 16;
      for (let i = 0; i < 32; i++) { const a = i / 32 * 6.28; const r0 = Rexp - u * (Rexp - Rpu - 8);
        g.fillStyle = u < 1 ? '#c96' : 'rgba(204,153,102,.3)'; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r0 + 22), cy + Math.sin(a) * (r0 + 22)); g.lineTo(cx + Math.cos(a + .19) * (r0 + 22), cy + Math.sin(a + .19) * (r0 + 22)); g.lineTo(cx + Math.cos(a + .1) * r0, cy + Math.sin(a + .1) * r0); g.fill();
        if (u > 0 && u < 1) { g.strokeStyle = 'rgba(255,200,120,.5)'; g.beginPath(); g.moveTo(cx + Math.cos(a + .1) * (r0 + 2), cy + Math.sin(a + .1) * (r0 + 2)); g.lineTo(cx + Math.cos(a + .1) * (r0 - 10), cy + Math.sin(a + .1) * (r0 - 10)); g.stroke(); } }
      g.fillStyle = '#b48ac0'; g.beginPath(); g.arc(cx, cy, Rpu, 0, 7); g.fill(); lbl('プルトニウム', cx, cy + 4, '#fff');
      if (k > 0) { g.fillStyle = 'rgba(255,230,140,' + Math.max(0.22, 1 - k * .6) + ')'; g.beginPath(); g.arc(cx, cy, Math.min(150, Rpu + k * 160), 0, 7); g.fill(); }
      lbl(u < 1 ? '周りの火薬が同時に爆発し、球を内側へ押しつぶす' : '密度が高まって臨界を超える', cx, 300, '#ffd27a');
      lbl('ファットマン（直径約1.5m・重さ約4.7トン）', 320, 30, '#fff');
    };
    const drawH = () => {
      const s1 = Math.min(1, t / 1.2), s2 = Math.min(1, Math.max(0, (t - 1.2) / 1.6)), s3 = Math.max(0, (t - 2.8) / 1.5);
      g.strokeStyle = '#8090b8'; g.lineWidth = 2; g.strokeRect(80, 90, 480, 150); lbl('容器', 100, 84, '#8090b8', 'left');
      g.fillStyle = '#b48ac0'; g.beginPath(); g.arc(160, 165, 38, 0, 7); g.fill(); lbl('第1段：原爆', 160, 260);
      const sw = 140 - s2 * 50, sh = 90 - s2 * 36;
      g.fillStyle = '#5fa8d3'; g.fillRect(400 - sw / 2, 165 - sh / 2, sw, sh); lbl('第2段：核融合の燃料', 400, 260); lbl('（重水素化リチウム）', 400, 276);
      if (s1 > 0) { g.fillStyle = 'rgba(255,230,140,' + (0.9 - s2 * .4) + ')'; g.beginPath(); g.arc(160, 165, 38 + s1 * 30, 0, 7); g.fill(); }
      if (s2 > 0 && s3 === 0) { g.fillStyle = 'rgba(190,170,255,' + (.35 * s2) + ')'; g.fillRect(82, 92, 476, 146); lbl('X線が容器の中に満ち、燃料を押しつぶす', 320, 70, '#d9ccff'); }
      if (s3 > 0) { g.fillStyle = 'rgba(255,245,200,' + Math.max(0.3, 0.9 - s3 * .5) + ')'; g.beginPath(); g.arc(400, 165, Math.min(230, 30 + s3 * 220), 0, 7); g.fill(); lbl('第1段：原爆', 160, 260); lbl('第2段：核融合の燃料', 400, 260); lbl('核融合：重水素＋三重水素 → ヘリウム＋中性子＋巨大なエネルギー', 320, 70, '#fff3c4'); }
      if (s1 > 0 && s2 === 0) lbl('原爆が爆発する', 320, 70, '#ffd27a');
    };
    const draw = () => {
      g.clearRect(0, 0, 640, 320); g.fillStyle = '#0e1320'; g.fillRect(0, 0, 640, 320);
      if (mode === 'sub' || mode === 'sup') drawChain(); else if (mode === 'gun') drawGun(); else if (mode === 'imp') drawImp(); else drawH();
    };
    ctl.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { mode = b.dataset.m; ctl.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); reset(); });
    ctl.querySelector('.wreplay').onclick = reset;
    reset();
    animate(host, (dt) => { t += dt; if (mode === 'sub' || mode === 'sup') stepChain(Math.min(dt, .05) * .6); draw(); });
    draw();
  };

  /* ================= yields: blast radius comparison (scales with yield^(1/3)) ================= */
  W.yields = function (host, p) {
    const B = p.bombs || [];
    const ctl = ctlBar(host, B.map((b, i) => '<button type="button" data-i="' + i + '"' + (i === B.length - 1 ? ' class="on"' : '') + '>' + CM.esc(b.n) + '</button>').join(''));
    const svg = svgBox(host, 640, 440), out = H('div', 'wout', host);
    const R0 = p.r15 || 1.7; // km for 15 kt
    const rk = (kt) => R0 * Math.pow(kt / 15, 1 / 3);
    let sel = B.length - 1, t = 0;
    const kmMax = 30, cx = 320, cy = 245, sc = 180 / kmMax;
    const fmt = (kt) => kt >= 1000 ? (kt / 1000).toLocaleString('ja-JP', { maximumFractionDigits: 1 }) + 'メガトン' : kt.toLocaleString('ja-JP') + 'キロトン';
    const draw = () => {
      svg.innerHTML = '';
      S('rect', { x: 0, y: 0, width: 640, height: 440 }, svg, 'fill:var(--card)');
      if (p.ref) { const rr = p.ref.r * sc; S('circle', { cx, cy, r: rr }, svg, 'fill:none;stroke:var(--ink-3);stroke-dasharray:5 4'); txt(svg, p.ref.t, cx, cy - rr - 8, 11, 'fill:var(--ink-3)'); }
      B.forEach((b, i) => {
        const r = rk(b.kt) * sc * (i === sel ? Math.min(1, t / 1.2) : 1);
        if (i > sel) return;
        S('circle', { cx, cy, r }, svg, 'fill:' + (i === sel ? 'rgba(229,123,91,.28)' : 'rgba(229,123,91,.08)') + ';stroke:' + (i === sel ? '#b2432a' : 'rgba(178,67,42,.35)') + ';stroke-width:' + (i === sel ? 2 : 1));
      });
      const b = B[sel];
      txt(svg, b.n + '：' + fmt(b.kt) + '（広島の約' + Math.round(b.kt / 15).toLocaleString('ja-JP') + '倍）', 320, 22, 14, 'font-weight:700;fill:var(--accent)');
      txt(svg, '建物が大きく壊れる範囲の目安：半径 約' + rk(b.kt).toFixed(1) + 'km', 320, 42, 12, 'fill:var(--ink-2)');
      S('line', { x1: 40, y1: 425, x2: 40 + 10 * sc, y2: 425 }, svg, 'stroke:var(--ink-2);stroke-width:2'); txt(svg, '10km', 40 + 5 * sc, 413, 10.5, 'fill:var(--ink-2)');
      S('circle', { cx, cy, r: 2 }, svg, 'fill:var(--ink)');
      out.innerHTML = '<b>' + CM.esc(b.n) + '</b>（' + CM.esc(b.y) + '）　' + (b.note || '') + '<br><small>※円の大きさは、爆風で建物が大きく壊れる範囲の目安。爆発の威力が8倍になると、半径は2倍になる（威力の3乗根に比例）という関係から、広島（約15キロトンで半径約' + R0 + 'km）を基準に計算した概算である。実際の被害は、爆発の高さや地形、熱線・放射線によっても変わる。</small>';
    };
    ctl.querySelectorAll('[data-i]').forEach(bt => bt.onclick = () => { sel = +bt.dataset.i; t = 0; ctl.querySelectorAll('[data-i]').forEach(x => x.classList.toggle('on', x === bt)); });
    animate(host, (dt) => { if (t < 1.3) { t += dt; draw(); } });
    draw();
  };
})();
