const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
let checks=0;
function check(condition,message){assert.ok(condition,message);checks++}
function environment(game,patch={}){
  let time=1000,serial=0;const timers=new Map(),nodes=new Map(),records=[];
  class Element{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;this.style={setProperty(k,v){this[k]=v}};this.listeners={};this.className='';this.clientWidth=1856;this._text='';this._html='';this.offsetWidth=100;
      this.classList={contains:(c)=>this.className.split(/\s+/).includes(c),add:(...c)=>this.className=[...new Set([...this.className.split(/\s+/).filter(Boolean),...c])].join(' '),remove:(...c)=>this.className=this.className.split(/\s+/).filter(x=>!c.includes(x)).join(' '),toggle:(c,force)=>{const yes=force??!this.classList.contains(c);yes?this.classList.add(c):this.classList.remove(c);return yes;}};
    }
    set id(v){this._id=v;nodes.set(v,this)}get id(){return this._id}
    set innerHTML(v){this._html=String(v);this._text='';this.children=[]}get innerHTML(){return this._html}
    set textContent(v){this._text=String(v);this._html=String(v);this.children=[]}get textContent(){return this._text}
    set innerText(v){this.textContent=v}get innerText(){return this.textContent}
    setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]??null}
    appendChild(child){this.children.push(child);return child}
    addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
    querySelectorAll(selector){return this.children.flatMap(c=>[...(selector==='button'?c.tagName==='BUTTON':selector.startsWith('.')?c.classList.contains(selector.slice(1)):false)?[c]:[],...c.querySelectorAll(selector)])}
    querySelector(s){return this.querySelectorAll(s)[0]||null}
    get firstElementChild(){return this.children[0]}
    getBoundingClientRect(){return {top:210,width:this.clientWidth}}
    focus(){}animate(){}
  }
  const html=read(game==='attention'?'find_diff_game.html':'memory_game_hard.html');
  for(const match of html.matchAll(/id="([^"]+)"/g)){const e=new Element();e.id=match[1]}
  const document={getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),body:new Element('body'),addEventListener(){},fonts:{ready:Promise.resolve()}};
  const sandbox={console,document,Math:Object.create(Math),Date:class extends Date{static now(){return time}},setTimeout(fn,ms=0){const id=++serial;timers.set(id,{fn,at:time+ms});return id},clearTimeout(id){timers.delete(id)},innerHeight:1080,addEventListener(){},dispatchEvent(){},CustomEvent:class{},localStorage:{getItem(){return null},setItem(){}},matchMedia(){return {matches:true}},location:{reload(){}},confirm(){return false},Image:class{set src(src){sandbox.setTimeout(()=>{if(sandbox.failImages)this.onerror();else this.onload()},1)}},BrainChallenge:{gameShell:{setProgress(el,current,total){el.setAttribute('aria-valuenow',current);el.setAttribute('aria-valuemax',total)},hideFeedback(){},animateScore(){},feedback(){}},scores:{save(record){records.push(record)}},player:{getName(){return '測試'},getAge(){return 30}},navigation:{goHome(){}}}};
  sandbox.window=sandbox;const context=vm.createContext(sandbox);
  vm.runInContext(read('brain-config.js'),context);
  const config=vm.runInContext('BrainChallengeConfigAPI.getForModule('+JSON.stringify(game)+')',context);
  Object.assign(config,patch);
  context.BrainChallengeConfigAPI={getForModule(){return config}};
  vm.runInContext(read('brain-assets.js'),context);
  vm.runInContext(read('brain-layout.js'),context);
  const run=source=>vm.runInContext(source,context);
  function tick(){if(!timers.size)return false;const [id,job]=[...timers].sort((a,b)=>a[1].at-b[1].at)[0];timers.delete(id);time=job.at;job.fn();return true}
  function load(){vm.runInContext(read(game==='attention'?'attention-game.js':'memory-game.js'),context)}
  async function ready(){for(let i=0;i<20;i++){await Promise.resolve();if(run('assetsReady'))break;tick()}await Promise.resolve()}
  return {run,load,ready,tick,nodes,records,context,config};
}
(async()=>{
  const base=environment('attention');
  const api=base.context.BrainChallengeAssets.api;
  const pool=api.getPool('attention');
  check(pool.length===100,'100 assets');
  check(new Set(pool.map(x=>x.label)).size===100,'100 unique object labels');
  check(new Set(pool.map(x=>x.markup)).size===100,'100 separate sprite coordinates');
  check(pool.every(x=>fs.existsSync(path.join(root,x.src))),'Every image path exists');
  const deck=api.createDeck('attention');
  const first=deck.draw(19),second=deck.draw(28),third=deck.draw(39);
  check(new Set([...first,...second].map(x=>x.id)).size===47,'No repeat in first two default rounds');
  check(new Set([...first,...second,...third].map(x=>x.id)).size===86,'No repeats throughout three default rounds');
  check(new Set(third.map(x=>x.id)).size===39,'No repeat inside third draw');
  assert.throws(()=>deck.draw(101));checks++;
  // Every supported board size and difference count, repeated with random permutations.
  for(let n=3;n<=8;n++)for(let differences=1;differences<=8;differences++)for(let trial=0;trial<3;trial++){
    const env=environment('attention',{rounds:3,gridSizes:[n,n,n],differencesPerRound:differences});
    env.load();await env.ready();check(env.run('assetsReady'),'Preloaded before start');env.run('initGame()');
    for(let round=0;round<3;round++){
      const a=env.nodes.get('grid-a').children,b=env.nodes.get('grid-b').children;
      check(a.length===n*n&&b.length===n*n,'Correct board sizes');
      check(new Set(a.map(c=>c.dataset.objectId)).size===n*n,'Unique baseline');
      check(new Set(b.map(c=>c.dataset.objectId)).size===n*n,'Unique target');
      const changed=a.flatMap((c,i)=>c.dataset.objectId!==b[i].dataset.objectId?[i]:[]);
      check(changed.length===differences,'Exactly requested visible differences');
      const wrong=a.findIndex((c,i)=>c.dataset.objectId===b[i].dataset.objectId);
      env.run('checkClick('+wrong+',gridB.children['+wrong+'])');
      check(env.run('roundScore')===95,'Wrong answer penalty');
      for(const i of changed){env.run('checkClick('+i+',gridB.children['+i+'])');env.run('checkClick('+i+',gridB.children['+i+'])')}
      check(env.run('foundCount')===differences,'No duplicate found counting');
      check(env.run('phase')==='review','Round can complete');
      const total=env.run('totalScore');env.run('roundComplete()');check(env.run('totalScore')===total,'No duplicate round scoring');
      env.run('nextRound()');env.run('nextRound()');
    }
    check(env.records.length===1&&env.records[0].score===95,'One final record with expected average');
  }
  // Memory timers, complete sequence lengths, keyboard-equivalent repeated calls, reveal.
  for(const length of [3,5,6,8]){
    const env=environment('memory',{sequenceLength:length});env.load();await env.ready();env.run('initGame()');
    for(let round=0;round<3;round++){
      let ticks=0;while(env.run('phase')==='showing'&&ticks++<100)env.tick();
      check(env.run('phase')==='answering','Sequence timers reach answer phase');
      check(env.nodes.get('options-area').children.length===length+15,'Correct option count');
      check(new Set(env.nodes.get('options-area').children.map(x=>x.dataset.objectId)).size===length+15,'Unique memory options');
      env.run('submitAnswer()');check(env.run('phase')==='answering','Incomplete answer cannot submit');
      env.run('targetItems.forEach(item=>{const b=optionsArea.children.find(b=>b.dataset.objectId===item.id);selectAnswer(item,b);selectAnswer(item,b)})');
      check(env.run('userAnswers.filter(Boolean).length')===length,'Duplicate selection blocked');
      env.run('removeAnswer(0)');check(env.run('userAnswers.filter(Boolean).length')===length-1,'Remove compacts selection');
      // Return to exact order using real selection handlers.
      env.run('while(userAnswers.some(Boolean))removeAnswer(0);targetItems.forEach(item=>selectAnswer(item,optionsArea.children.find(b=>b.dataset.objectId===item.id)))');
      env.run('submitAnswer()');check(env.run('phase')==='review','Submission locks phase');
      check(env.nodes.get('options-area').style.display==='none','Options hidden when revealing answers');
      check(env.nodes.get('sequence-label').textContent==='你的排列','Review labels the original player sequence');
      check(env.context.document.body.dataset.phase==='review','Review layout state set');
      const score=env.run('totalScore'),answers=env.run('userAnswers.map(x=>x.item.id).join()');
      env.run('submitAnswer();removeAnswer(0)');
      check(env.run('totalScore')===score&&env.run('userAnswers.map(x=>x.item.id).join()')===answers,'No double-score or editing after submit');
      const reveal=env.nodes.get('result-board').innerHTML;
      check(!reveal.includes('[object Object]')&&reveal.includes('answer-reveal'),'Human-readable image answer reveal');
      check((reveal.match(/<li>/g)||[]).length===length,'All answers revealed');
      env.run('nextRound()');env.run('nextRound()');
    }
    check(env.records.length===1&&env.records[0].score===100,'Memory records exact score once');
  }
  // Partial/misordered scores and maximum-length cap.
  for(const mode of ['reversed','partial','none']){
    const env=environment('memory',{sequenceLength:8});env.load();await env.ready();env.run('initGame()');
    while(env.run('phase')==='showing')env.tick();
    env.run("const wrongItems=itemPool.filter(x=>!targetItems.includes(x));const chosen="+(mode==='reversed'?'[...targetItems].reverse()':mode==='partial'?'[...targetItems.slice(0,7),wrongItems[0]]':'wrongItems.slice(0,8)')+";chosen.forEach(item=>{let btn=optionsArea.children.find(b=>b.dataset.objectId===item.id);if(!btn){btn=document.createElement('button')}selectAnswer(item,btn)});submitAnswer()");
    check(env.run('totalScore')===(mode==='none'?0:80),'Partial score bounded');
  }
  // Image loading failures are not swallowed, and retry can recover.
  for(const game of ['attention','memory']){
    const env=environment(game);env.context.failImages=true;env.load();await env.ready();
    check(!env.run('assetsReady'),'Missing images block starting');
    check(env.run('phase')==='ready','Failed preload never starts a scored round');
    env.context.failImages=false;env.run('prepareAssets()');await env.ready();check(env.run('assetsReady'),'Preload retry recovers');
  }
  // Parse all scripts, including legacy pages, and verify local HTML links.
  for(const filename of fs.readdirSync(root)){
    if(filename.endsWith('.js'))new vm.Script(read(filename),{filename});
    if(!filename.endsWith('.html'))continue;
    const text=read(filename);
    for(const match of text.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename});
    for(const match of text.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css|html|png))"/g)){
      if(!/^https?:/.test(match[1]))check(fs.existsSync(path.join(root,match[1])),filename+' resource '+match[1]);
    }
  }
  console.log('PASS: '+checks+' assertions. 144 attention sessions / 432 rounds; memory lengths 3,5,6,8; partial/incorrect answers; preload failure/retry; asset and script checks.');
  console.log('LIMIT: DOM test double, not a browser. No claim of full-screen, pointer, visual CSS, or real screen-reader testing.');
})().catch(error=>{console.error(error);process.exitCode=1});
