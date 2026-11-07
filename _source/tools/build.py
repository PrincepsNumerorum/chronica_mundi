#!/usr/bin/env python3
"""CHRONICA MUNDI content build: src/ (lesson/term/battle markup) -> site/data/*.js

Lesson markup (src/lessons/<id>.txt)
  front matter between '---' lines (key: value)
  ## 見出し                     -> h2 (TOC entry)
  ### 小見出し                   -> h3
  @map key=val ...              -> starts a new scene whose stage is a map
  @battle <id> phase=<n>        -> scene with battle player
  @image file="File:..." cap="" -> scene with an image (Wikimedia Commons)
  @figure <id>                  -> scene showing a :::figure block
  @scene                        -> new scene, stage unchanged
  :::topic <kind> | <title> ... :::   inline expandable topic
  :::figure <id> | <caption> ... :::  raw SVG/HTML figure
  :::html ... :::               raw html
  :::contemp <year> <range>     contemporaneous events box (single line)
  :::geo ... :::                JSON {places,routes,areas,labels}
  :::summary / :::quiz / :::sources blocks
  inline: [[語]] [[表示|語]] **強調** ｜漢字《よみ》 【史実】 [^key] [text](url)
"""
import os, re, json, sys, glob, html as H, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src'); OUT = os.path.join(ROOT, 'site', 'data')
WARN = []
TERM_NAMES = set()

def jsdump(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':'))
def write_js(path, call, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f: f.write('%s(%s);\n' % (call, jsdump(obj)))

# ---------------------------------------------------------------- inline markup
LABELS = {'史実': 'fact', '通説': 'common', '諸説': 'debate', '伝承': 'legend', '俗説': 'myth'}
KANJI = r'[㐀-鿿豈-﫿々〆ヶ]'

class Ctx:
    def __init__(self): self.terms = set(); self.fn = {}; self.fn_order = []

def inline(s, ctx):
    s = H.escape(s, quote=False)
    s = re.sub(r'\[\^([\w\-]+)\]', lambda m: fnref(m.group(1), ctx), s)
    s = re.sub(r'\[([^\]\[]+)\]\((https?://[^)\s]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    def term(m):
        body = m.group(1)
        disp, name = (body.split('|', 1) if '|' in body else (body, body))
        ctx.terms.add(name)
        return '<span class="t" data-t="%s">%s</span>' % (H.escape(name, quote=True), disp)
    s = re.sub(r'\[\[([^\]]+?)\]\]', term, s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'==(.+?)==', r'<mark class="imp">\1</mark>', s)
    s = re.sub(r'｜([^｜《]+?)《([^》]+)》', r'<ruby>\1<rt>\2</rt></ruby>', s)
    s = re.sub(r'(' + KANJI + r'+)《([^》]+)》', r'<ruby>\1<rt>\2</rt></ruby>', s)
    s = re.sub(r'【(史実|通説|諸説|伝承|俗説)】', lambda m: '<span class="lbl lbl-%s">%s</span>' % (LABELS[m.group(1)], m.group(1)), s)
    s = xref(s)
    return s

LESSON_TITLES = {}
_XT = []
def xref(s):
    """turn (→「title」の回) cross references into links to the lesson"""
    if '→' not in s or not LESSON_TITLES: return s
    if not _XT: _XT.extend(sorted(LESSON_TITLES, key=len, reverse=True))
    def one(m):
        seg = m.group(1)
        for title in _XT:
            k = '「' + title + '」'
            if k in seg: seg = seg.replace(k, '\x01%s\x02' % LESSON_TITLES[title])
        seg = re.sub(r'\x01([\w-]+)\x02', lambda mm: '<a class="xref" href="#/lesson/%s">「%s」</a>' % (mm.group(1), ID2TITLE[mm.group(1)]), seg)
        return '→' + seg + 'の回'
    return re.sub(r'→((?:(?!の回).){1,160}?)の回', one, s)
ID2TITLE = {}
def load_titles():
    for ln in open(os.path.join(SRC, 'curriculum.txt'), encoding='utf-8'):
        cols = [x.strip() for x in ln.split('|')]
        if len(cols) >= 3 and re.match(r'^[\dT]+-\d+$', cols[0]): LESSON_TITLES[cols[2]] = cols[1]; ID2TITLE[cols[1]] = cols[2]

def fnref(key, ctx):
    if key not in ctx.fn:
        ctx.fn_order.append(key); ctx.fn[key] = len(ctx.fn_order)
    return '<sup class="fn"><a href="#src-%s">[%d]</a></sup>' % (key, ctx.fn[key])

def plain(s):
    s = re.sub(r'<rt>.*?</rt>', '', s)
    s = re.sub(r'<[^>]+>', '', s)
    return H.unescape(re.sub(r'\s+', ' ', s)).strip()

# ---------------------------------------------------------------- block parser
def parse_attrs(s):
    out = {}
    for m in re.finditer(r'(\w+)=("([^"]*)"|\S+)', s):
        out[m.group(1)] = m.group(3) if m.group(3) is not None else m.group(2)
    return out

def num(v):
    try: return int(v)
    except ValueError: return float(v)

def commons_search(f):
    from urllib.parse import quote
    stem = re.sub(r'\.(jpe?g|png|gif|svg|tiff?)$', '', f.replace('_', ' '), flags=re.I)
    return 'https://commons.wikimedia.org/w/index.php?search=' + quote(stem) + '&title=Special:MediaSearch&type=image'

MEDIA_LOG = []
COMMONS_FP = 'https://commons.wikimedia.org/wiki/Special:FilePath/'
CW_NOTE = ('<div class="cw-note"><b>閲覧注意</b>　この回には、遺体や飢餓、暴力の痕跡など、見る人によっては強い衝撃を受ける写真や映像が含まれている。'
           'これらにはぼかしをかけてあり、クリックすると表示される（画面右上の設定で、ぼかしを一括で外すこともできる）。'
           '歴史の事実を伝える記録として掲載している。</div>')

def commons_transcode(f):
    import hashlib
    from urllib.parse import quote
    h = hashlib.md5(f.encode('utf-8')).hexdigest()
    q = quote(f)
    return 'https://upload.wikimedia.org/wikipedia/commons/transcoded/%s/%s/%s/%s' % (h[0], h[:2], q, q)

def commons_audio_mp3(f):
    import hashlib
    from urllib.parse import quote
    h = hashlib.md5(f.encode('utf-8')).hexdigest()
    q = quote(f)
    return 'https://upload.wikimedia.org/wikipedia/commons/transcoded/%s/%s/%s/%s.mp3' % (h[0], h[:2], q, q)

def media_html(kind, a, ctx):
    """!image / !video / !audio  file="..." cap="..." [nsfw=1] [archive=ID] [warn="..."]"""
    from urllib.parse import quote
    cap = a.get('cap', '')
    caph = inline(cap, ctx)
    nsfw = bool(a.get('nsfw'))
    if a.get('youtube'):
        yid = a['youtube']; st = a.get('start', '')
        src_link = 'https://www.youtube.com/watch?v=%s%s' % (yid, ('&t=%ss' % st) if st else '')
        # click-to-play facade: YouTube refuses embeds without a Referer (error 153), e.g. pages opened as local files
        body = ('<div class="ytf" data-yt="%s" data-start="%s"><img loading="lazy" src="https://i.ytimg.com/vi/%s/hqdefault.jpg" alt="%s">'
                '<button type="button" class="ytplay" aria-label="再生">▶</button></div>'
                % (H.escape(yid), H.escape(st), H.escape(yid), H.escape(plain(cap))))
    elif a.get('archive'):
        aid = a['archive']
        page = 'https://archive.org/details/' + aid
        body = '<iframe loading="lazy" src="https://archive.org/embed/%s" allowfullscreen title="%s"></iframe>' % (H.escape(aid), H.escape(plain(cap)))
        src_link = page
    else:
        from urllib.parse import unquote
        f = unquote(a['file']).replace('File:', '').replace(' ', '_')
        fq = quote(f)
        src_link = 'https://commons.wikimedia.org/wiki/File:' + fq
        if kind == 'image':
            body = '<img loading="lazy" src="%s%s?width=1000" alt="%s">' % (COMMONS_FP, fq, H.escape(plain(cap)))
        elif kind == 'video':
            # Commons re-encodes every video as WebM (VP9). Theora (.ogv) no longer decodes in Chrome
            # (only the Vorbis audio plays), so the transcodes come first and the original last.
            tc = commons_transcode(f)
            srcs = ''.join('<source src="%s.%s" type="video/webm">' % (tc, r) for r in ('480p.vp9.webm', '360p.vp9.webm', '240p.vp9.webm', '360p.webm', '240p.webm'))
            otype = ' type="video/ogg; codecs=&quot;theora, vorbis&quot;"' if f.lower().endswith('.ogv') else ''
            if f.lower().endswith('.webm'):
                srcs = '<source src="%s%s" type="video/webm">' % (COMMONS_FP, fq) + srcs
            else:
                srcs += '<source src="%s%s"%s>' % (COMMONS_FP, fq, otype)
            body = '<video controls preload="none" playsinline poster="%s%s?width=960">%s</video>' % (COMMONS_FP, fq, srcs)
        else:
            body = ('<audio controls preload="none"><source src="%s%s"><source src="%s" type="audio/mpeg"></audio>'
                    % (COMMONS_FP, fq, commons_audio_mp3(f)))
    if nsfw:
        warn = a.get('warn', '遺体や負傷の様子などが写っています')
        body = ('<div class="cwbox">%s<button type="button" class="cwbtn">⚠ 閲覧注意<small>%s。クリックすると表示します</small></button></div>'
                % (body, H.escape(warn)))
    MEDIA_LOG.append((kind, plain(cap), src_link))
    if kind == 'image':
        fb = '画像はオンライン時に表示される（<a href="%s" target="_blank" rel="noopener">Wikimedia Commonsで見る</a>）' % (src_link)
        return ('<figure class="img%s">%s<div class="fallback">%s</div><figcaption>%s%s</figcaption></figure>'
                % (' nsfw' if nsfw else '', body, fb, caph, '<button type="button" class="cwhide">ぼかしを戻す</button>' if nsfw else ''))
    label = '映像' if kind == 'video' else '音声'
    fb = 'この%sは、お使いのブラウザでは再生できない場合がある。<a href="%s" target="_blank" rel="noopener">出典のページで再生する</a>' % (label, src_link)
    return ('<figure class="media %s%s"><div class="mwrap">%s</div><div class="fallback">%s</div><figcaption><span class="mkind">%s</span>%s'
            '<a class="msrc" href="%s" target="_blank" rel="noopener">出典</a>%s</figcaption></figure>'
            % (kind, ' nsfw' if nsfw else '', body, fb, label, caph, src_link, '<button type="button" class="cwhide">ぼかしを戻す</button>' if nsfw else ''))

def stage_from(line, figures):
    kind, _, rest = line[1:].partition(' ')
    a = parse_attrs(rest)
    if kind == 'map':
        st = {'type': 'map'}
        if 'year' in a: st['year'] = num(a['year'])
        if 'view' in a: st['view'] = [num(x) for x in a['view'].split(',')]
        for k in ('hl', 'places', 'routes', 'areas', 'labels', 'pulses'):
            if k in a: st[k] = [x for x in a[k].split(',') if x]
        if 'play' in a: st['play'] = [num(x) for x in a['play'].split(',')]
        if 'cap' in a: st['caption'] = a['cap']
        if 'ylabel' in a: st['ylabel'] = a['ylabel']
        if 'sub' in a: st['sub'] = a['sub']
        if 'ms' in a: st['ms'] = num(a['ms'])
        if 'legend' in a: st['legend'] = [{'c': it.split(':', 1)[0], 't': it.split(':', 1)[1], **({'dash': 1} if it.endswith('~') else {})} for it in a['legend'].split(';') if ':' in it]
        for it in st.get('legend', []):
            it['t'] = it['t'].rstrip('~')
        st['cue'] = a.get('cue')
        return st
    if kind == 'battle':
        bid = rest.split()[0]
        return {'type': 'battle', 'id': bid, 'phase': num(a.get('phase', 0)), 'cue': a.get('cue', '戦況図を表示')}
    if kind == 'image':
        f = a['file'].replace('File:', '').replace(' ', '_')
        MEDIA_LOG.append(('image', plain(a.get('cap', '')), 'https://commons.wikimedia.org/wiki/File:' + f))
        return {'type': 'image', 'src': 'https://commons.wikimedia.org/wiki/Special:FilePath/%s?width=1400' % f,
                'page': commons_search(f), 'cap': a.get('cap', ''), 'cue': a.get('cue', '図版を表示')}
    if kind == 'figure':
        fid = rest.split()[0]
        if fid not in figures: WARN.append('figure not defined before use: ' + fid)
        return {'type': 'figure', 'html': figures.get(fid, ''), 'cue': a.get('cue', '図解を表示')}
    if kind == 'pre':
        return {'type': 'pre'}
    if kind == 'scene':
        return None
    WARN.append('unknown directive ' + line)
    return None

def render_paras(lines, ctx):
    """lines: plain text lines (no fences). returns html"""
    out = []; buf = []; lst = None; tbl = []; sq = []
    SQ = {'原': ('o', '原文'), '読': ('k', '書き下し'), '訳': ('t', '現代語訳'), '意': ('t', '意訳')}
    def flush():
        nonlocal buf, lst, tbl, sq
        if sq:
            rows = ''.join('<div class="sq-%s"><span class="sq-l">%s</span><div class="sq-b"%s>%s</div></div>' % (SQ[k][0], SQ[k][1], (' lang="%s"' % lg) if lg else '', re.sub(r'\s*(?:／| / )\s*', '<br>', inline(t, ctx))) for k, lg, t in sq if k != '--')
            cite = ''.join('<p class="cite">%s</p>' % inline(t, ctx) for k, lg, t in sq if k == '--')
            out.append('<div class="srcq">' + rows + cite + '</div>'); sq = []
        if buf:
            out.append('<p>' + inline(''.join(x.strip() for x in buf), ctx) + '</p>'); buf = []
        if lst:
            tag, items = lst
            out.append('<%s>%s</%s>' % (tag, ''.join('<li>' + inline(i, ctx) + '</li>' for i in items), tag)); lst = None
        if tbl:
            rows = [[c.strip() for c in r.strip().strip('|').split('|')] for r in tbl if not re.match(r'^\|?\s*:?-{2,}', r.strip())]
            th = '<tr>' + ''.join('<th>' + inline(c, ctx) + '</th>' for c in rows[0]) + '</tr>'
            td = ''.join('<tr>' + ''.join('<td>' + inline(c, ctx) + '</td>' for c in r) + '</tr>' for r in rows[1:])
            out.append('<div class="tablewrap"><table>' + th + td + '</table></div>'); tbl = []
    for ln in lines:
        s = ln.rstrip()
        if not s.strip(): flush(); continue
        m = re.match(r'^>(原|読|訳|意)(?:\[([\w-]+)\])?\s+(.*)', s)
        if m:
            if buf or lst or tbl:
                keep = sq; sq = []; flush(); sq = keep
            sq.append((m.group(1), m.group(2), m.group(3))); continue
        if sq and s.startswith('-- '):
            sq.append(('--', None, s[3:].strip())); continue
        if sq: flush()
        mm = re.match(r'^\s*!(image|video|audio)\b(.*)', s)
        if mm:
            flush(); out.append(media_html(mm.group(1), parse_attrs(mm.group(2)), ctx)); continue
        if s.startswith('>>'):
            flush(); out.append('<p class="orig">' + inline(s[2:].strip(), ctx) + '</p>'); continue
        if s.startswith('-- '):
            flush(); out.append('<p class="cite">' + inline(s[3:].strip(), ctx) + '</p>'); continue
        if s.startswith('> '):
            flush(); out.append('<blockquote>' + inline(s[2:], ctx) + '</blockquote>'); continue
        if s.startswith('|'):
            if buf or lst: flush()
            tbl.append(s); continue
        m = re.match(r'^(-|\d+\.)\s+(.*)', s)
        if m:
            if buf or tbl: flush()
            tag = 'ul' if m.group(1) == '-' else 'ol'
            if lst and lst[0] != tag: flush()
            if not lst: lst = (tag, [])
            lst[1].append(m.group(2)); continue
        if lst or tbl: flush()
        buf.append(s)
    flush()
    return ''.join(out)

TOPIC_KINDS = {'voice', 'trivia', 'source', 'life', 'debate', 'confuse', 'view', 'now', 'person', 'war', 'term', 'myth', 'works', 'mech'}
TOPIC_JA = {'voice': '証言', 'trivia': 'こぼれ話', 'source': '史料', 'life': '暮らし', 'debate': '諸説あり', 'confuse': '混同注意', 'view': '視点を変える', 'now': 'いま', 'person': '人物', 'war': '戦術', 'term': '用語', 'myth': '俗説', 'works': '作品紹介', 'mech': 'しくみ'}

def parse_front(text):
    m = re.match(r'^---\n(.*?)\n---\n', text, re.S)
    meta = {}
    if not m: return meta, text
    for ln in m.group(1).splitlines():
        if ':' not in ln: continue
        k, v = ln.split(':', 1); v = v.strip()
        if v.startswith('[') and v.endswith(']'): v = [x.strip() for x in v[1:-1].split(',') if x.strip()]
        meta[k.strip()] = v
    return meta, text[m.end():]

def build_lesson(path, all_topics, search):
    text = open(path, encoding='utf-8').read().replace('\r\n', '\n')
    meta, body = parse_front(text)
    lid = meta.get('id') or os.path.splitext(os.path.basename(path))[0]
    ctx = Ctx()
    lines = body.split('\n')
    scenes = [{'stage': None, 'parts': []}]
    cw_flag = [False]
    MEDIA_LOG.clear()
    toc = []; figures = {}; geo = {}; summary = []; quiz = []; sources = []
    i = 0; hcount = 0; tcount = 0; para = []
    def cur(): return scenes[-1]['parts']
    def flush_para():
        nonlocal para
        if para: cur().append(render_paras(para, ctx)); para = []
    while i < len(lines):
        ln = lines[i]
        st = ln.strip()
        if st.startswith(':::'):
            flush_para()
            head = st[3:].strip()
            kind, _, arg = head.partition(' ')
            if kind == 'contemp':
                y, *r = arg.split()
                cur().append('<div class="contemp" data-y="%s" data-r="%s"></div>' % (y, r[0] if r else 15)); i += 1; continue
            # collect block
            j = i + 1; blk = []
            while j < len(lines) and lines[j].strip() != ':::':
                blk.append(lines[j]); j += 1
            i = j + 1
            if kind == 'topic':
                tk, _, title = arg.partition('|'); tk = tk.strip(); title = title.strip()
                if tk not in TOPIC_KINDS: WARN.append('%s: unknown topic kind %s' % (lid, tk))
                tcount += 1; tid = '%s-t%d' % (lid, tcount)
                inner = render_paras(blk, ctx)
                cur().append('<details class="topic topic-%s" id="%s"><summary><span class="tk">%s</span><span class="tt">%s</span></summary><div class="tb">%s</div></details>' % (tk, tid, TOPIC_JA.get(tk, tk), inline(title, ctx), inner))
                ptxt = plain(inner)
                all_topics.append({'id': tid, 'k': tk, 'kj': TOPIC_JA.get(tk, tk), 't': plain(inline(title, ctx)), 'l': lid, 'x': ptxt[:90]})
                search.append({'k': 'topic', 'id': tid, 'l': lid, 't': plain(inline(title, ctx)), 'x': ptxt})
            elif kind == 'figure':
                fid, _, cap = arg.partition('|'); fid = fid.strip()
                htm = '\n'.join(blk)
                figures[fid] = htm + ('<p style="font-size:12px;color:var(--ink-3);margin:6px 0 0;text-align:center">%s</p>' % inline(cap.strip(), ctx) if cap.strip() else '')
                if 'inline' in arg.split('|')[0].split():
                    cur().append('<figure class="fig">%s<figcaption>%s</figcaption></figure>' % (htm, inline(cap.strip(), ctx)))
            elif kind == 'html':
                cur().append('\n'.join(blk))
            elif kind == 'widget':
                wname, _, cap = arg.partition('|'); wname = wname.strip()
                body = '\n'.join(blk).strip() or '{}'
                try:
                    def _walk(o):
                        if isinstance(o, str): return xref(o)
                        if isinstance(o, list): return [_walk(x) for x in o]
                        if isinstance(o, dict): return {k: _walk(v) for k, v in o.items()}
                        return o
                    body = json.dumps(_walk(json.loads(body)), ensure_ascii=False)
                except Exception as e: WARN.append('%s: widget %s bad JSON: %s' % (lid, wname, e)); body = '{}'
                cur().append('<figure class="widget" data-w="%s" data-p="%s"><div class="wbody"></div>%s</figure>' % (wname, H.escape(body, quote=True), ('<figcaption>%s</figcaption>' % inline(cap.strip(), ctx)) if cap.strip() else ''))
            elif kind == 'geo':
                g = json.loads('\n'.join(blk))
                for k, v in g.items(): geo.setdefault(k, {}).update(v)
            elif kind == 'summary':
                summary = [inline(re.sub(r'^-\s*', '', x.strip()), ctx) for x in blk if x.strip()]
            elif kind == 'sources':
                for x in blk:
                    if not x.strip(): continue
                    k, _, v = x.strip().partition(':')
                    sources.append({'k': k.strip(), 'h': inline(v.strip(), ctx)})
            elif kind == 'quiz':
                q = None
                for x in blk + ['']:
                    x = x.strip()
                    if x.startswith('Q:'):
                        if q: quiz.append(q)
                        q = {'q': inline(x[2:].strip(), ctx), 'opts': [], 'a': -1, 'e': ''}
                    elif x.startswith('+ ') or x.startswith('- '):
                        if x[0] == '+': q['a'] = len(q['opts'])
                        q['opts'].append(inline(x[2:].strip(), ctx))
                    elif x.startswith('E:'):
                        q['e'] = inline(x[2:].strip(), ctx)
                if q: quiz.append(q)
                for qq in quiz:
                    if qq['a'] < 0: WARN.append('%s: quiz without answer: %s' % (lid, qq['q']))
            else:
                WARN.append('%s: unknown block %s' % (lid, kind))
            continue
        if st.startswith('@'):
            flush_para()
            stage = stage_from(st, figures)
            scenes.append({'stage': stage, 'parts': []})
            i += 1; continue
        if st.startswith('!image') or st.startswith('!video') or st.startswith('!audio'):
            flush_para()
            kind = st[1:6]
            a = parse_attrs(st[6:])
            cur().append(media_html(kind, a, ctx))
            if a.get('nsfw'): cw_flag[0] = True
            i += 1; continue
        if st.startswith('## '):
            flush_para()
            # a battle / picture shown on the right does not carry over into the next chapter: fall back to the lesson map
            last = next((x['stage'] for x in reversed(scenes) if x['stage']), None)
            if last and last.get('type') in ('battle', 'image', 'figure'):
                scenes.append({'stage': {'type': 'pre'}, 'parts': []})
            hcount += 1
            title = st[3:].strip(); aid = '%s-h%d' % (lid, hcount)
            toc.append({'id': aid, 't': plain(inline(title, ctx))})
            cur().append('<h2 id="%s"><span class="hno">%d</span>%s</h2>' % (aid, hcount, inline(title, ctx)))
            i += 1; continue
        if st.startswith('### '):
            flush_para(); cur().append('<h3>%s</h3>' % inline(st[4:].strip(), ctx)); i += 1; continue
        para.append(ln); i += 1
    flush_para()
    if MEDIA_LOG:
        seen = set(); items = []
        KJ = {'image': '図版', 'video': '映像', 'audio': '音声'}
        for k, c, u in MEDIA_LOG:
            if u in seen: continue
            seen.add(u)
            c1 = re.split(r'(?<=）)。|。', c)[0] if c else ''
            if len(c1) > 70: c1 = c1[:68] + '…'
            host = 'YouTube' if 'youtube' in u else ('Internet Archive' if 'archive.org' in u else 'Wikimedia Commons')
            items.append('<li><span class="mk">%s</span>%s（<a href="%s" target="_blank" rel="noopener">%s</a>）</li>' % (KJ.get(k, k), H.escape(c1), H.escape(u), host))
        sources.append({'k': 'm', 'h': '<b>掲載した図版・写真・映像・音声</b><ul class="mlist">' + ''.join(items) + '</ul>'})
    if cw_flag[0]:
        scenes[0]['parts'].insert(0, CW_NOTE)
    out_scenes = []
    nl = meta.get('nolink', [])
    if isinstance(nl, str): nl = nl.split(',')
    used = set(ctx.terms) | {x.strip() for x in nl if x.strip()}
    # furigana: glossary/curated difficult words + words the author glossed in this lesson, on every occurrence
    lruby = dict(RUBY)
    for m in re.finditer(r'｜([^｜《\n]{2,12})《([^》\n]+)》', body): lruby.setdefault(m.group(1), m.group(2))
    for m in re.finditer('(' + KANJI + r'{2,12})《([^》\n]+)》', body): lruby.setdefault(m.group(1), m.group(2))
    duals = {k: v for k, v in DUAL.items() if not v[2] or lid in v[2]}
    for k, v in duals.items(): lruby.setdefault(k, v[0])
    for sc in scenes:
        htm = dual_ruby(ruby_all(autolink(''.join(sc['parts']), TERM_NAMES, used), lruby), duals)
        for m in re.finditer(r'data-t="([^"]+)"', htm): ctx.terms.add(H.unescape(m.group(1)))
        if not htm and not sc['stage']: continue
        d = {'html': htm}
        if sc['stage']:
            d['stage'] = {k: v for k, v in sc['stage'].items() if v is not None and k != 'cue'}
            if sc['stage'].get('cue'): d['cue'] = sc['stage']['cue']
        out_scenes.append(d)
    # footnote numbering must follow source order for consistency: renumber by first use
    srcmap = {s['k']: s for s in sources}
    for k in ctx.fn_order:
        if k not in srcmap: WARN.append('%s: footnote key without source: %s' % (lid, k))
    ordered = [srcmap[k] for k in ctx.fn_order if k in srcmap] + [s for s in sources if s['k'] not in ctx.fn]
    alltext = plain(''.join(s['html'] for s in out_scenes))
    L = {'id': lid, 'no': meta.get('no', ''), 'title': meta.get('title', lid), 'period': meta.get('period', ''),
         'regions': meta.get('regions', []), 'question': meta.get('question', ''), 'toc': toc, 'scenes': out_scenes,
         'summary': summary, 'quiz': quiz, 'sources': ordered, 'chars': len(alltext)}
    # ensure footnote numbers match ordered list (already by first use)
    gg = {}
    for gp in glob.glob(os.path.join(SRC, 'geo', '*.json')):
        for k, v in json.load(open(gp, encoding='utf-8')).items(): gg.setdefault(k, {}).update(v)
    for sc in out_scenes:
        st = sc.get('stage') or {}
        if st.get('type') != 'map': continue
        for k, gk in (('places', 'places'), ('pulses', 'places'), ('routes', 'routes'), ('labels', 'labels'), ('areas', 'areas')):
            for x in st.get(k, []):
                if x not in geo.get(gk, {}) and x not in gg.get(gk, {}): WARN.append('%s: undefined %s id %s' % (lid, k, x))
    js = ''
    if geo.get('places'): js += 'CM.data.places(%s);\n' % jsdump(geo['places'])
    if geo.get('routes'): js += 'CM.data.routes(%s);\n' % jsdump(geo['routes'])
    if geo.get('areas'): js += 'CM.data.areas(%s);\n' % jsdump(geo['areas'])
    if geo.get('labels'): js += 'CM.data.glabels(%s);\n' % jsdump(geo['labels'])
    js += 'CM.data.lesson(%s);\n' % jsdump(L)
    with open(os.path.join(OUT, 'lessons', lid + '.js'), 'w', encoding='utf-8') as f: f.write(js)
    search.append({'k': 'lesson', 'id': lid, 't': L['title'], 'x': alltext})
    return lid, ctx.terms, L

# ---------------------------------------------------------------- terms
def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

def kana_row(y):
    rows = [('a', 'あいうえおぁぃぅぇぉゔ'), ('ka', 'かきくけこがぎぐげご'), ('sa', 'さしすせそざじずぜぞ'), ('ta', 'たちつてとだぢづでどっ'), ('na', 'なにぬねの'),
            ('ha', 'はひふへほばびぶべぼぱぴぷぺぽ'), ('ma', 'まみむめも'), ('ya', 'やゆよゃゅょ'), ('ra', 'らりるれろ'), ('wa', 'わをんゎ')]
    c = (y or ' ')[0]
    for k, chars in rows:
        if c in chars: return k
    return 'etc'

def build_terms(term_use):
    entries = []
    for path in sorted(glob.glob(os.path.join(SRC, 'terms', '*.txt'))):
        text = open(path, encoding='utf-8').read().replace('\r\n', '\n')
        for chunk in re.split(r'^=== ', text, flags=re.M)[1:]:
            head, _, rest = chunk.partition('\n')
            meta_txt, _, body = rest.partition('\n---\n')
            meta = {}
            for ln in meta_txt.splitlines():
                if ':' in ln: k, v = ln.split(':', 1); meta[k.strip()] = v.strip()
            entries.append((head.strip(), meta, body.strip()))
    index = []; chunks = {}; search = []
    names = {}
    for h, meta, body in entries:
        ctx = Ctx()
        # body: paragraphs, '### ' subheads
        parts = []; buf = []
        for ln in body.split('\n'):
            if ln.startswith('### '):
                if buf: parts.append(render_paras(buf, ctx)); buf = []
                parts.append('<h3>%s</h3>' % inline(ln[4:].strip(), ctx))
            else: buf.append(ln)
        if buf: parts.append(render_paras(buf, ctx))
        htm = ''.join(parts)
        y = hira(meta.get('yomi', ''))
        if not y: WARN.append('term without yomi: ' + h)
        row = kana_row(y)
        alias = [a.strip() for a in meta.get('alias', '').split(',') if a.strip()]
        t = {'h': h, 'y': y, 'c': row}
        if meta.get('cat'): t['k'] = meta['cat']
        if meta.get('era'): t['e'] = meta['era']
        if meta.get('region'): t['r'] = meta['region']
        if alias: t['a'] = alias
        if meta.get('img'): t['i'] = meta['img'].replace('File:', '').strip().replace(' ', '_')
        if meta.get('imgcap'): t['ic'] = meta['imgcap']
        t['_body'] = htm
        index.append(t); names[h] = t
        for a in alias: names.setdefault(a, t)
        chunks.setdefault(row, {})[h] = htm
        search.append({'k': 'term', 'id': h, 't': h, 'x': plain(htm)})
    # lessons using the term
    for lid, used in term_use.items():
        for n in used:
            t = names.get(n)
            if t: t.setdefault('l', [])
            if t and lid not in t['l']: t['l'].append(lid)
    for t in index: t.pop('_body', None)
    write_js(os.path.join(OUT, 'terms', 'index.js'), 'CM.data.termsIndex', index)
    for row in ['a', 'ka', 'sa', 'ta', 'na', 'ha', 'ma', 'ya', 'ra', 'wa', 'etc']:
        with open(os.path.join(OUT, 'terms', 't_%s.js' % row), 'w', encoding='utf-8') as f:
            f.write('CM.data.termChunk(%s,%s);\n' % (jsdump(row), jsdump(chunks.get(row, {}))))
    missing = sorted({n for used in term_use.values() for n in used if n not in names})
    return index, search, missing

# ---------------------------------------------------------------- curriculum
def build_curriculum(ready):
    parts = []
    for ln in open(os.path.join(SRC, 'curriculum.txt'), encoding='utf-8'):
        ln = ln.rstrip('\n')
        if not ln.strip() or ln.startswith('//'): continue
        if ln.startswith('# '):
            no, title, period = [x.strip() for x in ln[2:].split('|')]
            parts.append({'no': no, 'title': title, 'period': period, 'lessons': []}); continue
        cols = [x.strip() for x in ln.split('|')]
        no, lid, title = cols[0], cols[1], cols[2]
        L = {'no': no, 'id': lid, 'title': title}
        if lid in ready: L['ready'] = 1
        parts[-1]['lessons'].append(L)
    write_js(os.path.join(OUT, 'curriculum.js'), 'CM.data.curriculum', {'parts': parts})
    ids = [l['id'] for p in parts for l in p['lessons']]
    for r in ready:
        if r not in ids: WARN.append('lesson not in curriculum: ' + r)
    return parts

# ---------------------------------------------------------------- battles
def build_battles(search):
    idx = []
    for path in sorted(glob.glob(os.path.join(SRC, 'battles', '*.json'))):
        d = json.load(open(path, encoding='utf-8'))
        ctx = Ctx()
        if 'desc' in d: d['html'] = render_paras(d.pop('desc').split('\n'), ctx)
        for ph in d['phases']:
            if 'text' in ph: ph['html'] = inline(ph['text'], ctx)
        if 'sources' in d: d['sources'] = [inline(s, ctx) for s in d['sources']]
        write_js(os.path.join(OUT, 'battles', d['id'] + '.js'), 'CM.data.battle', d)
        idx.append({k: d.get(k) for k in ('id', 'ja', 'y', 'lon', 'lat', 'region', 'sum', 'lesson')})
        search.append({'k': 'battle', 'id': d['id'], 't': d['ja'], 'x': plain(d.get('html', '')) + ' ' + ' '.join(plain(p.get('html', '')) for p in d['phases'])})
    write_js(os.path.join(OUT, 'battles', 'index.js'), 'CM.data.battleIndex', idx)
    return idx

def build_geo():
    g = {}
    for path in sorted(glob.glob(os.path.join(SRC, 'geo', '*.json'))):
        d = json.load(open(path, encoding='utf-8'))
        for k, v in d.items(): g.setdefault(k, {}).update(v)
    write_js(os.path.join(OUT, 'geo', 'places.js'), 'CM.data.places', g.get('places', {}))
    js = 'CM.data.routes(%s);\nCM.data.areas(%s);\nCM.data.glabels(%s);\n' % (jsdump(g.get('routes', {})), jsdump(g.get('areas', {})), jsdump(g.get('labels', {})))
    open(os.path.join(OUT, 'geo', 'routes.js'), 'w', encoding='utf-8').write(js)

EA_REGION = re.compile(r'中国|日本|朝鮮|韓|東アジア|モンゴル|チベット|内陸アジア|中央アジア|北アジア|奈良|雲南|台湾|ベトナム|沿海州|満州|西域|遼|渤海')
RUBY = {}
def term_names():
    names = set(); RUBY.clear()
    for path in glob.glob(os.path.join(SRC, 'terms', '*.txt')):
        text = open(path, encoding='utf-8').read().replace('\r\n', '\n')
        for chunk in re.split(r'^=== ', text, flags=re.M)[1:]:
            head, _, rest = chunk.partition('\n')
            head = head.strip(); names.add(head)
            meta = {}
            for ln in rest.split('\n---\n')[0].splitlines():
                if ':' in ln: k, v = ln.split(':', 1); meta[k.strip()] = v.strip()
            alias = [a.strip() for a in meta.get('alias', '').split(',') if a.strip()]
            names.update(alias)
    for fn in ('ruby.tsv', 'ruby_extra.tsv'):
        fp = os.path.join(SRC, fn)
        if not os.path.exists(fp): continue
        for ln in open(fp, encoding='utf-8'):
            if ln.startswith('#') or '\t' not in ln: continue
            k, v = ln.rstrip('\n').split('\t', 1)
            if len(k) >= 2 and v: RUBY[k] = v
    return {n for n in names if len(n) >= 2}

KATA = re.compile(r'[\u30A0-\u30FF]')
_RUBY_RE = {}
def ruby_all(htm, rmap):
    """put furigana on every plain-text occurrence of difficult words (outside tags, ruby, headings, links)"""
    if not rmap: return htm
    key = id(rmap)
    if key not in _RUBY_RE or _RUBY_RE[key][0] is not rmap:
        ws = sorted(rmap, key=len, reverse=True)
        _RUBY_RE.clear(); _RUBY_RE[key] = (rmap, re.compile('|'.join(re.escape(w) for w in ws)))
    rx = _RUBY_RE[key][1]
    parts = re.split(r'(<[^>]+>)', htm)
    stack = []; depth = 0
    for i, seg in enumerate(parts):
        if seg.startswith('<'):
            m = re.match(r'<(/?)(\w+)', seg)
            if not m: continue
            close, tag = m.groups()
            skip = tag in ('ruby', 'rt', 'h2', 'h3', 'summary', 'a', 'script', 'style') or bool(re.search(r'\blang="(?!ja)', seg))
            if tag in ('br', 'img', 'input', 'hr', 'wbr', 'source'): continue
            if not close: stack.append(skip); depth += skip
            elif stack: depth -= stack.pop()
            continue
        if depth or not seg.strip(): continue
        def rep(m):
            w = m.group(0); a, b = m.start(), m.end()
            # do not split a longer kanji compound (e.g. avoid ruby on 李賢 inside 李賢者)
            return '<ruby>%s<rt>%s</rt></ruby>' % (w, rmap[w])
        parts[i] = rx.sub(rep, seg)
    return ''.join(parts)
DUAL = {}
def load_dual():
    fp = os.path.join(SRC, 'ruby_dual.tsv')
    if not os.path.exists(fp): return
    for ln in open(fp, encoding='utf-8'):
        if ln.startswith('#') or '\t' not in ln: continue
        c = ln.rstrip('\n').split('\t')
        if len(c) < 3: continue
        DUAL[c[0]] = (c[1], c[2], set(x.strip() for x in (c[3] if len(c) > 3 else '').split(',') if x.strip()))
_DUAL_RE = {}
def dual_ruby(htm, duals):
    """East Asian personal names: Japanese reading (inner ruby) + local reading (outer ruby)"""
    if not duals: return htm
    key = tuple(sorted(duals))
    if key not in _DUAL_RE: _DUAL_RE[key] = re.compile('<ruby>(' + '|'.join(re.escape(k) for k in sorted(duals, key=len, reverse=True)) + ')<rt>[^<]*</rt></ruby>')
    return _DUAL_RE[key].sub(lambda m: '<ruby class="dual"><ruby>%s<rt>%s</rt></ruby><rt>%s</rt></ruby>' % (m.group(1), duals[m.group(1)][0], duals[m.group(1)][1]), htm)

_TOK = None
SUPERS = {}
def build_supers(names):
    by = sorted(names, key=len)
    for n in by:
        s = [m for m in names if len(m) > len(n) and n in m]
        if s: SUPERS[n] = s
_KJ = re.compile(KANJI)
SUF_OK = {'徒', '教徒', '人', '派', '者', '的', '化', '系', '語', '軍', '朝', '党', '側'}
PRE_OK = {'第', '新', '旧', '前', '後', '元', '東', '西', '南', '北'}
def word_ok(seg, j, n):
    """reject a match that cuts through a word (大都 in 大都市, 統領 in 大統領, 民会 in 国民会議 ...)"""
    global _TOK
    before = seg[j - 1] if j > 0 else ''
    after = seg[j + len(n)] if j + len(n) < len(seg) else ''
    kb = bool(_KJ.match(n[0])) and bool(before) and bool(_KJ.match(before))
    ka = bool(_KJ.match(n[-1])) and bool(after) and bool(_KJ.match(after))
    # inside a longer glossary term (キリスト in キリスト教, イスラーム in イスラーム教 ...)
    for m in SUPERS.get(n, ()):
        k = m.find(n)
        while k >= 0:
            if j - k >= 0 and seg[j - k:j - k + len(m)] == m: return False
            k = m.find(n, k + 1)
    # Latin abbreviations: EC in ECB, IS in CIS
    if re.match(r'[A-Za-z]', n[0]) and before and re.match(r'[A-Za-z0-9]', before): return False
    if re.match(r'[A-Za-z]', n[-1]) and after and re.match(r'[A-Za-z0-9]', after): return False
    if n == '大学' and (after == '者' or (before and (KATA.match(before) or _KJ.match(before)))): return False
    if not (kb or ka): return True
    if _TOK is None:
        try:
            from janome.tokenizer import Tokenizer
            _TOK = Tokenizer()
        except Exception:
            _TOK = False
    if not _TOK: return True
    a0 = max(0, j - 12); win = seg[a0:j + len(n) + 12]; a = j - a0; b = a + len(n)
    pos = 0; spans = []
    for w in _TOK.tokenize(win):
        spans.append((pos, pos + len(w.surface))); pos += len(w.surface)
    for s, e in spans:
        if s < a < e and win[s:a] not in PRE_OK: return False   # starts inside a word
        if s < b < e and win[b:e] not in SUF_OK: return False   # ends inside a word
    return True

def autolink(htm, names, used):
    """link the first plain-text occurrence of each known term (outside tags, links, headings)"""
    parts = re.split(r'(<[^>]+>)', htm)
    depth = 0  # inside span.t / h2 / h3 / summary / a / sup
    stack = []
    order = sorted(names, key=len, reverse=True)
    reps = []
    for i, seg in enumerate(parts):
        if seg.startswith('<'):
            m = re.match(r'<(/?)(\w+)([^>]*)>', seg)
            if not m: continue
            close, tag, attrs = m.groups()
            skip = tag in ('h2', 'h3', 'summary', 'a', 'sup', 'rt', 'ruby') or (tag == 'span' and 'class="t"' in attrs)
            if not close and tag not in ('br', 'img', 'input'):
                stack.append(skip); depth += skip
            elif close and stack:
                depth -= stack.pop()
            continue
        if depth or not seg.strip(): continue
        for n in order:
            if n in used: continue
            j = seg.find(n)
            while j >= 0:
                before = seg[j - 1] if j > 0 else ''
                after = seg[j + len(n)] if j + len(n) < len(seg) else ''
                if KATA.match(n[0]) and KATA.match(before or ' '): j = seg.find(n, j + 1); continue
                if KATA.match(n[-1]) and KATA.match(after or ' '): j = seg.find(n, j + 1); continue
                break
            while j >= 0 and not word_ok(seg, j, n):
                j = seg.find(n, j + 1)
                while j >= 0:
                    before = seg[j - 1] if j > 0 else ''
                    after = seg[j + len(n)] if j + len(n) < len(seg) else ''
                    if KATA.match(n[0]) and KATA.match(before or ' '): j = seg.find(n, j + 1); continue
                    if KATA.match(n[-1]) and KATA.match(after or ' '): j = seg.find(n, j + 1); continue
                    break
            while j >= 0:
                # inside a book title 『…』: link only when the whole title is the term
                o = seg.rfind('『', 0, j); c = seg.rfind('』', 0, j)
                if o > c:
                    e = seg.find('』', j)
                    if seg[o + 1:e] != n: j = seg.find(n, j + 1); continue
                break
            if j < 0: continue
            used.add(n)
            disp = '<ruby>%s<rt>%s</rt></ruby>' % (n, RUBY[n]) if n in RUBY and RUBY[n] != hira(n) else n
            reps.append('<span class="t" data-t="%s">%s</span>' % (H.escape(n, quote=True), disp))
            seg = seg[:j] + '\x00%d\x00' % (len(reps) - 1) + seg[j + len(n):]
        parts[i] = re.sub(r'\x00(\d+)\x00', lambda m: reps[int(m.group(1))], seg)
    return ''.join(parts)

def main():
    os.makedirs(os.path.join(OUT, 'lessons'), exist_ok=True)
    global TERM_NAMES
    TERM_NAMES = term_names()
    load_titles()
    load_dual()
    build_supers(TERM_NAMES)
    if os.path.exists(os.path.join(SRC, 'events_base.json')):
        import subprocess, sys as _sys
        subprocess.run([_sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'merge_events.py')], check=False)
    topics = []; search = []; term_use = {}; ready = set()
    for path in sorted(glob.glob(os.path.join(SRC, 'lessons', '*.txt'))):
        lid, used, L = build_lesson(path, topics, search)
        term_use[lid] = used; ready.add(lid)
        print('lesson', lid, L['chars'], 'chars,', len(L['scenes']), 'scenes,', len(used), 'terms')
    build_curriculum(ready)
    index, tsearch, missing = build_terms(term_use)
    search += tsearch
    build_battles(search)
    build_geo()
    write_js(os.path.join(OUT, 'topics.js'), 'CM.data.topics', topics)
    write_js(os.path.join(OUT, 'search.js'), 'CM.data.search', search)
    print('terms', len(index), 'topics', len(topics))
    if missing: print('MISSING TERMS (%d):' % len(missing), '、'.join(missing))
    for w in WARN: print('WARN', w)

if __name__ == '__main__':
    main()
