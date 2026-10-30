const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const context={};context.window=context;vm.createContext(context);
vm.runInContext(read('brain-lobby.js'),context);
const ids=new Set();
for(const game of ['clock','attention','memory','executive']){
 const svg=context.BrainLobby.paper(game);
 assert.ok(svg.includes('aria-hidden="true"'));
 assert.ok(svg.includes('preserveAspectRatio="none"'));
 for(const name of ['paper-shadow','paper-fill','paper-outline','paper-fold-face'])assert.ok(svg.includes(`class="${name}"`));
 for(const [,id] of svg.matchAll(/id="([^"]+)"/g)){assert.ok(!ids.has(id));ids.add(id)}
 for(const [,id] of svg.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.has(id));
}
const index=read('index.html'),css=read('brain-stationery.css');
assert.ok(index.includes('feMorphology in="cutAlpha"'));
assert.ok(index.includes('filter="url(#yunyun-cut-edge)"'));
assert.ok(index.includes('BrainLobby?.paper(game.id)'));
assert.ok(!index.includes('class="paper-fold"'));
assert.ok(css.includes('vector-effect:non-scaling-stroke'));
assert.ok(css.includes('width:min(1360px,71vw)'));
assert.ok(css.includes('background:transparent!important;box-shadow:none!important'));
assert.ok(css.includes('.lobby-mascot {width:110px;height:78px'));
console.log('PASS: four vector paper layers, unique gradient IDs, display-scale sticker filter and scoped lobby styling. No browser visual approval implied.');
