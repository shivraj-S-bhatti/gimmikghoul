import {readFile, readdir, writeFile, rename} from 'node:fs/promises';
import {resolve, basename, dirname} from 'node:path';
import {createHash} from 'node:crypto';

const root=process.argv[2]||'/app';
const bridge=process.argv[3]||'/tmp/pokemon-sprites.js';
async function files(directory,extensions=['.js']){
  const entries=await readdir(directory,{withFileTypes:true});
  const nested=await Promise.all(entries.map(entry=>entry.isDirectory()?files(resolve(directory,entry.name),extensions):extensions.some(extension=>entry.name.endsWith(extension))?[resolve(directory,entry.name)]:[]));
  return nested.flat();
}
const matches=[];
for(const file of await files(resolve(root,'.next/static/chunks'))){
  const content=await readFile(file,'utf8');
  if(/customElements\.define\(["']falkordb-canvas["']/.test(content))matches.push({file,content});
}
if(matches.length!==1)throw Error(`Expected exactly one pinned FalkorDB canvas chunk, found ${matches.length}`);
const {file,content}=matches[0];
if(content.includes('__pokemonSpriteRenderer'))throw Error('Sprite renderer is already installed');
for(const method of ['drawNode(', 'pointerNode(', 'setConfig(', 'isNodeInCullingBounds('])if(!content.includes(method))throw Error(`Canvas API guard failed: ${method}`);
const hash=source=>createHash('sha256').update(source).digest('hex').slice(0,16);
const originalHash=basename(file).match(/^\d+\.([a-f0-9]{16})\.js$/)?.[1];
if(!originalHash)throw Error('Unexpected pinned canvas chunk filename');
const patched=content+'\n;'+await readFile(bridge,'utf8')+'\n';
const patchedHash=hash(patched);
const patchedFile=resolve(dirname(file),basename(file).replace(originalHash,patchedHash));
await writeFile(file,patched);
await rename(file,patchedFile);

// Next serves static chunks with immutable cache headers. Changing bytes at
// the same URL leaves an already-open browser on the old renderer. Rename the
// canvas chunk and its webpack loader, then update the server manifests/HTML
// that choose the loader. This preserves cacheability while invalidating the
// complete dependency chain for this pinned build.
async function replaceReferences(previous,next){
  const changed=[];
  for(const reference of await files(resolve(root,'.next'),['.js','.json','.html'])){
    const source=await readFile(reference,'utf8');
    if(!source.includes(previous))continue;
    await writeFile(reference,source.replaceAll(previous,next));
    changed.push(reference);
  }
  return changed;
}
const changed=await replaceReferences(originalHash,patchedHash);
const staticChanges=changed.filter(path=>path.includes('/static/chunks/'));
if(staticChanges.length!==1||!/^webpack-[a-f0-9]{16}\.js$/.test(basename(staticChanges[0])))throw Error(`Unexpected canvas loader references: ${staticChanges.join(', ')}`);
const runtime=staticChanges[0];
const runtimeOldHash=basename(runtime).match(/^webpack-([a-f0-9]{16})\.js$/)[1];
const runtimeNewHash=hash(await readFile(runtime,'utf8'));
const runtimeFile=resolve(dirname(runtime),`webpack-${runtimeNewHash}.js`);
await rename(runtime,runtimeFile);
const runtimeReferences=await replaceReferences(runtimeOldHash,runtimeNewHash);
if(runtimeReferences.some(path=>path.includes('/static/chunks/')))throw Error('Unexpected circular static reference to webpack runtime');
console.log(`Installed local Pokemon renderer: ${basename(patchedFile)}; loader: ${basename(runtimeFile)}; updated ${changed.length+runtimeReferences.length} references`);
