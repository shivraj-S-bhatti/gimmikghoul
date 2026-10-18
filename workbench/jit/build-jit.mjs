// Builds the just-in-time theory graph gk_gimmikghoul one step at a time, so the FalkorDB Browser view grows on camera.
// Seed: London Faust's Louisville top-16 team (Alcremie Decorate + Mega Garchomp Z + Trick Room Torkoal), as shown by Cybertron.
// Usage from repo root:  node workbench/jit/build-jit.mjs 1   (then 2, 3, 4, 5, 6; step 1 resets gk_gimmikghoul)
// Every capability edge is derived from engine data; damage edges come from the native Smogon Champions calculator.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { connect, query, rows } from '../../scripts/db.mjs';
import { calculateRow } from '../tools/calculator.mjs';

const G = process.env.JIT_GRAPH || 'gk_gimmikghoul';
if (!/^gk_[a-z0-9_]+$/.test(G)) throw Error('JIT_GRAPH must use the gk_ namespace.');
const step = Number(process.argv[2] || 1);
const require = createRequire(import.meta.url);
const { Dex } = require('../../.cache/showdown/dist/sim');
const dex = Dex.mod('champions');
const FORMAT = 'gen9championsvgc2026regmc';
const META = JSON.parse(fs.readFileSync(new URL('../../data/meta-sets.json', import.meta.url))).formats.find(f => f.format === FORMAT);
const USAGE = JSON.parse(fs.readFileSync(new URL('../../.cache/usage.json', import.meta.url))).data;
const toID = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const SOURCE = { id: 'cybertron-alcremie', label: 'Cybertron (Aaron Zheng), Road to Ranked: Alcremie team, Louisville Regionals top 16 (London Faust)', kind: 'source_claim',
  locator: 'YouTube video; sets read from the rental and stats screens; claims from the Common Combinations and Weaknesses & Watchouts slides and narration', retrieved: '2026-10-18 (transcript and screenshots supplied by Shivraj)' };

// The seed team, read off the rental screen in the video (stat points in evs).
const TEAM = {
  Alcremie: { species: 'Alcremie', ability: 'Sweet Veil', item: 'Rocky Helmet', nature: 'Bold', moves: ['Decorate', 'Helping Hand', 'Dazzling Gleam', 'Mystical Fire'], evs: { hp: 32, def: 32, spd: 2 } },
  'Garchomp-Mega-Z': { species: 'Garchomp', canonicalSpecies: 'Garchomp-Mega-Z', ability: 'Rough Skin', item: 'Garchompite Z', nature: 'Timid', moves: ['Draco Meteor', 'Earth Power', 'Power Gem', 'Protect'], evs: { def: 2, spa: 32, spd: 15, spe: 17 } },
  Torkoal: { species: 'Torkoal', ability: 'Drought', item: 'Charcoal', nature: 'Quiet', moves: ['Eruption', 'Heat Wave', 'Earth Power', 'Protect'], evs: { hp: 30, spa: 28, spd: 8 } },
  Farigiraf: { species: 'Farigiraf', ability: 'Armor Tail', item: 'Sitrus Berry', nature: 'Relaxed', moves: ['Hyper Voice', 'Psychic', 'Trick Room', 'Protect'], evs: { hp: 29, def: 24, spd: 13 } },
  Venusaur: { species: 'Venusaur', ability: 'Chlorophyll', item: 'Focus Sash', nature: 'Modest', moves: ['Leaf Storm', 'Sludge Bomb', 'Sleep Powder', 'Protect'], evs: { hp: 2, spa: 32, spe: 32 } },
  Kingambit: { species: 'Kingambit', ability: 'Defiant', item: 'Occa Berry', nature: 'Brave', moves: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Protect'], evs: { hp: 14, atk: 32, spd: 20 } },
};
const fullSet = s => ({ level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, ...s, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0, ...s.evs } });
const metaSet = n => META.species.find(s => s.name === n)?.candidate.set;
const setText = s => `${s.canonicalSpecies || s.species} @ ${s.item} | ${s.ability} | ${s.nature} | ${Object.entries(s.evs).filter(([, v]) => v).map(([k, v]) => `${v} ${k}`).join(' / ')} | ${s.moves.join(', ')}`;

const c = await connect();
const q = (cy, p = {}) => query(c, G, cy, p);
const mon = (name, extra = {}) => q('MERGE (m:Mon {id:$id}) ON CREATE SET m.name=$name, m.usage=$u SET m += $extra',
  { id: toID(name), name, u: Number((USAGE[name]?.usage ?? 0).toFixed(4)), extra });
const learns = (species, move) => {
  const sp = dex.species.get(species);
  for (const id of [sp.id, toID(sp.baseSpecies), toID(sp.changesFrom || '')]) if (dex.data.Learnsets[id]?.learnset?.[toID(move)]) return true;
  return false;
};
const legal = Object.keys(USAGE).filter(n => dex.species.get(n).exists);
const say = (title, lines, cypher) => { console.log(`\n== Step ${step}: ${title}`); for (const l of lines) console.log('  ' + l); if (cypher) console.log(`\n  Browser:  ${cypher}`); };

if (step === 1) {
  // Seed: the six members and the two ideas the source claims hold the team together.
  await q('MATCH (n) DETACH DELETE n');
  await q('CREATE (:Source {id:$id, label:$label, kind:$kind, locator:$locator, retrieved:$retrieved})', SOURCE);
  for (const [name, s] of Object.entries(TEAM)) await mon(name, { onTeam: true, set: setText(s), setSource: SOURCE.id });
  for (const [a, b, why] of [['Alcremie', 'Garchomp-Mega-Z', 'Decorate +2 Atk/SpA; Sweet Veil keeps the partner awake'], ['Farigiraf', 'Torkoal', 'Trick Room end game']])
    await q('MATCH (a:Mon {id:$a}), (b:Mon {id:$b}), (s:Source {id:$s}) CREATE (a)-[:CORE {why:$why, status:"source_claim"}]->(b), (a)-[:FROM]->(s)', { a: toID(a), b: toID(b), why, s: SOURCE.id });
  say('Seed the team and the claimed cores', ['6 mons from the rental screen, 2 CORE edges attributed to the source (status source_claim)'], "MATCH p=(:Mon)-[:CORE]->(:Mon) RETURN p");
}

if (step === 2) {
  // Capability index from engine data: status moves that raise a target's stats can boost an ally;
  // status moves that lower a target's stats become boosts on a Contrary ally. Nothing here is a hand list.
  // Engine target semantics: only these target types can land on an adjacent ally in doubles. allAdjacentFoes / foeSide moves cannot.
  const ALLY_TARGETS = ['normal', 'any', 'adjacentAlly', 'adjacentAllyOrSelf', 'allies', 'allAdjacent'];
  const moves = dex.moves.all().filter(m => !m.isNonstandard && m.category === 'Status' && m.boosts && ALLY_TARGETS.includes(m.target));
  const raise = moves.filter(m => Object.values(m.boosts).some(v => v > 0) && Object.values(m.boosts).every(v => v >= 0));
  const lower = moves.filter(m => Object.values(m.boosts).every(v => v < 0) && Object.values(m.boosts).reduce((a, v) => a + v, 0) <= -2);
  const contrary = legal.filter(n => Object.values(dex.species.get(n).abilities).includes('Contrary'));
  const topLearners = m => legal.filter(n => learns(n, m.name)).sort((a, b) => (USAGE[b].usage) - (USAGE[a].usage)).slice(0, 4);
  let edges = 0;
  for (const m of raise) {
    const who = topLearners(m); if (!who.length) continue;
    await q('MERGE (x:Move {id:$id}) SET x.name=$name, x.kind="ally-boost", x.boosts=$b, x.confuses=$cf, x.target=$t', { id: m.id, name: m.name, b: JSON.stringify(m.boosts), cf: m.volatileStatus === 'confusion', t: m.target });
    for (const n of who) { await mon(n); await q('MATCH (a:Mon {id:$a}), (x:Move {id:$m}) CREATE (a)-[:CAN_LEARN {status:"learnset_candidate", note:"in the Champions learnset; set not validated"}]->(x)', { a: toID(n), m: m.id }); edges++; }
  }
  for (const m of lower) {
    const who = topLearners(m); if (!who.length || !contrary.length) continue;
    await q('MERGE (x:Move {id:$id}) SET x.name=$name, x.kind="drop-inverted-by-contrary", x.boosts=$b, x.target=$t', { id: m.id, name: m.name, b: JSON.stringify(m.boosts), t: m.target });
    for (const n of who.slice(0, 2)) { await mon(n); await q('MATCH (a:Mon {id:$a}), (x:Move {id:$m}) CREATE (a)-[:CAN_LEARN {status:"learnset_candidate", note:"in the Champions learnset; set not validated"}]->(x)', { a: toID(n), m: m.id }); edges++; }
    for (const r of contrary) { await mon(r, { ability: 'Contrary' }); await q('MATCH (x:Move {id:$m}), (r:Mon {id:$r}) CREATE (x)-[:ENABLES {via:"Contrary turns the drop into a boost", status:"rule_candidate", note:"Contrary is a legal ability of this species; ally targeting and set not checked here"}]->(r)', { m: m.id, r: toID(r) }); edges++; }
  }
  if (learns('Alcremie', 'Decorate')) await q('MATCH (a:Mon {id:"alcremie"}), (x:Move {id:"decorate"}) MERGE (a)-[:CAN_LEARN {status:"on_source_set", note:"on the rental set from the source"}]->(x)');
  await q('MATCH (x:Move {id:"decorate"}), (g:Mon {id:"garchompmegaz"}) CREATE (x)-[:ENABLES {via:"+2 Atk/SpA on the ally", status:"source_claim_and_move_data", source:"cybertron-alcremie"}]->(g)');
  say('Index ally boosters and Contrary-inverted drops from engine data',
    [`${raise.length} ally-targetable stat-raising status moves, ${lower.length} ally-targetable stat-lowering moves of -2 or more (engine target types ${ALLY_TARGETS.join(', ')})`, `Contrary users in the meta: ${contrary.join(', ') || 'none'}`, `${edges} candidate relationships (learnset and enabling links)`],
    "MATCH p=(:Mon)-[:CAN_LEARN]->(:Move)-[:ENABLES]->(:Mon) RETURN p");
}

if (step === 3) {
  // Native calculator, selected targets only: what does +2 from Decorate change for Garchomp and Torkoal?
  const plan = [
    ['Garchomp-Mega-Z', 'Draco Meteor', {}, ['Salamence-Mega', 'Rillaboom', 'Incineroar', 'Kingambit', 'Gholdengo', 'Archaludon', 'Charizard-Mega-Y', 'Sylveon']],
    ['Torkoal', 'Eruption', { weather: 'Sun' }, ['Rillaboom', 'Kingambit', 'Gholdengo', 'Incineroar', 'Basculegion', 'Milotic']],
  ];
  const pins = { calculator: JSON.parse(fs.readFileSync(new URL('../../.cache/champions-calculator/manifest.json', import.meta.url))),
    engineRevision: JSON.parse(fs.readFileSync(new URL('../../.artifacts/source-manifest.json', import.meta.url))).revision, adapter: 'workbench/tools/calculator.mjs' };
  const receipt = { step: 3, format: FORMAT, pins, source: SOURCE.id, rows: [] };
  const out = [];
  for (const [atk, move, field, targets] of plan) for (const t of targets) {
    const def = metaSet(t); if (!def) continue;
    const input = b => ({ format: FORMAT, attacker: { set: fullSet(TEAM[atk]), state: { boosts: { atk: b, spa: b } } }, defender: def, move, field });
    const [r0, r2] = [await calculateRow(input(0)), await calculateRow(input(2))];
    const rowId = `${toID(atk)}|${toID(move)}|${toID(t)}`;
    receipt.rows.push({ id: rowId, input0: input(0), output0: r0, input2: input(2), output2: r2 });
    const label = r => r.status === 'calculated' ? r.native.kochance.text : `${r.status}${r.native?.range ? ` (damage ${JSON.stringify(r.native.range)})` : ''}`;
    const k0 = label(r0), k2 = label(r2);
    const flips = !/guaranteed OHKO/.test(k0) && /guaranteed OHKO/.test(k2);
    const rel = r2.status !== 'calculated' ? 'CALC_NOT_COMPLETED' : /guaranteed OHKO/.test(k2) ? 'OHKO_AT_PLUS2' : 'NOT_OHKO_AT_PLUS2';
    await mon(t);
    await q(`MATCH (a:Mon {id:$a}), (d:Mon {id:$d}) CREATE (a)-[:${rel} {move:$move, at0:$k0, atPlus2:$k2, decorateFlips:$flips, desc2:$desc2, attackerSet:$aset, defenderSet:$dset, field:$fieldText, conditions:$cond, status:$st, receipt:$rc}]->(d)`,
      { a: toID(atk), d: toID(t), move, k0, k2, flips, desc2: r2.native?.fullDesc ?? '', aset: setText(TEAM[atk]) + ' [source: rental screen]',
        dset: setText({ ...def, item: def.item, ability: def.ability, nature: def.nature, evs: def.evs, moves: def.moves }) + ' [data/meta-sets.json candidate, constructed]',
        fieldText: Object.keys(field).length ? JSON.stringify(field) : 'neutral', st: r2.status === 'calculated' ? 'native_checked' : `native_${r2.status}`,
        rc: `workbench/jit/checks/step3-decorate.json rows[id=${rowId}]`,
        cond: `+0 vs +2 Atk and SpA (Decorate); no Intimidate, screens or terrain` });
    out.push(`${atk} ${move} -> ${t}: +0 ${k0} | +2 ${k2}${flips ? '   <- Decorate flips it' : ''}`);
  }
  fs.mkdirSync(new URL('./checks/', import.meta.url), { recursive: true });
  fs.writeFileSync(new URL('./checks/step3-decorate.json', import.meta.url), JSON.stringify(receipt, null, 1) + '\n');
  say('Native calcs on selected targets: what Decorate buys', [...out, 'Receipt: workbench/jit/checks/step3-decorate.json (full inputs, outputs, calculator and engine pins)'], "MATCH p=(:Mon {onTeam:true})-[r:OHKO_AT_PLUS2|NOT_OHKO_AT_PLUS2|CALC_NOT_COMPLETED]->(:Mon) RETURN p");
}

if (step === 4) {
  // Threats: counterplay to Decorate and to the seed, separated by where each claim comes from.
  const redirect = ['Follow Me', 'Rage Powder'];
  const users = META.species.filter(s => s.candidate?.set?.moves?.some(m => redirect.map(toID).includes(toID(m)))).map(s => s.name);
  await q('CREATE (:Threat {id:"redirection", name:"Redirection steals Decorate", status:"source_claim"})');
  for (const u of users) { await mon(u); await q('MATCH (u:Mon {id:$u}), (t:Threat {id:"redirection"}), (a:Mon {id:"alcremie"}) CREATE (u)-[:CARRIES]->(t), (t)-[:COUNTERPLAY {status:"meta_candidate_set", note:"move on the meta candidate set; that redirection steals Decorate is claimed by the source", policy:"Condition to play around, not a dismissal: the source uses Helping Hand or attacks instead of Decorate, or skips the Alcremie lead into Indeedee", source:"cybertron-alcremie"}]->(a)', { u: toID(u) }); }
  const claims = [['faster-garchomp', 'Faster Garchomp (Timid Draco, Scarf)', 'garchompmegaz'], ['bulky-charizard', 'Specially bulky Mega Charizard survives Power Gem', 'garchompmegaz'],
    ['focus-sash', 'Focus Sash survives +2 attacks', 'alcremie'], ['rain', 'Opposing rain beats Torkoal', 'torkoal'], ['taunt-tr', 'Taunt / reversing Trick Room', 'farigiraf']];
  for (const [id, name, target] of claims)
    await q('MATCH (m:Mon {id:$m}), (s:Source {id:$s}) CREATE (t:Threat {id:$id, name:$name, status:"source_claim"})-[:COUNTERPLAY {status:"source_claim", source:"cybertron-alcremie"}]->(m), (t)-[:FROM]->(s)', { id, name, m: target, s: SOURCE.id });
  const fairy = META.species.filter(s => dex.species.get(s.name).types.includes('Fairy')).map(s => s.name).slice(0, 6);
  for (const f of fairy) { await mon(f); await q('MATCH (f:Mon {id:$f}), (g:Mon {id:"garchompmegaz"}) CREATE (g)-[:NO_EFFECT {move:"Draco Meteor", why:"Fairy type is immune to Dragon moves", status:"engine_typechart"}]->(f)', { f: toID(f) }); }
  say('Counterplay', [`Redirection carriers in meta candidate sets: ${users.join(', ')}`, `${claims.length} source claims from the video`, `Fairy types immune to Draco (engine type chart): ${fairy.join(', ')}`],
    "MATCH p=()-[:COUNTERPLAY]->(:Mon {onTeam:true}) RETURN p UNION MATCH p=(:Mon {onTeam:true})-[:NO_EFFECT]->() RETURN p");
}

if (step === 5) {
  // Sweet Veil versus the sleep hole, and where Rocky Helmet helps: computed from engine move flags and meta candidate sets.
  const sleepers = META.species.filter(s => s.candidate?.set?.moves?.some(m => ['sleeppowder', 'spore', 'hypnosis', 'yawn', 'sing'].includes(toID(m)))).map(s => s.name);
  await q('CREATE (:Threat {id:"sleep", name:"Sleep (Sleep Powder, Hypnosis, Yawn)", status:"engine"})');
  await q('MATCH (a:Mon {id:"alcremie"}), (t:Threat {id:"sleep"}) CREATE (a)-[:BLOCKS {why:"Sweet Veil: Alcremie and its partner cannot fall asleep", status:"engine_ability_text", note:"ability handler, not a battle trace"}]->(t)');
  for (const s of sleepers) { await mon(s); await q('MATCH (u:Mon {id:$u}), (t:Threat {id:"sleep"}) CREATE (u)-[:CARRIES]->(t)', { u: toID(s) }); }
  const helmet = [];
  for (const s of META.species.slice(0, 30)) {
    const contact = (s.candidate?.set?.moves || []).filter(m => dex.moves.get(m).flags?.contact && dex.moves.get(m).category !== 'Status');
    if (contact.length >= 2) { helmet.push(`${s.name} (${contact.join(', ')})`); await mon(s.name);
      await q('MATCH (a:Mon {id:"alcremie"}), (d:Mon {id:$d}) CREATE (a)-[:HELMET_OPPORTUNITY {why:"Rocky Helmet chips a contact attacker that hits Alcremie", moves:$mv, setSource:"data/meta-sets.json candidate", status:"engine_move_flags", limits:"Only if that move targets Alcremie and connects; not checked: target choice, Protect, Long Reach / Protective Pads, sets that differ from the candidate"}]->(d)', { d: toID(s.name), mv: contact.join(', ') }); }
  }
  say('Sleep hole and Rocky Helmet value', [`Sleep users among meta candidates: ${sleepers.join(', ')}`, `Top-30 meta candidate sets with 2+ contact attacks (Rocky Helmet opportunities, not matchup results): ${helmet.length}`, ...helmet.slice(0, 8)],
    "MATCH p=(:Mon {id:'alcremie'})-[:BLOCKS|HELMET_OPPORTUNITY]->() RETURN p");
}

if (step === 6) {
  // Other support moves, shown with their stat vectors. They are different supports, not substitutes:
  // Garchomp's Draco Meteor and Torkoal's Eruption are special, so only a Special Attack raise does Decorate's job for them.
  const other = rows(await q('MATCH (a:Mon)-[:CAN_LEARN]->(x:Move {kind:"ally-boost"}) WHERE a.id <> "alcremie" AND x.confuses = false AND x.id <> "decorate" RETURN DISTINCT a.name, x.id, x.name, x.boosts LIMIT 8'));
  const lines = [];
  for (const [a, id, mv, boosts] of other) {
    const b = JSON.parse(boosts), spa = (b.spa || 0) > 0;
    await q('MATCH (a:Mon {name:$a}), (d:Move {id:"decorate"}) MERGE (a)-[:OTHER_SUPPORT {move:$mv, boosts:$boosts, raisesSpecialAttack:$spa, note:$note, status:"move_data"}]->(d)',
      { a, mv, boosts, spa, note: spa ? 'Also raises Special Attack' : 'Does not raise Special Attack: no substitute for Decorate on special Garchomp or Torkoal' });
    lines.push(`${a} via ${mv} ${boosts}${spa ? '' : '  (no SpA: different support, not a substitute)'}`);
  }
  await q('MATCH (s:Mon {id:"staraptormega"}) MATCH (g:Mon {id:"garchompmegaz"}) MERGE (s)-[:OTHER_PLAN {job:"different plan for the one-Mega slot: Memento into Contrary (see gk_board)", status:"hypothesis"}]->(g)');
  say('Other supports, with stat vectors', lines, "MATCH p=(:Mon)-[:OTHER_SUPPORT]->(:Move {id:'decorate'}) RETURN p");
}

const counts = rows(await q('MATCH (n) RETURN labels(n)[0], count(n)'));
const rels = rows(await q('MATCH ()-[r]->() RETURN type(r), count(r)'));
console.log(`\n  ${G} now: ${counts.map(r => r.join(' ')).join(', ')} | ${rels.map(r => r.join(' ')).join(', ')}`);
await c.quit();
