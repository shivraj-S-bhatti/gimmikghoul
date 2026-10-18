import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('an immutable client cache receives new renderer and webpack URLs after patching',async()=>{
  const root=await mkdtemp(join(tmpdir(),'pokemon-browser-patch-'));
  try{
    const chunks=join(root,'.next/static/chunks');await mkdir(chunks,{recursive:true});
    const oldCanvas='3747.aaaaaaaaaaaaaaaa.js',oldRuntime='webpack-bbbbbbbbbbbbbbbb.js';
    const original='customElements.define("falkordb-canvas",X); /* drawNode( pointerNode( setConfig( isNodeInCullingBounds( */';
    const runtime='const chunkHashes={3747:"aaaaaaaaaaaaaaaa"};';
    await writeFile(join(chunks,oldCanvas),original);
    await writeFile(join(chunks,oldRuntime),runtime);
    await writeFile(join(root,'.next/build-manifest.json'),JSON.stringify({rootMainFiles:['static/chunks/'+oldRuntime]}));
    await writeFile(join(root,'.next/react-loadable-manifest.json'),JSON.stringify({canvas:['static/chunks/'+oldCanvas]}));
    const immutableCache=new Map([[oldCanvas,original],[oldRuntime,runtime]]);
    execFileSync(process.execPath,[new URL('./patch-browser.mjs',import.meta.url).pathname,root,new URL('./pokemon-sprites.js',import.meta.url).pathname]);
    const manifest=JSON.parse(await readFile(join(root,'.next/build-manifest.json'),'utf8'));
    const runtimeName=manifest.rootMainFiles[0].split('/').at(-1);
    const loadedRuntime=immutableCache.get(runtimeName)||await readFile(join(chunks,runtimeName),'utf8');
    const canvasHash=loadedRuntime.match(/3747:"([a-f0-9]+)"/)[1];
    const canvasName='3747.'+canvasHash+'.js';
    const loadedCanvas=immutableCache.get(canvasName)||await readFile(join(chunks,canvasName),'utf8');
    assert.ok(loadedCanvas.includes('__pokemonSpriteRenderer'),'cached original chunk must not hide the renderer extension');
    assert.notEqual(runtimeName,oldRuntime);
    assert.notEqual(canvasName,oldCanvas);
    const loadable=JSON.parse(await readFile(join(root,'.next/react-loadable-manifest.json'),'utf8'));
    assert.equal(loadable.canvas[0],'static/chunks/'+canvasName);
  }finally{await rm(root,{recursive:true,force:true});}
});
