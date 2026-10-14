/* 3D museum: walk around monuments and objects at true scale (three.js loaded lazily) */
(function () {
  'use strict';
  const MODELS = {};
  CM.data.model = (id, b64) => { MODELS[id] = b64; };
  CM.data.museum = (arr) => { CM.museum = arr; };
  // bbox of the exhibit proper, skipping helpers flagged userData.noBox (interiors, ghosts)
  const boxOf = (T, root) => { const bb = new T.Box3(); root.updateMatrixWorld(true); const walk = (o) => { if (o.userData && o.userData.noBox) return; if (o.isMesh) bb.union(new T.Box3().setFromObject(o)); o.children.forEach(walk); }; walk(root); return bb; };
  const b64ToBuf =(b64) => { const bin = atob(b64), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  const fmtM = (m) => m >= 100 ? Math.round(m) + ' m' : m >= 10 ? m.toFixed(1) + ' m' : m.toFixed(2) + ' m';

  /* reference silhouettes for size comparison (meters) */
  const REFS = [
    { id: 'human', t: '人（身長1.7 m）', always: true },
    { id: 'bus', t: '路線バス（長さ11 m）' },
    { id: 'khufu', t: 'クフ王のピラミッド（底辺230 m・高さ147 m）', shape: 'pyr', w: 230.3, h: 146.6 },
    { id: 'ur', t: 'ウルのジッグラト（基底64×46 m・推定高さ30 m）', shape: 'step', w: 64, d: 46, h: 30 },
    { id: 'parthenon', t: 'パルテノン神殿（69.5×30.9 m・高さ約14 m）', shape: 'box', w: 69.5, d: 30.9, h: 13.7 },
    { id: 'daibutsuden', t: '東大寺大仏殿（現在の建物 57×50.5 m・高さ49 m）', shape: 'box', w: 57, d: 50.5, h: 49.1 },
    { id: 'abusimbel', t: 'アブ・シンベル大神殿の正面（幅約35 m・高さ約30 m）', shape: 'box', w: 35, d: 4, h: 30 }
  ];

  CM.pages.museum = {
    async render(view, params) {
      await CM.load('data/museum/index.js');
      if (!params[0]) return this.list(view);
      const ex = (CM.museum || []).find(e => e.id === params[0]);
      if (!ex) { view.innerHTML = '<div class="wrap"><h1>展示が見つからない</h1><p><a href="#/museum">博物館へ戻る</a></p></div>'; return; }
      return ex.sketchfab ? this.embed(view, ex) : this.viewer(view, ex);
    },
    nav(ex) {
      const t = this.tour(), i = t.indexOf(ex), a = t[i - 1], b = t[i + 1];
      return '<div class="mus-nav">' + (a ? '<a href="#/museum/' + a.id + '">← ' + CM.esc(a.title) + '</a>' : '<span></span>') + '<span class="muted">順路 ' + (i + 1) + ' / ' + t.length + '</span>' + (b ? '<a href="#/museum/' + b.id + '">' + CM.esc(b.title) + ' →</a>' : '<span></span>') + '</div>';
    },
    credit(ex) {
      const c = ex.credit; if (!c) return '';
      return '<div class="mus-credit"><b>3Dモデル</b>：<a href="' + CM.esc(c.url) + '" target="_blank" rel="noopener">' + CM.esc(c.title) + '</a>（' + (c.authorUrl ? '<a href="' + CM.esc(c.authorUrl) + '" target="_blank" rel="noopener">' + CM.esc(c.author) + '</a>' : CM.esc(c.author)) + '、Sketchfab）' + (c.license ? '<br>ライセンス：' + (c.licenseUrl ? '<a href="' + CM.esc(c.licenseUrl) + '" target="_blank" rel="noopener">' + CM.esc(c.license) + '</a>' : CM.esc(c.license)) : '') + (c.note ? '<br>' + CM.esc(c.note) : '') + '</div>';
    },
    side(ex, extra) {
      return '<aside class="mus-side"><a class="muted" href="#/museum" style="font-size:13px">← 立体博物館・遺跡ツアー</a><h1>' + CM.esc(ex.title) + '</h1><div class="chips"><span class="chip num">' + CM.esc(ex.era) + '</span><span class="chip">' + CM.esc(ex.region) + '</span><span class="chip">' + CM.esc(ex.kindLabel || '') + '</span></div>' +
        (extra || '') + '<div class="mus-body">' + ex.html + '</div>' + (ex.lessons ? '<div class="related">' + ex.lessons.map(id => { const L = CM.lessonMeta(id); return L ? '<a class="chip" href="#/lesson/' + id + '">講義：' + CM.esc(L.title) + '</a>' : ''; }).join('') + '</div>' : '') +
        this.credit(ex) + this.nav(ex) + '</aside>';
    },
    embed(view, ex) {
      const src = 'https://sketchfab.com/models/' + ex.sketchfab + '/embed?autostart=1&ui_theme=dark&dnt=1';
      view.innerHTML = '<div class="mus"><div class="mus-stage mus-embed"><iframe title="' + CM.esc(ex.credit ? ex.credit.title : ex.title) + '" src="' + src + '" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe></div>' +
        this.side(ex, '<div class="mus-ctl"><p class="muted mus-help">ドラッグで回転、右ドラッグ（2本指）で移動、ホイール（ピンチ）で拡大。ダブルクリックした場所に近づく。右下のボタンで全画面表示。この3Dモデルは、Sketchfabから読み込んで表示している。表示されない場合は、インターネットへの接続を確認するか、<a href="' + CM.esc(ex.credit.url) + '" target="_blank" rel="noopener">Sketchfabのページ</a>で見てほしい。</p></div>') + '</div>';
      CM.bindInline(view);
    },
    tour() { return (CM.museum || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0)); },
    list(view) {
      const badge = (e) => e.sketchfab ? '<span class="mus-badge web">オンラインで観察</span>' : '<span class="mus-badge walk">歩いて探検</span>';
      view.innerHTML = '<div class="wrap"><div class="page-head"><h1>立体博物館・遺跡ツアー</h1><p>世界史の遺跡や建造物を3Dで観察する。時代順の順路で巡ることができる。「歩いて探検」の展示は、人や他の建造物と大きさを比べたり、人の目の高さで歩き回ったりできる（ファイルを開くだけで動く）。「オンラインで観察」の展示は、3Dモデル共有サイトSketchfabの公開モデルを埋め込んだもので、インターネットに接続しているときだけ表示される。</p></div>' +
        '<ol class="cards mus-tourlist">' + this.tour().map((e, i) => '<li><a class="card" href="#/museum/' + e.id + '"><div class="meta"><span class="num">' + (i + 1) + '. ' + CM.esc(e.era) + '</span><span>' + CM.esc(e.region) + '</span></div><h3>' + CM.esc(e.title) + '</h3><p>' + CM.esc(e.sum) + '</p><p class="muted" style="font-size:12px">' + badge(e) + ' ' + CM.esc(e.kindLabel || '') + '</p></a></li>').join('') + '</ol>' +
        '<div class="mus-note"><h3>3Dモデルについて</h3><p>写真1枚から自動生成したモデル（AI生成）は、写っていない背面・側面や細部が推定で補われており、形が正確とは限らない。展示ごとに「モデルの性格」を示している。柱の様式やピラミッドのように寸法の記録がはっきりしているものは、記録された寸法から図形として組み立てている（図形モデル）。</p></div></div>';
    },
    async viewer(view, ex) {
      view.innerHTML = '<div class="mus"><div class="mus-stage"><canvas class="mus-cv"></canvas><div class="mus-labels"></div>' +
        '<div class="mus-hud"><div class="mus-modes"><button type="button" data-mode="orbit" class="on">観察</button><button type="button" data-mode="walk">歩く</button><button type="button" data-mode="measure">測る</button></div><span class="mus-status"></span></div>' +
        '<div class="mus-pad" hidden><button type="button" data-k="f">▲</button><button type="button" data-k="l">◀</button><button type="button" data-k="b">▼</button><button type="button" data-k="r">▶</button></div>' +
        '<div class="mus-load">3Dデータを読み込み中…</div></div>' +
        this.side(ex, '<div class="mus-ctl"><h4>大きさを比べる</h4><div class="mus-refs">' + REFS.filter(r => !r.always && r.id !== ex.selfRef).map(r => '<label><input type="checkbox" value="' + r.id + '"> ' + CM.esc(r.t) + '</label>').join('') + '</div>' +
        (ex.toggles ? '<h4>表示</h4><div class="mus-tg">' + ex.toggles.map(t => '<label><input type="checkbox" value="' + t.id + '"' + (t.on ? ' checked' : '') + '> ' + CM.esc(t.t) + '</label>').join('') + '</div>' : '') +
        '<p class="muted mus-help">観察：ドラッグで回転、右ドラッグで移動、ホイールで拡大。歩く：W・A・S・Dまたは矢印キー（画面の▲▼◀▶）で移動、ドラッグで向きを変える。Shiftで走る。測る：2点をクリックすると距離を表示。</p></div>') + '</div>';
      CM.bindInline(view);
      await CM.load('assets/vendor/three.bundle.js');
      if (ex.model) await CM.load('data/museum/m_' + ex.model + '.js');
      if (!view.isConnected) return;
      this.sc = new Scene3D(view.querySelector('.mus'), ex);
      await this.sc.init();
    },
    destroy() { if (this.sc) this.sc.dispose(); this.sc = null; }
  };

  class Scene3D {
    constructor(root, ex) {
      this.root = root; this.ex = ex; this.cv = root.querySelector('.mus-cv'); this.stage = root.querySelector('.mus-stage');
      this.labels = []; this.refObjs = {}; this.toggles = {}; this.mode = 'orbit'; this.keys = {}; this.alive = true; this.meas = [];
    }
    async init() {
      const T = window.THREE, ex = this.ex;
      const r = this.renderer = new T.WebGLRenderer({ canvas: this.cv, antialias: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
      r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
      const s = this.scene = new T.Scene();
      s.background = new T.Color(ex.sky || 0xbfd3e3);
      s.fog = new T.Fog(s.background, 400, 2600);
      const pm = new T.PMREMGenerator(r); s.environment = pm.fromScene(new T.RoomEnvironment(), 0.04).texture;
      s.add(new T.HemisphereLight(0xeef3ff, 0xd8cbb2, 0.75));
      const sun = this.sun = new T.DirectionalLight(0xfff2dc, 2.4); sun.position.set(-120, 180, 90); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); s.add(sun); s.add(sun.target);
      // ground with a 10 m grid
      const g = new T.Mesh(new T.PlaneGeometry(6000, 6000), new T.MeshStandardMaterial({ color: ex.ground || 0xd8c49c, roughness: 1 }));
      g.rotation.x = -Math.PI / 2; g.receiveShadow = true; g.name = 'ground'; s.add(g); this.ground = g;
      const grid = new T.GridHelper(600, 60, 0x9a8a6a, 0xb8a882); grid.position.y = 0.02; grid.material.transparent = true; grid.material.opacity = 0.35; s.add(grid);
      const cam = this.cam = new T.PerspectiveCamera(50, 1, 0.1, 8000);
      this.controls = new T.OrbitControls(cam, this.cv); this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * 0.495;
      // the exhibit
      this.obj = new T.Group(); s.add(this.obj);
      if (ex.model) await this.loadModel();
      if (ex.builder) BUILD[ex.builder](this, T);
      this.fitSun();
      // human for scale, next to the exhibit
      const bb = this.bbox = boxOf(T, this.obj), sz = bb.getSize(new T.Vector3());
      this.human = makeHuman(T); this.human.position.set(bb.max.x + 3, 0, bb.max.z - Math.min(6, sz.z * 0.2)); s.add(this.human);
      this.addLabel(this.human, '人 1.7 m', 1.95);
      if (ex.dimLabels !== false) this.addDims(bb, sz);
      // camera
      const c = bb.getCenter(new T.Vector3()), R = Math.max(sz.x, sz.y, sz.z);
      this.home = { pos: new T.Vector3(c.x + R * 0.9, Math.max(R * 0.45, 4), c.z + R * 1.1), tgt: new T.Vector3(c.x, sz.y * 0.35, c.z) };
      if (ex.view) { this.home.pos.set(...ex.view.pos); this.home.tgt.set(...ex.view.tgt); }
      cam.position.copy(this.home.pos); this.controls.target.copy(this.home.tgt);
      this.walkStart = ex.walkStart ? new T.Vector3(...ex.walkStart) : new T.Vector3(c.x, 0, bb.max.z + 25);
      this.ray = new T.Raycaster();
      this.bindUI(); this.resize();
      this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.stage);
      this.root.querySelector('.mus-load').remove();
      this.clock = new T.Clock();
      const loop = () => { if (!this.alive) return; this.frame(); this.raf = requestAnimationFrame(loop); };
      loop();
    }
    loadModel() {
      const T = window.THREE, ex = this.ex;
      return new Promise((res, rej) => {
        const ld = new T.GLTFLoader(); ld.setMeshoptDecoder(T.MeshoptDecoder);
        ld.parse(b64ToBuf(MODELS[ex.model]), '', (gl) => {
          const m = gl.scene;
          m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) { o.material.side = T.DoubleSide; } } });
          if (ex.rotY) m.rotation.y = ex.rotY * Math.PI / 180;
          m.updateMatrixWorld(true);
          // photogrammetry scans carry baked lighting: show their textures unlit
          if (ex.unlit) m.traverse(o => { if (o.isMesh && o.material) { const old = o.material; o.material = new T.MeshBasicMaterial({ map: old.map || null, color: old.map ? 0xffffff : (old.color || 0xcccccc), side: T.DoubleSide }); o.castShadow = false; } });
          let bb = new T.Box3().setFromObject(m), sz = bb.getSize(new T.Vector3());
          if (ex.scaleTo) {
            const k = ex.scaleTo.m / sz[ex.scaleTo.axis];
            m.scale.multiplyScalar(k);
            // optional footprint fit: AI meshes get depth wrong, so the other horizontal axis is stretched to the documented size
            if (ex.scaleTo.z) m.scale.z = ex.scaleTo.z / sz.z;
          } else if (ex.scale) m.scale.multiplyScalar(ex.scale);
          m.updateMatrixWorld(true);
          bb = new T.Box3().setFromObject(m); const c = bb.getCenter(new T.Vector3());
          m.position.x -= c.x; m.position.z -= c.z; m.position.y -= (ex.floorY != null ? bb.min.y + ex.floorY : bb.min.y);
          this.obj.add(m); this.modelRoot = m; res();
        }, rej);
      });
    }
    fitSun() {
      const T = window.THREE, bb = new T.Box3().setFromObject(this.obj), R = Math.max(30, bb.getSize(new T.Vector3()).length() * 0.7), sh = this.sun.shadow.camera;
      sh.left = -R; sh.right = R; sh.top = R; sh.bottom = -R; sh.near = 1; sh.far = R * 6; sh.updateProjectionMatrix();
      this.sun.position.set(-R * 1.1, R * 1.7, R * 0.9); this.sun.target.position.set(0, 0, 0);
    }
    addDims(bb, sz) {
      const T = window.THREE, s = this.scene, mat = new T.LineBasicMaterial({ color: 0x8a2f1d });
      const y0 = 0.05, z1 = bb.max.z + Math.max(2, sz.z * 0.06), x1 = bb.max.x + Math.max(2, sz.x * 0.06);
      const ln = (a, b) => { const l = new T.Line(new T.BufferGeometry().setFromPoints([a, b]), mat); s.add(l); return l; };
      ln(new T.Vector3(bb.min.x, y0, z1), new T.Vector3(bb.max.x, y0, z1));
      const p1 = new T.Object3D(); p1.position.set((bb.min.x + bb.max.x) / 2, y0, z1); s.add(p1); this.addLabel(p1, '幅 ' + fmtM(sz.x), 0.5, 'dim');
      ln(new T.Vector3(x1, y0, bb.min.z), new T.Vector3(x1, y0, bb.max.z));
      const p2 = new T.Object3D(); p2.position.set(x1, y0, (bb.min.z + bb.max.z) / 2); s.add(p2); this.addLabel(p2, '奥行 ' + fmtM(sz.z), 0.5, 'dim');
      ln(new T.Vector3(x1, 0, bb.max.z), new T.Vector3(x1, sz.y, bb.max.z));
      const p3 = new T.Object3D(); p3.position.set(x1, sz.y, bb.max.z); s.add(p3); this.addLabel(p3, '高さ ' + fmtM(sz.y), 0.5, 'dim');
    }
    addLabel(obj, text, dy, cls) {
      const el = document.createElement('div'); el.className = 'mus-lab' + (cls ? ' ' + cls : ''); el.textContent = text;
      this.root.querySelector('.mus-labels').appendChild(el);
      const L = { obj, el, dy: dy || 0 }; this.labels.push(L); return L;
    }
    removeLabelFor(obj) { this.labels = this.labels.filter(L => { if (L.obj === obj) { L.el.remove(); return false; } return true; }); }
    bindUI() {
      const root = this.root, T = window.THREE;
      root.querySelectorAll('.mus-modes button').forEach(b => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
      root.querySelectorAll('.mus-refs input').forEach(i => i.addEventListener('change', () => this.toggleRef(i.value, i.checked)));
      root.querySelectorAll('.mus-tg input').forEach(i => { i.addEventListener('change', () => this.applyToggle(i.value, i.checked)); this.applyToggle(i.value, i.checked); });
      this.onKey = (e) => { if (/input|select|textarea/i.test(e.target.tagName)) return; const k = e.key.toLowerCase(); const map = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r' }; if (map[k] && this.mode === 'walk') { this.keys[map[k]] = e.type === 'keydown'; e.preventDefault(); } if (k === 'shift') this.keys.run = e.type === 'keydown'; };
      window.addEventListener('keydown', this.onKey); window.addEventListener('keyup', this.onKey);
      root.querySelectorAll('.mus-pad button').forEach(b => { const on = (v) => (e) => { this.keys[b.dataset.k] = v; e.preventDefault(); }; b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); });
      // look-around drag in walk mode
      let drag = null;
      this.cv.addEventListener('pointerdown', (e) => {
        if (this.mode === 'walk') { drag = { x: e.clientX, y: e.clientY }; this.cv.setPointerCapture(e.pointerId); }
        else if (this.mode === 'measure') this.measureAt(e);
      });
      this.cv.addEventListener('pointermove', (e) => { if (!drag) return; this.yaw -= (e.clientX - drag.x) * 0.004; this.pitch = CM.clamp(this.pitch - (e.clientY - drag.y) * 0.004, -1.2, 1.2); drag = { x: e.clientX, y: e.clientY }; });
      this.cv.addEventListener('pointerup', () => { drag = null; });
      void T;
    }
    setMode(m) {
      const T = window.THREE;
      this.mode = m;
      this.root.querySelectorAll('.mus-modes button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
      this.root.querySelector('.mus-pad').hidden = m !== 'walk';
      this.controls.enabled = m !== 'walk';
      const st = this.root.querySelector('.mus-status');
      if (m === 'walk') {
        this.pos = this.walkStart.clone(); this.pos.y = this.groundAt(this.pos.x, this.pos.z, 1e9);
        const c = this.bbox.getCenter(new T.Vector3()); this.yaw = Math.atan2(-(c.x - this.pos.x), -(c.z - this.pos.z)); this.pitch = 0.12;
        st.textContent = '歩く：目の高さ1.6 m';
      } else if (m === 'orbit') {
        this.cam.position.copy(this.home.pos); this.controls.target.copy(this.home.tgt); this.cam.up.set(0, 1, 0); st.textContent = '';
      } else { st.textContent = '測る：2点をクリック'; this.meas = []; }
    }
    meshes() { const a = []; this.obj.traverse(o => { if (o.isMesh && o.visible && !o.userData.noHit) a.push(o); }); return a; }
    groundAt(x, z, fromY) {
      const T = window.THREE;
      this.ray.set(new T.Vector3(x, Math.min(fromY, 2000), z), new T.Vector3(0, -1, 0)); this.ray.far = 4000;
      const h = this.ray.intersectObjects(this.meshes(), false)[0];
      return h ? h.point.y : 0;
    }
    measureAt(e) {
      const T = window.THREE, rc = this.cv.getBoundingClientRect();
      const p = new T.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
      this.ray.setFromCamera(p, this.cam); this.ray.far = 1e5;
      const h = this.ray.intersectObjects(this.meshes().concat([this.ground]), false)[0]; if (!h) return;
      const dot = new T.Mesh(new T.SphereGeometry(Math.max(0.15, this.cam.position.distanceTo(h.point) * 0.006), 12, 8), new T.MeshBasicMaterial({ color: 0xc0392b, depthTest: false }));
      dot.position.copy(h.point); dot.renderOrder = 9; this.scene.add(dot); this.meas.push(dot);
      if (this.meas.length % 2 === 0) {
        const a = this.meas[this.meas.length - 2].position, b = h.point;
        const l = new T.Line(new T.BufferGeometry().setFromPoints([a.clone(), b.clone()]), new T.LineBasicMaterial({ color: 0xc0392b, depthTest: false })); l.renderOrder = 9; this.scene.add(l); this.meas.push(l);
        const mid = new T.Object3D(); mid.position.copy(a).add(b).multiplyScalar(0.5); this.scene.add(mid); this.meas.push(mid);
        const d = a.distanceTo(b), dh = Math.abs(a.y - b.y);
        this.addLabel(mid, fmtM(d) + (dh > 0.5 ? '（高低差 ' + fmtM(dh) + '）' : ''), 0, 'meas');
      }
    }
    toggleRef(id, on) {
      const T = window.THREE, r = REFS.find(x => x.id === id);
      if (!on) { const o = this.refObjs[id]; if (o) { this.scene.remove(o); this.removeLabelFor(o); delete this.refObjs[id]; } return; }
      let o;
      if (id === 'bus') { o = makeBus(T); }
      else {
        const mat = new T.MeshBasicMaterial({ color: 0x3d6fb4, transparent: true, opacity: 0.18, depthWrite: false }), edge = new T.LineBasicMaterial({ color: 0x2b5a9e });
        let geo;
        if (r.shape === 'pyr') { geo = new T.ConeGeometry(r.w / Math.SQRT2, r.h, 4, 1); geo.rotateY(Math.PI / 4); geo.translate(0, r.h / 2, 0); }
        else if (r.shape === 'step') { const parts = [[1, 0.37], [0.72, 0.27], [0.48, 0.36]].map(([k, hk], i, arr) => { const y0 = arr.slice(0, i).reduce((a, b) => a + b[1], 0) * r.h; const g = new T.BoxGeometry(r.w * k, r.h * hk, r.d * k); g.translate(0, y0 + r.h * hk / 2, 0); return g; }); geo = T.mergeGeometries(parts); }
        else { geo = new T.BoxGeometry(r.w, r.h, r.d); geo.translate(0, r.h / 2, 0); }
        o = new T.Group(); const m = new T.Mesh(geo, mat); m.userData.noHit = true; o.add(m); o.add(new T.LineSegments(new T.EdgesGeometry(geo, 20), edge));
      }
      // place to the left of the exhibit, in a row
      const used = Object.values(this.refObjs).reduce((a, x) => Math.min(a, x.userData.minX), this.bbox.min.x - 8);
      const w = id === 'bus' ? 11 : r.w;
      o.position.set(used - w / 2 - 8, 0, (this.bbox.min.z + this.bbox.max.z) / 2); o.userData.minX = used - w - 8;
      this.scene.add(o); this.refObjs[id] = o;
      this.addLabel(o, r.t, id === 'bus' ? 4 : (r.h || 3) + 2, 'ref');
    }
    applyToggle(id, on) {
      this.obj.traverse(o => { if (o.userData.tg === id) o.visible = on; if (o.userData.tgOff === id) o.visible = !on; });
      if (this.ex.onToggle) this.ex.onToggle(this, id, on);
    }
    resize() {
      const w = this.stage.clientWidth, h = this.stage.clientHeight; if (!w || !h) return;
      this.renderer.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    }
    frame() {
      const T = window.THREE, dt = Math.min(0.05, this.clock.getDelta());
      if (this.mode === 'walk') {
        const sp = (this.keys.run ? 9 : 2.6) * dt, f = (this.keys.f ? 1 : 0) - (this.keys.b ? 1 : 0), s = (this.keys.r ? 1 : 0) - (this.keys.l ? 1 : 0);
        if (f || s) {
          const dx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) * sp, dz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) * sp;
          const nx = this.pos.x + dx, nz = this.pos.z + dz, gy = this.groundAt(nx, nz, this.pos.y + 1.0);
          // steps up to 0.9 m (ex.maxStep for coarse AI meshes) can be climbed (stairs, terraces); higher walls block the way
          const gyAbove = this.groundAt(nx, nz, this.pos.y + 50);
          const ms = this.ex.maxStep || 0.9;
          // optional wall collision for scanned interiors and colonnades: probe forward at knee and chest height
          let blocked = false;
          if (this.ex.collide) {
            const d = new T.Vector3(dx, 0, dz), len = d.length(); d.normalize();
            for (const hgt of [0.6, 1.3]) { this.ray.set(new T.Vector3(this.pos.x, this.pos.y + hgt, this.pos.z), d); this.ray.far = len + 0.3; if (this.ray.intersectObjects(this.meshes(), false).length) { blocked = true; break; } }
          }
          if (blocked) { /* stay */ }
          else if (gyAbove - this.pos.y <= ms) { this.pos.x = nx; this.pos.z = nz; this.pos.y = gyAbove; }
          else if (gy - this.pos.y <= ms && gy > this.pos.y - 30) { this.pos.x = nx; this.pos.z = nz; this.pos.y = gy; }
        }
        const eye = this.pos.clone(); eye.y += 1.6;
        this.cam.position.copy(eye);
        const dir = new T.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
        this.cam.lookAt(eye.clone().add(dir));
        this.root.querySelector('.mus-status').textContent = '歩く：目の高さ1.6 m　地面からの高さ ' + fmtM(Math.max(0, this.pos.y));
      } else this.controls.update();
      if (this.ex.animate) this.ex.animate(this, dt);
      this.renderer.render(this.scene, this.cam);
      // labels
      const w = this.stage.clientWidth, h = this.stage.clientHeight, v = new T.Vector3();
      this.labels.forEach(L => {
        L.obj.getWorldPosition(v); v.y += L.dy; v.project(this.cam);
        const vis = v.z < 1 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
        L.el.style.display = vis ? '' : 'none';
        if (vis) L.el.style.transform = 'translate(' + ((v.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - v.y) / 2 * h).toFixed(1) + 'px) translate(-50%,-100%)';
      });
    }
    dispose() {
      this.alive = false; cancelAnimationFrame(this.raf);
      window.removeEventListener('keydown', this.onKey); window.removeEventListener('keyup', this.onKey);
      if (this.ro) this.ro.disconnect();
      if (this.renderer) { this.renderer.dispose(); this.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    }
  }

  function makeHuman(T) {
    const g = new T.Group(), m = new T.MeshStandardMaterial({ color: 0x8d2f23, roughness: 0.7 });
    const body = new T.Mesh(new T.CapsuleGeometry(0.2, 0.75, 4, 12), m); body.position.y = 0.9 + 0.08; g.add(body);
    const head = new T.Mesh(new T.SphereGeometry(0.12, 16, 12), m); head.position.y = 1.58; g.add(head);
    const legs = new T.Mesh(new T.CylinderGeometry(0.13, 0.11, 0.6, 10), m); legs.position.y = 0.3; g.add(legs);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.userData.noHit = true; } });
    return g;
  }
  function makeBus(T) {
    const g = new T.Group(), m = new T.MeshStandardMaterial({ color: 0x2e7d5b, roughness: 0.5 });
    const b = new T.Mesh(new T.BoxGeometry(11, 2.9, 2.5), m); b.position.y = 1.75; g.add(b);
    const win = new T.Mesh(new T.BoxGeometry(10.4, 0.8, 2.52), new T.MeshStandardMaterial({ color: 0x223344, roughness: 0.2 })); win.position.y = 2.4; g.add(win);
    [-3.6, 3.6].forEach(x => [-1.2, 1.2].forEach(z => { const w = new T.Mesh(new T.CylinderGeometry(0.5, 0.5, 0.3, 16), new T.MeshStandardMaterial({ color: 0x222222 })); w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w); }));
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  /* ---------------- procedural exhibits ---------------- */
  const BUILD = {};
  const marble = (T, c) => new T.MeshStandardMaterial({ color: c || 0xe9e3d6, roughness: 0.62, metalness: 0 });

  /* fluted, tapering shaft. profile: 'doric' (sharp arrises) or 'ionic' (flutes separated by fillets) */
  function shaftGeo(T, H, r0, r1, nFl, prof, depth) {
    const seg = 40, aroundPer = 10, nA = nFl * aroundPer, pos = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, y = t * H;
      const R = r0 + (r1 - r0) * Math.pow(t, 1.25) + r0 * 0.012 * Math.sin(Math.PI * Math.min(1, t * 1.4)); // entasis
      for (let j = 0; j <= nA; j++) {
        const a = j / nA * Math.PI * 2, u = (j % aroundPer) / aroundPer; // position inside a flute
        let f;
        if (prof === 'doric') f = Math.sin(Math.PI * u);
        else { const q = (u - 0.12) / 0.76; f = q <= 0 || q >= 1 ? 0 : Math.sqrt(Math.max(0, 1 - (2 * q - 1) * (2 * q - 1))); }
        const rr = R * (1 - depth * f);
        pos.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
      }
    }
    const W = nA + 1;
    for (let i = 0; i < seg; i++) for (let j = 0; j < nA; j++) { const a = i * W + j, b = a + W; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const lathe = (T, pts, seg) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg || 64);
  function spiralTube(T, R0, turns, rad, dir) {
    const pts = [];
    for (let i = 0; i <= 120; i++) { const t = i / 120, a = t * turns * Math.PI * 2, r = R0 * (1 - 0.82 * t); pts.push(new T.Vector3(dir * Math.cos(a) * r, -Math.sin(a) * r, 0)); }
    return new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, rad, 8, false);
  }
  function acanthusLeaf(T, w, h, bend) {
    const s = new T.Shape(); s.moveTo(0, 0);
    const lobes = 4;
    for (let i = 1; i <= lobes; i++) { const y = h * i / (lobes + 0.6), x = w / 2 * (1 - 0.15 * i / lobes); s.quadraticCurveTo(x * 1.25, y - h * 0.12, x * 0.72, y); }
    s.quadraticCurveTo(w * 0.15, h * 0.98, 0, h);
    for (let i = lobes; i >= 1; i--) { const y = h * i / (lobes + 0.6), x = -w / 2 * (1 - 0.15 * i / lobes); s.quadraticCurveTo(x * 0.72, y, x * 1.25, y - h * 0.12); }
    s.lineTo(0, 0);
    const g = new T.ShapeGeometry(s, 6), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / h; p.setZ(i, bend * y * y * h + (y > 0.8 ? (y - 0.8) * h * 0.9 : 0)); p.setY(i, p.getY(i) - (y > 0.8 ? (y - 0.8) * (y - 0.8) * h * 2.2 : 0)); }
    g.computeVertexNormals(); return g;
  }
  BUILD.orders = function (sc, T) {
    const M = marble(T), M2 = marble(T, 0xddd5c4), grp = sc.obj;
    const add = (g, m, x, y, z, parent, tg) => { const o = new T.Mesh(g, m || M); o.position.set(x || 0, y || 0, z || 0); o.castShadow = o.receiveShadow = true; if (tg) o.userData.tg = tg; (parent || grp).add(o); return o; };
    const lab = (o, t, dy) => sc.addLabel(o, t, dy, 'ref');
    // examples at true size: Parthenon (Doric), Erechtheion N. porch (Ionic), Olympieion (Corinthian)
    const specs = [
      { k: 'doric', x: -16, D: 1.905, H: 10.43, name: 'ドーリア式（パルテノン神殿、前447〜前432年）' },
      { k: 'ionic', x: 0, D: 0.82, H: 7.63, name: 'イオニア式（エレクテイオン北玄関、前421〜前406年）' },
      { k: 'cor', x: 17, D: 1.92, H: 17.25, name: 'コリント式（オリュンピエイオン、前174年〜後131年）' }];
    sc.columns = [];
    specs.forEach(sp => {
      const c = new T.Group(); c.position.x = sp.x; grp.add(c); sc.columns.push({ g: c, sp });
      const r0 = sp.D / 2;
      // stylobate (3 steps for Doric; a plinth platform otherwise)
      [0, 1, 2].forEach(i => add(new T.BoxGeometry(sp.D * 3.4 - i * 0.7, 0.5, sp.D * 3.4 - i * 0.7), M2, 0, 0.25 + i * 0.5, 0, c));
      let y = 1.5;
      if (sp.k === 'doric') {
        const Hs = sp.H - sp.D * 0.42;
        add(shaftGeo(T, Hs, r0, r0 * 0.78, 20, 'doric', 0.07), M, 0, y, 0, c, 'shaft'); y += Hs;
        add(lathe(T, [[0, 0], [r0 * 0.78, 0], [r0 * 0.8, 0.05], [r0 * 1.05, sp.D * 0.15], [r0 * 1.12, sp.D * 0.24], [0, sp.D * 0.24]]), M, 0, y, 0, c, 'cap'); y += sp.D * 0.24;
        add(new T.BoxGeometry(sp.D * 1.15, sp.D * 0.18, sp.D * 1.15), M, 0, y + sp.D * 0.09, 0, c, 'cap'); y += sp.D * 0.18;
      } else if (sp.k === 'ionic') {
        // Attic base: plinth? (Erechtheion has none) torus - scotia - torus
        add(lathe(T, [[0, 0], [r0 * 1.42, 0], [r0 * 1.5, 0.08], [r0 * 1.42, 0.17], [r0 * 1.2, 0.2], [r0 * 1.12, 0.28], [r0 * 1.22, 0.36], [r0 * 1.28, 0.42], [r0 * 1.2, 0.5], [r0, 0.54], [0, 0.54]]), M, 0, y, 0, c, 'base'); y += 0.54;
        const Hs = sp.H - 0.54 - sp.D * 0.62;
        add(shaftGeo(T, Hs, r0, r0 * 0.84, 24, 'ionic', 0.06), M, 0, y, 0, c, 'shaft'); y += Hs;
        // echinus + volute bolsters
        add(lathe(T, [[0, 0], [r0 * 0.84, 0], [r0 * 1.0, sp.D * 0.12], [r0 * 1.02, sp.D * 0.2], [0, sp.D * 0.2]]), M, 0, y, 0, c, 'cap');
        const vy = y + sp.D * 0.22, VR = sp.D * 0.34, Wc = sp.D * 1.35;
        add(new T.BoxGeometry(Wc, sp.D * 0.12, sp.D * 0.9), M, 0, vy + VR * 0.55, 0, c, 'cap');
        [-1, 1].forEach(sx => {
          add(new T.CylinderGeometry(VR * 0.92, VR * 0.92, sp.D * 0.88, 24).rotateX(Math.PI / 2), M, sx * (Wc / 2 - VR * 0.85), vy, 0, c, 'cap');
          [-1, 1].forEach(sz => { const sp2 = add(spiralTube(T, VR, 3, sp.D * 0.025, sx), M, sx * (Wc / 2 - VR * 0.85), vy, sz * sp.D * 0.45, c, 'cap'); void sp2; });
        });
        add(new T.BoxGeometry(Wc * 0.98, sp.D * 0.08, sp.D * 0.98), M, 0, vy + VR * 0.55 + sp.D * 0.1, 0, c, 'cap');
        y = vy + VR * 0.55 + sp.D * 0.14;
      } else {
        // Corinthian: base, shaft, tall bell capital with two rows of acanthus and corner helices
        add(lathe(T, [[0, 0], [r0 * 1.45, 0], [r0 * 1.45, 0.25], [r0 * 1.38, 0.32], [r0 * 1.18, 0.38], [r0 * 1.25, 0.46], [r0 * 1.12, 0.55], [r0, 0.6], [0, 0.6]]), M, 0, y, 0, c, 'base'); y += 0.6;
        const capH = sp.D * 1.17, Hs = sp.H - 0.6 - capH;
        add(shaftGeo(T, Hs, r0, r0 * 0.86, 24, 'ionic', 0.05), M, 0, y, 0, c, 'shaft'); y += Hs;
        const rb = r0 * 0.86;
        add(lathe(T, [[0, 0], [rb, 0], [rb * 1.02, capH * 0.5], [rb * 1.2, capH * 0.88], [0, capH * 0.88]]), M2, 0, y, 0, c, 'cap');
        const leafM = marble(T, 0xe3dccc); leafM.side = T.DoubleSide;
        [[0, capH * 0.36, 0], [Math.PI / 8, capH * 0.6, capH * 0.18]].forEach(([off, lh, ly]) => {
          for (let i = 0; i < 8; i++) {
            const a = off + i * Math.PI / 4, lf = new T.Mesh(acanthusLeaf(T, rb * 0.95, lh, 0.35), leafM);
            lf.position.set(Math.sin(a) * rb * 1.02, y + ly, Math.cos(a) * rb * 1.02); lf.rotation.y = a; lf.castShadow = true; lf.userData.tg = 'cap'; c.add(lf);
          }
        });
        for (let i = 0; i < 4; i++) {
          const a = Math.PI / 4 + i * Math.PI / 2, h = add(spiralTube(T, sp.D * 0.11, 1.6, sp.D * 0.022, 1), M, Math.sin(a) * rb * 1.2, y + capH * 0.8, Math.cos(a) * rb * 1.2, c, 'cap');
          h.rotation.y = a + Math.PI / 2;
        }
        const ab = new T.Shape(), A = sp.D * 0.78, cc = sp.D * 0.12;
        ab.moveTo(-A, -A + cc); ab.quadraticCurveTo(-A + cc * 1.6, 0, -A, A - cc); ab.lineTo(-A + cc, A); ab.quadraticCurveTo(0, A - cc * 1.6, A - cc, A); ab.lineTo(A, A - cc); ab.quadraticCurveTo(A - cc * 1.6, 0, A, -A + cc); ab.lineTo(A - cc, -A); ab.quadraticCurveTo(0, -A + cc * 1.6, -A + cc, -A); ab.lineTo(-A, -A + cc);
        add(new T.ExtrudeGeometry(ab, { depth: capH * 0.12, bevelEnabled: false }).rotateX(-Math.PI / 2), M, 0, y + capH * 0.88, 0, c, 'cap');
        y += capH;
      }
      // entablature segment (architrave / frieze / cornice)
      const ew = sp.D * 3.2, ed = sp.D * 1.3;
      const E = new T.Group(); E.userData.tg = 'ent'; c.add(E);
      if (sp.k === 'doric') {
        add(new T.BoxGeometry(ew, sp.D * 0.71, ed), M2, 0, y + sp.D * 0.355, 0, E); y += sp.D * 0.71;
        add(new T.BoxGeometry(ew, sp.D * 0.04, ed * 1.02), M2, 0, y, 0, E);
        add(new T.BoxGeometry(ew * 0.99, sp.D * 0.71, ed * 0.96), M2, 0, y + sp.D * 0.355, 0, E);
        [-1, 0, 1].forEach(k => { const tri = add(new T.BoxGeometry(sp.D * 0.45, sp.D * 0.71, ed * 0.08), marble(T, 0xd2cbbb), k * ew * 0.42, y + sp.D * 0.355, ed * 0.5, E); [-1, 0, 1].forEach(q => { const gr = add(new T.BoxGeometry(sp.D * 0.04, sp.D * 0.6, ed * 0.02), marble(T, 0xa49d8c), k * ew * 0.42 + q * sp.D * 0.12, y + sp.D * 0.33, ed * 0.545, E); void gr; }); void tri; });
        y += sp.D * 0.71;
        add(new T.BoxGeometry(ew * 1.08, sp.D * 0.32, ed * 1.15), M2, 0, y + sp.D * 0.16, 0, E); y += sp.D * 0.32;
      } else {
        const ah = sp.D * (sp.k === 'ionic' ? 0.85 : 0.9);
        [0, 1, 2].forEach(i => add(new T.BoxGeometry(ew, ah / 3, ed * (0.94 + i * 0.03)), M2, 0, y + ah / 6 + i * ah / 3, 0, E)); y += ah;
        add(new T.BoxGeometry(ew, ah * 0.9, ed * 0.98), M2, 0, y + ah * 0.45, 0, E); y += ah * 0.9;
        for (let i = 0; i < 14; i++) add(new T.BoxGeometry(ew / 30, ah * 0.16, ed * 0.08), M2, -ew / 2 + ew / 28 + i * ew / 14, y + ah * 0.08, ed * 0.53, E); // dentils
        y += ah * 0.16;
        add(new T.BoxGeometry(ew * 1.08, ah * 0.35, ed * 1.18), M2, 0, y + ah * 0.175, 0, E); y += ah * 0.35;
      }
      const top = new T.Object3D(); top.position.set(0, y + 1.2, 0); c.add(top); lab(top, sp.name, 0);
      sp.top = y;
    });
    sc.ex.walkStart = [0, 0, 18];
    sc.ex.onToggle = (s, id, on) => { if (id === 'norm') s.columns.forEach(({ g, sp }) => g.scale.setScalar(on ? 1.9 / sp.D : 1)); };
  };
  BUILD.khufu = function (sc, T) {
    const B = 230.33, H = 146.6, grp = sc.obj;
    const stone = new T.MeshStandardMaterial({ color: 0xd9c08f, roughness: 0.95, transparent: true, opacity: 1 });
    sc.pyrMat = stone;
    // stepped courses (every ~1.4 m) give the real rough surface; the top 8.5 m (capstone part) is missing today
    const courses = 96, parts = [];
    for (let i = 0; i < courses; i++) { const y0 = H * i / courses, y1 = Math.min(138.5, H * (i + 1) / courses); if (y0 >= 138.5) break; const w = B * (1 - y0 / H); const g = new T.BoxGeometry(w, y1 - y0, w); g.translate(0, (y0 + y1) / 2, 0); parts.push(g); }
    const core = new T.Mesh(T.mergeGeometries(parts), stone); core.castShadow = core.receiveShadow = true; core.userData.tgOff = 'cut'; grp.add(core);
    // original smooth casing (white limestone), shown as a ghost
    const cas = new T.Mesh(new T.ConeGeometry(B / Math.SQRT2, H, 4, 1).rotateY(Math.PI / 4).translate(0, H / 2, 0), new T.MeshStandardMaterial({ color: 0xf4efe2, transparent: true, opacity: 0.22, depthWrite: false })); cas.userData = { tg: 'casing', noHit: true, noBox: true }; grp.add(cas);
    const ghost = new T.Mesh(new T.ConeGeometry(B / Math.SQRT2, H, 4, 1).rotateY(Math.PI / 4).translate(0, H / 2, 0), new T.MeshStandardMaterial({ color: 0xd9c08f, transparent: true, opacity: 0.12, depthWrite: false }));
    ghost.userData = { tg: 'cut', noHit: true, noBox: true }; grp.add(ghost);
    const wire = new T.LineSegments(new T.EdgesGeometry(ghost.geometry), new T.LineBasicMaterial({ color: 0x8a6a3a })); wire.userData = { tg: 'cut', noHit: true, noBox: true }; grp.add(wire);
    // interior (approximate): north is +z here
    const dark = new T.MeshStandardMaterial({ color: 0x7a2c1c, roughness: 0.8 }), dark2 = new T.MeshStandardMaterial({ color: 0x2f4f6f, roughness: 0.8 });
    const IN = new T.Group(); IN.userData.tg = 'cut'; IN.userData.noBox = true; grp.add(IN);
    const box = (w, h, d, x, y, z, m, rx) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m || dark); o.position.set(x, y, z); if (rx) o.rotation.x = rx; o.userData.noHit = true; IN.add(o); return o; };
    const slope = 26.5 * Math.PI / 180;
    // descending passage: entrance ~17 m above base on the north face, down to the subterranean chamber 30 m below base
    const ez = (B / 2) * (1 - 17 / H), ent = new T.Vector3(0, 17, ez), Ld = 105;
    const dEnd = new T.Vector3(0, ent.y - Ld * Math.sin(slope), ent.z - Ld * Math.cos(slope));
    const mid = ent.clone().add(dEnd).multiplyScalar(0.5);
    box(1.05, 1.2, Ld, mid.x, mid.y, mid.z, dark, -slope);
    box(8.3, 3.5, 14, 0, dEnd.y - 1, dEnd.z - 8, dark2);
    // ascending passage (39 m) from ~28 m inside the descending passage, then the Grand Gallery (46.7 m, 8.6 m high)
    const aStart = ent.clone().add(new T.Vector3(0, -28 * Math.sin(slope), -28 * Math.cos(slope)));
    const aEnd = aStart.clone().add(new T.Vector3(0, 39 * Math.sin(slope), -39 * Math.cos(slope)));
    const am = aStart.clone().add(aEnd).multiplyScalar(0.5); box(1.05, 1.2, 39, 0, am.y, am.z, dark, slope);
    const gEnd = aEnd.clone().add(new T.Vector3(0, 46.7 * Math.sin(slope), -46.7 * Math.cos(slope)));
    const gm = aEnd.clone().add(gEnd).multiplyScalar(0.5); box(2.06, 8.6, 46.7, 0, gm.y + 3.7, gm.z, dark, slope);
    // Queen's chamber (horizontal passage at the gallery foot), King's chamber at 43 m
    box(1.05, 1.17, 38, 0, aEnd.y - 0.6, aEnd.z - 19, dark);
    const qc = box(5.23, 6.23, 5.75, 0, aEnd.y + 2.5, aEnd.z - 38 - 2.9, dark2);
    const kc = box(10.47, 5.84, 5.23, 0, 43 + 2.92, gEnd.z - 6, dark2);
    const lab = (o, t, dy) => { sc.addLabel(o, t, dy == null ? 4 : dy, 'ref').el.dataset.tg = 'cut'; };
    lab(kc, '王の間（10.5×5.2 m、床は地上43 m）'); lab(qc, '女王の間', -5);
    const gl = new T.Object3D(); gl.position.copy(gm); IN.add(gl); lab(gl, '大回廊（長さ47 m・高さ8.6 m）');
    const sub = new T.Object3D(); sub.position.set(0, dEnd.y, dEnd.z - 8); IN.add(sub); lab(sub, '地下の間（地表から約30 m下）');
    const en = new T.Object3D(); en.position.copy(ent); IN.add(en); lab(en, '入口（北面、地上約17 m）');
    sc.ex.walkStart = [0, 0, B / 2 + 30];
    sc.ex.onToggle = (s, id, on) => { if (id === 'cut') s.labels.forEach(L => { if (L.el.dataset.tg === 'cut') L.el.hidden = !on; }); };
  };
})();
