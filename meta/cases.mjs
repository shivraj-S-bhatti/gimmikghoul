// Recompute every case-study number in the report from site/data/teams.json.
// Usage: node meta/cases.mjs   -> site/data/cases.json
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
const {events, teams, matches} = JSON.parse(fs.readFileSync(ROOT + 'site/data/teams.json'));
const [FRA, LOU, NICE] = [0, 1, 2];
const has = (t, sp) => t.sets.some(s => s.species === sp);
const item = (t, it) => t.sets.some(s => s.item === it);
const set = (t, sp) => t.sets.find(s => s.species === sp);
const pct = (w, l) => +(100 * w / Math.max(1, w + l)).toFixed(1);

// Day 1 games per team, with the opponent attached.
const games = teams.map(() => []);
for (const [a, b, w, r] of matches) {
  if (w === 0.5 || r > events[teams[a].event].day1Rounds) continue;
  games[a].push({o: teams[b], w: w === 1}); games[b].push({o: teams[a], w: w === 0});
}
const rec = (idx, opp = () => true) => { let w = 0, l = 0; for (const k of idx) for (const g of games[k]) if (opp(g.o)) g.w ? w++ : l++; return {w, l, pct: pct(w, l)}; };
const ids = pred => teams.map((t, k) => [t, k]).filter(([t]) => pred(t)).map(([, k]) => k);
const share = (pred, e) => +(100 * teams.filter(t => t.event === e && pred(t)).length / events[e].teams).toFixed(1);

const SIX = ['Raichu', 'Golisopod', 'Archaludon', 'Pelipper', 'Basculegion-F', 'Sneasler'];
const six = t => SIX.every(sp => has(t, sp));
const raichu = (t, s) => six(t) && item(t, `Raichunite ${s}`);
const sunrain = t => has(t, 'Venusaur') && has(t, 'Grimmsnarl') && item(t, 'Charizardite Y');
const snarl = t => (set(t, 'Archaludon')?.moves || []).includes('Snarl');
const out = {};

out.sameSix = Object.fromEntries([['X', 'X'], ['Y', 'Y']].map(([k, s]) => [k, [LOU, NICE].map(e => ({event: events[e].slug, players: ids(t => t.event === e && raichu(t, s)).length,
  day2: teams.filter(t => t.event === e && raichu(t, s) && t.day2).length, ...rec(ids(t => t.event === e && raichu(t, s)))}))]));
out.snarlAtNice = {withSnarl: rec(ids(t => t.event === NICE && raichu(t, 'X') && snarl(t))), withoutSnarl: rec(ids(t => t.event === NICE && raichu(t, 'X') && !snarl(t)))};
out.sunrainAdapts = {
  scarfGarchomp: [LOU, NICE].map(e => share(t => sunrain(t) && set(t, 'Garchomp')?.item === 'Choice Scarf', e) / share(sunrain, e) * 100 | 0),
  snarlArchaludon: [LOU, NICE].map(e => share(t => sunrain(t) && snarl(t), e) / share(sunrain, e) * 100 | 0),
  charizardYField: [LOU, NICE].map(e => share(t => item(t, 'Charizardite Y'), e)),
  raichuYvsSunrain: [LOU, NICE].map(e => rec(ids(t => t.event === e && raichu(t, 'Y')), sunrain)),
  raichuXvsSunrainNice: rec(ids(t => t.event === NICE && raichu(t, 'X')), sunrain)};
const rain = t => has(t, 'Pelipper'), intim = o => o.sets.some(s => s.ability === 'Intimidate');
out.basculegion = Object.fromEntries([['female', t => has(t, 'Basculegion-F') && rain(t)], ['male', t => has(t, 'Basculegion') && rain(t)], ['maleOffRain', t => has(t, 'Basculegion') && !rain(t)]]
  .map(([k, p]) => [k, {teams: ids(p).length, overall: rec(ids(p)), vsIntimidate: rec(ids(p), intim), vsRillaboom: rec(ids(p), o => has(o, 'Rillaboom'))}]));
const gengar = t => item(t, 'Gengarite'), perishUsers = t => t.sets.filter(s => s.moves.includes('Perish Song')).length;
out.perish = {
  oneUserNice: rec(ids(t => t.event === NICE && gengar(t) && perishUsers(t) <= 1)), twoUsersNice: rec(ids(t => t.event === NICE && gengar(t) && perishUsers(t) >= 2)),
  secondUserShare: [FRA, LOU, NICE].map(e => share(t => gengar(t) && perishUsers(t) >= 2, e) / share(gengar, e) * 100 | 0),
  soundproofShare: [FRA, LOU, NICE].map(e => share(t => gengar(t) && t.sets.some(s => s.ability === 'Soundproof'), e) / share(gengar, e) * 100 | 0)};
const seed = t => item(t, 'Raichunite X') && set(t, 'Sneasler')?.item === 'Electric Seed';
out.lineage = Object.fromEntries([['pelipperBascF', t => has(t, 'Pelipper') && has(t, 'Basculegion-F')], ['oldMega', t => has(t, 'Pelipper') && has(t, 'Basculegion-F') && has(t, 'Golisopod') && (item(t, 'Swampertite') || item(t, 'Floettite'))],
  ['raichuXSeedSix', t => six(t) && seed(t)], ['raichuXSeedAnywhere', seed]].map(([k, p]) => [k, [FRA, LOU, NICE].map(e => teams.filter(t => t.event === e && p(t)).length)]));
const stones = {};
for (const [k, t] of teams.entries()) if (t.event === NICE) for (const s of t.sets) if (s.form !== s.species) (stones[s.form] ??= []).push(k);
out.megasAtNice = Object.entries(stones).filter(([, v]) => v.length >= 20).map(([form, v]) => ({form, teams: v.length, ...rec(v)})).sort((a, b) => b.teams - a.teams);

fs.writeFileSync(ROOT + 'site/data/cases.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1).slice(0, 4000));
