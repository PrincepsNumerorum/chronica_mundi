/* Battle animation engine: SVG field map, units/fleets tweened between phases, movement arrows drawn in */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const S = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const SIDE = { a: '#b2432a', b: '#2f4f7a', c: '#94711f', d: '#2a6b66', e: '#6c4a7d', f: '#555555', g: '#5f6d2c', h: '#8a2f2f' };
  const sideCol = (k, sides) => { const s = (sides || []).find(x => x.k === k); return (s && s.c) || SIDE[k] || k || '#555'; };
  const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function smoothPath(pts) {
    if (pts.length < 3) return 'M' + pts.map(p => p.join(',')).join('L');
    let d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + c1.join(',') + ' ' + c2.join(',') + ' ' + p2.join(',');
    }
    return d;
  }
  const polyD = (pts, close) => 'M' + pts.map(p => p.join(',')).join('L') + (close ? 'Z' : '');

  // geo-referenced battles: lon/lat inputs are converted to a local frame whose view is 1000 units wide,
  // so fonts/strokes keep their schematic sizes; real map tiles are drawn underneath.
  const Z0 = 18, TS = 256, W0 = TS * Math.pow(2, Z0);
  const merc = (lon, lat) => { const sn = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360 * W0, (0.5 - Math.log((1 + sn) / (1 - sn)) / (4 * Math.PI)) * W0]; };
  const TILES = {
    topo: { url: (z, x, y) => 'https://' + 'abc'[(x + y) % 3] + '.tile.opentopomap.org/' + z + '/' + x + '/' + y + '.png', max: 17, attr: '地図：© OpenStreetMap contributors, SRTM ｜ OpenTopoMap (CC-BY-SA)' },
    sat: { url: (z, x, y) => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + z + '/' + y + '/' + x, max: 18, attr: '画像：Esri, Maxar, Earthstar Geographics' }
  };
  function projectGeo(d) {
    const o = JSON.parse(JSON.stringify(d));
    const g = d.geo, aspect = g.aspect || 0.64;
    const lat0 = g.c[1], mpp = 156543.03392 * Math.cos(lat0 * Math.PI / 180) / Math.pow(2, Z0);
    const wpx = g.km * 1000 / mpp, f = wpx / 1000;          // merc px per local unit
    const c = merc(g.c[0], g.c[1]), mx0 = c[0] - wpx / 2, my0 = c[1] - wpx * aspect / 2;
    const L = (lon, lat) => { const q = merc(lon, lat); return [(q[0] - mx0) / f, (q[1] - my0) / f]; };
    const m2u = 1 / (mpp * f);                               // metres -> local units
    const pp = (pts) => pts.map(p => L(p[0], p[1]));
    const box = (fc) => { const q = L(fc.c[0], fc.c[1]); const w = fc.km * 1000 * m2u, h = w * aspect; return [q[0] - w / 2, q[1] - h / 2, w, h]; };
    o.view = [0, 0, 1000, 1000 * aspect];
    o._geo = { mx0, my0, f };
    (o.terrain || []).forEach(t => { if (t.pts) t.pts = pp(t.pts); if (t.inner) t.inner = pp(t.inner); if (t.lp) t.lp = L(t.lp[0], t.lp[1]); if (t.x != null) { const q = L(t.x, t.y); t.x = q[0]; t.y = q[1]; } if (t.w && t.t !== 'wall') t.w *= m2u; });
    (o.units || []).forEach(u => { u.w = (u.w || 400) * m2u; u.h = (u.h || 150) * m2u; if (u.gap) u.gap *= m2u; });
    o.phases.forEach(ph => {
      for (const id in (ph.u || {})) { const a = ph.u[id]; const q = L(a[0], a[1]); ph.u[id] = [q[0], q[1]].concat(a.slice(2)); }
      (ph.arrows || []).forEach(a => { a.pts = pp(a.pts); });
      (ph.fx || []).forEach(f2 => { const q = L(f2.x, f2.y); f2.x = q[0]; f2.y = q[1]; if (f2.r) f2.r *= m2u; });
      (ph.marks || []).forEach(m => { const q = L(m.x, m.y); m.x = q[0]; m.y = q[1]; });
      if (ph.focus) ph.focus = box(ph.focus);
    });
    if (g.scale) o.scale = { len: g.scale * m2u, label: g.scaleLabel || (g.scale >= 1000 ? g.scale / 1000 + ' km' : g.scale + ' m') };
    return o;
  }

  class BattleView {
    constructor(container, data, opts) {
      if (data.geo && !data._geo) data = projectGeo(data);
      this.d = data; this.opts = opts || {};
      this.el = CM.h('div', { class: 'battle' });
      container.appendChild(this.el);
      this.svg = S('svg', { class: 'field', viewBox: data.view.join(' '), preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': data.ja + 'の戦況図' });
      this.el.appendChild(this.svg);
      this.note = CM.h('div', { class: 'bnote' });
      this.el.appendChild(this.note);
      this.legend = CM.h('div', { class: 'blegend' }, data.sides.map(s => '<span><i style="background:' + sideCol(s.k, data.sides) + '"></i>' + CM.esc(s.ja) + '</span>').join(''));
      this.el.appendChild(this.legend);
      this.ctl = CM.h('div', { class: 'bctl' }, '<button type="button" data-a="prev" aria-label="前の段階">◀</button><button type="button" data-a="play" aria-label="自動再生">▶</button><button type="button" data-a="next" aria-label="次の段階">▶|</button><div class="phases"></div>');
      this.el.appendChild(this.ctl);
      this.ctl.querySelector('.phases').innerHTML = data.phases.map((p, i) => '<button type="button" data-i="' + i + '">' + (i + 1) + '. ' + CM.esc(p.title) + '</button>').join('');
      this.ctl.addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.i) { this.stopAuto(); this.go(+b.dataset.i); }
        else if (b.dataset.a === 'prev') { this.stopAuto(); this.go(this.i - 1); }
        else if (b.dataset.a === 'next') { this.stopAuto(); this.go(this.i + 1); }
        else if (b.dataset.a === 'play') this.toggleAuto();
      });
      if (data._geo) {
        this.tileSrc = '';
        this.tileBtns = CM.h('div', { class: 'btiles' }, '<button type="button" data-t="topo">地形図</button><button type="button" data-t="sat">衛星写真</button><button type="button" data-t="none">地図なし</button>');
        this.tileBtns.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) this.setTiles(b.dataset.t); });
        this.attrEl = CM.h('div', { class: 'battr' });
        this.el.append(this.tileBtns, this.attrEl);
        this.syncTileBtns();
        this.ro = new ResizeObserver(() => this.updateTiles()); this.ro.observe(this.el);
      }
      this.buildDefs(); this.drawTerrain(); this.buildUnits();
      this.arrowLayer = S('g', { class: 'arrows' }, this.svg);
      this.fxLayer = S('g', { class: 'fx' }, this.svg);
      this.unitLayer.parentNode.appendChild(this.unitLayer);
      this.labelLayer = S('g', { class: 'ulabels' }, this.svg);
      this.drawFurniture();
      this.i = -1; this.cur = {};
      this.go(this.opts.phase || 0, true);
      this._theme = () => { this.svg.innerHTML = ''; this.buildDefs(); this.drawTerrain(); this.buildUnits(); this.arrowLayer = S('g', {}, this.svg); this.fxLayer = S('g', {}, this.svg); this.svg.appendChild(this.unitLayer); this.labelLayer = S('g', {}, this.svg); this.drawFurniture(); const i = this.i; this.i = -1; this.go(i, true); };
      document.addEventListener('cm:theme', this._theme);
    }
    destroy() { if (this.ro) this.ro.disconnect(); this.stopAuto(); this.dead = true; document.removeEventListener('cm:theme', this._theme); this.el.remove(); }
    pal() {
      const dark = CM.isDark();
      return dark ? { land: '#2b2f2a', land2: '#343a33', sea: '#1d3240', seaLine: '#3e6378', hill: '#5a5140', hillLine: '#7d705a', forest: '#2f4a33', marsh: '#4c6a6a', road: '#8b7a5c', ink: '#e5e3dc', ink2: '#aeb3bd', town: '#c9c3b5', camp: '#c9c3b5', halo: '#14181f' }
        : { land: '#e9e4d3', land2: '#ddd6c0', sea: '#b9d0d6', seaLine: '#6f97a6', hill: '#cdbb94', hillLine: '#a38d61', forest: '#a9bf93', marsh: '#a8c6be', road: '#9a7f55', ink: '#1b2130', ink2: '#4b5363', town: '#3b3b3b', camp: '#3b3b3b', halo: '#f6f7f3' };
    }
    buildDefs() {
      const P = this.pal();
      const defs = S('defs', {}, this.svg);
      const fp = S('pattern', { id: 'pf-' + this.d.id, width: 14, height: 14, patternUnits: 'userSpaceOnUse' }, defs);
      S('circle', { cx: 4, cy: 4, r: 2.6, fill: CM.isDark() ? '#3f6044' : '#7f9c6b' }, fp); S('circle', { cx: 11, cy: 10, r: 2.2, fill: CM.isDark() ? '#3f6044' : '#7f9c6b' }, fp);
      const mp = S('pattern', { id: 'pm-' + this.d.id, width: 16, height: 10, patternUnits: 'userSpaceOnUse' }, defs);
      S('path', { d: 'M2 5h7M10 9h5', stroke: P.seaLine, 'stroke-width': 1.2 }, mp);
      Object.keys(SIDE).concat((this.d.sides || []).map(s => s.k)).forEach(k => {
        const m = S('marker', { id: 'ah-' + this.d.id + '-' + k, viewBox: '0 0 10 10', refX: 6, refY: 5, markerWidth: 4.2, markerHeight: 4.2, orient: 'auto-start-reverse' }, defs);
        S('path', { d: 'M0,0L10,5L0,10z', fill: sideCol(k, this.d.sides) }, m);
      });
    }
    drawTerrain() {
      const P = this.pal(), d = this.d, v = d.view;
      const g = S('g', { class: 'terrain' }, this.svg);
      S('rect', { x: v[0] - 2000, y: v[1] - 2000, width: v[2] + 4000, height: v[3] + 4000, fill: d.bg === 'sea' ? P.sea : P.land }, g);
      if (d._geo) { this.tileLayer = S('g', { class: 'tiles' }, g); this.tileKeys = {}; requestAnimationFrame(() => this.updateTiles()); }
      const labels = [];
      (d.terrain || []).forEach(t => {
        const pts = t.pts;
        switch (t.t) {
          case 'land': S('path', { d: polyD(pts, true), fill: P.land, stroke: P.seaLine, 'stroke-width': 1.2 }, g); break;
          case 'sea': case 'lake': S('path', { d: (t.smooth ? smoothPath(pts) + 'Z' : polyD(pts, true)), fill: P.sea, 'fill-opacity': t.alpha || 1, stroke: P.seaLine, 'stroke-width': 1, 'stroke-dasharray': t.dash ? '6 4' : 'none' }, g); break;
          case 'river':
            S('path', { d: smoothPath(pts), fill: 'none', stroke: P.seaLine, 'stroke-width': (t.w || 10) + 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
            S('path', { d: smoothPath(pts), fill: 'none', stroke: P.sea, 'stroke-width': t.w || 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g); break;
          case 'hill':
            S('path', { d: smoothPath(pts.concat([pts[0]])) + 'Z', fill: P.hill, 'fill-opacity': .75, stroke: P.hillLine, 'stroke-width': 1.2 }, g);
            if (t.inner) S('path', { d: smoothPath(t.inner.concat([t.inner[0]])) + 'Z', fill: P.hill, stroke: P.hillLine, 'stroke-width': 1 }, g); break;
          case 'forest': S('path', { d: smoothPath(pts.concat([pts[0]])) + 'Z', fill: 'url(#pf-' + d.id + ')', stroke: CM.isDark() ? '#3f6044' : '#7f9c6b', 'stroke-width': 1 }, g); break;
          case 'marsh': S('path', { d: smoothPath(pts.concat([pts[0]])) + 'Z', fill: 'url(#pm-' + d.id + ')', stroke: 'none' }, g); break;
          case 'field': S('path', { d: polyD(pts, true), fill: P.land2, stroke: 'none' }, g); break;
          case 'road': S('path', { d: smoothPath(pts), fill: 'none', stroke: P.road, 'stroke-width': t.w || 3, 'stroke-dasharray': '7 5' }, g); break;
          case 'bridge': S('path', { d: polyD(pts), fill: 'none', stroke: P.ink, 'stroke-width': 5 }, g); S('path', { d: polyD(pts), fill: 'none', stroke: P.land, 'stroke-width': 2.5 }, g); break;
          case 'wall': S('path', { d: (t.close ? polyD(pts, true) : polyD(pts)), fill: 'none', stroke: P.ink, 'stroke-width': t.w || 3, 'stroke-dasharray': t.dash || 'none' }, g);
            if (t.ticks) S('path', { d: (t.close ? polyD(pts, true) : polyD(pts)), fill: 'none', stroke: P.ink, 'stroke-width': 7, 'stroke-dasharray': '1.5 9' }, g); break;
          case 'camp': S('path', { d: smoothPath(pts.concat([pts[0]])) + 'Z', fill: 'none', stroke: P.camp, 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g); break;
          case 'town':
            for (let k = 0; k < 4; k++) S('rect', { x: t.x - 9 + (k % 2) * 10, y: t.y - 9 + Math.floor(k / 2) * 10, width: 7, height: 7, fill: P.town }, g);
            break;
          case 'island': S('path', { d: smoothPath(pts.concat([pts[0]])) + 'Z', fill: P.land, stroke: P.seaLine, 'stroke-width': 1.2 }, g); break;
          case 'label': break;
          default: break;
        }
        if (t.label) labels.push(t);
      });
      // terrain labels on top of terrain
      labels.forEach(t => {
        const pos = t.lp || (t.t === 'label' ? [t.x, t.y] : t.x != null ? [t.x + 14, t.y] : t.pts[Math.floor(t.pts.length / 2)]);
        const isWater = t.t === 'river' || t.t === 'sea' || t.t === 'lake';
        this.text(g, t.label, pos[0], pos[1], t.size || 17, isWater ? P.seaLine : P.ink2, true, t.rot, t.t === 'town' ? 'start' : 'middle');
      });
    }
    text(parent, str, x, y, size, color, italic, rot, anchor) {
      const P = this.pal();
      const a = { x, y, style: 'font-size:calc(var(--zs,1) * ' + size + 'px);stroke-width:calc(var(--zs,1) * 3.5px)', 'text-anchor': anchor || 'middle', 'dominant-baseline': 'middle', fill: color, 'paint-order': 'stroke', stroke: P.halo, 'stroke-linejoin': 'round', 'font-family': italic ? 'var(--font-display)' : 'var(--font-body)', 'font-weight': italic ? 600 : 700 };
      if (italic) a['font-style'] = 'italic';
      if (rot) a.transform = 'rotate(' + rot + ' ' + x + ' ' + y + ')';
      const t = S('text', a, parent); t.textContent = str; return t;
    }
    buildUnits() {
      this.unitLayer = S('g', { class: 'units' }, this.svg);
      this.uEls = {};
      (this.d.units || []).forEach(u => {
        const col = sideCol(u.s, this.d.sides);
        const g = S('g', { class: 'unit' }, this.unitLayer);
        const w = u.w || 40, h = u.h || 16;
        if (u.t === 'ships') {
          const n = u.n || 1, gap = u.gap || 16;
          for (let k = 0; k < n; k++) {
            const x = -k * gap;
            S('path', { d: 'M' + (x + 7) + ',0 L' + (x + 3) + ',-3.4 L' + (x - 6) + ',-3.4 L' + (x - 7) + ',0 L' + (x - 6) + ',3.4 L' + (x + 3) + ',3.4Z', fill: col, stroke: CM.isDark() ? '#111' : '#fff', 'stroke-width': .8 }, g);
          }
        } else if (u.t === 'camp' || u.t === 'circle') {
          S('circle', { r: w / 2, fill: col, 'fill-opacity': .18, stroke: col, 'stroke-width': 2, 'stroke-dasharray': '4 3' }, g);
        } else {
          S('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 2, fill: col, 'fill-opacity': .88, stroke: CM.isDark() ? '#0e1116' : '#fff', 'stroke-width': 1.2 }, g);
          const sw = { stroke: '#fff', 'stroke-width': 1.4, fill: 'none', opacity: .9 };
          const bx = Math.min(w, h * 1.6) / 2 - 2, by = h / 2 - 3;
          if (u.t === 'inf') S('path', Object.assign({ d: 'M' + (-bx) + ',' + (-by) + 'L' + bx + ',' + by + 'M' + (-bx) + ',' + by + 'L' + bx + ',' + (-by) }, sw), g);
          else if (u.t === 'cav' || u.t === 'hcav') { S('path', Object.assign({ d: 'M' + (-bx) + ',' + by + 'L' + bx + ',' + (-by) }, sw), g); if (u.t === 'hcav') S('path', Object.assign({ d: 'M' + (-bx + 4) + ',' + by + 'L' + (bx + 4) + ',' + (-by) }, sw), g); }
          else if (u.t === 'arch') S('path', Object.assign({ d: 'M' + (-bx) + ',' + by + 'Q0,' + (-by * 2.2) + ' ' + bx + ',' + by }, sw), g);
          else if (u.t === 'hinf') { S('path', Object.assign({ d: 'M' + (-bx) + ',' + (-by) + 'L' + bx + ',' + by + 'M' + (-bx) + ',' + by + 'L' + bx + ',' + (-by) }, sw), g); S('path', Object.assign({ d: 'M' + (-bx) + ',0L' + bx + ',0' }, sw), g); }
          else if (u.t === 'art' || u.t === 'siege') S('circle', { r: Math.min(h / 4, 4), fill: '#fff' }, g);
          else if (u.t === 'eleph') S('path', Object.assign({ d: 'M' + (-bx) + ',' + by + 'Q0,' + (-by) + ' ' + bx + ',' + by + 'M0,0v' + by }, sw), g);
          else if (u.t === 'chariot') S('circle', Object.assign({ r: Math.min(h / 3, 5) }, sw), g);
          else if (u.t === 'tank') S('rect', Object.assign({ x: -bx, y: -by / 1.6, width: 2 * bx, height: by * 1.2, rx: by / 1.2 }, sw), g);
        }
        const lab = this.text(this.labelLayer || this.unitLayer, u.ja || '', 0, 0, u.fs || 15, col, false);
        lab.style.pointerEvents = 'none';
        this.uEls[u.id] = { g, lab, u };
      });
    }
    drawFurniture() {
      const v = this.d.view, P = this.pal();
      const g = S('g', { class: 'furniture' }, this.svg);
      if (this.d.scale) {
        const x = v[0] + 24, y = v[1] + v[3] - 26, L = this.d.scale.len;
        S('path', { d: 'M' + x + ',' + y + 'h' + L + 'M' + x + ',' + (y - 5) + 'v10M' + (x + L) + ',' + (y - 5) + 'v10', stroke: P.ink, 'stroke-width': 2 }, g);
        this.text(g, this.d.scale.label, x + L / 2, y - 12, 12, P.ink, false);
      }
      const nx = v[0] + v[2] - 34, ny = v[1] + v[3] - 46, rot = this.d.north || 0;
      const ng = S('g', { transform: 'translate(' + nx + ',' + ny + ') rotate(' + rot + ')' }, g);
      S('path', { d: 'M0,-16L6,6L0,1L-6,6Z', fill: P.ink }, ng);
      this.text(ng, 'N', 0, -25, 12, P.ink, false);
      if (this.d.schematic !== false && !this.d._geo) this.text(g, '模式図・縮尺は概略', v[0] + v[2] - 12, v[1] + v[3] - 12, 10.5, P.ink2, false, 0, 'end');
    }
    unitTransform(st) { return 'translate(' + st[0] + ',' + st[1] + ') rotate(' + (st[2] || 0) + ') scale(' + (st[4] != null ? st[4] : 1) + ',1)'; }
    stateFor(i) {
      // accumulate unit states through phase i
      const st = {};
      for (let k = 0; k <= i; k++) {
        const ph = this.d.phases[k];
        for (const id in (ph.u || {})) {
          const a = ph.u[id]; const prev = st[id] || [0, 0, 0, 0, 1];
          const o = a[3] && typeof a[3] === 'object' ? a[3] : {};
          st[id] = [a[0], a[1], a[2] != null ? a[2] : prev[2], o.o != null ? o.o : 1, o.sc != null ? o.sc : (prev[4] != null ? prev[4] : 1), o.st || null, o.lx, o.ly];
        }
      }
      return st;
    }
    go(i, instant) {
      const N = this.d.phases.length;
      i = CM.clamp(i, 0, N - 1);
      if (i === this.i && !instant) return;
      const from = this.cur, to = this.stateFor(i);
      this.i = i;
      const ph = this.d.phases[i];
      this.ctl.querySelectorAll('.phases button').forEach((b, k) => b.classList.toggle('on', k === i));
      this.note.innerHTML = '<h4>' + (i + 1) + '. ' + CM.esc(ph.title) + '</h4><span class="when">' + CM.esc(ph.when || '') + '</span><div>' + (ph.html || CM.esc(ph.text || '')) + '</div>';
      if (this.opts.onPhase) this.opts.onPhase(i);
      // arrows & fx
      this.arrowLayer.innerHTML = ''; this.fxLayer.innerHTML = '';
      const P = this.pal();
      (ph.arrows || []).forEach((a, k) => {
        const col = sideCol(a.s, this.d.sides);
        const w = a.k === 'attack' ? 6 : a.k === 'fire' ? 2 : 4.5;
        const p = S('path', { d: a.pts.length > 2 ? polyD(CM.roundPts(a.pts, null, 16).pts) : polyD(a.pts), fill: 'none', stroke: col, 'stroke-width': w, 'stroke-linecap': 'round', 'marker-end': 'url(#ah-' + this.d.id + '-' + a.s + ')', opacity: a.k === 'fire' ? .8 : .9 }, this.arrowLayer);
        if (a.k === 'retreat' || a.k === 'feint') p.setAttribute('stroke-dasharray', '10 7');
        if (a.k === 'fire') p.setAttribute('stroke-dasharray', '3 5');
        if (!instant && !CM.reducedMotion() && !(a.k === 'retreat' || a.k === 'feint' || a.k === 'fire')) {
          const L = p.getTotalLength();
          p.style.strokeDasharray = L; p.style.strokeDashoffset = L;
          p.style.transition = 'stroke-dashoffset 1.3s ease ' + (0.35 + k * 0.12) + 's';
          requestAnimationFrame(() => requestAnimationFrame(() => { p.style.strokeDashoffset = 0; }));
        }
        if (a.label) { const m = a.pts[Math.floor(a.pts.length / 2)]; this.text(this.arrowLayer, a.label, m[0] + (a.lx || 0), m[1] - 12 + (a.ly || 0), 14, col, false); }
      });
      (ph.fx || []).forEach(f => {
        if (f.t === 'clash') { const g = S('g', { transform: 'translate(' + f.x + ',' + f.y + ')' }, this.fxLayer); S('path', { d: 'M-9,-9L9,9M9,-9L-9,9', stroke: P.ink, 'stroke-width': 3 }, g); }
        else if (f.t === 'fire' || f.t === 'boom') { const c = S('circle', { cx: f.x, cy: f.y, r: f.r || 10, fill: '#d9661f', opacity: .55 }, this.fxLayer); if (!CM.reducedMotion()) { const an = S('animate', { attributeName: 'r', values: (f.r || 10) * .6 + ';' + (f.r || 10) * 1.3 + ';' + (f.r || 10) * .6, dur: '1.4s', repeatCount: 'indefinite' }, c); void an; } }
        else if (f.t === 'smoke') S('circle', { cx: f.x, cy: f.y, r: f.r || 18, fill: P.ink2, opacity: .25 }, this.fxLayer);
        if (f.label) this.text(this.fxLayer, f.label, f.x, f.y - (f.r || 12) - 10, 12, P.ink, false);
      });
      (ph.marks || []).forEach(m => this.text(this.fxLayer, m.t, m.x, m.y, m.size || 15, m.c ? sideCol(m.c, this.d.sides) : P.ink, !!m.italic));
      // tween units
      const t0 = performance.now(), dur = (instant || CM.reducedMotion()) ? 0 : 1200;
      const ids = Object.keys(this.uEls);
      const step = (now) => {
        if (this.dead) return;
        const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(t);
        ids.forEach(id => {
          const el = this.uEls[id], a = from[id], b = to[id];
          if (!b) { el.g.style.display = 'none'; el.lab.style.display = 'none'; return; }
          el.g.style.display = ''; el.lab.style.display = '';
          const s = a ? [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + angleDiff(a[2], b[2]) * e, a[3] + (b[3] - a[3]) * e, a[4] + (b[4] - a[4]) * e] : [b[0], b[1], b[2], b[3] * e, b[4]];
          el.g.setAttribute('transform', this.unitTransform(s));
          el.g.setAttribute('opacity', s[3]);
          el.g.style.filter = b[5] === 'rout' ? 'grayscale(.6)' : '';
          const ly = b[7] != null ? b[7] : -((el.u.h || 16) / 2 + 10) - (el.u.t === 'ships' ? 2 : 0);
          const lx = b[6] != null ? b[6] : (el.u.t === 'ships' ? -((el.u.n || 1) - 1) * (el.u.gap || 16) / 2 * Math.cos((s[2] || 0) * Math.PI / 180) : 0);
          el.lab.setAttribute('x', s[0] + lx); el.lab.setAttribute('y', s[1] + ly);
          el.lab.setAttribute('opacity', Math.min(1, s[3] + .15));
        });
        this.cur = {};
        ids.forEach(id => { if (to[id]) this.cur[id] = to[id]; });
        if (t < 1) { this.cur = blend(from, to, e); requestAnimationFrame(step); } else { this.cur = to; this.declutter(); }
      };
      requestAnimationFrame(step);
      // focus / viewBox
      const vb = ph.focus || this.d.view;
      this.animateViewBox(vb, instant ? 0 : 1000);
    }
    declutter() {
      // nudge overlapping unit labels apart (simple greedy vertical search)
      const placed = [];
      [this.arrowLayer, this.fxLayer].forEach(L => L && L.querySelectorAll('text').forEach(t => { try { const bb = t.getBBox(); placed.push([bb.x, bb.y, bb.width, bb.height]); } catch (e) { /* hidden */ } }));
      Object.values(this.uEls).forEach(el => {
        const L = el.lab; if (L.style.display === 'none' || +L.getAttribute('opacity') < 0.3) return;
        if (L._y0 == null || Math.abs(+L.getAttribute('y') - L._y1) > 0.01) L._y0 = +L.getAttribute('y');
        let bb; try { L.setAttribute('y', L._y0); bb = L.getBBox(); } catch (e) { return; }
        const h = bb.height || 12;
        for (const dy of [0, -h, h * 1.1, -2 * h, 2.1 * h, -3 * h]) {
          const b = [bb.x, bb.y + dy, bb.width, bb.height];
          if (!placed.some(o => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1])) { L.setAttribute('y', L._y0 + dy); L._y1 = L._y0 + dy; placed.push(b); return; }
        }
        L._y1 = L._y0; placed.push([bb.x, bb.y, bb.width, bb.height]);
      });
    }
    animateViewBox(vb, ms) {
      const cur = (this.svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      if (!ms || CM.reducedMotion() || cur.length !== 4) { this.svg.setAttribute('viewBox', vb.join(' ')); this.svg.style.setProperty('--zs', vb[2] / this.d.view[2]); this.updateTiles(); return; }
      const t0 = performance.now();
      const step = (now) => { const t = Math.min(1, (now - t0) / ms), e = ease(t); const nv = cur.map((c, k) => c + (vb[k] - c) * e); this.svg.setAttribute('viewBox', nv.join(' ')); this.svg.style.setProperty('--zs', nv[2] / this.d.view[2]); if (t < 1 && !this.dead) requestAnimationFrame(step); else this.updateTiles(); };
      requestAnimationFrame(step);
    }
    updateTiles() {
      const G = this.d._geo; if (!G || !this.tileLayer || this.dead) return;
      const src = TILES[CM.storage.get('battleTiles', 'topo')];
      if (!src) { this.tileLayer.innerHTML = ''; this.tileKeys = {}; if (this.attrEl) this.attrEl.textContent = ''; return; }
      const vb = this.svg.getAttribute('viewBox').split(/\s+/).map(Number);
      const ew = this.svg.clientWidth || 800, eh = this.svg.clientHeight || 500;
      let vw = vb[2], vh = vb[3], vx = vb[0], vy = vb[1];
      if (ew / eh > vw / vh) { const nw = vh * ew / eh; vx -= (nw - vw) / 2; vw = nw; } else { const nh = vw * eh / ew; vy -= (nh - vh) / 2; vh = nh; }
      const s = ew / (vw * G.f);
      const tz = CM.clamp(Math.round(Z0 + Math.log2(s) + 0.3), 3, src.max);
      const tsz = TS * Math.pow(2, Z0 - tz);
      const mx = G.mx0 + vx * G.f, my = G.my0 + vy * G.f, mw = vw * G.f, mh = vh * G.f;
      const x0 = Math.floor(mx / tsz), x1 = Math.floor((mx + mw) / tsz), y0 = Math.floor(my / tsz), y1 = Math.floor((my + mh) / tsz);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) > 80) return;
      const want = {};
      for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
        const key = this.tileSrc + tz + '/' + tx + '/' + ty; want[key] = 1;
        if (this.tileKeys[key]) continue;
        const im = S('image', { x: (tx * tsz - G.mx0) / G.f, y: (ty * tsz - G.my0) / G.f, width: tsz / G.f + 0.5, height: tsz / G.f + 0.5, preserveAspectRatio: 'none' }, this.tileLayer);
        im.setAttribute('href', src.url(tz, tx, ty));
        im.dataset.z = tz;
        this.tileKeys[key] = im;
      }
      // drop tiles of other zoom levels once the new ones are requested (keeps coverage during loading)
      Object.keys(this.tileKeys).forEach(k => { if (!want[k]) { const im = this.tileKeys[k]; if (+im.dataset.z !== tz || Object.keys(this.tileKeys).length > 160) { im.remove(); delete this.tileKeys[k]; } } });
      if (this.attrEl) this.attrEl.textContent = src.attr;
    }
    setTiles(kind) { CM.storage.set('battleTiles', kind); if (this.tileLayer) { this.tileLayer.innerHTML = ''; this.tileKeys = {}; } this.updateTiles(); this.syncTileBtns(); }
    syncTileBtns() { if (this.tileBtns) this.tileBtns.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === CM.storage.get('battleTiles', 'topo'))); }
    toggleAuto() { if (this.auto) this.stopAuto(); else this.startAuto(); }
    startAuto() {
      this.auto = true; this.ctl.querySelector('[data-a=play]').textContent = '■';
      const tick = () => {
        if (!this.auto || this.dead) return;
        if (this.i >= this.d.phases.length - 1) { this.stopAuto(); return; }
        this.go(this.i + 1);
        const txt = (this.d.phases[this.i].text || '').length;
        this.autoT = setTimeout(tick, Math.max(4500, txt * 70));
      };
      if (this.i >= this.d.phases.length - 1) this.go(0, true);
      this.autoT = setTimeout(tick, 1500);
    }
    stopAuto() { this.auto = false; clearTimeout(this.autoT); const b = this.ctl && this.ctl.querySelector('[data-a=play]'); if (b) b.textContent = '▶'; }
  }
  function angleDiff(a, b) { let d = (b - a) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; }
  function blend(from, to, e) {
    const out = {};
    for (const id in to) { const a = from[id], b = to[id]; out[id] = a ? [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + angleDiff(a[2], b[2]) * e, a[3] + (b[3] - a[3]) * e, a[4] + (b[4] - a[4]) * e, b[5], b[6], b[7]] : b; }
    return out;
  }
  CM.BattleView = BattleView;
  CM.loadBattle = async (id) => { if (!CM.battles[id]) await CM.load('data/battles/' + id + '.js'); return CM.battles[id]; };

  /* ---------------- battle pages ---------------- */
  CM.pages.battle = {
    async render(view, params) {
      const d = await CM.loadBattle(params[0]);
      if (!d) { view.innerHTML = '<div class="wrap"><h1>戦いが見つからない</h1></div>'; return; }
      view.innerHTML = '<div class="battle-page"><div class="bp-field" id="bpfield"></div><div class="bp-info" id="bpinfo"></div></div>';
      const info = document.getElementById('bpinfo');
      const L = d.lesson && CM.lessonMeta(d.lesson);
      info.innerHTML = '<div class="eyebrow">戦史</div><h1>' + CM.esc(d.ja) + '</h1><div class="muted" style="font-size:13px">' + CM.esc(d.en || '') + '</div>' +
        '<dl style="margin-top:12px"><dt>年月日</dt><dd>' + CM.esc(d.date) + '</dd><dt>場所</dt><dd>' + CM.esc(d.place) + '</dd><dt>結果</dt><dd>' + CM.esc(d.result) + '</dd>' +
        d.sides.map(s => '<dt style="color:' + sideCol(s.k, d.sides) + '">' + CM.esc(s.ja) + '</dt><dd>指揮：' + CM.esc(s.cmd || '') + '<br>兵力：' + CM.esc(s.str || '') + (s.loss ? '<br>損害：' + CM.esc(s.loss) : '') + '</dd>').join('') + '</dl>' +
        '<div class="prose" style="font-size:15px;margin-top:14px">' + (d.html || '') + '</div>' +
        '<h3 style="font-size:1rem;margin-top:18px">戦闘の段階</h3><ol style="padding-left:1.3em;font-size:14px">' + d.phases.map((p, i) => '<li><a href="#" data-i="' + i + '">' + CM.esc(p.title) + '</a></li>').join('') + '</ol>' +
        (L ? '<p><a class="btn" href="#/lesson/' + d.lesson + '">講義「' + CM.esc(L.title) + '」で読む</a></p>' : '') +
        '<p><a class="btn" href="#/atlas/' + d.y + '">この年の歴史地図</a></p>' +
        (d.sources ? '<div class="sources"><h3 style="font-size:.95rem">出典・参考</h3><ol>' + d.sources.map(s => '<li>' + s + '</li>').join('') + '</ol></div>' : '');
      this.bv = new BattleView(document.getElementById('bpfield'), d, {});
      info.querySelectorAll('[data-i]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); this.bv.stopAuto(); this.bv.go(+a.dataset.i); }));
      CM.bindInline(info);
    },
    destroy() { if (this.bv) this.bv.destroy(); this.bv = null; }
  };
  CM.pages.battles = {
    async render(view) {
      const list = CM.battleIndex.slice().sort((a, b) => a.y - b.y);
      let html = '<div class="wrap"><div class="page-head"><h1>戦史</h1><p>戦いの経過を段階ごとのアニメーションで見る。講義の中からも呼び出される。</p></div>';
      html += '<div style="height:360px;border:1px solid var(--rule);border-radius:10px;overflow:hidden;margin-bottom:20px;position:relative" id="bmap"></div><div class="cards">';
      list.forEach(b => {
        html += '<a class="card" href="#/battle/' + b.id + '"><div class="meta"><span class="num">' + CM.esc(CM.fmtYear(b.y)) + '</span><span>' + CM.esc(b.region || '') + '</span></div><h3>' + CM.esc(b.ja) + '</h3><p>' + CM.esc(b.sum || '') + '</p></a>';
      });
      html += '</div>' + (list.length ? '' : '<p class="muted">準備中</p>') + '</div>';
      view.innerHTML = html;
      const mv = this.mv = new CM.MapView(document.getElementById('bmap'), { hud: false });
      mv.labelsOn = false;
      mv.setView(40, 35, 0.3);
      mv.year = -5000; await mv.ready; await mv.setYear(-5000);
      mv.setOverlays({ places: list.map(b => ({ ja: b.ja, lon: b.lon, lat: b.lat, k: 'battle', href: '#/battle/' + b.id })) });
    },
    destroy() { if (this.mv) this.mv.destroy(); this.mv = null; }
  };
})();
