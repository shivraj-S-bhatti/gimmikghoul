#!/usr/bin/env node
// A small shell boundary for native graph exploration; no new orchestration.
import {connect} from './db.mjs';
const [action,graph,...flags]=process.argv.slice(2);
const experiment=name=>/^gk_[a-z0-9_]+$/.test(name||'');
const client=await connect();
try {
 if(action==='list') console.log(JSON.stringify(await client.sendCommand(['GRAPH.LIST']),null,2));
 else if(action==='query') {
  if(!graph) throw Error('Name a graph. Pipe Cypher into stdin.');
  const write=flags.includes('--write');
  if(write&&!experiment(graph)) throw Error('CLI writes require an exact gk_* experiment name.');
  if(!write&&!(await client.sendCommand(['GRAPH.LIST'])).includes(graph))throw Error('Graph does not exist; refusing an accidental empty graph.');
  let text=''; for await(const chunk of process.stdin)text+=chunk;
  const cypher=text.trim();
  if(!cypher)throw Error('Pipe Cypher into stdin.');
  console.log(JSON.stringify(await client.sendCommand([write?'GRAPH.QUERY':'GRAPH.RO_QUERY',graph,cypher]),null,2));
 } else if(action==='reset') {
  if(!experiment(graph)||!flags.includes('--yes')) throw Error('Reset requires one exact gk_* graph name and --yes. No wildcard or catalog reset.');
  console.log(JSON.stringify(await client.sendCommand(['GRAPH.DELETE',graph])));
 } else throw Error('Usage: node scripts/graph.mjs list | query GRAPH [--write] < query.cypher | reset gk_NAME --yes');
} finally {await client.quit();}
