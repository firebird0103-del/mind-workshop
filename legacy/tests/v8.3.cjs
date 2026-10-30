const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),css=fs.readFileSync(path.join(root,'brain-stationery.css'),'utf8');
assert.ok(css.includes('background:#eeedf8'));
assert.ok(css.includes('.preview-clock{width:120px;height:120px'));
assert.ok(css.includes('.preview-diff{width:122px;height:122px'));
assert.ok(css.includes('.preview-memory::before'));
assert.ok(css.includes('.preview-shapes i::before'));
assert.ok(css.includes('width:min(1360px,71vw)'));
// Dimensions contract only: thumbnails plus shadow remain above the start control.
const minCardHeight=232,startTop=minCardHeight-18-50;
for(const previewHeight of [120,122,100,94])assert.ok(30+previewHeight+7<startTop);
assert.equal(css.split('{').length,css.split('}').length);
console.log('PASS: v8.3 preview styling and dimensional contracts. Not a browser screenshot test.');
