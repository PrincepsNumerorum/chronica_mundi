/* CHRONICA MUNDI map engine: twha territory raster (equirectangular, 10 px/deg) + Natural Earth vectors + animated overlays */
(function () {
  'use strict';
  const T = 450, NX = 8, NY = 4, W = T * NX, H = T * NY; // world pixel space at scale 1 (10 px per degree)
  const MIN_YEAR = -4000, MAX_DATA_YEAR = 2019;
  const LEVEL_Z = [0, 0.85, 1.7, 3.2, 6];

  // polity fill palette (class 2..29), muted atlas tones
  const PAL_LIGHT = ['#d88a7a', '#e0b062', '#a9bb6c', '#6fae95', '#78a7cf', '#a690c9', '#cf95b9', '#c4ac6c', '#82b9bb', '#e39a83', '#93b273', '#b39a84',
    '#7697bb', '#c5a8cf', '#dcbb72', '#8fbb8f', '#bb8763', '#7fa5a6', '#c98a9f', '#a0a9cf', '#d3bb8f', '#86acd0', '#adc172', '#d3a272', '#9797c7', '#c0c77d', '#d7a5a5', '#8d8d8d'];
  const PAL_DARK = ['#b8604f', '#c08d3e', '#879a49', '#4f8c74', '#5785ad', '#836ca8', '#ab7096', '#a38b4a', '#5f9799', '#c27561', '#719052', '#927a63',
    '#56779b', '#a487ae', '#bb9a50', '#6e9a6e', '#9a6644', '#5f8586', '#a76a7f', '#7f88ad', '#b29a6e', '#668bae', '#8ca050', '#b28150', '#7676a6', '#9fa65c', '#b68484', '#6d6d6d'];
  const SIDE = { a: '#b2432a', b: '#2f4f7a', c: '#94711f', d: '#2a6b66', e: '#6c4a7d', f: '#3d3d3d', g: '#5f6d2c', h: '#8a2f2f' };

  const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const ll2w = (lon, lat) => [(lon + 180) * 10, (90 - lat) * 10];
  const w2ll = (x, y) => [x / 10 - 180, 90 - y / 10];
  CM.ll2w = ll2w; CM.w2ll = w2ll;
  // corners rounded with tangent arcs (no kinks); waypoint labels move to the nearest curve point
  const smoothRoute = (P, labels) => {
    const r = CM.roundPts(P, labels.map(Boolean), 16);
    const lab = r.pts.map(() => null);
    labels.forEach((l, i) => { if (l) lab[r.idx[i]] = l; });
    return { pts: r.pts, labels: lab };
  };
  CM.sideColor = (s) => SIDE[s] || s || SIDE.a;

  /* ---------------- shared data cache ---------------- */
  const shared = { ready: null, tileCache: new Map(), relief: null, reliefTheme: null, paths: null };
  function ensureBase() {
    if (!shared.ready) shared.ready = CM.loadAll(['data/map/terr_index.js', 'data/map/relief.js', 'data/map/polities.js', 'data/geo/base.js', 'data/geo/places.js', 'data/geo/routes.js']);
    return shared.ready;
  }
  let terrPromise = null;
  function ensureTerritory() {
    if (!terrPromise) terrPromise = ensureBase().then(() => CM.loadAll(Object.keys(CM.terrIndex).map(k => 'data/map/terr_' + k + '.js')));
    return terrPromise;
  }
  CM.ensureMapData = ensureTerritory;

  function decodeB64Png(b64) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img); img.onerror = reject;
      img.src = 'data:image/png;base64,' + b64;
    });
  }
  const scratch = document.createElement('canvas'); scratch.width = T; scratch.height = T;
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  async function tileClasses(key, yr) {
    const ck = key + ':' + yr;
    if (shared.tileCache.has(ck)) { const v = shared.tileCache.get(ck); shared.tileCache.delete(ck); shared.tileCache.set(ck, v); return v; }
    const img = await decodeB64Png(CM.terr[key][String(yr)]);
    sctx.clearRect(0, 0, T, T); sctx.drawImage(img, 0, 0);
    const d = sctx.getImageData(0, 0, T, T).data;
    const out = new Uint8Array(T * T);
    for (let p = 0, q = 0; p < out.length; p++, q += 4) out[p] = (d[q] + 4) >> 3;
    shared.tileCache.set(ck, out);
    if (shared.tileCache.size > 220) shared.tileCache.delete(shared.tileCache.keys().next().value);
    return out;
  }
  function tileYear(key, year) {
    const ys = CM.terrIndex[key];
    if (!ys || year < MIN_YEAR) return null;
    let lo = 0, hi = ys.length - 1, ans = ys[0];
    while (lo <= hi) { const m = (lo + hi) >> 1; if (ys[m] <= year) { ans = ys[m]; lo = m + 1; } else hi = m - 1; }
    return ans;
  }
  async function buildRelief() {
    const dark = CM.isDark();
    const tv = CM.tv();
    const theme = tv.sea + tv.relief.join();
    if (shared.relief && shared.reliefTheme === theme) return shared.relief;
    const land = tv.relief.length === 3 ? tv.relief : [233, 230, 219];
    const sea = hex2rgb(tv.sea || '#c4d5d8');
    const tiles = {};
    for (const key of Object.keys(CM.relief)) {
      const img = await decodeB64Png(CM.relief[key]);
      const c = document.createElement('canvas'); c.width = T; c.height = T;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      const id = g.getImageData(0, 0, T, T), d = id.data;
      for (let q = 0; q < d.length; q += 4) {
        const r = d[q], gg = d[q + 1], b = d[q + 2];
        if (b > r + 25) { d[q] = sea[0]; d[q + 1] = sea[1]; d[q + 2] = sea[2]; }
        else {
          const L = (r + gg + b) / 765; // 0..1, relief shading
          const f = dark ? (0.55 + L * 0.75) : (0.78 + L * 0.27);
          d[q] = Math.min(255, land[0] * f); d[q + 1] = Math.min(255, land[1] * f); d[q + 2] = Math.min(255, land[2] * f);
        }
      }
      g.putImageData(id, 0, 0);
      tiles[key] = c;
    }
    shared.relief = tiles; shared.reliefTheme = theme; CM._reliefTiles = tiles;
    return tiles;
  }
  function decodeLine(arr, out) {
    let x = 0, y = 0;
    for (let i = 0; i < arr.length; i += 2) { x += arr[i]; y += arr[i + 1]; out.push((x / 100 + 180) * 10, (90 - y / 100) * 10); }
    return out;
  }
  function buildPaths() {
    if (shared.paths) return shared.paths;
    const G = CM.geo, P = { coast: new Path2D(), lakes: new Path2D(), shelf: new Path2D(), rivers: [new Path2D(), new Path2D(), new Path2D()] };
    const add = (path, arr, close) => {
      const pts = decodeLine(arr, []);
      for (let i = 0; i < pts.length; i += 2) {
        if (i && Math.abs(pts[i] - pts[i - 2]) > W / 2) { path.moveTo(pts[i], pts[i + 1]); continue; }
        i ? path.lineTo(pts[i], pts[i + 1]) : path.moveTo(pts[i], pts[i + 1]);
      }
      if (close) path.closePath();
    };
    G.coast.forEach(a => add(P.coast, a));
    G.lakes.forEach(l => { if (l[0] <= 6) add(P.lakes, l[1], true); });
    G.shelf.forEach(a => add(P.shelf, a, true));
    G.rivers.forEach(r => add(P.rivers[r[0] <= 3 ? 0 : r[0] <= 6 ? 1 : 2], r[2]));
    shared.paths = P;
    return P;
  }

  /* ---------------- MapView ---------------- */
  class MapView {
    constructor(container, opts) {
      this.opts = Object.assign({ interactive: true, labels: true, hud: true, onYear: null, onClickPolity: true }, opts || {});
      this.el = CM.h('div', { class: 'mapview' });
      this.canvas = CM.h('canvas');
      this.el.appendChild(this.canvas);
      this.hud = CM.h('div', { class: 'map-hud' }, '<div class="map-year"></div><div class="map-caption"></div>');
      if (!this.opts.hud) this.hud.hidden = true;
      this.legend = CM.h('div', { class: 'map-legend' });
      this.ctrl = CM.h('div', { class: 'map-ctrl' }, '<button type="button" data-z="1" aria-label="拡大">＋</button><button type="button" data-z="-1" aria-label="縮小">−</button><button type="button" data-z="0" aria-label="場面の表示に戻す" title="場面の表示に戻す">⟲</button>');
      this.loadingEl = CM.h('div', { class: 'map-loading' }, '地図データを読み込み中…');
      this.el.append(this.hud, this.legend, this.ctrl, this.loadingEl);
      container.appendChild(this.el);
      this.ctx = this.canvas.getContext('2d');
      this.year = 1000; this.cx = W / 2; this.cy = H / 2 - 100; this.z = 0.35;
      this.cls = new Uint8Array(W * H);
      this.tiles = []; // per tile: {key, yr, fill, border}
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) this.tiles.push({ i, j, key: '' + i + j, yr: undefined, fill: null, border: null });
      this.ov = { places: [], routes: [], areas: [], labels: [], pulses: [] };
      this.hl = null; this.hlNames = [];
      this.anim = null; this.routeT0 = 0; this.dirty = true; this.alive = true;
      this.homeView = null;
      this.labelsOn = this.opts.labels;
      this._yearToken = 0;
      this._resize = () => this.resize();
      this._theme = () => this.retheme();
      window.addEventListener('resize', this._resize);
      document.addEventListener('cm:theme', this._theme);
      this.ro = window.ResizeObserver ? new ResizeObserver(this._resize) : null;
      if (this.ro) this.ro.observe(this.el);
      this.resize();
      this.bindInput();
      this.ready = ensureTerritory().then(() => buildRelief()).then(() => { buildPaths(); this.loadingEl.remove(); this.loaded = true; return this.setYear(this.year, true); })
        .catch(err => { this.loadingEl.textContent = '地図を表示できませんでした：' + err.message; });
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
    destroy() {
      this.alive = false;
      window.removeEventListener('resize', this._resize);
      document.removeEventListener('cm:theme', this._theme);
      if (this.ro) this.ro.disconnect();
      this.el.remove();
    }
    resize() {
      const r = this.el.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.cw = Math.max(1, r.width); this.ch = Math.max(1, r.height);
      this.canvas.width = Math.round(this.cw * this.dpr); this.canvas.height = Math.round(this.ch * this.dpr);
      this.dirty = true;
    }
    async retheme() {
      if (!this.loaded) return;
      await buildRelief();
      this.tiles.forEach(t => { t.yr = undefined; });
      await this.setYear(this.year, true);
    }

    /* ---- year / territory ---- */
    async setYear(year, force) {
      year = Math.round(year);
      if (year === 0) year = 1;
      this.year = year;
      this.updateHudYear();
      if (!this.loaded) return;
      const token = ++this._yearToken;
      const dataYear = Math.min(year, MAX_DATA_YEAR);
      const changed = [];
      await Promise.all(this.tiles.map(async (t) => {
        const yr = tileYear(t.key, dataYear);
        if (!force && yr === t.yr) return;
        const cls = yr == null ? null : await tileClasses(t.key, yr);
        if (token !== this._yearToken) return;
        t.yr = yr; t.pending = cls; changed.push(t);
      }));
      if (token !== this._yearToken) return;
      if (changed.length) {
        changed.forEach(t => this.writeCls(t, t.pending));
        const near = new Set();
        changed.forEach(t => { near.add(t); this.neighbors(t).forEach(n => near.add(n)); });
        near.forEach(t => this.paintTile(t));
        if (this.hlNames.length) this.highlight(this.hlNames);
      }
      this.computeLabels();
      this.dirty = true;
      if (this.opts.onYear) this.opts.onYear(year);
    }
    writeCls(t, cls) {
      const x0 = t.i * T, y0 = t.j * T;
      for (let y = 0; y < T; y++) {
        const row = (y0 + y) * W + x0;
        if (cls) this.cls.set(cls.subarray(y * T, y * T + T), row); else this.cls.fill(1, row, row + T);
      }
    }
    neighbors(t) {
      const out = [];
      const L = this.tiles[t.j * NX + (t.i + NX - 1) % NX]; out.push(L);
      if (t.j > 0) out.push(this.tiles[(t.j - 1) * NX + t.i]);
      return out;
    }
    paintTile(t) {
      const pal = (CM.isDark() ? PAL_DARK : PAL_LIGHT).map(hex2rgb);
      const borderRGB = CM.isDark() ? [12, 14, 18] : [60, 50, 40];
      if (!t.fill) { t.fill = document.createElement('canvas'); t.fill.width = T; t.fill.height = T; t.border = document.createElement('canvas'); t.border.width = T; t.border.height = T; }
      const fg = t.fill.getContext('2d'), bg = t.border.getContext('2d');
      const fi = fg.createImageData(T, T), bi = bg.createImageData(T, T), fd = fi.data, bd = bi.data;
      const x0 = t.i * T, y0 = t.j * T, C = this.cls;
      for (let y = 0; y < T; y++) {
        const gy = y0 + y;
        for (let x = 0; x < T; x++) {
          const gx = x0 + x, p = gy * W + gx, c = C[p], q = (y * T + x) * 4;
          if (c >= 2) { const col = pal[(c - 2) % pal.length]; fd[q] = col[0]; fd[q + 1] = col[1]; fd[q + 2] = col[2]; fd[q + 3] = 255; }
          if (c === 0) continue;
          const r = C[gy * W + (gx + 1) % W], d = gy + 1 < H ? C[p + W] : c;
          if ((r !== c && r !== 0 && !(r === 1 && c === 1)) || (d !== c && d !== 0 && !(d === 1 && c === 1))) {
            bd[q] = borderRGB[0]; bd[q + 1] = borderRGB[1]; bd[q + 2] = borderRGB[2]; bd[q + 3] = 210;
          }
        }
      }
      fg.putImageData(fi, 0, 0); bg.putImageData(bi, 0, 0);
    }

    /* ---- polities / labels ---- */
    politiesAt(year) {
      const out = [];
      if (!CM.polities) return out;
      const y = Math.min(year, MAX_DATA_YEAR);
      for (let k = 0; k < CM.polities.length; k++) {
        const p = CM.polities[k];
        if (y < p.s || y >= p.e) continue;
        let n = null;
        for (const e of p.n) { n = e; if (y < e[1]) break; }
        if (!n || !n[2]) continue;
        out.push({ k, p, name: n[2], en: n[3], abbr: n[4] || n[2], x: n[5], y: n[6], lv: n[7] });
      }
      return out;
    }
    computeLabels() { this.labels = this.year < MIN_YEAR ? [] : this.politiesAt(this.year); this.dirty = true; }
    findPolity(name) {
      const list = this.politiesAt(this.year);
      return list.find(l => l.name === name || l.abbr === name) || list.find(l => l.name.indexOf(name) >= 0 || (l.abbr && l.abbr.indexOf(name) >= 0));
    }
    floodFrom(px, py) {
      px = Math.round(px); py = Math.round(py);
      const C = this.cls;
      let start = -1;
      outer: for (let r = 0; r <= 18; r += 2) {
        for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) {
          const x = (px + dx + W) % W, y = py + dy;
          if (y < 0 || y >= H) continue;
          if (C[y * W + x] >= 2) { start = y * W + x; break outer; }
        }
      }
      if (start < 0) return null;
      const c = C[start], mask = new Uint8Array(W * H), stack = [start];
      let minx = W, maxx = 0, miny = H, maxy = 0, n = 0;
      mask[start] = 1;
      while (stack.length) {
        const p = stack.pop(), x = p % W, y = (p / W) | 0; n++;
        if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
        const nb = [y * W + (x + 1) % W, y * W + (x + W - 1) % W, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
        for (const q of nb) if (q >= 0 && !mask[q] && C[q] === c) { mask[q] = 1; stack.push(q); }
      }
      return { mask, minx, maxx, miny, maxy, n };
    }
    highlight(names, color) {
      this.hlNames = names || [];
      this.hl = null;
      if (!this.hlNames.length || !this.loaded) { this.dirty = true; return; }
      const parts = [];
      for (const nm of this.hlNames) {
        const pol = this.findPolity(nm);
        if (!pol) continue;
        const f = this.floodFrom(pol.x, pol.y);
        if (f) parts.push(f);
      }
      if (!parts.length) { this.dirty = true; return; }
      let minx = W, maxx = 0, miny = H, maxy = 0;
      parts.forEach(f => { minx = Math.min(minx, f.minx); maxx = Math.max(maxx, f.maxx); miny = Math.min(miny, f.miny); maxy = Math.max(maxy, f.maxy); });
      const bw = maxx - minx + 3, bh = maxy - miny + 3;
      const c = document.createElement('canvas'); c.width = bw; c.height = bh;
      const g = c.getContext('2d'), id = g.createImageData(bw, bh), d = id.data;
      const col = hex2rgb(color || (CM.isDark() ? '#e06a4f' : '#b2432a'));
      const M = new Uint8Array(W * H);
      parts.forEach(f => { for (let i = 0; i < M.length; i++) if (f.mask[i]) M[i] = 1; });
      for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
        const p = y * W + x; if (!M[p]) continue;
        const q = ((y - miny + 1) * bw + (x - minx + 1)) * 4;
        const edge = !M[p - 1] || !M[p + 1] || !M[p - W] || !M[p + W];
        d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; d[q + 3] = edge ? 255 : 95;
      }
      g.putImageData(id, 0, 0);
      this.hl = { canvas: c, x: minx - 1, y: miny - 1, w: bw, h: bh };
      this.dirty = true;
    }

    /* ---- camera ---- */
    setView(lon, lat, z) { const [x, y] = ll2w(lon, lat); this.cx = x; this.cy = y; this.z = z; this.clampView(); this.dirty = true; }
    flyTo(lon, lat, z, ms) {
      const [tx, ty] = ll2w(lon, lat);
      if (ms == null) ms = 1400;
      if (CM.reducedMotion() || ms <= 0) { this.cx = tx; this.cy = ty; this.z = z; this.clampView(); this.dirty = true; return; }
      let dx = tx - this.cx; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
      this.anim = { t0: performance.now(), ms, x0: this.cx, y0: this.cy, dx, dy: ty - this.cy, lz0: Math.log(this.z), lz1: Math.log(z) };
    }
    clampView() {
      this.z = CM.clamp(this.z, 0.18, 14);
      this.cx = ((this.cx % W) + W) % W;
      const halfH = this.ch / 2 / this.z;
      this.cy = H < 2 * halfH ? H / 2 : CM.clamp(this.cy, halfH, H - halfH);
    }
    screenToWorld(sx, sy) { return [this.cx + (sx - this.cw / 2) / this.z, this.cy + (sy - this.ch / 2) / this.z]; }
    bindInput() {
      const el = this.canvas;
      const ptrs = new Map(); let drag = null, pinch = null, moved = false;
      el.addEventListener('pointerdown', (e) => {
        el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.offsetX, e.offsetY]); moved = false; this.anim = null;
        if (ptrs.size === 1) drag = { x: e.offsetX, y: e.offsetY, cx: this.cx, cy: this.cy };
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: this.z }; drag = null; }
      });
      el.addEventListener('pointermove', (e) => {
        if (!ptrs.has(e.pointerId)) {
          if (this.opts.interactive) { const [wx, wy] = this.screenToWorld(e.offsetX, e.offsetY); this.hover = [wx, wy]; }
          return;
        }
        ptrs.set(e.pointerId, [e.offsetX, e.offsetY]);
        if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; this.z = pinch.z * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d; moved = true; this.clampView(); this.dirty = true; return; }
        if (drag) {
          const dx = e.offsetX - drag.x, dy = e.offsetY - drag.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
          this.cx = drag.cx - dx / this.z; this.cy = drag.cy - dy / this.z; this.clampView(); this.dirty = true;
        }
      });
      const up = (e) => {
        ptrs.delete(e.pointerId);
        if (ptrs.size < 2) pinch = null;
        if (!ptrs.size) {
          if (!moved && drag && this.opts.onClickPolity && this.loaded) this.clickAt(e.offsetX, e.offsetY);
          drag = null;
        }
      };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      el.addEventListener('wheel', (e) => {
        e.preventDefault(); this.anim = null;
        const [wx, wy] = this.screenToWorld(e.offsetX, e.offsetY);
        const f = Math.exp(-e.deltaY * 0.0015);
        this.z *= f; this.clampView();
        this.cx = wx - (e.offsetX - this.cw / 2) / this.z; this.cy = wy - (e.offsetY - this.ch / 2) / this.z; this.clampView();
        this.dirty = true;
      }, { passive: false });
      this.ctrl.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const z = +b.getAttribute('data-z');
        if (z === 0) { if (this.homeView) this.flyTo(this.homeView[0], this.homeView[1], this.homeView[2], 900); return; }
        const ll = w2ll(this.cx, this.cy);
        this.flyTo(ll[0], ll[1], this.z * (z > 0 ? 1.6 : 1 / 1.6), 350);
      });
    }
    clickAt(sx, sy) {
      let [wx, wy] = this.screenToWorld(sx, sy);
      wx = ((wx % W) + W) % W;
      if (wy < 0 || wy >= H) return;
      // place markers first
      const hitPlace = this.ov.places.find(p => { const s = this.worldToScreen(p.x, p.y); return Math.hypot(s[0] - sx, s[1] - sy) < 10; });
      if (hitPlace && hitPlace.href) { location.hash = hitPlace.href; return; }
      const f = this.floodFrom(wx, wy);
      this.closeCard();
      if (!f) return;
      const inside = this.labels.filter(l => f.mask[Math.round(l.y) * W + ((Math.round(l.x) % W) + W) % W]);
      inside.sort((a, b) => a.lv - b.lv);
      const pol = inside[0];
      if (!pol) return;
      this.hlNames = [pol.name]; this.highlight([pol.name]);
      this.showCard(pol, sx, sy);
    }
    showCard(pol, sx, sy) {
      const y = Math.min(this.year, MAX_DATA_YEAR);
      const leaders = [];
      pol.p.L.forEach(grp => grp.p.forEach(pp => { if (y >= pp[0] && y < pp[1]) leaders.push([grp.t, pp[2], pp[0], pp[1]]); }));
      const yr = (v) => v <= -4000 ? '' : CM.fmtYearShort(v);
      const term = CM.findTerm(pol.name) || CM.findTerm(pol.abbr);
      let html = '<button type="button" class="iconbtn close" aria-label="閉じる">×</button><h4>' + CM.esc(pol.name) + '</h4><div class="en">' + CM.esc(pol.en || '') + '</div><dl>' +
        '<dt>存続</dt><dd class="num">' + yr(pol.p.s) + '〜' + (pol.p.e > 2019 ? '' : yr(pol.p.e)) + '</dd>';
      leaders.slice(0, 6).forEach(l => { html += '<dt>' + CM.esc(l[0] || '指導者') + '</dt><dd>' + CM.esc(l[1]) + ' <span class="muted num">(' + yr(l[2]) + '–' + (l[3] > 2019 ? '' : yr(l[3])) + ')</span></dd>'; });
      html += '</dl>' + (term ? '<p style="margin:8px 0 0"><a href="#" data-term="' + CM.esc(term.h) + '">用語解説を開く</a></p>' : '') +
        '<p class="muted" style="margin:8px 0 0;font-size:11px">範囲・名称は概略（World Historical Atlas）</p>';
      const card = CM.h('div', { class: 'map-card' }, html);
      const x = CM.clamp(sx + 12, 8, this.cw - 330), yy = CM.clamp(sy - 20, 50, this.ch - 200);
      card.style.left = x + 'px'; card.style.top = yy + 'px';
      card.querySelector('.close').addEventListener('click', () => this.closeCard());
      const tl = card.querySelector('[data-term]');
      if (tl) tl.addEventListener('click', (e) => { e.preventDefault(); CM.openTerm(tl.getAttribute('data-term')); });
      this.el.appendChild(card); this.card = card;
    }
    closeCard() { if (this.card) { this.card.remove(); this.card = null; } }
    worldToScreen(x, y) {
      let dx = x - this.cx; if (dx > W / 2) dx -= W; if (dx < -W / 2) dx += W;
      return [this.cw / 2 + dx * this.z, this.ch / 2 + (y - this.cy) * this.z];
    }

    /* ---- overlays ---- */
    setOverlays(spec) {
      spec = spec || {};
      const resolvePlace = (p) => {
        const d = typeof p === 'string' ? Object.assign({ id: p }, CM.places[p] || {}) : p;
        if (d.lon == null) return null;
        const [x, y] = ll2w(d.lon, d.lat);
        return Object.assign({}, d, { x, y });
      };
      this.ov.places = (spec.places || []).map(resolvePlace).filter(Boolean);
      const resolveRoute = (r, i) => {
        const d = typeof r === 'string' ? Object.assign({ id: r }, CM.routes[r] || {}) : Object.assign({}, r);
        if (!d.pts || d.pts.length < 2) return null;
        const pts = d.pts.map(p => ll2w(p[0], p[1]));
        // unwrap longitudes so a route never jumps across the map
        for (let k = 1; k < pts.length; k++) { while (pts[k][0] - pts[k - 1][0] > W / 2) pts[k][0] -= W; while (pts[k][0] - pts[k - 1][0] < -W / 2) pts[k][0] += W; }
        let labels = d.pts.map(p => p[2] || null), wpts = pts;
        if (!d.straight && pts.length > 2) { const sm = smoothRoute(pts, labels); wpts = sm.pts; labels = sm.labels; }
        const cum = [0]; for (let k = 1; k < wpts.length; k++) cum.push(cum[k - 1] + Math.hypot(wpts[k][0] - wpts[k - 1][0], wpts[k][1] - wpts[k - 1][1]));
        return Object.assign({ delay: (d.delay != null ? d.delay : i * 0.35), dur: d.dur || 1.8 }, d, { wpts, cum, labels });
      };
      this.ov.routes = (spec.routes || []).map(resolveRoute).filter(Boolean);
      this.ov.areas = (spec.areas || []).map(a => typeof a === 'string' ? CM.areas[a] : a).filter(Boolean).map(a => {
        const w = a.pts.map(p => ll2w(p[0], p[1]));
        for (let k = 1; k < w.length; k++) { while (w[k][0] - w[k - 1][0] > W / 2) w[k][0] -= W; while (w[k][0] - w[k - 1][0] < -W / 2) w[k][0] += W; }
        return Object.assign({}, a, { wpts: w });
      });
      this.ov.labels = (spec.labels || []).map(l => typeof l === 'string' ? CM.glabels[l] : l).filter(Boolean).map(l => { const [x, y] = ll2w(l.lon, l.lat); return Object.assign({}, l, { x, y }); });
      this.ov.pulses = (spec.pulses || []).map(resolvePlace).filter(Boolean);
      this.routeT0 = performance.now();
      this.setLegend(spec.legend);
      this.dirty = true;
    }
    setLegend(items) {
      this.legend.innerHTML = (items || []).map(it => '<span><i style="background:' + CM.esc(CM.sideColor(it.c)) + (it.dash ? ';background:repeating-linear-gradient(90deg,' + CM.esc(CM.sideColor(it.c)) + ' 0 4px,transparent 4px 7px)' : '') + '"></i>' + CM.esc(it.t) + '</span>').join('');
    }
    setCaption(html) { this.hud.querySelector('.map-caption').innerHTML = html || ''; }
    updateHudYear() {
      const el = this.hud.querySelector('.map-year');
      el.innerHTML = CM.esc(this.yearLabel || CM.fmtYear(this.year)) + (this.subLabel ? '<small>' + CM.esc(this.subLabel) + '</small>' : '');
    }
    // apply a lesson/atlas scene spec
    async apply(s, opts) {
      opts = opts || {};
      this.yearLabel = s.ylabel || null; this.subLabel = s.sub || null;
      this.closeCard();
      if (s.view) { this.homeView = s.view; opts.instant ? this.setView(s.view[0], s.view[1], s.view[2]) : this.flyTo(s.view[0], s.view[1], s.view[2], s.ms); }
      this.setOverlays(s);
      this.setCaption(s.caption ? CM.esc(s.caption) : '');
      if (s.play && !CM.reducedMotion()) {
        this.hlNames = s.hl || [];
        await this.playYears(s.play[0], s.play[1], s.play[2] || 3);
      } else {
        await this.setYear(s.year != null ? s.year : this.year);
        this.highlight(s.hl || []);
      }
    }
    async playYears(y0, y1, sec) {
      const token = (this._playToken = (this._playToken || 0) + 1);
      const steps = Math.min(80, Math.abs(y1 - y0));
      const t0 = performance.now();
      for (let k = 0; k <= steps; k++) {
        if (token !== this._playToken || !this.alive) return;
        const y = Math.round(y0 + (y1 - y0) * k / steps);
        await this.setYear(y);
        const wait = t0 + (k + 1) * sec * 1000 / steps - performance.now();
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
      }
      this.highlight(this.hlNames);
    }
    stopPlay() { this._playToken = (this._playToken || 0) + 1; }

    /* ---- render ---- */
    loop(now) {
      if (!this.alive) return;
      if (this.anim) {
        const a = this.anim, t = Math.min(1, (now - a.t0) / a.ms), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // zoom out mid-flight for long hops
        const dist = Math.hypot(a.dx, a.dy) * Math.exp(a.lz0);
        const bump = dist > 600 ? Math.sin(Math.PI * e) * Math.min(1.1, dist / 1500) : 0;
        this.cx = a.x0 + a.dx * e; this.cy = a.y0 + a.dy * e;
        this.z = Math.exp(a.lz0 + (a.lz1 - a.lz0) * e - bump);
        this.clampView();
        if (t >= 1) this.anim = null;
        this.dirty = true;
      }
      const routesAnimating = this.ov.routes.some(r => (now - this.routeT0) / 1000 < r.delay + r.dur) || this.ov.routes.some(r => r.flow) || this.ov.pulses.length;
      if (this.dirty || routesAnimating) { this.draw(now); this.dirty = false; }
      requestAnimationFrame(this.loop);
    }
    eachWrap(fn) {
      // call fn(offsetX) for each horizontal world copy that intersects the screen
      const halfW = this.cw / 2 / this.z;
      for (let k = -1; k <= 1; k++) {
        const ox = k * W;
        if (ox + W < this.cx - halfW || ox > this.cx + halfW) continue;
        fn(ox);
      }
    }
    draw(now) {
      const g = this.ctx, dpr = this.dpr, z = this.z;
      const dark = CM.isDark();
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.fillStyle = CM.tv().sea;
      g.fillRect(0, 0, this.cw, this.ch);
      if (!this.loaded) return;
      const tx = this.cw / 2 - this.cx * z, ty = this.ch / 2 - this.cy * z;
      const halfW = this.cw / 2 / z, halfH = this.ch / 2 / z;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const showTerr = this.year >= MIN_YEAR;
      this.eachWrap((ox) => {
        g.setTransform(dpr * z, 0, 0, dpr * z, dpr * (tx + ox * z), dpr * ty);
        for (const t of this.tiles) {
          const x = t.i * T + ox, y = t.j * T;
          if (x + T < this.cx - halfW || x > this.cx + halfW || y + T < this.cy - halfH || y > this.cy + halfH) continue;
          const rel = shared.relief && shared.relief[t.key];
          if (rel) g.drawImage(rel, t.i * T, y, T + 0.5, T + 0.5);
          if (showTerr && t.fill) { g.globalAlpha = dark ? 0.5 : 0.5; g.drawImage(t.fill, t.i * T, y, T + 0.5, T + 0.5); g.globalAlpha = 1; }
        }
        if (this.hl) g.drawImage(this.hl.canvas, this.hl.x, this.hl.y, this.hl.w, this.hl.h);
        if (showTerr) {
          g.globalAlpha = Math.min(0.9, 0.35 + z * 0.12);
          for (const t of this.tiles) {
            const x = t.i * T + ox, y = t.j * T;
            if (!t.border || x + T < this.cx - halfW || x > this.cx + halfW || y + T < this.cy - halfH || y > this.cy + halfH) continue;
            g.drawImage(t.border, t.i * T, y, T + 0.5, T + 0.5);
          }
          g.globalAlpha = 1;
        }
        const P = shared.paths;
        if (P) {
          if (this.year < -9000) { g.fillStyle = dark ? 'rgba(90,100,90,.35)' : 'rgba(200,190,160,.45)'; g.fill(P.shelf, 'evenodd'); }
          g.fillStyle = CM.tv().sea; g.fill(P.lakes);
          g.strokeStyle = dark ? 'rgba(110,160,190,.75)' : 'rgba(70,120,150,.7)';
          g.lineWidth = 0.9 / z; g.stroke(P.rivers[0]);
          if (z > 0.9) { g.lineWidth = 0.7 / z; g.stroke(P.rivers[1]); }
          if (z > 2.2) { g.lineWidth = 0.6 / z; g.stroke(P.rivers[2]); }
          g.strokeStyle = dark ? 'rgba(160,190,200,.55)' : 'rgba(40,70,85,.55)'; g.lineWidth = 0.8 / z; g.stroke(P.coast);
        }
      });
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawOverlays(g, now);
      if (this.labelsOn) this.drawLabels(g);
    }
    drawOverlays(g, now) {
      const t = (now - this.routeT0) / 1000;
      const dark = CM.isDark();
      const Q = []; // deferred labels: {pri, text, x, y, size, color, weight, italic, cands:[[dx,dy,align]]}
      // areas
      for (const a of this.ov.areas) {
        g.beginPath();
        const s0 = this.worldToScreen(a.wpts[0][0], a.wpts[0][1]);
        a.wpts.forEach((p, i) => { const sx = s0[0] + (p[0] - a.wpts[0][0]) * this.z, sy = s0[1] + (p[1] - a.wpts[0][1]) * this.z; i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); });
        g.closePath();
        const c = CM.sideColor(a.c);
        g.fillStyle = c; g.globalAlpha = a.alpha || 0.22; g.fill(); g.globalAlpha = 1;
        g.strokeStyle = c; g.lineWidth = 1.5; g.setLineDash(a.dash ? [6, 4] : []); g.stroke(); g.setLineDash([]);
        if (a.label) { const cpt = a.lp ? this.worldToScreen(...ll2w(a.lp[0], a.lp[1])) : this.worldToScreen(a.wpts[0][0], a.wpts[0][1]); Q.push({ pri: 3, text: a.label, x: cpt[0], y: cpt[1], size: 12, color: c, weight: '700', cands: [[0, 0, 'center'], [0, -16, 'center'], [0, 16, 'center']] }); }
      }
      // routes
      for (const r of this.ov.routes) {
        const f = CM.reducedMotion() ? 1 : CM.clamp((t - r.delay) / r.dur, 0, 1);
        if (f <= 0) continue;
        const total = r.cum[r.cum.length - 1], len = total * f;
        const col = CM.sideColor(r.c), w = r.w || 3;
        const b0 = this.worldToScreen(r.wpts[0][0], r.wpts[0][1]), zz = this.z, x0 = r.wpts[0][0], y0 = r.wpts[0][1];
        const R = (x, y) => [b0[0] + (x - x0) * zz, b0[1] + (y - y0) * zz];
        g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
        g.setLineDash(r.dash ? [8, 6] : []);
        if (r.flow) { g.setLineDash([10, 8]); g.lineDashOffset = -((now / 40) % 18); }
        g.beginPath();
        let tip = null, prev = null, k;
        for (k = 0; k < r.wpts.length; k++) {
          const wp = r.wpts[k];
          const s = R(wp[0], wp[1]);
          if (r.cum[k] <= len) { k ? g.lineTo(s[0], s[1]) : g.moveTo(s[0], s[1]); prev = s; tip = s; }
          else {
            const a = r.wpts[k - 1], seg = r.cum[k] - r.cum[k - 1], u = (len - r.cum[k - 1]) / seg;
            const s2 = R(a[0] + (wp[0] - a[0]) * u, a[1] + (wp[1] - a[1]) * u);
            g.lineTo(s2[0], s2[1]); tip = s2; break;
          }
        }
        g.globalAlpha = 0.92; g.stroke(); g.globalAlpha = 1; g.setLineDash([]); g.lineDashOffset = 0;
        // arrowhead
        if (tip && prev && !r.noArrow) {
          let ang;
          const k2 = Math.min(k, r.wpts.length - 1);
          const a = R(r.wpts[Math.max(0, k2 - 1)][0], r.wpts[Math.max(0, k2 - 1)][1]);
          ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]);
          if (f >= 1) { const n = r.wpts.length; const p0 = R(r.wpts[n - 2][0], r.wpts[n - 2][1]), p1 = R(r.wpts[n - 1][0], r.wpts[n - 1][1]); ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]); tip = p1; }
          const L = 7 + w * 2;
          g.fillStyle = col; g.beginPath(); g.moveTo(tip[0], tip[1]);
          g.lineTo(tip[0] - L * Math.cos(ang - 0.45), tip[1] - L * Math.sin(ang - 0.45));
          g.lineTo(tip[0] - L * Math.cos(ang + 0.45), tip[1] - L * Math.sin(ang + 0.45)); g.closePath(); g.fill();
        }
        // waypoint labels
        r.labels.forEach((lb, i) => {
          if (!lb || r.cum[i] > len + 0.01) return;
          const s = R(r.wpts[i][0], r.wpts[i][1]);
          g.fillStyle = col; g.beginPath(); g.arc(s[0], s[1], 2.5, 0, 7); g.fill();
          Q.push({ pri: 4, text: lb, x: s[0], y: s[1], size: 11, color: dark ? '#e5e3dc' : '#1b2130', weight: '500', cands: [[6, -7, 'left'], [-6, -7, 'right'], [6, 8, 'left'], [-6, 8, 'right'], [0, -13, 'center'], [0, 13, 'center']] });
        });
        if (r.label && f >= 1) {
          const mid = Math.floor(r.wpts.length / 2), s = R(r.wpts[mid][0], r.wpts[mid][1]);
          Q.push({ pri: 5, text: r.label, x: s[0], y: s[1], size: 12, color: col, weight: '700', cands: [[0, -11, 'center'], [0, 12, 'center'], [10, 0, 'left'], [-10, 0, 'right'], [0, -26, 'center'], [0, 26, 'center']] });
        }
      }
      // pulses
      for (const p of this.ov.pulses) {
        const s = this.worldToScreen(p.x, p.y);
        const ph = ((now / 1000 + (p.phase || 0)) % 2) / 2;
        g.strokeStyle = CM.sideColor(p.c || 'h'); g.globalAlpha = 1 - ph; g.lineWidth = 2;
        g.beginPath(); g.arc(s[0], s[1], 4 + ph * 18, 0, 7); g.stroke(); g.globalAlpha = 1;
      }
      // free labels
      for (const l of this.ov.labels) {
        const s = this.worldToScreen(l.x, l.y);
        Q.push({ pri: 2, text: l.t, x: s[0], y: s[1], size: l.size || 13, color: l.c ? CM.sideColor(l.c) : (dark ? '#cfcabd' : '#4b4537'), weight: l.w || '600', italic: l.italic !== false, cands: [[0, 0, 'center'], [0, -15, 'center'], [0, 15, 'center'], [0, -28, 'center'], [0, 28, 'center']] });
      }
      // places
      const boxes = this.uiBoxes();
      for (const p of this.ov.places) {
        const s = this.worldToScreen(p.x, p.y);
        if (s[0] < -20 || s[0] > this.cw + 20 || s[1] < -20 || s[1] > this.ch + 20) continue;
        const k = p.k || 'city', ink = dark ? '#e5e3dc' : '#1b2130', acc = CM.sideColor(p.c || (k === 'battle' ? 'a' : 'f'));
        g.lineWidth = 1.5;
        if (k === 'battle') {
          g.strokeStyle = acc; g.lineWidth = 2.4; g.beginPath(); g.moveTo(s[0] - 5, s[1] - 5); g.lineTo(s[0] + 5, s[1] + 5); g.moveTo(s[0] + 5, s[1] - 5); g.lineTo(s[0] - 5, s[1] + 5); g.stroke();
        } else if (k === 'site') {
          g.fillStyle = dark ? '#d2aa52' : '#94711f'; g.beginPath(); g.moveTo(s[0], s[1] - 5); g.lineTo(s[0] + 5, s[1]); g.lineTo(s[0], s[1] + 5); g.lineTo(s[0] - 5, s[1]); g.closePath(); g.fill();
        } else if (k === 'capital') {
          g.fillStyle = dark ? '#12161d' : '#fff'; g.strokeStyle = ink; g.beginPath(); g.arc(s[0], s[1], 5.5, 0, 7); g.fill(); g.stroke();
          g.fillStyle = ink; g.beginPath(); g.arc(s[0], s[1], 2.6, 0, 7); g.fill();
        } else if (k === 'event') {
          g.fillStyle = acc; g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 2.6 : 6.5, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(s[0] + r * Math.cos(a), s[1] + r * Math.sin(a)); } g.closePath(); g.fill();
        } else {
          g.fillStyle = ink; g.beginPath(); g.arc(s[0], s[1], 3.4, 0, 7); g.fill();
        }
        boxes.push([s[0] - 6, s[1] - 6, 12, 12]);
        const txt = p.ja + (p.note ? ' ' + p.note : '');
        const c0 = [[8, -7, 'left'], [-8, -7, 'right'], [8, 8, 'left'], [-8, 8, 'right'], [0, -15, 'center'], [0, 15, 'center'], [10, -19, 'left'], [-10, -19, 'right'], [10, 20, 'left'], [-10, 20, 'right'], [0, -28, 'center'], [0, 28, 'center']];
        if (p.lx != null || p.ly != null) { const dx = p.lx != null ? p.lx : 8, dy = p.ly != null ? p.ly : -7; c0.unshift([dx, dy, dx < 0 ? 'right' : dx > 0 ? 'left' : 'center']); }
        Q.push({ pri: k === 'capital' ? 0 : 1, text: txt, x: s[0], y: s[1], size: p.size || 12.5, color: ink, weight: k === 'capital' ? '700' : '500', cands: c0, must: k === 'capital' || k === 'battle' || k === 'event' });
      }
      // ---- collision-aware label placement ----
      const tv = CM.tv(), hit = (b) => boxes.some(o => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1]);
      Q.sort((a, b) => a.pri - b.pri);
      for (const q of Q) {
        g.font = (q.italic ? 'italic ' : '') + q.weight + ' ' + q.size + 'px ' + (q.italic ? tv.display : tv.body);
        const w = g.measureText(q.text).width + 8, h = q.size + 6;
        let best = null;
        for (const c of q.cands) {
          const x = q.x + c[0], y = q.y + c[1];
          const bx = c[2] === 'left' ? x - 2 : c[2] === 'right' ? x - w + 2 : x - w / 2;
          const b = [bx, y - h / 2, w, h];
          if (b[0] < 2 || b[0] + w > this.cw - 2 || b[1] < 2 || b[1] + h > this.ch - 2) continue;
          if (!hit(b)) { best = [c, b]; break; }
        }
        if (!best && q.must) { const c = q.cands[0], x = q.x + c[0], y = q.y + c[1]; best = [c, [c[2] === 'left' ? x - 2 : c[2] === 'right' ? x - w + 2 : x - w / 2, y - h / 2, w, h]]; }
        if (!best) continue;
        boxes.push(best[1]);
        this.textHalo(g, q.text, q.x + best[0][0], q.y + best[0][1], q.size, q.color, q.weight, best[0][2], q.italic);
      }
      this.placeBoxes = boxes;
    }
    worldToScreenRaw(x, y) { // no wrap normalisation (routes are pre-unwrapped); pick copy nearest to view
      let dx = x - this.cx;
      while (dx > W / 2) dx -= W; while (dx < -W / 2) dx += W;
      return [this.cw / 2 + dx * this.z, this.ch / 2 + (y - this.cy) * this.z];
    }
    textHalo(g, text, x, y, size, color, weight, align, italic) {
      const tv = CM.tv();
      g.font = (italic ? 'italic ' : '') + (weight || '500') + ' ' + size + 'px ' + (italic ? tv.display : tv.body);
      g.textAlign = align || 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3.2; g.lineJoin = 'round';
      g.strokeStyle = tv.halo;
      g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
    }
    uiBoxes() {
      // screen rects of overlay UI (year, caption, legend, zoom buttons) so labels avoid them
      const out = [], r0 = this.el.getBoundingClientRect();
      const els = [this.hud.querySelector('.map-year'), this.hud.querySelector('.map-caption'), this.legend, this.ctrl];
      for (const e of els) {
        if (!e || this.hud.hidden && e.parentNode === this.hud) continue;
        const r = e.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        out.push([r.left - r0.left - 2, r.top - r0.top - 2, r.width + 4, r.height + 4]);
      }
      return out;
    }
    drawLabels(g) {
      if (!this.labels) return;
      const z = this.z, dark = CM.isDark();
      const boxes = (this.placeBoxes || this.uiBoxes()).slice();
      const list = this.labels.filter(l => z >= LEVEL_Z[Math.min(l.lv, 4)]).sort((a, b) => a.lv - b.lv);
      const fontD = CM.tv().display;
      for (const l of list) {
        const s = this.worldToScreen(l.x, l.y);
        if (s[0] < -60 || s[0] > this.cw + 60 || s[1] < -20 || s[1] > this.ch + 20) continue;
        const full = z >= LEVEL_Z[Math.min(l.lv, 4)] * 2.2 + 0.5;
        const txt = full ? l.name : l.abbr;
        const size = l.lv === 0 ? 14 : l.lv === 1 ? 12.5 : 11.5;
        g.font = '700 ' + size + 'px ' + fontD;
        const w = g.measureText(txt).width;
        let box = null, oy = 0;
        for (const dy of [0, -16, 16, -30, 30]) {
          const bb = [s[0] - w / 2 - 4, s[1] + dy - size / 2 - 3, w + 8, size + 6];
          if (bb[0] < 2 || bb[0] + bb[2] > this.cw - 2 || bb[1] < 2 || bb[1] + bb[3] > this.ch - 2) continue;
          if (!boxes.some(b => bb[0] < b[0] + b[2] && bb[0] + bb[2] > b[0] && bb[1] < b[1] + b[3] && bb[1] + bb[3] > b[1])) { box = bb; oy = dy; break; }
        }
        if (!box) continue;
        boxes.push(box);
        const hl = this.hlNames.indexOf(l.name) >= 0 || this.hlNames.indexOf(l.abbr) >= 0;
        this.textHalo(g, txt, s[0], s[1] + oy, size, hl ? (dark ? '#ff8a6e' : '#8f2a14') : (dark ? '#e7e2d6' : '#2b2a33'), '700');
        g.font = '700 ' + size + 'px ' + fontD;
      }
    }
  }
  CM.MapView = MapView;
  CM.MAP = { W, H, T, MIN_YEAR, MAX_DATA_YEAR };

  /* ---------------- atlas page ---------------- */
  // piecewise slider scale: position 0..1000 -> year
  const SEG = [[0, -4000], [220, -500], [400, 500], [580, 1500], [800, 1900], [1000, 2026]];
  const pos2year = (p) => { for (let i = 1; i < SEG.length; i++) if (p <= SEG[i][0]) { const a = SEG[i - 1], b = SEG[i]; return Math.round(a[1] + (b[1] - a[1]) * (p - a[0]) / (b[0] - a[0])); } return 2026; };
  const year2pos = (y) => { for (let i = 1; i < SEG.length; i++) if (y <= SEG[i][1]) { const a = SEG[i - 1], b = SEG[i]; return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return 1000; };
  CM.pages.atlas = {
    async render(view, params, q) {
      view.innerHTML = '<div class="atlas"><div class="atlas-map" id="atlasmap"></div><div class="yearbar">' +
        '<button type="button" class="btn" id="aplay" aria-label="再生">▶ 再生</button>' +
        '<input class="yin" id="ayear" type="text" inputmode="numeric" aria-label="年（紀元前はマイナス）" title="年を入力（紀元前は -221 のようにマイナス）">' +
        '<input type="range" id="arange" min="0" max="1000" step="1" aria-label="年代">' +
        '<select id="aspeed" class="hide-s" aria-label="再生速度"><option value="0.5">とてもゆっくり（0.5年/秒）</option><option value="1">ゆっくり（1年/秒）</option><option value="3">やや遅く（3年/秒）</option><option value="8" selected>標準（8年/秒）</option><option value="25">速く（25年/秒）</option><option value="80">とても速く（80年/秒）</option></select>' +
        '<span class="hide-s"><label style="font-size:13px"><input type="checkbox" id="alabels" checked> 国名</label> <label style="font-size:13px"><input type="checkbox" id="abattles" checked> 戦い</label> <label style="font-size:13px"><input type="checkbox" id="aevroll"> 年表</label> <button type="button" class="btn" id="aglobe">地球儀</button></span>' +
        '<div class="era-ticks" id="aticks"></div></div></div>';
      const mapEl = document.getElementById('atlasmap');
      const roll = this.roll = new EventRoll(view.querySelector('.atlas'));
      const startYear = params[0] ? parseInt(params[0], 10) : CM.storage.get('atlasYear', 1250);
      const mv = this.mv = new MapView(mapEl, {});
      mv.setView(60, 35, 0.42);
      const yin = document.getElementById('ayear'), rng = document.getElementById('arange');
      const ticks = [[-4000, '前4000'], [-2000, '前2000'], [-500, '前500'], [1, '1'], [500, '500'], [1000, '1000'], [1500, '1500'], [1700, '1700'], [1900, '1900'], [2026, '2026']];
      document.getElementById('aticks').innerHTML = ticks.map(t => '<span style="left:' + (year2pos(t[0]) / 10) + '%">' + t[1] + '</span>').join('');
      const battleSpec = (y) => {
        if (!document.getElementById('abattles').checked) return [];
        return CM.battleIndex.filter(b => Math.abs(b.y - y) <= Math.max(3, Math.abs(y) < 1000 ? 30 : 12)).map(b => ({ ja: b.ja, lon: b.lon, lat: b.lat, k: 'battle', href: '#/battle/' + b.id, note: CM.fmtYearShort(b.y) }));
      };
      const setYear = async (y, fromRange, fromPlay) => {
        y = CM.clamp(Math.round(y), -4000, 2026); if (y === 0) y = 1;
        yin.value = y < 0 ? '前' + (-y) : String(y);
        if (!fromRange) rng.value = year2pos(y);
        CM.storage.set('atlasYear', y);
        mv.setOverlays({ places: battleSpec(y) });
        if (!fromPlay && playing) yf = y;
        roll.setYear(y, fromPlay);
        await mv.setYear(y);
      };
      this.setYear = setYear;
      rng.addEventListener('input', () => setYear(pos2year(+rng.value), true));
      yin.addEventListener('change', () => { const v = yin.value.trim(); const n = parseInt(v.replace(/^前/, '-').replace(/[^\d-]/g, ''), 10); if (!isNaN(n)) setYear(n); });
      document.getElementById('alabels').addEventListener('change', (e) => { mv.labelsOn = e.target.checked; mv.dirty = true; });
      document.getElementById('abattles').addEventListener('change', () => setYear(mv.year));
      const evc = document.getElementById('aevroll');
      evc.checked = !!CM.storage.get('atlasRoll', false);
      const togRoll = async () => { CM.storage.set('atlasRoll', evc.checked); if (evc.checked) { await CM.load('data/events.js'); roll.show(mv.year || startYear); } else roll.hide(); };
      evc.addEventListener('change', togRoll);
      roll.onClose = () => { evc.checked = false; togRoll(); };
      roll.onPick = (y) => setYear(y);
      if (evc.checked) togRoll();
      let playing = false, yf = null, busy = false, raf = 0, lastT = 0;
      const play = document.getElementById('aplay');
      const stopPlay = () => { playing = false; play.textContent = '▶ 再生'; if (raf) cancelAnimationFrame(raf); raf = 0; roll.playing = false; };
      const tick = (now) => {
        if (!playing || !this.alive) { raf = 0; return; }
        const dt = lastT ? Math.min(0.25, (now - lastT) / 1000) : 0; lastT = now;
        const sp = +document.getElementById('aspeed').value;
        if (!busy) {
          yf += dt * sp;
          if (yf >= 2026) { yf = 2026; stopPlay(); }
          roll.setPos(yf);
          const yi = Math.floor(yf);
          if (yi !== mv.year && yi !== 0) {
            busy = true;
            setYear(yi, false, true).finally(() => { busy = false; });
          }
        }
        if (playing) raf = requestAnimationFrame(tick);
      };
      play.addEventListener('click', () => {
        if (playing) { stopPlay(); return; }
        playing = true; play.textContent = '■ 停止'; roll.playing = true;
        yf = mv.year >= 2026 ? -4000 : mv.year; lastT = 0;
        raf = requestAnimationFrame(tick);
      });
      rng.addEventListener('pointerdown', () => { if (playing) stopPlay(); });
      this.alive = true;
      this.stop = () => { stopPlay(); };
      document.getElementById('aglobe').addEventListener('click', () => { CM.openGlobe && CM.openGlobe(mv); });
      await setYear(startYear);
    },
    destroy() { this.alive = false; if (this.stop) this.stop(); if (this.roll) this.roll.destroy(); if (this.mv) this.mv.destroy(); this.mv = null; }
  };

  /* ---------------- end-roll of chronology events over the atlas ---------------- */
  class EventRoll {
    constructor(parent) {
      this.el = document.createElement('div');
      this.el.className = 'evroll'; this.el.hidden = true;
      this.el.innerHTML = '<div class="evroll-h"><b>年表</b><span class="evroll-y num"></span><button type="button" class="evroll-x" aria-label="閉じる">×</button></div><div class="evroll-v"><div class="evroll-list"></div></div>';
      parent.appendChild(this.el);
      this.list = this.el.querySelector('.evroll-list'); this.vp = this.el.querySelector('.evroll-v');
      this.off = 0; this.target = 0; this.i0 = -1; this.i1 = -1; this.raf = 0; this.year = null; this.playing = false; this.manual = 0;
      this.el.querySelector('.evroll-x').addEventListener('click', () => this.onClose && this.onClose());
      this.vp.addEventListener('wheel', (e) => { e.preventDefault(); this.off += e.deltaY * 0.6; this.target = this.off; this.manual = performance.now(); this.clampOff(); }, { passive: false });
      this.list.addEventListener('click', (e) => { const it = e.target.closest('[data-y]'); if (it && this.onPick) this.onPick(+it.dataset.y); });
    }
    idxOf(y) { const ev = CM.events; let lo = 0, hi = ev.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ev[m].y < y) lo = m + 1; else hi = m; } return lo; }
    /* render a window of events around year y; keep the visual position of what is on screen */
    render(y) {
      const ev = CM.events, c = this.idxOf(y);
      if (this.i0 >= 0 && c - this.i0 > 25 && this.i1 - c > 60) return;
      const i0 = Math.max(0, c - 50), i1 = Math.min(ev.length, c + 150);
      let anchor = null, anchorTop = 0;
      for (const ch of this.list.children) if (ch.offsetTop + ch.offsetHeight > this.off) { anchor = ch.dataset.i; anchorTop = ch.offsetTop - this.off; break; }
      this.i0 = i0; this.i1 = i1;
      let html = '', lastY = null;
      for (let i = i0; i < i1; i++) {
        const e = ev[i];
        if (e.y !== lastY) { html += '<div class="evroll-yr num" data-y="' + e.y + '" data-i="' + i + '" data-h="1">' + CM.esc(CM.fmtYear(e.y)) + '</div>'; lastY = e.y; }
        html += '<div class="evroll-it" data-y="' + e.y + '" data-i="' + i + '"><span class="rg rg-' + e.r + '">' + CM.esc(CM.REGION_JA[e.r] || '') + '</span>' + (e.m ? '<span class="md">' + e.m + (e.d ? '/' + e.d : '') + '</span>' : '') + CM.esc(e.t) + '</div>';
      }
      this.list.innerHTML = html;
      this.heads = [...this.list.querySelectorAll('[data-h]')].map(h => [+h.dataset.y, h.offsetTop]);
      if (anchor != null) { const a = this.list.querySelector('[data-i="' + anchor + '"]'); if (a) { const d = (a.offsetTop - anchorTop) - this.off; this.off += d; this.target += d; } }
    }
    /* scroll offset that puts (fractional) year yf at the reading line */
    offsetFor(yf) {
      const H = this.heads || []; if (!H.length) return 0;
      const line = this.vp.clientHeight * 0.32;
      let k = 0; while (k < H.length - 1 && H[k + 1][0] <= yf) k++;
      const [y0, t0] = H[k], nx = H[k + 1];
      let t = t0;
      if (nx && yf > y0) t = t0 + (nx[1] - t0) * Math.min(1, (yf - y0) / (nx[0] - y0));
      return Math.max(0, t - line);
    }
    mark(y) {
      const ny = this.nearestYear(y);
      if (ny === this.marked) return; this.marked = ny;
      this.list.querySelectorAll('.now').forEach(n => n.classList.remove('now'));
      this.list.querySelectorAll('[data-y="' + ny + '"]').forEach(n => n.classList.add('now'));
    }
    /* jump (slider, typing, click): glide to the year */
    setYear(y, fromPlay) {
      this.year = y;
      if (this.el.hidden || !CM.events) return;
      this.el.querySelector('.evroll-y').textContent = CM.fmtYear(y) + '前後';
      if (fromPlay) return;
      this.render(y);
      this.target = this.offsetFor(y); this.mark(y);
    }
    /* continuous playback: follow the fractional year exactly */
    setPos(yf) {
      if (this.el.hidden || !CM.events) return;
      this.render(yf);
      this.target = this.offsetFor(yf);
      this.mark(Math.floor(yf));
    }
    nearestYear(y) { const ev = CM.events, i = this.idxOf(y); const a = ev[Math.max(0, i - 1)], b = ev[Math.min(ev.length - 1, i)]; return (!a || (b && Math.abs(b.y - y) <= Math.abs(a.y - y))) ? b.y : a.y; }
    clampOff() { this.off = Math.max(0, Math.min(this.off, Math.max(0, this.list.scrollHeight - this.vp.clientHeight * 0.4))); }
    show(y) {
      this.el.hidden = false; this.i0 = this.i1 = -1; this.list.innerHTML = ''; this.marked = null;
      this.setYear(y); this.off = this.target; this.list.style.transform = 'translateY(' + (-this.off) + 'px)';
      let last = 0;
      const tick = (now) => {
        if (this.el.hidden || !this.el.isConnected) { this.raf = 0; return; }
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
        // after a manual wheel scroll, stay put for a while unless playback moves on
        if (!(now - this.manual < 4000 && !this.playing)) {
          const d = this.target - this.off;
          this.off += this.playing ? d * Math.min(1, dt * 10) : d * Math.min(1, dt * 4);
        }
        this.list.style.transform = 'translateY(' + (-this.off).toFixed(1) + 'px)';
        this.raf = requestAnimationFrame(tick);
      };
      if (!this.raf) this.raf = requestAnimationFrame(tick);
    }
    hide() { this.el.hidden = true; }
    destroy() { this.el.hidden = true; if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.el.remove(); }
  }
})();
