import fs from 'node:fs/promises';
import {connect,query,rows} from './db.mjs';
const data=JSON.parse(await fs.readFile('.artifacts/dataset.json'));
const graph=process.env.GRAPH_NAME || 'pokemon_mc_202609';
if (!/^pokemon_[a-zA-Z0-9_]+$/.test(graph)) throw new Error('Use an isolated pokemon_ graph name');
const client=await connect();
const start=performance.now();
async function index(label) {
  try { await query(client,graph,`CREATE INDEX FOR (n:${label}) ON (n.id)`); }
  catch(error) { if (!error.message.includes("already indexed")) throw error; }
}
try {
  // Clear readiness before touching an existing import; publish only once all
  // relationship batches and final count validation have succeeded.
  await query(client,graph,'MATCH (s:Snapshot) SET s.importComplete=false');
  for (const label of Object.keys(data.counts)) {
    await index(label);
    const selected=data.nodes.filter(n=>n.label===label).map(({label,...n})=>n);
    for(let i=0;i<selected.length;i+=200) {
      await query(client,graph,`UNWIND $batch AS row MERGE (n:${label} {id:row.id}) SET n = row`,{batch:selected.slice(i,i+200)});
    }
  }
  // All endpoints have a shared index so relationship imports do not scan every label.
  await query(client,graph,'MATCH (n) SET n:Entity');
  await index('Entity');
  const types=[...new Set(data.edges.map(e=>e.type))];
  for(const type of types) {
    const selected=data.edges.filter(e=>e.type===type).map(({type,from,to,...props})=>({from,to,props}));
    for(let i=0;i<selected.length;i+=200) {
      await query(client,graph,`UNWIND $batch AS row MATCH (a:Entity {id:row.from}), (b:Entity {id:row.to}) MERGE (a)-[e:${type}]->(b) SET e = row.props`,{batch:selected.slice(i,i+200)});
    }
  }
  const countNodes=rows(await query(client,graph,'MATCH (n) RETURN count(n)'))[0][0];
  const countEdges=rows(await query(client,graph,'MATCH ()-[e]->() RETURN count(e)'))[0][0];
  const report={graph,nodes:Number(countNodes),edges:Number(countEdges),importMs:performance.now()-start,
    expectedNodes:data.nodes.length,expectedEdges:data.edges.length};
  await fs.writeFile('.artifacts/ingest-report.json',JSON.stringify(report,null,2));
  if (report.nodes!==report.expectedNodes || report.edges!==report.expectedEdges) throw new Error(`Count mismatch: ${JSON.stringify(report)}`);
  await query(client,graph,'MATCH (s:Snapshot) SET s.importComplete=true');
  console.log(JSON.stringify(report));
} finally { await client.quit(); }
