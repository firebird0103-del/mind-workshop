const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
function config(mode,rounds){
 const c={dispatchEvent(){},CustomEvent:function(){},localStorage:{getItem(k){return k.endsWith('mode_v1')?mode:rounds?JSON.stringify({executive:{rounds}}):null},setItem(){}}};
 c.window=c;vm.createContext(c);vm.runInContext(read('brain-config.js'),c);return c;
}
const c=config(null,null);assert.equal(c.BrainChallengeConfigAPI.getForModule('executive').rounds,10);
assert.equal(c.BrainChallengeConfigAPI.getPresets().exhibition.executive.rounds,10);
assert.equal(config('exhibition',5).BrainChallengeConfigAPI.get('executive').rounds,10);
assert.equal(config('custom',5).BrainChallengeConfigAPI.get('executive').rounds,5);
assert.equal(config('challenge',6).BrainChallengeConfigAPI.get('executive').rounds,6);
for(const id of ['clock','attention','memory'])assert.equal(c.BrainChallengeConfigAPI.get(id).rounds,id==='clock'?5:3);
// Execute actual shape game start/answer/finish path using a lightweight DOM double.
const nodes=new Map(),records=[];
const node=()=>({style:{},classList:{add(){}},setAttribute(){},addEventListener(){},appendChild(){},textContent:'',innerHTML:''});
c.document={getElementById(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},createElement:node,querySelectorAll(){return[]}};
c.performance={now:()=>1000};c.BrainChallenge={gameShell:{hideFeedback(){},feedback(){}},player:{getName:()=> 'test',getAge:()=> '36-55'},scores:{save:r=>records.push(r)},audio:{play(){}}};
vm.runInContext(read('brain-assets.js'),c);vm.runInContext(read('brain-interference.js'),c);
const html=read('shape_color_game.html');let script=[...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)][0][1];
script=script.replace('window.startGame=startGame;', 'window.testAnswer=answer;window.startGame=startGame;');
vm.runInContext(script,c);c.startGame();
for(let i=1;i<=10;i++){
 assert.ok(nodes.get('status').innerHTML.includes(`${i} / 10`));
 assert.equal(records.length,0);
 c.testAnswer({correct:i<=7},node());
}
assert.equal(records.length,1);assert.equal(records[0].score,70);assert.equal(nodes.get('progress').style.width,'100%');
c.testAnswer({correct:true},node());assert.equal(records.length,1);
c.startGame();assert.ok(nodes.get('status').innerHTML.includes('1 / 10'));
const css=read('brain-stationery.css'),index=read('index.html');
assert.equal((css.match(/{/g)||[]).length,(css.match(/}/g)||[]).length);
assert.ok(css.includes('max-width:1360px'));assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(css.includes('width:min(1360px,71vw)'));
assert.ok(css.includes('border-radius:24px 22px 25px 20px!important'));
assert.ok(/\.preview-memory \.object-art\{[^}]*mix-blend-mode:multiply/.test(css));
// CSS sizing contract, not a browser measurement. Simulate common logical viewports.
for(const width of [1200,1280,1366,1440,1600,1920]) {
 const content=Math.min(1360,width*.71);
 assert.ok(content/width<=.711);
 assert.ok((width-content)/2>=width*.144);
 assert.ok((content-32)/2>=400);
}
assert.ok(index.includes('assets/yunyun-sticker.png'));assert.ok(index.includes('role="dialog"'));
assert.ok(fs.existsSync(path.join(root,'assets/yunyun-sticker.png')));
for(const f of ['clock_game.html','find_diff_game.html','memory_game_hard.html','shape_color_game.html'])assert.ok(!read(f).includes('brain-stationery.css'));
console.log('PASS: v8 default/migration/custom config; actual 10-answer finish, 70/100 average, single record, restart; lobby scope/static checks. Browser rendering not tested.');
