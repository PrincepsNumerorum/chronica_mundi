/* Index pages: terms, term, topics, timeline, search */
(function () {
  'use strict';
  CM.REGION_JA = { cn: '中国', kj: '朝鮮・日本', ia: '内陸アジア', sa: '南アジア', se: '東南アジア', wa: '西アジア・北アフリカ', eu: 'ヨーロッパ', ru: 'ロシア・東欧', af: 'アフリカ', am: '南北アメリカ', oc: 'オセアニア', gl: '世界・国際' };
  CM.REGION_KEYS = Object.keys(CM.REGION_JA);
  // topic families (see tools/build.py TOPIC_FAM)
  const TOPIC_FAMS = [['src', '史料', '当時の人びとが残した記録・証言・遺物'], ['deep', '深掘り', '人物・暮らし・しくみ・戦術をくわしく'], ['think', '考える', '諸説・俗説の検証・別の視点'], ['confuse', '混同注意', '取り違えやすい用語や出来事'], ['now', 'いま', '現在まで続く問題'], ['works', '作品', 'その時代を描いた小説・映画・美術'], ['music', '音楽', '時代を映した歌と曲を、録音で聴く'], ['side', 'こぼれ話', '教科書では触れない、気になる場面']];
  const TOPIC_KIND = { source: ['src', '記録'], voice: ['src', '証言'], relic: ['src', '遺物'], person: ['deep', '人物'], life: ['deep', '暮らし'], mech: ['deep', 'しくみ'], war: ['deep', '戦術'], term: ['deep', 'ことば'], debate: ['think', '諸説あり'], myth: ['think', '俗説を検証'], view: ['think', '別の視点'], confuse: ['confuse', ''], now: ['now', ''], works: ['works', ''], music: ['music', ''], trivia: ['side', ''] };
  const FAM_JA = Object.fromEntries(TOPIC_FAMS.map(f => [f[0], f[1]]));
  const TOPIC_JA = Object.fromEntries(Object.entries(TOPIC_KIND).map(([k, v]) => [k, FAM_JA[v[0]] + (v[1] ? '｜' + v[1] : '')]));
  CM.TOPIC_JA = TOPIC_JA;
  const KANA_LABEL = { a: 'あ', ka: 'か', sa: 'さ', ta: 'た', na: 'な', ha: 'は', ma: 'ま', ya: 'や', ra: 'ら', wa: 'わ', etc: '他' };

  /* ---------------- terms index ---------------- */
  CM.pages.terms = {
    render(view, params, q) {
      const list = (CM.terms ? CM.terms.list : []).slice().sort((a, b) => (a.y || '').localeCompare(b.y || '', 'ja'));
      const cats = [...new Set(list.map(t => t.k).filter(Boolean))].sort();
      const row = (q && q.row) || CM.storage.get('termRow', 'a');
      view.innerHTML = '<div class="wrap"><div class="page-head"><h1>用語索引</h1><p>' + list.length + '語。人物・国家・制度・事件・地名などを五十音順に収める。</p></div>' +
        '<div class="kana-tabs" id="ktabs">' + Object.keys(KANA_LABEL).map(k => '<button type="button" data-k="' + k + '">' + KANA_LABEL[k] + '</button>').join('') + '<button type="button" data-k="all">すべて</button></div>' +
        '<div class="filters"><select id="tcat" aria-label="分類"><option value="">すべての分類</option>' + cats.map(c => '<option>' + CM.esc(c) + '</option>').join('') + '</select><input id="tq" type="search" placeholder="見出し語で絞り込む" aria-label="見出し語で絞り込む"></div><div class="term-list" id="tlist"></div></div>';
      const draw = (k) => {
        CM.storage.set('termRow', k);
        document.querySelectorAll('#ktabs button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
        const cat = document.getElementById('tcat').value, s = document.getElementById('tq').value.trim();
        const items = list.filter(t => (k === 'all' || s || t.c === k) && (!cat || t.k === cat) && (!s || t.h.indexOf(s) >= 0 || (t.y || '').indexOf(s) >= 0 || (t.a || []).some(a => a.indexOf(s) >= 0)));
        let html = '', lastHead = '';
        items.forEach(t => {
          const h = (t.y || '?').charAt(0);
          if (h !== lastHead) { html += '<h3>' + CM.esc(h) + '</h3>'; lastHead = h; }
          html += '<a href="#/term/' + encodeURIComponent(t.h) + '">' + CM.esc(t.h) + (t.k ? '<small>' + CM.esc(t.k) + '</small>' : '') + '</a>';
        });
        document.getElementById('tlist').innerHTML = html || '<p class="muted">該当する語はまだない。</p>';
      };
      document.getElementById('ktabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) draw(b.dataset.k); });
      document.getElementById('tcat').addEventListener('change', () => draw(CM.storage.get('termRow', 'a')));
      document.getElementById('tq').addEventListener('input', () => draw(CM.storage.get('termRow', 'a')));
      draw(row);
    }
  };
  CM.pages.term = {
    async render(view, params) {
      const name = params.join('/');
      view.innerHTML = '<div class="wrap"><div class="term-page" id="tp"><p class="muted">読み込み中…</p></div><p style="margin-top:2em"><a href="#/terms">← 用語索引へ</a></p></div>';
      const tp = document.getElementById('tp');
      tp.innerHTML = await CM.renderTerm(name);
      CM.bindInline(tp);
    }
  };

  /* ---------------- topics ---------------- */
  CM.pages.topics = {
    render(view) {
      const list = CM.topics || [];
      const famOf = (t) => t.f || (TOPIC_KIND[t.k] || ['side'])[0];
      view.innerHTML = '<div class="wrap"><div class="page-head"><h1>トピックス</h1><p>講義の途中に差し込んだ囲み記事 ' + list.length + '件。読者が知りたいことに応じて、8つのグループに分けている。押すと講義の該当箇所が開く。</p></div>' +
        '<div class="tfams">' + TOPIC_FAMS.map(f => '<button type="button" class="tfam tf-' + f[0] + '" data-f="' + f[0] + '"><b>' + f[1] + '</b><span>' + f[2] + '</span><em>' + list.filter(t => famOf(t) === f[0]).length + '件</em></button>').join('') + '</div>' +
        '<div class="filters"><select id="pk" aria-label="種類"><option value="">すべての種類</option>' + TOPIC_FAMS.map(f => '<optgroup label="' + f[1] + '"><option value="f:' + f[0] + '">' + f[1] + '（すべて）</option>' + Object.keys(TOPIC_KIND).filter(k => TOPIC_KIND[k][0] === f[0] && TOPIC_KIND[k][1] && list.some(t => t.k === k)).map(k => '<option value="' + k + '">' + TOPIC_JA[k] + '</option>').join('') + '</optgroup>').join('') + '</select><input id="pq" type="search" placeholder="キーワードで絞り込む" aria-label="キーワードで絞り込む"></div><div class="cards" id="plist"></div></div>';
      const draw = () => {
        const k = document.getElementById('pk').value, s = document.getElementById('pq').value.trim();
        view.querySelectorAll('.tfam').forEach(b => b.classList.toggle('on', k === 'f:' + b.dataset.f));
        document.getElementById('plist').innerHTML = list.filter(t => (!k || (k.startsWith('f:') ? famOf(t) === k.slice(2) : t.k === k)) && (!s || t.t.indexOf(s) >= 0 || t.x.indexOf(s) >= 0)).map(t => {
          const L = CM.lessonMeta(t.l);
          return '<a class="card" href="#/lesson/' + t.l + '?topic=' + t.id + '"><div class="meta"><span class="chip tchip tf-' + famOf(t) + '">' + CM.esc(TOPIC_JA[t.k] || t.k) + '</span><span>' + CM.esc(L ? L.title : '') + '</span></div><h3>' + CM.esc(t.t) + '</h3><p>' + CM.esc(t.x) + '…</p></a>';
        }).join('') || '<p class="muted">該当なし</p>';
      };
      view.querySelectorAll('.tfam').forEach(b => b.addEventListener('click', () => { const sel = document.getElementById('pk'); sel.value = sel.value === 'f:' + b.dataset.f ? '' : 'f:' + b.dataset.f; draw(); }));
      document.getElementById('pk').addEventListener('change', draw);
      document.getElementById('pq').addEventListener('input', draw);
      draw();
    }
  };

  /* ---------------- timeline ---------------- */
  const RANGES = [[-10000000, -3000, '先史〜前3000年'], [-3000, -1000, '前3000〜前1000年'], [-1000, -500, '前1000〜前500年'], [-500, -1, '前500〜前1年'], [1, 500, '1〜500年'], [500, 1000, '500〜1000年'],
    [1000, 1200, '1000〜1200年'], [1200, 1400, '1200〜1400年'], [1400, 1600, '1400〜1600年'], [1600, 1700, '1600〜1700年'], [1700, 1800, '1700〜1800年'], [1800, 1850, '1800〜1850年'], [1850, 1900, '1850〜1900年'],
    [1900, 1920, '1900〜1920年'], [1920, 1945, '1920〜1945年'], [1945, 1970, '1945〜1970年'], [1970, 2000, '1970〜2000年'], [2000, 2027, '2000〜2026年']];
  CM.pages.timeline = {
    async render(view, params, q) {
      view.innerHTML = '<div class="wrap" style="max-width:none"><div class="page-head"><h1>同時代年表</h1><p>同じ時期に各地域で何が起きていたかを横に並べて見る。年を押すとその年の歴史地図が開く。</p></div>' +
        '<div class="filters"><select id="trange" aria-label="時代">' + RANGES.map((r, i) => '<option value="' + i + '">' + r[2] + '</option>').join('') + '</select>' +
        '<span id="tregs" style="display:flex;flex-wrap:wrap;gap:4px 10px;font-size:calc(13px * var(--ui,1))">' + CM.REGION_KEYS.map(k => '<label><input type="checkbox" value="' + k + '" checked> ' + CM.REGION_JA[k] + '</label>').join('') + '</span>' +
        '<input id="tfind" type="search" placeholder="出来事を絞り込む" aria-label="出来事を絞り込む"></div><div class="tl-scroll"><div class="tl" id="tl"></div></div></div>';
      await CM.load('data/events.js');
      const sel = document.getElementById('trange');
      sel.value = CM.storage.get('tlRange', 7);
      const draw = () => {
        const r = RANGES[+sel.value]; CM.storage.set('tlRange', +sel.value);
        const regs = [...document.querySelectorAll('#tregs input:checked')].map(i => i.value);
        const s = document.getElementById('tfind').value.trim();
        const ev = CM.events.filter(e => e.y >= r[0] && e.y < r[1] && regs.indexOf(e.r) >= 0 && (!s || e.t.indexOf(s) >= 0));
        const years = [...new Set(ev.map(e => e.y))].sort((a, b) => a - b);
        const tl = document.getElementById('tl');
        tl.style.setProperty('--cols', regs.length);
        let html = '<div class="tl-row tl-head"><div>年</div>' + regs.map(k => '<div>' + CM.REGION_JA[k] + '</div>').join('') + '</div>';
        years.forEach(y => {
          html += '<div class="tl-row"><div><a href="#/atlas/' + (y < -4000 ? -4000 : y) + '">' + CM.esc(CM.fmtYear(y)) + '</a></div>';
          regs.forEach(k => {
            html += '<div>' + ev.filter(e => e.y === y && e.r === k).map(e => '<div class="tl-ev">' + (e.m ? '<span class="md">' + e.m + (e.d ? '/' + e.d : '') + '</span>' : '') + (e.c ? '<span class="md">頃</span>' : '') + CM.esc(e.t) + '</div>').join('') + '</div>';
          });
          html += '</div>';
        });
        tl.innerHTML = years.length ? html : '<p class="muted">該当する出来事がない。</p>';
      };
      sel.addEventListener('change', draw);
      document.getElementById('tregs').addEventListener('change', draw);
      document.getElementById('tfind').addEventListener('input', draw);
      draw();
    }
  };

  /* ---------------- search ---------------- */
  CM.pages.search = {
    async render(view, params, q) {
      const query = (q && q.q) ? q.q.trim() : '';
      document.getElementById('searchbox').value = query;
      view.innerHTML = '<div class="wrap"><div class="page-head"><h1>検索：「' + CM.esc(query) + '」</h1></div><div class="search-res" id="sres"><p class="muted">検索中…</p></div></div>';
      if (!query) { document.getElementById('sres').innerHTML = '<p class="muted">キーワードを入力してほしい。</p>'; return; }
      await Promise.all([CM.load('data/search.js'), CM.load('data/events.js')]);
      const hits = [];
      const snip = (text, i) => { const a = Math.max(0, i - 40); return (a ? '…' : '') + CM.esc(text.slice(a, i)) + '<mark>' + CM.esc(text.substr(i, query.length)) + '</mark>' + CM.esc(text.slice(i + query.length, i + query.length + 70)) + '…'; };
      CM.searchIndex.forEach(d => {
        const ti = d.t.indexOf(query), bi = d.x.indexOf(query);
        if (ti < 0 && bi < 0) return;
        const href = d.k === 'lesson' ? '#/lesson/' + d.id : d.k === 'term' ? '#/term/' + encodeURIComponent(d.id) : d.k === 'topic' ? '#/lesson/' + d.l + '?topic=' + d.id : d.k === 'battle' ? '#/battle/' + d.id : '#/';
        hits.push({ score: (ti >= 0 ? 100 : 0) + (d.t === query ? 100 : 0) + (d.k === 'term' ? 10 : 0), html: '<a href="' + href + '"><span class="k">' + ({ lesson: '講義', term: '用語', topic: 'トピックス', battle: '戦史' }[d.k] || '') + '</span><b>' + CM.esc(d.t) + '</b><span class="sn">' + (bi >= 0 ? snip(d.x, bi) : CM.esc(d.x.slice(0, 100))) + '</span></a>' });
      });
      CM.events.forEach(e => { const i = e.t.indexOf(query); if (i >= 0) hits.push({ score: 1, html: '<a href="#/atlas/' + Math.max(-4000, e.y) + '"><span class="k">年表</span><b class="num">' + CM.esc(CM.fmtYear(e.y)) + '</b><span class="sn">' + snip(e.t, i) + '</span></a>' }); });
      hits.sort((a, b) => b.score - a.score);
      document.getElementById('sres').innerHTML = hits.length ? '<p class="muted">' + hits.length + '件</p>' + hits.slice(0, 200).map(h => h.html).join('') : '<p class="muted">見つからなかった。</p>';
    }
  };
})();
