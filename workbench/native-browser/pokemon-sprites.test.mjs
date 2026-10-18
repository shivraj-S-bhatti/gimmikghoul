import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('native renderer extension loads only exact local assets and preserves native fallbacks and hit targets', async()=>{
  const code=await readFile(new URL('./pokemon-sprites.js',import.meta.url),'utf8');
  const requests=[],draws=[],native=[],hits=[];
  const canvas={isConnected:true,config:{foregroundColor:'#111',backgroundColor:'#fff'},
    setConfig(value){this.config={...this.config,...value};},refresh(){},
    drawNode(node){native.push({id:node.id,caption:[...node.displayName]});},
    pointerNode(...args){hits.push(args);},
  };
  class Image {naturalWidth=96;naturalHeight=48;set src(value){requests.push(value);queueMicrotask(()=>this.onload());}}
  const context={window:{},location:{origin:'http://localhost:4319'},URL,Image,console,
    customElements:{whenDefined:()=>Promise.resolve()},
    document:{documentElement:{},querySelectorAll:()=>[canvas]},MutationObserver:class{observe(){}},
  };
  vm.runInNewContext(code,context);
  await Promise.resolve();
  const ctx={save(){},restore(){},drawImage(...args){draws.push(args);},strokeText(){},fillText(){}};
  const node={id:1,size:10,x:2,y:3,displayName:['Venusaur',''],data:{name:'Venusaur',spriteStatus:'exact',imageUrl:'http://localhost:4319/sprites/venusaur.png'}};
  canvas.config.node.nodeCanvasObject(node,ctx);
  assert.equal(draws.length,0,'unloaded asset falls back to native node');
  await Promise.resolve();
  canvas.config.node.nodeCanvasObject(node,ctx);
  assert.deepEqual(requests,['/sprites/venusaur.png']);
  assert.equal(draws.length,1);
  assert.equal(draws[0][3],18);
  assert.equal(draws[0][4],9,'preserves source image aspect ratio');
  assert.deepEqual(node.displayName,['Venusaur',''],'native display state restored');
  for(const data of [{spriteStatus:'missing'},{spriteStatus:'exact',imageUrl:'https://example.com/sprites/venusaur.png'},{spriteStatus:'exact',imageUrl:'http://localhost:4319/api/secret'}])canvas.config.node.nodeCanvasObject({...node,data},ctx);
  assert.equal(draws.length,1);
  assert.equal(requests.length,1,'never fetches remote or unrelated local URL');
  canvas.config.node.nodePointerAreaPaint(node,'red',ctx);
  assert.equal(hits[0][0],node);
  assert.equal(native.length,5);
});
