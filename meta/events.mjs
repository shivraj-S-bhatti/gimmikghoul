// Normalise open team sheets and pairings into one anonymised dataset.
// Each team becomes: event, place, six sets, Day 1 record, and engine-derived tokens
// (battle form, weather, terrain, key abilities, move-level mechanics) used by plans.py.
// Player names and team-sheet links are dropped.
// Usage: node meta/events.mjs [slug ...]   (default: Frankfurt, Louisville, Nice 2027)
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = new URL('../', import.meta.url).pathname;
const {Dex} = require(ROOT + '.cache/showdown/dist/sim');
const dex = Dex.mod('champions');
const id = s => Dex.toID(s);
const SLUGS = process.argv.slice(2).length ? process.argv.slice(2) : ['regional-frankfurt-2027', 'regional-louisville-2027', 'regional-nice-2027'];
const OUT = ROOT + 'site/data/';

async function load(slug) {
  const f = `${ROOT}.cache/events/${slug}.js`;
  if (!fs.existsSync(f)) {
    fs.mkdirSync(`${ROOT}.cache/events`, {recursive: true});
    const r = await fetch(`https://vgchistory.com/live/${slug}.js`, {headers: {'user-agent': 'gimmikghoul-meta'}});
    if (!r.ok) throw Error(`fetch ${slug}: ${r.status}`);
    fs.writeFileSync(f, await r.text());
  }
  const s = fs.readFileSync(f, 'utf8');
  return JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
}

const weatherOf = {drizzle: 'rain', drought: 'sun', sandstream: 'sand', snowwarning: 'snow'};
const terrainOf = {electricsurge: 'electric', grassysurge: 'grassy', psychicsurge: 'psychic', mistysurge: 'misty'};
const KEY_AB = new Set(['intimidate', 'prankster', 'shadowtag', 'unburden', 'swiftswim', 'chlorophyll', 'sandrush', 'slushrush', 'armortail', 'soundproof', 'bulletproof', 'magicbounce', 'stalwart', 'pixilate', 'aerilate', 'refrigerate']);
const MOVE_MECH = {trickroom: 'trickroom', tailwind: 'tailwind', followme: 'redirection', ragepowder: 'redirection', spore: 'sleep', sleeppowder: 'sleep', hypnosis: 'sleep', yawn: 'sleep',
  reflect: 'screens', lightscreen: 'screens', auroraveil: 'screens', perishsong: 'perishsong', fakeout: 'fakeout', wideguard: 'wideguard', taunt: 'taunt', haze: 'haze', expandingforce: 'expandingforce', weatherball: 'weatherball'};
const megaForm = (mon, item) => { const it = dex.items.get(item), sp = dex.species.get(mon); const f = it.megaStone?.[sp.baseSpecies] || it.megaStone?.[sp.name]; return f ? dex.species.get(f) : null; };

const teams = [], matches = [], events = [];
for (const [e, slug] of SLUGS.entries()) {
  const EV = await load(slug);
  const div = EV.divisions.find(d => d.id === 'masters');
  const day1 = EV.dayTwo?.masters?.after ?? 8;
  const index = new Map();
  EV.field.forEach((f, i) => {
    if (f.division !== 'Masters' || !f.team?.length) return;
    const sets = f.team.map(t => {
      const base = dex.species.get(t.mon), mega = megaForm(t.mon, t.item);
      return {species: base.name, form: (mega || base).name, item: t.item, ability: t.ability, nature: t.nature, moves: t.moves || []};
    });
    const tok = new Set();
    for (const s of sets) {
      const form = id(s.form), abilities = [id(s.ability), ...(s.form !== s.species ? [id(dex.species.get(s.form).abilities[0])] : [])];
      tok.add('mon:' + form);
      for (const a of abilities) { if (weatherOf[a]) tok.add('wx:' + weatherOf[a]); if (terrainOf[a]) tok.add('terrain:' + terrainOf[a]); if (KEY_AB.has(a)) tok.add('ab:' + a); }
      for (const m of s.moves.map(id)) if (MOVE_MECH[m]) tok.add('mech:' + MOVE_MECH[m]);
    }
    for (const s of sets) { tok.add(`set:${id(s.form)}@${id(s.item)}`); for (const m of s.moves) tok.add(`set:${id(s.form)}>${id(m)}`); }
    index.set(i, teams.length);
    teams.push({event: e, place: f.place, sets, tok: [...tok], d1: [0, 0], all: [0, 0], day2: false});
  });
  for (const rd of div.rounds) for (const t of rd.tables) {
    if (t.b == null || !index.has(t.a) || !index.has(t.b)) continue;
    const a = index.get(t.a), b = index.get(t.b), w = t.result === 'a' ? 1 : t.result === 'b' ? 0 : 0.5;
    matches.push([a, b, w, rd.n]);
    for (const [k, won] of [[a, w], [b, 1 - w]]) {
      if (won === 0.5) continue;
      teams[k].all[won ? 0 : 1]++;
      if (rd.n <= day1) teams[k].d1[won ? 0 : 1]++; else teams[k].day2 = true;
    }
  }
  events.push({slug, name: EV.name, dates: EV.dates, city: EV.place?.city, teams: index.size, day1Rounds: day1, source: 'RK9 open team sheets via vgchistory.com'});
}

fs.mkdirSync(OUT, {recursive: true});
fs.writeFileSync(OUT + 'teams.json', JSON.stringify({events, teams, matches}));
const q = v => /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v;
fs.writeFileSync(OUT + 'teams.csv', ['team,event,place,day1_wins,day1_losses,day2,' + [1, 2, 3, 4, 5, 6].map(n => `mon${n},item${n}`).join(',')]
  .concat(teams.map((t, k) => [k, events[t.event].slug, t.place, ...t.d1, t.day2 ? 1 : 0, ...t.sets.flatMap(s => [s.form, s.item])].map(q).join(','))).join('\n') + '\n');
fs.writeFileSync(OUT + 'matches.csv', ['team_a,team_b,a_won,round'].concat(matches.map(m => m.join(','))).join('\n') + '\n');
console.log(events.map(e => `${e.slug}: ${e.teams} teams`).join(' | '), `| ${matches.length} matches`);
