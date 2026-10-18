#!/usr/bin/env node
// Controlled execution experiments, not matchup or damage simulations.
// Run from any directory: node /path/to/repo/workbench/runthrough/check.cjs
const path=require('node:path');
const root=path.resolve(__dirname,'../..');
const revision='a833737d8408322c8b1e821dee16af07b1fd9234';
const {Battle}=require('../../.cache/showdown/dist/sim/battle.js');
const {TeamValidator}=require('../../.cache/showdown/dist/sim/team-validator.js');
const fs=require('node:fs'),assert=require('node:assert/strict');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'.artifacts/source-manifest.json')));
assert.equal(manifest.revision,revision,'Prepare the declared Showdown revision first');
const format='gen9championsvgc2026regmc';
const set=(species,ability,moves,item='',extra={})=>({species,ability,moves,item,nature:'Hardy',evs:{hp:2},level:50,...extra});
const extras=[set('Primarina','Torrent',['Protect']),set('Tyranitar','Sand Stream',['Protect']),set('Lucario','Inner Focus',['Protect']),set('Milotic','Competitive',['Protect'])];
const passive=[set('Rillaboom','Grassy Surge',['Fake Out','Protect']),set('Garchomp','Rough Skin',['Protect']),...extras];
const records=[];
function start(name,p1,p2=passive){
 const validator=new TeamValidator(format);const errors=[validator.validateTeam(structuredClone(p1)),validator.validateTeam(structuredClone(p2))];
 assert.ok(errors.every(e=>!e),JSON.stringify({name,errors}));
 const battle=new Battle({formatid:format,seed:[1,2,3,4],p1:{name:'Plan',team:p1},p2:{name:'Opponent',team:p2}});
 battle.makeChoices('team 1234','team 1234');
 battle.record={name,format,teams:{p1,p2},validation:errors,initialSpeeds:battle.p1.active.map(p=>({name:p.name,speed:p.getStat('spe')}))};return battle;
}
function save(b,extra={}){records.push({...b.record,...extra,requestState:b.requestState,active:b.p1.active.map(p=>({name:p.name,species:p.species.name,hp:p.hp,ability:p.ability,boosts:{...p.boosts},canMegaEvo:p.canMegaEvo})),log:[...b.log]});b.destroy();}
function memento(name,enemy='move protect, move protect',opponent=passive,item=''){
 const p1=[set('Gholdengo','Good as Gold',['Memento'],item,{nature:'Timid',evs:{spa:32,spe:32,hp:2}}),set('Staraptor','Intimidate',['Brave Bird','Protect'],'Staraptite',{nature:'Jolly',evs:{atk:32,spe:32,hp:2}}),...extras];
 const b=start(name,p1,opponent);b.makeChoices('move memento -2, move bravebird 2 mega',enemy);save(b);
}
memento('memento-ally');
memento('normal-fakeout-gholdengo','move fakeout 1, move protect');
memento('scrappy-fakeout-gholdengo','move fakeout 1, move protect',[set('Kangaskhan','Scrappy',['Fake Out','Protect']),passive[1],...extras]);
memento('followme-redirection','move followme, move protect',[set('Clefable','Magic Guard',['Follow Me','Protect']),passive[1],...extras]);
memento('scarf-memento-before-attack','move protect, move protect',passive,'Choice Scarf');
function chain(name,audinite){
 const p1=[set('Audino','Regenerator',['Simple Beam','Protect'],audinite?'Audinite':''),set('Snorlax','Thick Fat',['Stockpile','Protect'],'',{evs:{hp:32,def:30,spe:4}}),set('Slowbro','Regenerator',['Psych Up','Body Press','Protect'],'Slowbronite',{nature:'Relaxed',evs:{hp:32,def:32,spd:2}}),extras[0],extras[1],extras[2]];
 const b=start(name,p1);b.makeChoices(`move simplebeam -2${audinite?' mega':''}, move stockpile`,'move protect, move protect');
 b.makeChoices('switch 3, move stockpile','move protect, move protect');
 b.makeChoices('move psychup -2, move stockpile','move protect, move protect');
 const beforeMega=b.p1.active.map(p=>({name:p.name,ability:p.ability,boosts:{...p.boosts},canMegaEvo:p.canMegaEvo}));
 const accepted=b.choose('p1','move bodypress 1 mega, move protect');
 if(accepted)b.choose('p2','move protect, move protect');
 save(b,{beforeMega,secondMegaChoiceAccepted:accepted,choiceError:b.p1.choice.error});
}
chain('base-audino-chain',false);
chain('mega-audino-spends-mega',true);
const byName=Object.fromEntries(records.map(r=>[r.name,r]));
const moveIndex=(name,move)=>byName[name].log.findIndex(line=>line.startsWith('|move|p1')&&line.includes(`|${move}|`));
assert.ok(moveIndex('memento-ally','Brave Bird')<moveIndex('memento-ally','Memento'));
assert.ok(moveIndex('scarf-memento-before-attack','Memento')<moveIndex('scarf-memento-before-attack','Brave Bird'));
assert.equal(byName['memento-ally'].active[1].boosts.atk,2);
assert.equal(byName['normal-fakeout-gholdengo'].active[1].boosts.atk,2);
assert.equal(byName['scrappy-fakeout-gholdengo'].active[1].boosts.atk,0);
assert.equal(byName['followme-redirection'].active[0].hp,0);
assert.equal(byName['followme-redirection'].active[1].boosts.atk,0);
assert.equal(byName['base-audino-chain'].active[0].ability,'shellarmor');
assert.equal(byName['base-audino-chain'].active[0].boosts.def,6);
assert.equal(byName['base-audino-chain'].active[0].boosts.spd,6);
assert.equal(byName['mega-audino-spends-mega'].secondMegaChoiceAccepted,false);
// Full traces stay in ignored scratch; compact semantic evidence is versionable.
const output=path.join(root,'.artifacts/runthrough-check');
fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({revision,records},null,2)+'\n');
const summary={
  revision, format, seed:[1,2,3,4],
  scope:'Seven controlled execution branches; all fixture teams validated. No matchup or win-rate claim.',
  branches:records.map(r=>({
    name:r.name,
    teamValidation:r.validation.every(errors=>!errors)?'passed':'failed',
    requestState:r.requestState,
    final:r.active.map(p=>({species:p.species,ability:p.ability,fainted:p.hp===0,boosts:Object.fromEntries(Object.entries(p.boosts).filter(([,n])=>n!==0))})),
    ...(r.secondMegaChoiceAccepted!==undefined?{slowbroMegaChoiceAccepted:r.secondMegaChoiceAccepted,choiceError:r.choiceError}:{}),
    events:r.log.filter(line=>/\|move\||\|faint\||\|-immune\||\|-boost\||\|-copyboost\||\|-mega\||\|cant\|/.test(line)&&!line.includes('|Protect')),
  })),
};
fs.writeFileSync(path.join(__dirname,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(`Verified ${records.length} branches; summary: workbench/runthrough/summary.json`);
