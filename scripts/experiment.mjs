import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {connect,query,rows} from './db.mjs';

const data=JSON.parse(await fs.readFile('.artifacts/dataset.json'));
const graph=process.env.GRAPH_NAME || 'pokemon_mc_202609';
const start=performance.now();
const species=data.nodes.filter(n=>n.label==='Species' && n.sampleSetValidated);
const learns=new Map(), abilities=new Map();
for(const e of data.edges) {
  const map=e.type==='LEARNS'?learns:e.type==='HAS_ABILITY'?abilities:null;
  if (!map) continue;
  if (!map.has(e.from)) map.set(e.from,new Set());
  map.get(e.from).add(e.to);
}
const usage=new Map(data.nodes.filter(n=>n.label==='Usage').map(n=>[n.id.replace('Usage:','Species:'),n.usage]));
const can=(s,m)=>learns.get(s.id)?.has('Move:'+m);
const has=(s,a)=>abilities.get(s.id)?.has('Ability:'+a);
const names=list=>list.map(s=>[s.name]);
const gate='s.sampleSetValidated = true';
const cases=[
  {id:'simple-beam',cypher:`MATCH (s:Species)-[:LEARNS]->(:Move {id:'Move:simplebeam'}) WHERE ${gate} RETURN DISTINCT s.name`,
    baseline:()=>names(species.filter(s=>can(s,'simplebeam'))),mustContain:[['Farfetch’d']]},
  {id:'shell-smash',cypher:`MATCH (s:Species)-[:LEARNS]->(:Move {id:'Move:shellsmash'}) WHERE ${gate} RETURN DISTINCT s.name`,
    baseline:()=>names(species.filter(s=>can(s,'shellsmash'))),mustContain:[['Torterra']],mustExclude:[['Farfetch’d']]},
  {id:'body-press-ice-beam',cypher:`MATCH (:Move {id:'Move:bodypress'})<-[:LEARNS]-(s:Species)-[:LEARNS]->(:Move {id:'Move:icebeam'}) WHERE ${gate} RETURN DISTINCT s.name`,
    baseline:()=>names(species.filter(s=>can(s,'bodypress')&&can(s,'icebeam'))),mustContain:[['Swalot']]},
  {id:'intimidate-glare',cypher:`MATCH (:Ability {id:'Ability:intimidate'})<-[:HAS_ABILITY]-(s:Species)-[:LEARNS]->(:Move {id:'Move:glare'}) WHERE ${gate} RETURN DISTINCT s.name`,
    baseline:()=>names(species.filter(s=>has(s,'intimidate')&&can(s,'glare'))),mustContain:[['Arbok']]},
  {id:'rare-beam-smash-pairs',
    cypher:`MATCH (a:Species)-[:LEARNS]->(:Move {id:'Move:simplebeam'}), (b:Species)-[:LEARNS]->(:Move {id:'Move:shellsmash'}), (ua:Usage)-[:OBSERVED_FOR]->(a), (ub:Usage)-[:OBSERVED_FOR]->(b) WHERE a.sampleSetValidated = true AND b.sampleSetValidated = true AND a.nationalNumber <> b.nationalNumber AND ua.usage < 0.01 AND ub.usage < 0.01 RETURN DISTINCT a.name,b.name`,
    baseline:()=>species.filter(s=>can(s,'simplebeam')&&usage.has(s.id)&&usage.get(s.id)<0.01)
      .flatMap(a=>species.filter(b=>can(b,'shellsmash')&&usage.has(b.id)&&usage.get(b.id)<0.01&&a.nationalNumber!==b.nationalNumber).map(b=>[a.name,b.name]))},
];
const baselineSetupMs=performance.now()-start;
const canonical=result=>result.map(row=>JSON.stringify(row)).sort();
const client=await connect(), results=[];
await fs.mkdir('queries',{recursive:true});
try {
  for(const test of cases) {
    await fs.writeFile(`queries/${test.id}.cypher`,test.cypher+'\n');
    await query(client,graph,test.cypher); test.baseline();
    const graphTimes=[],plainTimes=[];
    let actual,expected;
    for(let i=0;i<5;i++) {
      let t=performance.now(); actual=rows(await query(client,graph,test.cypher));graphTimes.push(performance.now()-t);
      t=performance.now();expected=test.baseline();plainTimes.push(performance.now()-t);
      assert.deepEqual(canonical(actual),canonical(expected),`${test.id}: graph/plain-data disagreement`);
    }
    for(const row of test.mustContain||[]) assert(canonical(actual).includes(JSON.stringify(row)),`${test.id}: missing ${row}`);
    for(const row of test.mustExclude||[]) assert(!canonical(actual).includes(JSON.stringify(row)),`${test.id}: unexpected ${row}`);
    const median=xs=>[...xs].sort((a,b)=>a-b)[2];
    results.push({id:test.id,parity:true,count:actual.length,graphMedianMs:median(graphTimes),plainMedianMs:median(plainTimes),
      positiveChecks:test.mustContain||[],negativeChecks:test.mustExclude||[],rows:actual.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
  }
} finally { await client.quit(); }
const report={date:new Date().toISOString(),graph,format:data.format,baselineSetupMs,results,
  interpretation:'Five hand-written retrieval queries, not novel-core discovery or competitive evaluation. Both paths use the same exporter; parity cannot detect shared extraction errors.',
  timingCaveat:'Five warm repetitions on one laptop. Graph timing includes local network round trip; JS uses prebuilt in-memory indexes. Not a database speed comparison.'};
await fs.writeFile('.artifacts/experiment.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,results:results.map(({rows,...r})=>({...r,examples:rows.slice(0,8)}))},null,2));
