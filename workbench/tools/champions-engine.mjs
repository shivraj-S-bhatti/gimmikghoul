/** Thin exact-format adapter to the pinned Showdown set validator. */
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const {Dex}=require('../../.cache/showdown/dist/sim/dex.js');
const {TeamValidator}=require('../../.cache/showdown/dist/sim/team-validator.js');
const manifest=JSON.parse(readFileSync(new URL('../../.artifacts/source-manifest.json',import.meta.url)));
export const DEFAULT_FORMAT='gen9championsvgc2026regmc';
const copy=x=>structuredClone(x);
function check(ok,message){if(!ok)throw Error(message);}
function keys(value,allowed,label){check(value&&typeof value==='object'&&!Array.isArray(value),`${label} must be an object`);for(const key of Object.keys(value))check(allowed.includes(key),`Unsupported ${label} field: ${key}`);}
function formatFor(name=DEFAULT_FORMAT){
 check(typeof name==='string','format must be a canonical string');
 const format=Dex.formats.get(name);
 check(format.exists&&format.id===name&&format.mod==='champions','Use an existing canonical Champions format ID; vanilla formats are refused');
 return format;
}
const provenance=format=>({revision:manifest.revision,format:format.id,mod:format.mod,implementation:'pinned Pokemon Showdown community engine'});
export function validateSetRow(row){
 try{
  keys(row,['id','format','set'],'row');const format=formatFor(row.format);
  check(row.set&&typeof row.set==='object'&&!Array.isArray(row.set),'set is required');
  const normalized=copy(row.set),errors=new TeamValidator(format.id).validateSet(normalized,{})||[];
  return {id:row.id,status:errors.length?'invalid':'valid',engine:provenance(format),errors,normalizedSet:normalized,scope:'Individual set only; not team/item/species clauses across a team or official-game certification.'};
 }catch(e){return {id:row?.id,status:'invalid_input',errors:[e.message]};}
}
