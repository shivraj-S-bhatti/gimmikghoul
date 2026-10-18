#!/usr/bin/env node
// Marginal observations are not observed joint sets.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateSetRow} from '../workbench/tools/champions-engine.mjs';
const inputs=[['.cache/usage.json','gen9championsvgc2026regmc'],['.cache/singles-202609-1500.json','gen9championsbssregmc']];
const sorted=obj=>Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).map(([value,weight])=>({value,weight}));
const formats=[];
for(const [path,format] of inputs){
 const bytes=await readFile(path);const source=JSON.parse(bytes);
 if(source.info.metagame!==format)throw Error(`Unexpected format in ${path}`);
 const species=Object.entries(source.data).sort((a,b)=>b[1].usage-a[1].usage).slice(0,60).map(([name,data])=>{
  const marginals=Object.fromEntries(['Moves','Abilities','Items','Spreads','Teammates'].map(key=>[key,sorted(data[key])]));
  const spread=marginals.Spreads[0]?.value||'';const [nature,points]=spread.split(':');
  const values=points?.split('/').map(Number)||[];
  const set={species:name,level:50,ability:marginals.Abilities[0]?.value,item:marginals.Items[0]?.value==='nothing'?'':marginals.Items[0]?.value,moves:marginals.Moves.filter(x=>x.value!=='nothing').slice(0,4).map(x=>x.value),nature,evs:Object.fromEntries(['hp','atk','def','spa','spd','spe'].map((k,i)=>[k,values[i]??0])),ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}};
  const marginalCoverage=Object.fromEntries(Object.entries(marginals).map(([key,entries])=>[key,{sourceEntries:entries.length,retainedEntries:Math.min(32,entries.length),totalWeight:entries.reduce((n,x)=>n+x.weight,0),retainedWeight:entries.slice(0,32).reduce((n,x)=>n+x.weight,0)}]));
  const retained=Object.fromEntries(Object.entries(marginals).map(([key,entries])=>[key,entries.slice(0,32)]));
  return {name,usage:data.usage,marginals:retained,marginalCoverage,candidate:{kind:'marginal_modes_combined_not_observed',probability:null,set,validation:validateSetRow({format,set})}};
 });
 formats.push({format,period:'2026-09',ratingCutoff:1500,url:`https://www.smogon.com/stats/2026-09/chaos/${format}-1500.json`,sha256:createHash('sha256').update(bytes).digest('hex'),sourceInfo:source.info,species});
}
const output={schemaVersion:1,meaning:'Top 60 species per format. Usage is source species usage. Up to 32 entries retained per marginal; coverage records truncation. Marginal weights are raw source counts/weights, not joint probabilities. Mode combinations are constructed candidate sets, never claimed as observed teams. EV fields carry Champions stat points. Individual-set validation only.',formats};
await writeFile('data/meta-sets.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(formats.map(f=>({format:f.format,species:f.species.length,valid:f.species.filter(x=>x.candidate.validation.status==='valid').length,other:f.species.filter(x=>x.candidate.validation.status!=='valid').length})),null,2));
