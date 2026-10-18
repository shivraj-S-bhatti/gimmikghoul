#!/usr/bin/env node
// Attach only exact-name sprite metadata to existing experiment nodes.
import {readFile} from 'node:fs/promises';
import {connect,query,rows} from './db.mjs';
const graph=process.argv[2];
if(!/^gk_[a-z0-9_]+$/.test(graph||''))throw Error('Supply one exact existing gk_* graph.');
const manifest=JSON.parse(await readFile(new URL('../data/sprites/manifest.json',import.meta.url)));
const c=await connect();
try {
 if(!(await c.sendCommand(['GRAPH.LIST'])).includes(graph))throw Error('Graph does not exist.');
 let updated=0;
 for(let start=0;start<manifest.entries.length;start+=100){
  const entries=manifest.entries.slice(start,start+100).filter(e=>e.status==='exact').map(e=>({name:e.name,imageUrl:`http://localhost:4319/sprites/${e.file}`,spriteId:e.spriteId,sha256:e.sha256,source:e.sourceUrl}));
  const result=await query(c,graph,'UNWIND $entries AS e MATCH (n) WHERE (n:Mon OR n:Species) AND n.name=e.name SET n.imageUrl=e.imageUrl,n.spriteStatus="exact",n.spriteId=e.spriteId,n.spriteSha256=e.sha256,n.spriteSource=e.source RETURN count(n)',{entries});
  updated+=Number(rows(result)[0][0]);
 }
 console.log(JSON.stringify({graph,updated,match:'exact species name only'}));
} finally {await c.quit();}
