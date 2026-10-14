// Convert twha region_list to compact polity data (ja/en names, label positions, leaders).
const fs = require('fs');
let src = fs.readFileSync(process.argv[2], 'utf8');
src = src.replace(/^'use strict';/, '').replace(/const\s+(\w+)\s*=/g, 'globalThis.$1=');
(0, eval)(src);
const rl = globalThis.region_list;
function dflt(a, o) {
  if (a[o] === '$') a[o] = a[o + 1];
  if (a[o + 1] === '@') a[o + 1] = a[o];
  if (a[o + 2] === '$') a[o + 2] = a[o + 1];
  if (a[o + 2] === '@') a[o + 2] = a[o];
}
const out = [];
for (const r of rl) {
  const p = { s: r[1], e: r[2], n: [], L: [] };
  let i = 3, name = [null, null], abbr = [null, null], x = 0, y = 0, lv = 0;
  for (; i < r.length && r[i].length > 3; i++) {
    const b = r[i].slice();
    if (b[3]) { dflt(b, 3); name = [b[3], b[4]]; }
    if (b.length >= 9 && b[6]) { dflt(b, 6); abbr = [b[6], b[7]]; }
    if (b.length >= 12) { x = b[9]; y = b[10]; lv = b[11]; }
    p.n.push([b[0], b[1], name[0], name[1], abbr[0], x, y, lv]);
  }
  let title = null, cur = null;
  for (; i < r.length; i++) {
    const b = r[i].slice();
    if (b.length === 3) { dflt(b, 0); cur = { t: b[0], te: b[1], p: [] }; p.L.push(cur); }
    else { dflt(b, 3); if (!cur) { cur = { t: '', te: '', p: [] }; p.L.push(cur); } cur.p.push([b[0], b[1], b[3], b[4]]); }
  }
  out.push(p);
}
fs.writeFileSync(process.argv[3], 'CM.data.polities(' + JSON.stringify(out) + ');\n');
console.log('polities', out.length, (fs.statSync(process.argv[3]).size / 1e6).toFixed(2), 'MB');
