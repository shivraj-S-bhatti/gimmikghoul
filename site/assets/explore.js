// Explore page: every chart is drawn from data/plans.json and data/cases.json as a scalable SVG.
const NS = 'http://www.w3.org/2000/svg';
const el = (p, tag, a = {}, txt) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; };
const img = (p, src, x, y, s, extra = {}) => el(p, 'image', {href: src, x, y, width: s, height: s, ...extra});
const sprite = id => `assets/${id}.${['raichumegax', 'raichumegay', 'staraptormega'].includes(id) ? 'gif' : 'png'}`;
const pct = v => (v * 100).toFixed(1) + '%';
const EV = ['Frankfurt', 'Louisville', 'Nice'];
const SPR = {'Staraptor Offense': ['staraptormega', 'arcaninehisui'], 'SunRain': ['grimmsnarl', 'venusaur'], 'Mence Offense': ['salamencemega'], 'Tyranitar Sand': ['tyranitarmega', 'excadrill'],
  'Protect the Queen': ['delphoxmega', 'sinistcha'], 'Whimsi Tailwind': ['whimsicott'], 'Sylveon Chomp': ['sylveon', 'garchomp'], 'Rain Room': ['politoed', 'farigiraf'], 'Psyspam': ['indeedeef', 'gardevoirmega'],
  'Perish Trap': ['gengarmega', 'kommoo'], 'Petal Dragon': ['floettemega', 'dragonitemega'], 'Weatherless Setup': ['volcarona'], 'Froslass Snow': ['froslassmega'], 'Ceruledge Milotic': ['ceruledge', 'milotic'],
  'Rage Moth': ['volcarona', 'garchompmegaz'], 'Swift Swim Rain': ['pelipper', 'basculegionf']};
const COL = ['#e8590c', '#c2255c', '#7048e8', '#a0672d', '#d6336c', '#2f9e44', '#e64980', '#1c7ed6', '#9c36b5', '#5f3dc4', '#f08c00', '#c92a2a', '#0c8599', '#495057', '#862e9c', '#1864ab'];
function seg(host, labels, current, onPick) {
  host.innerHTML = '';
  labels.forEach((label, i) => { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', i === current); b.onclick = () => onPick(i); host.appendChild(b); });
}
const clickable = (g, label, fn) => { g.setAttribute('role', 'button'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', label); g.addEventListener('click', fn); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); };

Promise.all([fetch('data/plans.json').then(r => r.json()), fetch('data/cases.json').then(r => r.json())]).then(([P, C]) => {
  const plans = P.plans.map(p => ({...p, spr: SPR[p.name] || [], wr: p.day1.map(([w, l]) => w / Math.max(1, w + l))}));

  // ---------- Meta Galaxy ----------
  const cent = plans.map(p => { const pts = P.map.filter(q => q[2] === p.f); return [pts.reduce((a, q) => a + q[0], 0) / pts.length, pts.reduce((a, q) => a + q[1], 0) / pts.length]; });
  let gEv = 2, gPick = -1;
  function galaxy() {
    const s = document.getElementById('galaxySvg'); s.innerHTML = '';
    const X = v => 40 + v * 920, Y = v => 34 + v * 572;
    for (const q of P.map) {
      const live = (gEv === 3 || q[3] === gEv) && (gPick < 0 || q[2] === gPick);
      el(s, 'circle', {cx: X(q[0]).toFixed(1), cy: Y(q[1]).toFixed(1), r: live ? 3.4 : 2.4, fill: COL[q[2]], 'fill-opacity': live ? .8 : .08});
    }
    const e = gEv === 3 ? 2 : gEv;
    plans.forEach((p, i) => {
      const g = el(s, 'g', {opacity: gPick < 0 || gPick === i ? 1 : .45}), sz = 26 + p.share[e] * 220, y = Y(cent[i][1]);
      const w = Math.max(p.name.length * 7.2, (p.tag.length + 8) * 6.6) + 24 + sz * (0.6 + 0.4 * p.spr.length);
      const x = Math.min(990 - w + sz * .6, Math.max(10 + sz * .6, X(cent[i][0])));
      el(g, 'rect', {x: x - sz * .6, y: y - sz / 2 - 2, width: w, height: sz + 4, rx: (sz + 4) / 2, fill: '#fff', 'fill-opacity': .86, stroke: gPick === i ? '#ffc83d' : '#fff', 'stroke-width': 2});
      p.spr.forEach((id, k) => img(g, sprite(id), x - sz / 2 + k * sz * .6, y - sz / 2, sz));
      el(g, 'text', {x: x - sz / 2 + sz * (0.6 * p.spr.length + 0.45), y: y - 1, 'font-weight': 700, 'font-size': 13}, p.name);
      el(g, 'text', {x: x - sz / 2 + sz * (0.6 * p.spr.length + 0.45), y: y + 13, class: 'm', 'font-size': 11}, `${p.tag} · ${pct(p.share[e])}`);
      clickable(g, p.name, () => { gPick = gPick === i ? -1 : i; galaxy(); });
    });
    seg(document.getElementById('galaxyEvents'), [...EV, 'All three'], gEv, i => { gEv = i; galaxy(); });
  }

  // ---------- Bandwagon Map ----------
  let bwSel = plans.findIndex(p => p.name === 'Perish Trap'), spread = true;
  function bandwagon() {
    const s = document.getElementById('bwSvg'); s.innerHTML = '';
    const L = 70, R = 970, T = 30, B = 580, xmax = .17;
    const X = v => L + (spread ? Math.sqrt(v / xmax) : v / xmax) * (R - L), Y = v => T + (.6 - v) / .18 * (B - T);
    el(s, 'rect', {x: L, y: T, width: X(.06) - L, height: Y(.5) - T, fill: '#12b886', 'fill-opacity': .1});
    el(s, 'rect', {x: X(.06), y: Y(.5), width: R - X(.06), height: B - Y(.5), fill: '#f03e3e', 'fill-opacity': .08});
    for (const v of [.44, .46, .48, .5, .52, .54, .56, .58, .6]) { el(s, 'line', {x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: '#0b1838', 'stroke-opacity': v === .5 ? .45 : .1, 'stroke-width': v === .5 ? 2 : 1}); el(s, 'text', {x: L - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'm'}, Math.round(v * 100) + '%'); }
    for (const v of (spread ? [.01, .02, .04, .08, .16] : [0, .04, .08, .12, .16])) el(s, 'text', {x: X(v), y: B + 20, 'text-anchor': 'middle', class: 'm'}, Math.round(v * 100) + '%');
    el(s, 'text', {x: (L + R) / 2, y: B + 44, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 14}, '% of teams that brought it →');
    el(s, 'text', {x: 18, y: (T + B) / 2, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 14, transform: `rotate(-90 18 ${(T + B) / 2})`}, 'Day 1 matches won →');
    const defs = el(s, 'defs');
    for (const [id, c] of [['a0', '#0b1838'], ['a1', '#e09a00']]) { const m = el(defs, 'marker', {id, viewBox: '0 0 10 10', refX: 7, refY: 5, markerWidth: 5, markerHeight: 5, orient: 'auto'}); el(m, 'path', {d: 'M0,0 L10,5 L0,10 z', fill: c, 'fill-opacity': id === 'a0' ? .45 : 1}); }
    const path = q => { const p = [q[0], q[0], q[1], q[2], q[2]]; let d = `M${q[0][0]},${q[0][1]}`;
      for (let i = 1; i < 3; i++) { const [a, b, c, e] = [p[i - 1], p[i], p[i + 1], p[i + 2]]; d += ` C${b[0] + (c[0] - a[0]) / 6},${b[1] + (c[1] - a[1]) / 6} ${c[0] - (e[0] - b[0]) / 6},${c[1] - (e[1] - b[1]) / 6} ${c[0]},${c[1]}`; } return d; };
    const order = plans.map((_, i) => i).sort((a, b) => (a === bwSel) - (b === bwSel));
    for (const i of order) {
      const p = plans[i], on = i === bwSel, q = p.share.map((v, e) => [X(v), Y(p.wr[e])]);
      el(s, 'path', {d: path(q), fill: 'none', stroke: on ? '#e09a00' : '#0b1838', 'stroke-opacity': on ? 1 : .3, 'stroke-width': on ? 4.5 : 1.6, 'marker-end': `url(#a${on ? 1 : 0})`});
      el(s, 'circle', {cx: q[0][0], cy: q[0][1], r: on ? 5 : 3, fill: '#fff', stroke: on ? '#e09a00' : '#0b1838', 'stroke-opacity': on ? 1 : .35, 'stroke-width': 2});
    }
    // Labels start outward from the cloud, then repel each other and every sprite; leader lines connect them.
    const anchors = plans.map(p => [X(p.share[2]), Y(p.wr[2])]);
    const cx = anchors.reduce((a, q) => a + q[0], 0) / anchors.length, cy = anchors.reduce((a, q) => a + q[1], 0) / anchors.length;
    const boxes = plans.map((p, i) => { const [ax, ay] = anchors[i], dx = ax - cx, dy = ay - cy, n = Math.hypot(dx, dy) || 1; return {w: p.name.length * 7.4 + 20, h: 22, x: ax + dx / n * 70, y: ay + dy / n * 70}; });
    for (let it = 0; it < 260; it++) {
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j], ox = (a.w + b.w) / 2 + 6 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 + 4 - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) { if (oy < ox) { const t = a.y < b.y ? -1 : 1; a.y += t * oy / 2; b.y -= t * oy / 2; } else { const t = a.x < b.x ? -1 : 1; a.x += t * ox / 2; b.x -= t * ox / 2; } } }
      for (const b of boxes) for (const [ax, ay] of anchors) { const ox = b.w / 2 + 22 - Math.abs(b.x - ax), oy = b.h / 2 + 22 - Math.abs(b.y - ay); if (ox > 0 && oy > 0) { if (oy < ox) b.y += (b.y < ay ? -1 : 1) * oy * .5; else b.x += (b.x < ax ? -1 : 1) * ox * .5; } }
      for (const b of boxes) { b.x = Math.min(R - b.w / 2, Math.max(L + b.w / 2, b.x)); b.y = Math.min(B - 12, Math.max(T + 12, b.y)); }
    }
    plans.forEach((p, i) => el(s, 'line', {x1: anchors[i][0], y1: anchors[i][1], x2: boxes[i].x, y2: boxes[i].y, stroke: '#0b1838', 'stroke-opacity': .3}));
    for (const i of order) {
      const p = plans[i], on = i === bwSel, sz = on ? 54 : 38, [ax, ay] = anchors[i], b = boxes[i], g = el(s, 'g');
      p.spr.forEach((id, k) => img(g, sprite(id), ax - sz / 2 + k * sz * .5 - (p.spr.length - 1) * sz * .25, ay - sz / 2, sz));
      el(g, 'rect', {x: b.x - b.w / 2, y: b.y - b.h / 2, width: b.w, height: b.h, rx: 11, fill: on ? '#ffc83d' : '#fff', 'fill-opacity': on ? 1 : .85});
      el(g, 'text', {x: b.x, y: b.y + 4.5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': on ? 700 : 600}, p.name);
      clickable(g, p.name, () => { bwSel = i; bandwagon(); });
    }
    const p = plans[bwSel];
    document.getElementById('bwRead').innerHTML = `<div class="row">${p.spr.map(id => `<img class="sp" src="${sprite(id)}" alt="">`).join('')}<b style="font:800 20px var(--display)">${p.name}</b><span class="k">${p.tag}</span></div>` +
      `<div class="row num" style="gap:24px">${EV.map((e, k) => `<span>${e}: ${pct(p.share[k])} of teams · won ${pct(p.wr[k])} (${p.day1[k][0]}-${p.day1[k][1]})</span>`).join('')}</div>`;
    seg(document.getElementById('bwModes'), ['Tight', 'Spread'], spread ? 1 : 0, i => { spread = i === 1; bandwagon(); });
  }

  // ---------- Target on your back ----------
  (function target() {
    const s = document.getElementById('targetSvg'), L = 70, R = 570, T = 24, B = 400;
    const X = n => L + (Math.log(n) - Math.log(18)) / (Math.log(260) - Math.log(18)) * (R - L), Y = v => T + (61 - v) / 16 * (B - T);
    for (const v of [46, 50, 54, 58]) { el(s, 'line', {x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: '#0b1838', 'stroke-opacity': v === 50 ? .45 : .1, 'stroke-width': v === 50 ? 2 : 1}); el(s, 'text', {x: L - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'm'}, v + '%'); }
    for (const n of [20, 40, 80, 160, 240]) el(s, 'text', {x: X(n), y: B + 20, 'text-anchor': 'middle', class: 'm'}, n);
    el(s, 'text', {x: (L + R) / 2, y: B + 44, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13}, 'teams that brought it →');
    for (const m of C.megasAtNice) {
      const id = m.form.toLowerCase().replace(/[^a-z0-9]/g, ''), key = id === 'raichumegax' || id === 'raichumegay', sz = key ? 54 : 38, x = X(m.teams), y = Y(m.pct);
      const g = el(s, 'g'); el(g, 'title', {}, `${m.form}: ${m.teams} teams, ${m.pct}% (${m.w}-${m.l})`);
      if (key) el(g, 'circle', {cx: x, cy: y, r: sz / 2 + 3, fill: '#fff', 'fill-opacity': .8, stroke: id === 'raichumegax' ? '#ffc83d' : '#6b4fd8', 'stroke-width': 3});
      img(g, sprite(id), x - sz / 2, y - sz / 2, sz);
      if (key) { const left = x > 420; el(g, 'text', {x: left ? x - sz / 2 - 6 : x + sz / 2 + 6, y: y + 4, 'text-anchor': left ? 'end' : 'start', 'font-weight': 700, 'font-size': 13}, `${m.form.replace('-Mega-', ' ')} ${m.pct}%`); }
    }
  })();

  // ---------- Observed matchup cycles ----------
  let cyc = 0;
  function cycles() {
    const s = document.getElementById('cycleSvg'); s.innerHTML = '';
    const loop = P.loops[cyc], cx = 300, cy = 236, r = 150;
    const pos = [0, 1, 2].map(k => [cx + r * Math.sin(k * 2 * Math.PI / 3), cy - r * Math.cos(k * 2 * Math.PI / 3)]);
    const defs = el(s, 'defs'), m = el(defs, 'marker', {id: 'fc', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 4, markerHeight: 4, orient: 'auto'}); el(m, 'path', {d: 'M0,0 L10,5 L0,10 z', fill: '#ffb000'});
    loop.plans.forEach((_, k) => {
      const [x1, y1] = pos[k], [x2, y2] = pos[(k + 1) % 3], dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
      const a = [x1 + ux * 66, y1 + uy * 66], b = [x2 - ux * 70, y2 - uy * 70], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ox = mx - cx, oy = my - cy, on = Math.hypot(ox, oy) || 1;
      const [w, l] = loop.records[k], share = w / (w + l), close = share < .56;
      el(s, 'path', {d: `M${a} Q${mx + ox / on * 50},${my + oy / on * 50} ${b}`, fill: 'none', stroke: '#ffb000', 'stroke-width': close ? 4 : 7, 'stroke-dasharray': close ? '10 8' : '', 'marker-end': 'url(#fc)'});
      const lx = mx + ox / on * 92, ly = my + oy / on * 92;
      el(s, 'rect', {x: lx - 52, y: ly - 22, width: 104, height: 44, rx: 14, fill: '#fff', 'fill-opacity': .92});
      el(s, 'text', {x: lx, y: ly - 2, 'text-anchor': 'middle', 'font-weight': 800, 'font-size': 18}, Math.round(share * 100) + '%');
      el(s, 'text', {x: lx, y: ly + 15, 'text-anchor': 'middle', class: 'm', 'font-size': 11}, `${w}-${l}`);
    });
    loop.plans.forEach((f, k) => {
      const p = plans[f], [x, y] = pos[k];
      el(s, 'circle', {cx: x, cy: y, r: 56, fill: '#fff', 'fill-opacity': .9});
      p.spr.slice(0, 2).forEach((id, j) => img(s, sprite(id), x - 30 + j * 26 - (p.spr.length - 1) * 13 + (p.spr.length === 1 ? 4 : 0), y - 40, 56));
      el(s, 'text', {x, y: y + 34, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 12}, p.name);
    });
    el(s, 'text', {x: 300, y: 450, 'text-anchor': 'middle', class: 'm'}, 'arrow: winner → loser · dashed: close, a lean not a lock');
    seg(document.getElementById('cycleTabs'), P.loops.slice(0, 2).map(l => l.plans.map(f => plans[f].name.split(' ')[0]).join(' → ')), cyc, i => { cyc = i; cycles(); });
  }

  // ---------- Meta River ----------
  (function river() {
    const s = document.getElementById('riverSvg'), xs = [110, 500, 890], top = 30, H = 470;
    const order = plans.map((_, i) => i).sort((a, b) => plans[b].share[0] - plans[a].share[0]);
    const tot = [0, 1, 2].map(e => plans.reduce((a, p) => a + p.share[e], 0));
    let acc = [0, 0, 0];
    const labels = [];
    const Y = f => top + f * H;
    const curve = (ys, rev) => { const pts = xs.map((x, e) => [x, Y(ys[e])]); if (rev) pts.reverse(); let d = ''; for (let i = 1; i < 3; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; } return d; };
    for (const i of order) {
      const p = plans[i], lo = acc.slice(); acc = acc.map((a, e) => a + p.share[e] / tot[e]); const hi = acc.slice();
      el(s, 'path', {d: `M${xs[0]},${Y(lo[0])}${curve(lo)} L${xs[2]},${Y(hi[2])}${curve(hi, true)} Z`, fill: COL[i], 'fill-opacity': .85, stroke: '#fff', 'stroke-width': 1.5});
      let e = 0; for (let k = 1; k < 3; k++) if (hi[k] - lo[k] > hi[e] - lo[e]) e = k;
      const th = (hi[e] - lo[e]) * H, sz = Math.max(18, Math.min(40, th * .9)), mid = Y((lo[e] + hi[e]) / 2), x = e === 0 ? xs[0] + 10 : e === 2 ? xs[2] - 210 : xs[1] - 90;
      if (th >= 16) labels.push(() => { p.spr.forEach((id, k) => img(s, sprite(id), x + k * sz * .6, mid - sz / 2, sz)); el(s, 'text', {x: x + sz * (0.6 * p.spr.length + .5), y: mid + 4, 'font-size': th > 30 ? 14 : 12, 'font-weight': 700, fill: '#fff', style: 'fill:#fff;paint-order:stroke;stroke:rgba(0,0,0,.25);stroke-width:3px'}, p.name); });
    }
    labels.forEach(f => f());
    EV.forEach((e, k) => el(s, 'text', {x: xs[k], y: 530, 'text-anchor': 'middle', 'font-weight': 800, 'font-size': 16}, e));
  })();

  // ---------- The Tape ----------
  (function tape() {
    const grid = document.getElementById('tapeGrid');
    for (const p of [...plans].sort((a, b) => b.share[2] - a.share[2])) {
      const d = p.wr[2] - p.wr[1], good = p.wr[2] >= .5, y = v => 38 - (v - .42) / .18 * 34;
      const div = document.createElement('div'); div.className = 'tick';
      div.innerHTML = `<div class="t">${p.spr.map(id => `<img src="${sprite(id)}" alt="">`).join('')}<div><b class="nm">${p.name}</b><div class="tag" style="margin-left:18px">${p.tag}</div></div></div>
        <div class="row" style="justify-content:space-between"><div><div style="font:800 26px var(--display)">${pct(p.share[2])}</div><div class="num ${good ? 'win' : 'loss'}" style="font-size:12px">won ${pct(p.wr[2])} ${d >= 0 ? '▲' : '▼'}${Math.abs(d * 100).toFixed(1)}</div></div>
        <svg viewBox="0 0 120 44" width="120" height="44" aria-hidden="true"><line x1="0" x2="120" y1="${y(.5)}" y2="${y(.5)}" stroke="#0b1838" stroke-opacity=".2" stroke-dasharray="3 3"/><polyline points="${p.wr.map((v, e) => `${6 + e * 54},${y(v)}`).join(' ')}" fill="none" stroke="${good ? '#146c43' : '#b42318'}" stroke-width="3" stroke-linecap="round"/></svg></div>`;
      grid.appendChild(div);
    }
  })();

  galaxy(); bandwagon(); cycles();
});
