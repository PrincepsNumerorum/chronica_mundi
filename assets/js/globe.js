/* 3D globe view (three.js r128, loaded on demand); texture composed from the MapView tiles */
(function () {
  'use strict';
  let threeReady = null;
  const loadThree = () => threeReady || (threeReady = CM.load('assets/vendor/three.min.js'));

  function compose(mv, canvas) {
    const { W, H, T } = CM.MAP;
    canvas.width = W; canvas.height = H;
    const g = canvas.getContext('2d');
    const dark = CM.isDark();
    g.fillStyle = dark ? '#17242c' : '#c4d5d8'; g.fillRect(0, 0, W, H);
    mv.tiles.forEach(t => {
      const rel = CM._reliefTiles ? CM._reliefTiles[t.key] : null;
      if (rel) g.drawImage(rel, t.i * T, t.j * T);
    });
    mv.tiles.forEach(t => {
      if (t.fill && mv.year >= CM.MAP.MIN_YEAR) { g.globalAlpha = 0.55; g.drawImage(t.fill, t.i * T, t.j * T); g.globalAlpha = 1; }
      if (t.border && mv.year >= CM.MAP.MIN_YEAR) { g.globalAlpha = 0.8; g.drawImage(t.border, t.i * T, t.j * T); g.globalAlpha = 1; }
    });
    if (mv.hl) g.drawImage(mv.hl.canvas, mv.hl.x, mv.hl.y);
    // coastline
    if (CM.geo) {
      g.strokeStyle = dark ? 'rgba(170,200,210,.8)' : 'rgba(40,70,85,.75)'; g.lineWidth = 1.2;
      CM.geo.coast.forEach(a => {
        let x = 0, y = 0; g.beginPath();
        for (let i = 0; i < a.length; i += 2) { x += a[i]; y += a[i + 1]; const px = (x / 100 + 180) * 10, py = (90 - y / 100) * 10; i ? g.lineTo(px, py) : g.moveTo(px, py); }
        g.stroke();
      });
    }
    // major labels
    (mv.labels || []).filter(l => l.lv <= 1).forEach(l => {
      const size = l.lv === 0 ? 26 : 18;
      g.font = '700 ' + size + 'px ' + CM.css('--font-display');
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.lineJoin = 'round';
      g.strokeStyle = dark ? 'rgba(18,22,29,.85)' : 'rgba(246,247,243,.9)'; g.strokeText(l.abbr, l.x, l.y);
      g.fillStyle = dark ? '#e7e2d6' : '#2b2a33'; g.fillText(l.abbr, l.x, l.y);
    });
  }

  CM.openGlobe = async function (mv) {
    const host = mv.el.parentElement;
    const wrap = CM.h('div', { class: 'mapview', style: 'position:absolute;inset:0;z-index:6' });
    const hud = CM.h('div', { class: 'map-hud' }, '<div class="map-year">' + CM.esc(CM.fmtYear(mv.year)) + '<small>地球儀表示（ドラッグで回転・ホイールで拡大）</small></div>');
    const close = CM.h('button', { type: 'button', class: 'btn', style: 'position:absolute;right:12px;top:10px;z-index:3' }, '平面地図に戻る');
    wrap.append(hud, close);
    host.appendChild(wrap);
    try { await loadThree(); } catch (e) { wrap.innerHTML = '<div class="map-loading">3D表示用ライブラリを読み込めなかった。</div>'; return; }
    const THREE = window.THREE;
    const r = wrap.getBoundingClientRect();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(r.width, r.height);
    wrap.insertBefore(renderer.domElement, hud);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, r.width / r.height, 0.01, 100);
    const texCanvas = document.createElement('canvas');
    compose(mv, texCanvas);
    // relief underneath: draw the visible main map once more at scale 1 for colours
    const tex = new THREE.CanvasTexture(texCanvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshBasicMaterial({ map: tex }));
    scene.add(globe);
    const atm = new THREE.Mesh(new THREE.SphereGeometry(1.03, 64, 48), new THREE.MeshBasicMaterial({ color: CM.isDark() ? 0x3a6a80 : 0x8fb4c4, transparent: true, opacity: 0.18, side: THREE.BackSide }));
    scene.add(atm);
    const ll = CM.w2ll(mv.cx, mv.cy);
    let lon = ll[0], lat = CM.clamp(ll[1], -70, 70), dist = 3.2, alive = true, idle = 0;
    const place = () => {
      const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI;
      cam.position.set(-Math.cos(phi) * Math.sin(th) * dist, Math.cos(th) * dist, Math.sin(phi) * Math.sin(th) * dist);
      cam.lookAt(0, 0, 0);
    };
    let drag = null;
    const cv = renderer.domElement;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, lon, lat]; cv.setPointerCapture(e.pointerId); idle = 0; });
    cv.addEventListener('pointermove', e => { if (!drag) return; const k = 60 / dist; lon = drag[2] - (e.clientX - drag[0]) * k / 100; lat = CM.clamp(drag[3] + (e.clientY - drag[1]) * k / 100, -85, 85); });
    cv.addEventListener('pointerup', () => { drag = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); dist = CM.clamp(dist * Math.exp(e.deltaY * 0.001), 1.25, 6); }, { passive: false });
    const onYear = mv.opts.onYear;
    mv.opts.onYear = (y) => { if (onYear) onYear(y); compose(mv, texCanvas); tex.needsUpdate = true; hud.querySelector('.map-year').firstChild.textContent = CM.fmtYear(y); };
    const loop = () => {
      if (!alive) return;
      if (!drag) { idle++; if (idle > 180 && !CM.reducedMotion()) lon += 0.05; }
      place(); renderer.render(scene, cam); requestAnimationFrame(loop);
    };
    loop();
    const ro = new ResizeObserver(() => { const b = wrap.getBoundingClientRect(); renderer.setSize(b.width, b.height); cam.aspect = b.width / b.height; cam.updateProjectionMatrix(); });
    ro.observe(wrap);
    close.addEventListener('click', () => { alive = false; ro.disconnect(); mv.opts.onYear = onYear; renderer.dispose(); tex.dispose(); wrap.remove(); });
  };
})();
