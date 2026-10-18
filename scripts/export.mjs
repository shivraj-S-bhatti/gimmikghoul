import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {Dex} = require('../.cache/showdown/dist/sim/dex.js');
const {TeamValidator} = require('../.cache/showdown/dist/sim/team-validator.js');
const dex = Dex.mod('champions');
const format = 'gen9championsvgc2026regmc';
const validator = new TeamValidator(format);
const manifest = JSON.parse(await fs.readFile('.artifacts/source-manifest.json'));
const usage = JSON.parse(await fs.readFile('.cache/usage.json'));
if (usage.info.metagame !== format) throw new Error('Usage format mismatch');
const rosterHtml = await fs.readFile('.cache/official-roster.html', 'utf8');
const roster = JSON.parse(rosterHtml.match(/const pokemons\s*=\s*(\[.*?\]);/s)?.[1] ?? 'null');
if (!Array.isArray(roster)) throw new Error('Official roster parser failed');
const nums = new Set(roster.map(r => Number(r[0].split('-')[0])));
const nodes = [], edges = [], issues = [];
const omittedSentinels = {emptyMove:0,noItem:0};
const id = (label, key) => `${label}:${key}`;
function node(label, key, props) { nodes.push({label, id:id(label,key), ...props}); }
function edge(type, fromLabel, from, toLabel, to, props={}) {
  edges.push({type, from:id(fromLabel,from), to:id(toLabel,to), ...props});
}
node('Snapshot', format, {name:format, revision:manifest.revision, usageMonth:'2026-09', cutoff:1500,
  battles:usage.info['number of battles'], createdAt:new Date().toISOString()});
for (const s of manifest.sources) node('Source', s.file, {...s});
for (const [key, flag, name] of roster) node('RosterEntry', key, {name, flag, nationalNumber:Number(key.split('-')[0])});
for (const t of dex.types.all()) node('Type', t.id, {name:t.name, damageTakenJson:JSON.stringify(t.damageTaken)});
for (const a of dex.abilities.all()) node('Ability', a.id, {name:a.name, available:!a.isNonstandard,
  description:a.desc || a.shortDesc || '', callbacks:Object.keys(a).filter(k=>typeof a[k]==='function')});
for (const i of dex.items.all()) node('Item', i.id, {name:i.name, available:!i.isNonstandard,
  description:i.desc || i.shortDesc || '', megaStoneJson:JSON.stringify(i.megaStone || null), megaEvolves:i.megaEvolves || ''});
for (const m of dex.moves.all()) {
  const moveKey=m.id==='hiddenpower'?Dex.toID(m.name):m.id;
  node('Move', moveKey, {name:m.name, available:!m.isNonstandard, category:m.category,
    power:m.basePower, accuracy:m.accuracy === true ? 100 : m.accuracy, bypassAccuracyCheck:m.accuracy===true,
    priority:m.priority, pp:m.pp, target:m.target, description:m.desc || m.shortDesc || '',
    effectsJson:JSON.stringify({boosts:m.boosts,self:m.self,secondary:m.secondary,secondaries:m.secondaries,
      status:m.status,volatileStatus:m.volatileStatus,weather:m.weather,terrain:m.terrain}),
    callbacks:Object.keys(m).filter(k=>typeof m[k]==='function')});
  edge('OF_TYPE','Move',moveKey,'Type',Dex.toID(m.type));
}
for (const s of dex.species.all()) {
  if (s.num <= 0) continue; // Simulator placeholders/CAP are outside the game catalog.
  const inCatalog = !s.isNonstandard;
  const officialNumber = nums.has(s.num);
  const learnsets = inCatalog && officialNumber ? dex.species.getFullLearnset(s.id) : [];
  const moveIds = [...new Set(learnsets.flatMap(l=>Object.keys(l.learnset)))].filter(m=>dex.moves.get(m).exists && !dex.moves.get(m).isNonstandard);
  const sample = moveIds[0];
  let sampleErrors = ['No current roster/catalog match or learnset'];
  if (sample) {
    sampleErrors = validator.validateSet({species:s.name,name:s.name, ability:s.abilities['0'],
      item:s.requiredItem || '',moves:[sample],level:50,nature:'Serious',
      evs:{hp:32,atk:0,def:0,spa:0,spd:2,spe:32},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}}, {}) || [];
  }
  node('Species', s.id, {name:s.name, nationalNumber:s.num, baseSpecies:s.baseSpecies,
    forme:s.forme || '', inChampionsCatalog:inCatalog, officialNumberPresent:officialNumber,
    sampleSetValidated:sampleErrors.length===0, sampleErrors:JSON.stringify(sampleErrors),
    hp:s.baseStats.hp, atk:s.baseStats.atk, def:s.baseStats.def, spa:s.baseStats.spa, spd:s.baseStats.spd,
    spe:s.baseStats.spe, bst:s.bst, battleOnly:JSON.stringify(s.battleOnly || false)});
  for (const t of s.types) edge('OF_TYPE','Species',s.id,'Type',Dex.toID(t));
  for (const [slot,a] of Object.entries(s.abilities)) edge('HAS_ABILITY','Species',s.id,'Ability',Dex.toID(a),{slot});
  for (const m of moveIds) edge('LEARNS','Species',s.id,'Move',m,{evidence:'resolved_champions_learnset', notJointSetValidation:true});
}
for (const [name,u] of Object.entries(usage.data)) {
  const species = dex.species.get(name);
  if (!species.exists) { issues.push({kind:'unknown_usage_species',name}); continue; }
  const key=species.id;
  node('Usage',key,{name,usage:u.usage,rawCount:u['Raw count'],spreadsJson:JSON.stringify(u.Spreads),
    checksCountersJson:JSON.stringify(u['Checks and Counters']),rawJson:JSON.stringify(u)});
  edge('OBSERVED_FOR','Usage',key,'Species',species.id);
  edge('IN_SNAPSHOT','Usage',key,'Snapshot',format);
  for (const [field,label,type] of [['Moves','Move','OBSERVED_MOVE'],['Items','Item','OBSERVED_ITEM'],['Abilities','Ability','OBSERVED_ABILITY'],['Teammates','Species','OBSERVED_TEAMMATE']]) {
    for (const [other,weight] of Object.entries(u[field] || {})) {
      if (field==='Moves' && other==='') { omittedSentinels.emptyMove++; continue; }
      if (field==='Items' && other==='nothing') { omittedSentinels.noItem++; continue; }
      const lookup=label==='Move'?dex.moves:label==='Item'?dex.items:label==='Ability'?dex.abilities:dex.species;
      const target=lookup.get(other);
      if (target.exists) edge(type,'Usage',key,label,target.id,{weight,meaning:'source_aggregate_weight_not_synergy_or_probability'});
      else issues.push({kind:'unknown_usage_reference',species:name,field,value:other});
    }
  }
}
const nodeIds=new Set(nodes.map(n=>n.id));
if (nodeIds.size!==nodes.length) throw new Error('Duplicate node identifiers');
const missing=edges.filter(e=>!nodeIds.has(e.from)||!nodeIds.has(e.to));
if (missing.length) throw new Error(`Dangling edges: ${JSON.stringify(missing.slice(0,5))}`);
const counts={}; for (const n of nodes) counts[n.label]=(counts[n.label]||0)+1;
const output={manifest,format,nodes,edges,issues,counts,omittedSentinels,
  boundaries:['Catalog includes unavailable species/moves/items; query availability flags.',
    'Official roster match is by national number, not exact form. Sample validator gate is community evidence.',
    'LEARNS edges do not certify arbitrary multi-move sets; validate full candidate sets.',
    'Usage marginals are not joint sets. Missing usage is unknown, not zero.',
    'Callback-based mechanics remain source code, not a parsed causal model.']};
await fs.writeFile('.artifacts/dataset.json',JSON.stringify(output));
await fs.writeFile('.artifacts/export-report.json',JSON.stringify({counts,edges:edges.length,issues,omittedSentinels,
  sampleValidatedSpecies:nodes.filter(n=>n.label==='Species'&&n.sampleSetValidated).length,boundaries:output.boundaries},null,2));
console.log(JSON.stringify({counts,edges:edges.length,issues:issues.length,sampleValidatedSpecies:output.nodes.filter(n=>n.label==='Species'&&n.sampleSetValidated).length}));
