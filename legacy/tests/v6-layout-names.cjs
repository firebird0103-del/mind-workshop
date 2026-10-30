const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const context={};context.window=context;vm.createContext(context);
vm.runInContext(read('brain-names.js'),context);vm.runInContext(read('brain-layout.js'),context);
const all=Array.from({length:400},()=>context.BrainChallengeNames.next());
assert.equal(new Set(all).size,400);
assert.ok(all.every(name=>name.length<=10&&!/[<>]/.test(name)));
let previous=all.at(-1);
for(let i=0;i<2000;i++){const next=context.BrainChallengeNames.next(previous);assert.notEqual(next,previous);previous=next;}
const choose=context.BrainChallengeLayout.chooseGrid;
let cases=0;
for(const [width,height] of [[900,500],[780,330],[650,290],[480,350],[320,420],[260,210],[900,120]]){
 for(const count of [8,15,20,21,23,28]){
   const g=choose(width,height,count);
   assert.ok(g.cols*g.rows>=count&&g.size>=56);
   assert.ok(g.cols*g.size+(g.cols-1)*8<=width);
   if(g.fits)assert.ok(g.rows*g.size+(g.rows-1)*8<=height);
   cases++;
 }
}
for(const count of [3,4,6]){
 const g=choose(900,240,count,{min:96,max:170,gap:12,maxColumns:6});
 assert.ok(g.fits);assert.equal(g.rows,1);
}
assert.ok(choose(320,40,20).fits===false,'Very short display must retain accessible sizing and allow scrolling');
// Actual lobby handlers, with minimal DOM and storage mocks.
const nodes=new Map();
function element(){return {value:'',textContent:'',style:{},children:[],attributes:{},handlers:{},classList:{add(){}},set innerHTML(v){this.children=[]},setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]},appendChild(x){this.children.push(x)},addEventListener(k,fn){this.handlers[k]=fn}}}
['player-name','random-name-btn','name-status','name-suggestions','name-modal'].forEach(id=>nodes.set(id,element()));
const saved=new Map([['lastPlayerName','我的暱稱']]),session=new Map();
const lobby={document:{getElementById:id=>nodes.get(id),createElement:element,querySelectorAll:selector=>selector==='#name-suggestions button'?nodes.get('name-suggestions').children:[],addEventListener(){},body:element()},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},sessionStorage:{setItem:(k,v)=>session.set(k,v)},addEventListener(){},alert(){},setTimeout(fn){fn()},location:{},matchMedia(){return{matches:true}}};
lobby.window=lobby;vm.createContext(lobby);
vm.runInContext(read('brain-names.js'),lobby);
const inline=[...read('index.html').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
vm.runInContext(inline,lobby);
vm.runInContext("selectedAgeGroup='20-40';openNameModal('memory_game_hard.html')",lobby);
assert.equal(nodes.get('player-name').value,'我的暱稱','Opening suggestions must not overwrite saved name');
assert.equal(nodes.get('name-suggestions').children.length,3);
assert.equal(new Set(nodes.get('name-suggestions').children.map(b=>b.textContent)).size,3);
lobby.refreshNameSuggestions(true);
const randomName=nodes.get('player-name').value;
assert.ok(randomName&&randomName!=='我的暱稱');
assert.equal(nodes.get('random-name-btn').textContent,'換一個');
const choice=nodes.get('name-suggestions').children[2];choice.handlers.click();
assert.equal(nodes.get('player-name').value,choice.textContent);
assert.equal(choice.attributes['aria-pressed'],'true');
nodes.get('player-name').value='自訂名字';nodes.get('player-name').handlers.input();
assert.ok(nodes.get('name-suggestions').children.every(b=>b.attributes['aria-pressed']==='false'));
lobby.confirmStart();assert.equal(saved.get('lastPlayerName'),'自訂名字');assert.equal(session.get('currentPlayerName'),'自訂名字');
assert.equal(lobby.location.href,'memory_game_hard.html');
nodes.get('player-name').value='  ';lobby.confirmStart();assert.equal(session.get('currentPlayerName'),'訪客');
// Catch malformed parentheses/brackets in touched CSS. This is not a browser layout test.
for(const name of ['brain-viewport.css','attention-layout.css']){
 const text=read(name).replace(/\/\*[\s\S]*?\*\//g,'').replace(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g,'');
 const stack=[];const closes={')':'(',']':'[','}':'{'};
 for(const char of text){if('([{'.includes(char))stack.push(char);else if(')]}'.includes(char))assert.equal(stack.pop(),closes[char],name+' bracket mismatch')}
 assert.equal(stack.length,0);
}
// Run legacy viewport controller with measured rectangles and observable style writes.
for(const game of ['clock','executive']){
  let mutations=0,scheduled=[];const observers=[];
  function box(height=40){return {children:[],clientWidth:900,display:'block',style:{values:{},setProperty(k,v){this.values[k]=String(v);mutations++},getPropertyValue(k){return this.values[k]||''}},getBoundingClientRect(){return{top:100,height}}};}
  const stage=box(500),hint=box(40),result=box(80),buttons=box(48),play=box();
  result.display='none';play.children=[stage,hint,result,buttons];
  const choices=box();choices.children=Array(6).fill({});
  const lookup={'.clock-stage':stage,'.play-area':play,'#result-board':result,'.btn-group':buttons,'#choices':choices};
  const env={document:{body:{dataset:{gameId:game}},querySelector:s=>lookup[s]||null,getElementById:id=>lookup['#'+id],addEventListener(){}},innerHeight:768,addEventListener(){},requestAnimationFrame:fn=>scheduled.push(fn),getComputedStyle:el=>({display:el.display,gap:'10px'}),MutationObserver:class{constructor(fn){observers.push(fn)}observe(){}},ResizeObserver:class{constructor(fn){observers.push(fn)}observe(){}}};
  env.window=env;vm.createContext(env);vm.runInContext(read('brain-layout.js'),env);vm.runInContext(read('brain-viewport.js'),env);
  while(scheduled.length)scheduled.shift()();
  if(game==='clock'){
    assert.equal(stage.style.values['--clock-size'],'490px');
    result.display='block';observers.forEach(fn=>fn());while(scheduled.length)scheduled.shift()();
    assert.equal(stage.style.values['--clock-size'],'400px','Clock reserves space for visible result');
  }else{
    assert.ok(Number(choices.style.values['--choice-cols'])>=3);
    const before=mutations;observers.forEach(fn=>fn());while(scheduled.length)scheduled.shift()();
    assert.equal(mutations,before,'Stable executive dimensions do not keep writing style');
  }
}
console.log('PASS: 400 unique nickname combinations, 2000 rerolls, lobby choose/edit/persist/guest flows; '+cases+' sizing scenarios, clock/executive controller checks, CSS delimiter checks.');
console.log('Sizing checks use supplied dimensions, not actual browser rendering.');
