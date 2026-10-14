/* Lesson reader: article scenes drive the sticky stage (map / battle / image / figure) */
(function () {
  'use strict';

  class Stage {
    constructor(el) {
      this.el = el; this.kind = null; this.map = null; this.battle = null; this.other = null;
      this.mapHost = CM.h('div', { style: 'position:absolute;inset:0' });
      this.otherHost = CM.h('div', { style: 'position:absolute;inset:0;display:none' });
      this.bar = CM.h('div', { class: 'stage-bar' }, '<button type="button" class="btn" data-a="collapse">図を縮める</button><span class="muted" data-r="label"></span>');
      el.append(this.mapHost, this.otherHost, this.bar);
      this.bar.addEventListener('click', (e) => { if (e.target.closest('[data-a=collapse]')) { el.classList.toggle('collapsed'); e.target.textContent = el.classList.contains('collapsed') ? '図を広げる' : '図を縮める'; } });
    }
    async show(sc) {
      if (!sc) return;
      const key = JSON.stringify(sc);
      if (key === this.lastKey) return;
      this.lastKey = key;
      this.bar.querySelector('[data-r=label]').textContent = sc.type === 'battle' ? '戦況図' : sc.type === 'map' ? '地図' : '図版';
      if (sc.type === 'map') {
        this.otherHost.style.display = 'none'; this.mapHost.style.display = '';
        if (this.battle) { this.battle.destroy(); this.battle = null; this.battleId = null; }
        if (!this.map) { this.map = new CM.MapView(this.mapHost, {}); this.map.setView(sc.view ? sc.view[0] : 60, sc.view ? sc.view[1] : 35, sc.view ? sc.view[2] : 0.4); await this.map.ready; return this.map.apply(sc, { instant: true }); }
        this.map.resize();
        return this.map.apply(sc);
      }
      this.mapHost.style.display = 'none'; this.otherHost.style.display = '';
      if (this.map) this.map.stopPlay();
      if (sc.type === 'battle') {
        if (this.battleId !== sc.id) {
          if (this.battle) this.battle.destroy();
          this.otherHost.innerHTML = '';
          const data = await CM.loadBattle(sc.id);
          this.battle = new CM.BattleView(this.otherHost, data, { phase: sc.phase || 0 });
          this.battleId = sc.id;
        } else this.battle.go(sc.phase || 0);
        return;
      }
      if (this.battle) { this.battle.destroy(); this.battle = null; this.battleId = null; }
      if (sc.type === 'image') {
        this.otherHost.innerHTML = '<figure class="img" style="margin:0;height:100%;display:grid;grid-template-rows:minmax(0,1fr) auto;background:var(--paper-2)"><img src="' + CM.esc(sc.src) + '" alt="' + CM.esc(sc.alt || sc.cap || '') + '" style="width:100%;height:100%;object-fit:contain;border-radius:0;background:transparent"><div class="fallback">画像はオンライン時に表示される：' + CM.esc(sc.cap || '') + ' <a href="' + CM.esc(sc.page || sc.src) + '" target="_blank" rel="noopener">出典を開く</a></div><figcaption style="padding:8px 12px;margin:0;background:var(--card);border-top:1px solid var(--rule)">' + (sc.capHtml || CM.esc(sc.cap || '')) + '</figcaption></figure>';
        CM.bindInline(this.otherHost);
      } else if (sc.type === 'figure') {
        this.otherHost.innerHTML = '<div style="height:100%;overflow:auto;padding:16px;background:var(--card);display:grid;place-items:center">' + sc.html + '</div>';
        CM.bindInline(this.otherHost);
      }
    }
    destroy() { if (this.map) this.map.destroy(); if (this.battle) this.battle.destroy(); }
  }

  function cueText(st) {
    if (st.type === 'map') return '地図：' + (st.caption || st.ylabel || CM.fmtYear(st.play ? st.play[1] : st.year));
    if (st.type === 'battle') return '戦況図：段階' + ((st.phase || 0) + 1);
    if (st.type === 'image') return '図版：' + (st.cap || '').slice(0, 30);
    return '図解';
  }
  function renderQuiz(L, host) {
    if (!L.quiz || !L.quiz.length) return;
    let score = 0, answered = 0;
    const wrap = CM.h('div', { class: 'quiz' });
    L.quiz.forEach((q, qi) => {
      const order = q.opts.map((o, i) => i).sort(() => Math.random() - .5);
      const card = CM.h('div', { class: 'qcard' }, '<div class="qq">問' + (qi + 1) + '　' + q.q + '</div><div class="opts">' + order.map(i => '<button type="button" data-i="' + i + '">' + q.opts[i] + '</button>').join('') + '</div><div class="qe" hidden>' + q.e + '</div>');
      card.querySelector('.opts').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b || card.dataset.done) return;
        card.dataset.done = 1; answered++;
        const ok = +b.dataset.i === q.a;
        if (ok) score++;
        card.querySelectorAll('.opts button').forEach(x => { if (+x.dataset.i === q.a) x.classList.add('ok'); else if (x === b) x.classList.add('ng'); });
        card.querySelector('.qe').hidden = false;
        CM.bindInline(card);
        if (answered === L.quiz.length) { CM.progress.quiz(L.id, score, L.quiz.length); CM.toast(L.quiz.length + '問中 ' + score + '問正解'); }
      });
      wrap.appendChild(card);
    });
    host.appendChild(wrap);
  }

  async function renderContemp(L, el) {
    const y = +el.dataset.y, r = +(el.dataset.r || 15);
    try { await CM.load('data/events.js'); } catch (e) { el.remove(); return; }
    const mine = new Set(L.regions || []);
    const ev = CM.events.filter(e => Math.abs(e.y - y) <= r && !mine.has(e.r));
    const byR = {};
    ev.forEach(e => { (byR[e.r] = byR[e.r] || []).push(e); });
    const pick = [];
    Object.keys(byR).forEach(k => { byR[k].sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y)); pick.push(...byR[k].slice(0, 2)); });
    pick.sort((a, b) => a.y - b.y);
    el.innerHTML = '<h4>同じころの世界（' + CM.esc(CM.fmtYear(y - r)) + '〜' + CM.esc(CM.fmtYear(y + r)) + '）</h4><ul>' + pick.slice(0, 10).map(e => '<li><span class="num">' + CM.esc(CM.fmtYearShort(e.y)) + '</span><span class="rg">' + CM.esc(CM.REGION_JA[e.r] || '') + '</span>' + CM.esc(e.t) + '</li>').join('') + '</ul>';
    if (!pick.length) el.remove();
  }

  CM.pages.lesson = {
    async render(view, params, q) {
      const id = params[0];
      const meta = CM.lessonMeta(id);
      if (!CM.lessons[id]) {
        try { await CM.load('data/lessons/' + id + '.js'); } catch (e) {
          view.innerHTML = '<div class="wrap"><h1>' + CM.esc(meta ? meta.title : id) + '</h1><p class="muted">この回はまだ準備中である。</p><p><a href="#/">目次へ戻る</a></p></div>';
          return;
        }
      }
      const L = CM.lessons[id];
      document.title = L.title + '｜CHRONICA MUNDI';
      const part = meta && meta.part;
      let html = '<div class="lesson"><article class="lesson-article" id="lart"><header class="lesson-head">' +
        '<div class="eyebrow"><span>' + CM.esc(part ? part.no + '　' + part.title : '') + '</span><span>第' + CM.esc(L.no || (meta && meta.no) || '') + '回</span></div>' +
        '<h1>' + CM.esc(L.title) + '</h1><div class="chips"><span class="chip num">' + CM.esc(L.period || '') + '</span>' + (L.regions || []).map(r => '<span class="chip">' + CM.esc(CM.REGION_JA[r] || r) + '</span>').join('') + '<span class="chip">約' + Math.max(5, Math.round((L.chars || 0) / 600)) + '分</span></div>' +
        (L.question ? '<div class="question"><b>この回の問い</b><span>' + CM.esc(L.question) + '</span></div>' : '') +
        '<nav class="toc"><span class="eyebrow">目次</span><ol>' + (L.toc || []).map(t => '<li><a href="#" data-anchor="' + t.id + '">' + CM.esc(t.t) + '</a></li>').join('') + '</ol></nav></header><div class="prose" id="lprose">';
      L.scenes.forEach((s, i) => { html += '<section class="scene" data-i="' + i + '">' + (s.stage ? '<button type="button" class="scene-cue">' + CM.esc(s.cue || cueText(s.stage)) + '</button>' : '') + s.html + '</section>'; });
      html += '</div><footer class="lesson-foot" id="lfoot">';
      if (L.summary && L.summary.length) html += '<h2 style="font-size:1.2rem">まとめ</h2><div class="summary"><ol>' + L.summary.map(s => '<li>' + s + '</li>').join('') + '</ol></div>';
      if (L.quiz && L.quiz.length) html += '<h2 style="font-size:1.2rem;margin-top:1.8em">確認問題</h2><div id="lquiz"></div>';
      if (L.sources && L.sources.length) html += '<div class="sources"><h2 style="font-size:1.1rem;margin-top:1.8em">出典・参考文献</h2><ol>' + L.sources.map(s => '<li id="src-' + CM.esc(s.k || '') + '">' + s.h + '</li>').join('') + '</ol></div>';
      const order = CM.lessonOrder().filter(l => l.ready), idx = order.findIndex(l => l.id === id);
      html += '<div class="pager">' + (idx > 0 ? '<a class="btn" href="#/lesson/' + order[idx - 1].id + '">← ' + CM.esc(order[idx - 1].title) + '</a>' : '<span></span>') + (idx >= 0 && idx < order.length - 1 ? '<a class="btn" href="#/lesson/' + order[idx + 1].id + '">' + CM.esc(order[idx + 1].title) + ' →</a>' : '') + '</div>';
      html += '</footer></article><aside class="lesson-stage" id="lstage" aria-label="地図と図版"></aside></div>';
      view.innerHTML = html;
      if (!L.scenes.some(sc => sc.stage)) view.querySelector('.lesson').classList.add('nostage');
      const art = document.getElementById('lart');
      CM.bindInline(art);
      if (L.quiz) renderQuiz(L, document.getElementById('lquiz'));
      art.querySelectorAll('.contemp[data-y]').forEach(el => renderContemp(L, el));
      art.querySelectorAll('[data-anchor]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.dataset.anchor); if (t) t.scrollIntoView({ behavior: CM.reducedMotion() ? 'auto' : 'smooth' }); }));
      art.querySelectorAll('a[href^="#fn-"], a[href^="#src-"]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); const t = document.getElementById(a.getAttribute('href').slice(1)); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
      // stage
      const stage = this.stage = new Stage(document.getElementById('lstage'));
      const scenes = [...art.querySelectorAll('.scene')];
      let active = -1;
      const activate = (i) => {
        if (i === active) return;
        // find the nearest scene at or before i that has a stage
        let k = i; while (k >= 0 && !L.scenes[k].stage) k--;
        if (k < 0) k = L.scenes.findIndex(s => s.stage);
        scenes.forEach((s, j) => s.classList.toggle('active', j === i));
        active = i;
        if (k >= 0) stage.show(L.scenes[k].stage);
      };
      scenes.forEach((s, i) => { const b = s.querySelector('.scene-cue'); if (b) b.addEventListener('click', () => { stage.lastKey = null; activate(i); active = i; }); });
      const pick = () => {
        const mobile = matchMedia('(max-width: 760px)').matches;
        const line = mobile ? innerHeight * 0.62 : innerHeight * 0.42;
        let best = 0;
        for (let j = 0; j < scenes.length; j++) { if (scenes[j].getBoundingClientRect().top <= line) best = j; else break; }
        activate(best);
      };
      let ticking = false;
      this.onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pick(); }); } };
      window.addEventListener('scroll', this.onScroll, { passive: true });
      activate(0);
      // mark read at the end
      this.io2 = new IntersectionObserver((en) => { if (en.some(e => e.isIntersecting)) CM.progress.markRead(id); }, {});
      this.io2.observe(document.getElementById('lfoot'));
      CM.storage.set('last', id);
      // deep link to a topic
      if (q && q.topic) {
        const t = document.getElementById(q.topic);
        if (t) { t.open = true; setTimeout(() => t.scrollIntoView({ block: 'center' }), 60); }
      }
    },
    destroy() { if (this.onScroll) window.removeEventListener('scroll', this.onScroll); if (this.io2) this.io2.disconnect(); if (this.stage) this.stage.destroy(); this.stage = null; document.title = 'CHRONICA MUNDI 世界史講義アトラス'; }
  };
})();
