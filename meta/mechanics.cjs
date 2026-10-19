// Engine checks behind the Raichu X story, in the pinned Showdown Champions mod.
// 1. Speeds as built. 2. Mega Raichu X sets Electric Terrain and pops Sneasler's Electric Seed.
// 3. Sleep Powder into Sneasler under each Raichu Mega, over 40 seeds.
// 4. Un-Mega'd Raichu's Lightning Rod pulls its own partner's Electro Shot.
// Usage: node meta/mechanics.cjs   -> site/data/mechanics.json
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const {Battle} = require(path.join(ROOT, '.cache/showdown/dist/sim/battle'));
const FORMAT = 'gen9championsdoublescustomgame';
const S = (species, item, ability, moves, nature, evs) => ({species, item, ability, moves, nature, evs, level: 50});
const ATK = {hp: 2, atk: 32, def: 0, spa: 0, spd: 0, spe: 32}, SPA = {hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32};
const raichuX = S('Raichu', 'Raichunite X', 'Lightning Rod', ['Volt Tackle', 'Volt Switch', 'Feint', 'Fake Out'], 'Jolly', ATK);
const raichuY = S('Raichu', 'Raichunite Y', 'Lightning Rod', ['Zap Cannon', 'Focus Blast', 'Fake Out', 'Protect'], 'Timid', SPA);
const seedSneasler = S('Sneasler', 'Electric Seed', 'Unburden', ['Poison Jab', 'Close Combat', 'Swords Dance', 'Protect'], 'Adamant', ATK);
const herbSneasler = S('Sneasler', 'White Herb', 'Unburden', ['Dire Claw', 'Close Combat', 'Rock Slide', 'Protect'], 'Adamant', ATK);
const archaludon = S('Archaludon', 'Leftovers', 'Stamina', ['Electro Shot', 'Dragon Pulse', 'Snarl', 'Protect'], 'Calm', {hp: 32, atk: 0, def: 0, spa: 2, spd: 32, spe: 0});
const pelipper = S('Pelipper', 'Damp Rock', 'Drizzle', ['Weather Ball', 'Hurricane', 'Wide Guard', 'Helping Hand'], 'Bold', {hp: 32, atk: 0, def: 32, spa: 2, spd: 0, spe: 0});
const scarfChomp = S('Garchomp', 'Choice Scarf', 'Rough Skin', ['Earthquake', 'Rock Slide', 'Dragon Claw', 'Stomping Tantrum'], 'Jolly', ATK);
const venusaur = S('Venusaur', 'Focus Sash', 'Chlorophyll', ['Sleep Powder', 'Leaf Storm', 'Sludge Bomb', 'Protect'], 'Modest', SPA);
const incineroar = S('Incineroar', 'Sitrus Berry', 'Intimidate', ['Fake Out', 'Flare Blitz', 'Parting Shot', 'Protect'], 'Careful', {hp: 32, atk: 2, def: 0, spa: 0, spd: 32, spe: 0});

function battle(p1, p2, seed = 1) {
  const b = new Battle({formatid: FORMAT, seed: [seed, 2, 3, 4]});
  b.setPlayer('p1', {name: 'A', team: p1}); b.setPlayer('p2', {name: 'B', team: p2});
  b.makeChoices(`team ${p1.map((_, i) => i + 1).join('')}`, `team ${p2.map((_, i) => i + 1).join('')}`);
  return b;
}
const out = {};
const b0 = battle([raichuX, seedSneasler, raichuY, herbSneasler, archaludon, pelipper], [scarfChomp, incineroar]);
const spe = p => p.storedStats.spe * (p.item === 'choicescarf' ? 1.5 : 1);
out.speeds = Object.fromEntries([...b0.p1.pokemon, b0.p2.pokemon[0]].filter(p => p.species.name !== 'Raichu').map(p => [`${p.species.name}@${p.getItem().name}`, Math.floor(spe(p))]));

// Mega Raichu X turn 1: terrain, Seed consumed, Unburden speed.
let b = battle([raichuX, seedSneasler, archaludon, pelipper], [incineroar, venusaur]);
b.makeChoices('move fakeout 1 mega, move swordsdance', 'move protect, move protect');
const sn = b.p1.active[1];
out.megaX = {terrain: b.field.terrain, seedConsumed: !sn.item, sneaslerSpeedNow: sn.getStat('spe'), unburden: !!sn.volatiles.unburden};

// Sleep Powder into Sneasler, 40 seeds each.
for (const [label, ra, sneas] of [['raichuX', raichuX, seedSneasler], ['raichuY', raichuY, herbSneasler]]) {
  const tally = {asleep: 0, blockedByTerrain: 0, missed: 0};
  for (let seed = 1; seed <= 40; seed++) {
    const t = battle([ra, sneas, archaludon, pelipper], [venusaur, incineroar], seed);
    t.makeChoices(`move ${label === 'raichuX' ? 'volttackle' : 'zapcannon'} 2 mega, move ${label === 'raichuX' ? 'swordsdance' : 'closecombat 2'}`, 'move sleeppowder 2, move protect');
    const log = t.log.join('\n');
    if (/\|-status\|p1b: Sneasler\|slp/.test(log)) tally.asleep++;
    else if (/Electric Terrain/.test(log.split('Sleep Powder')[1] || '') || /\|-activate\|p1b: Sneasler\|move: Electric Terrain/.test(log)) tally.blockedByTerrain++;
    else tally.missed++;
  }
  out['sleepPowder_' + label] = tally;
}
// Battle-form speeds after Mega Evolution.
for (const ra of [raichuX, raichuY]) {
  const t = battle([ra, herbSneasler], [incineroar, venusaur]);
  t.makeChoices('move fakeout 1 mega, move protect', 'move protect, move protect');
  out.speeds[t.p1.active[0].species.name] = t.p1.active[0].getStat('spe', true, true);
}

// Lightning Rod on an un-Mega'd Raichu pulls the partner's Electro Shot.
b = battle([raichuX, archaludon, pelipper, seedSneasler], [incineroar, venusaur]);
b.makeChoices('move feint 1, move electroshot 1', 'move protect, move protect');
b.makeChoices('move volttackle 1, move electroshot 1', 'move partingshot 2, move protect');
out.lightningRod = {electroShotRedirectedToRaichu: /\|move\|p1b: Archaludon\|Electro Shot\|p1a: Raichu/.test(b.log.join('\n'))};

fs.writeFileSync(path.join(ROOT, 'site/data/mechanics.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
