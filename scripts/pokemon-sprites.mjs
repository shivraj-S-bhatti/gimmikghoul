import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {connect, query, rows} from './db.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(root,'data/sprites');
const manifestPath=resolve(output,'manifest.json');
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const sources=['gen5','home','ani'];
const sourceRoot='https://play.pokemonshowdown.com/sprites/';
const dataset=JSON.parse(await readFile(resolve(root,'.artifacts/dataset.json'),'utf8'));

async function fetchChecked(url){
  let failure;
  for(let attempt=0;attempt<3;attempt++){
    try{const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`${response.status} ${url}`);return Buffer.from(await response.arrayBuffer());}
    catch(error){failure=error;}
  }
  throw failure;
}
function dimensions(buffer,extension){
  if(extension==='png'&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return [buffer.readUInt32BE(16),buffer.readUInt32BE(20)];
  if(extension==='gif'&&/^GIF8[79]a$/.test(buffer.subarray(0,6).toString()))return [buffer.readUInt16LE(6),buffer.readUInt16LE(8)];
  throw Error(`Invalid ${extension} image payload`);
}

async function download(){
  const require=createRequire(import.meta.url);
  const {Dex}=require(resolve(root,'.cache/showdown/dist/sim/dex.js'));
  await mkdir(output,{recursive:true});
  const indexes=await Promise.all(sources.map(async source=>{
    const url=sourceRoot+source+'/';const content=await fetchChecked(url);
    return {source,url,sha256:hash(content),files:new Set([...content.toString().matchAll(/href="\.\/([^"/]+\.(?:png|gif))"/g)].map(match=>match[1]))};
  }));
  let previous={entries:[]};try{previous=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
  const cached=new Map(previous.entries.map(entry=>[entry.speciesId,entry]));
  const species=dataset.nodes.filter(node=>node.label==='Species');
  const entries=new Array(species.length);let next=0;
  await Promise.all(Array.from({length:8},async()=>{
    while(next<species.length){
      const index=next++;const node=species[index];const spriteId=Dex.species.get(node.name).spriteid;
      const entry={speciesId:node.id,name:node.name,forme:node.forme,inChampionsCatalog:node.inChampionsCatalog,spriteId};
      const source=indexes.find(source=>source.files.has(spriteId+(source.source==='ani'?'.gif':'.png')));
      if(!source){entries[index]={...entry,status:'missing',reason:'No exact spriteid in inspected Showdown gen5, home, or ani directories; no base-form substitution.'};continue;}
      const extension=source.source==='ani'?'gif':'png';const url=source.url+spriteId+'.'+extension;
      const file=node.id.replace(/^Species:/,'')+'.'+extension;const prior=cached.get(node.id);
      let buffer;
      if(prior?.sourceUrl===url&&prior.file===file){try{const local=await readFile(resolve(output,file));if(hash(local)===prior.sha256)buffer=local;}catch{}}
      const downloaded=!buffer;if(!buffer)buffer=await fetchChecked(url);
      const [width,height]=dimensions(buffer,extension);
      if(downloaded)await writeFile(resolve(output,file),buffer);
      entries[index]={...entry,status:'exact',file,sourceUrl:url,sourceStyle:source.source,bytes:buffer.length,sha256:hash(buffer),width,height,downloadedAt:downloaded?new Date().toISOString():prior.downloadedAt};
    }
  }));
  const manifest={version:1,generatedAt:new Date().toISOString(),engineRevision:dataset.manifest.revision,sourceRoot,mapping:'Pinned Pokemon Showdown Dex.species.get(name).spriteid; exact spriteid only.',indexes:indexes.map(({files,...index})=>index),coverage:{total:entries.length,exact:entries.filter(e=>e.status==='exact').length,missing:entries.filter(e=>e.status==='missing').length,championsTotal:entries.filter(e=>e.inChampionsCatalog).length,championsExact:entries.filter(e=>e.inChampionsCatalog&&e.status==='exact').length},entries};
  await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest.coverage));
  return manifest;
}

async function apply(manifest){
  const graph=process.env.CATALOG_GRAPH||'pokemon_mc_202609';
  const base=new URL(process.env.SPRITE_BASE_URL||'http://localhost:4319/sprites/');
  if(!['localhost','127.0.0.1'].includes(base.hostname)||base.protocol!=='http:')throw Error('SPRITE_BASE_URL must use the local HTTP asset server');
  if(!base.pathname.endsWith('/'))throw Error('SPRITE_BASE_URL must end in /');
  for(const entry of manifest.entries){
    if(entry.status!=='exact')continue;
    if(!/^[a-z0-9]+\.(png|gif)$/.test(entry.file))throw Error(`Invalid local sprite filename: ${entry.speciesId}`);
    const buffer=await readFile(resolve(output,entry.file));
    if(hash(buffer)!==entry.sha256)throw Error(`Sprite file changed since manifest: ${entry.file}`);
  }
  const client=await connect();
  try{
    if(!(await client.sendCommand(['GRAPH.LIST'])).includes(graph))throw Error(`Catalog graph does not exist: ${graph}`);
    const snapshots=rows(await query(client,graph,'MATCH (s:Snapshot) RETURN s.revision'));
    if(!snapshots.some(([revision])=>revision===manifest.engineRevision))throw Error('Sprite manifest engine revision does not match catalog Snapshot');
    let applied=0;
    for(let index=0;index<manifest.entries.length;index+=100){
      const entries=manifest.entries.slice(index,index+100).map(entry=>({id:entry.speciesId,url:entry.file?new URL(entry.file,base).href:'',status:entry.status,source:entry.sourceUrl||'',spriteId:entry.spriteId,sha256:entry.sha256||''}));
      const result=await query(client,graph,'UNWIND $entries AS e MATCH (s:Species {id:e.id}) SET s.imageUrl=e.url, s.spriteStatus=e.status, s.spriteSource=e.source, s.spriteId=e.spriteId, s.spriteSha256=e.sha256 RETURN count(s)',{entries});
      applied+=Number(rows(result)[0][0]);
    }
    console.log(JSON.stringify({graph,applied,spriteBaseUrl:base.href}));
  }finally{await client.quit();}
}

const manifest=process.argv.includes('--apply-only')?JSON.parse(await readFile(manifestPath,'utf8')):await download();
if(process.argv.includes('--apply')||process.argv.includes('--apply-only'))await apply(manifest);
