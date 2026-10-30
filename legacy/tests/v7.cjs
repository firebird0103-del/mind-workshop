const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const ctx={};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('brain-assets.js'),ctx);vm.runInContext(read('brain-interference.js'),ctx);
const html=read('shape_color_game.html'),functions=html.slice(html.indexOf('function shuffle('),html.indexOf('function drawChoice('));
vm.runInContext('const COLOR_OPTIONS=BrainChallengeAssets.executive.colors,SHAPE_OPTIONS=BrainChallengeAssets.executive.shapes;let optionsPerRound=4;'+functions,ctx);
let trials=0;
for(const count of [3,4,5,6]){
 vm.runInContext('optionsPerRound='+count,ctx);
 for(const rule of ['color','shape'])for(let i=0;i<1000;i++){
  const choices=ctx.buildChoices(rule),answer=choices.find(x=>x.correct);
  assert.equal(choices.filter(x=>x.correct).length,1);
  assert.equal(choices.filter(x=>x[rule].id===answer[rule].id).length,1);
  const ink=ctx.BrainInterference.choose(choices);
  assert.ok(ink);assert.notEqual(ink.id,answer.color.id);
  assert.ok(choices.some(x=>!x.correct&&x.color.id===ink.id));
  trials++;
 }
}
// WCAG-like luminance check of keyword inks on the explicitly white prompt.
for(const c of ctx.BrainChallengeAssets.executive.colors){
 const rgb=ctx.BrainInterference.ink(c).slice(1).match(/../g).map(h=>parseInt(h,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const lum=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
 assert.ok(1.05/(lum+.05)>=4.5,c.id);
}
const values=new Map([['brain-audio-enabled','false']]);
const button={dataset:{},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this[k]=fn}};
const audio={localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},document:{addEventListener(){},querySelectorAll(){return[button]},querySelector(){return null}}};
audio.window=audio;vm.createContext(audio);vm.runInContext(read('brain-audio.js'),audio);
const a=audio.BrainChallengeAudio;assert.equal(a.isEnabled(),false);a.installControls();assert.equal(button['aria-pressed'],'false');
button.click();assert.equal(a.isEnabled(),true);assert.equal(values.get('brain-audio-enabled'),'true');
a.setEnabled(false);assert.equal(a.play('correct'),false);assert.equal(values.get('brain-audio-enabled'),'false');
vm.runInContext(read('brain-lobby.js'),ctx);
assert.equal((ctx.BrainLobby.preview('attention').match(/class="circled"/g)||[]).length,1);
assert.equal((ctx.BrainLobby.preview('attention').match(/object-art/g)||[]).length,4);
assert.equal((ctx.BrainLobby.preview('memory').match(/object-art/g)||[]).length,3);
assert.equal((ctx.BrainLobby.preview('executive').match(/<i>/g)||[]).length,4);
assert.ok(ctx.BrainLobby.preview('clock').includes('M50 50L34 35'));
for(const name of ['index.html','clock_game.html','find_diff_game.html','memory_game_hard.html','shape_color_game.html']){
 const source=read(name);
 for(const m of source.matchAll(/(?:src|href)="([^"#?]+\.(?:js|css))"/g))assert.ok(fs.existsSync(path.join(root,m[1])),name+':'+m[1]);
 for(const m of source.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:name});
}
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js')))new vm.Script(read(name),{filename:name});
assert.ok(html.includes('labelForRule(currentRule,currentTarget,choices)'));
assert.ok(!html.includes('playEvent'));
console.log('PASS: '+trials+' shape/color trials, unique answer & wrong-option ink; 6 contrast checks; persisted audio toggle, disabled playback, lobby previews, JS syntax and local references.');
console.log('LIMIT: logic/static tests only; actual browser layout and speaker output still require manual testing.');
