const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),sharp=require('sharp'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'brain-assets.js'),'utf8'),context);
const objects=context.window.BrainChallengeAssets.api.getPool('attention');
(async()=>{
 const samples=[],edgeWarnings=[];
 for(const object of objects){
   const src=path.join(root,object.src),meta=await sharp(src).metadata(),col=object.index%5,row=Math.floor(object.index/5);
   assert.equal(meta.format,'png');assert.ok(Math.abs(meta.width/meta.height-1.25)<.002);
   const [left,top,width,height]=object.rect;
   const {data,info}=await sharp(src).extract({left,top,width,height}).removeAlpha().raw().toBuffer({resolveWithObject:true});
   let minX=width,minY=height,maxX=-1,maxY=-1,count=0;
   for(let y=0;y<height;y++)for(let x=0;x<width;x++){
     const i=(y*width+x)*info.channels,r=data[i],g=data[i+1],b=data[i+2];
     // Include neutral gray utensils and black/white sports equipment as visible art.
     if(Math.min(r,g,b)<205){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
   }
   assert.ok(count>100,object.label+' must have visible image content');
   if(Math.min(minX,minY,width-1-maxX,height-1-maxY)<3)edgeWarnings.push(object.label);
   const sample=await sharp(src).extract({left,top,width,height}).resize(32,32).removeAlpha().raw().toBuffer();
   samples.push({object,sample});
 }
 const pairs=[];
 for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){
   let sum=0;for(let k=0;k<samples[i].sample.length;k++)sum+=Math.abs(samples[i].sample[k]-samples[j].sample[k]);
   const difference=sum/samples[i].sample.length;assert.ok(difference>3,'Near-duplicate image: '+samples[i].object.label+' / '+samples[j].object.label);
   pairs.push({objects:samples[i].object.label+' / '+samples[j].object.label,difference:+difference.toFixed(2)});
 }
 console.log('PASS: all '+objects.length+' viewports nonempty, all '+pairs.length+' image pairs differ; checked source rectangles.');
 console.log('Closest image pairs (mean RGB difference, not a human recognizability score):',pairs.sort((a,b)=>a.difference-b.difference).slice(0,5));
 console.log('Near-edge tiles needing visual review:',edgeWarnings);
})().catch(error=>{console.error(error);process.exitCode=1});
