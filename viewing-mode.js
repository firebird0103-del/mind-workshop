// Two overlapping, stationary touch contacts are an exit gesture. Pinch, pan,
// long presses, cancellation, extra fingers and sequential taps are excluded.
export function createTwoFingerExitGesture({maxDuration=400,maxDistance=8}={}){
 const points=new Map();let start=0,seen=0,paired=false,invalid=false;
 function reset(){points.clear();start=seen=0;paired=invalid=false;}
 function move(id,x,y){const p=points.get(id);if(p&&Math.hypot(x-p[0],y-p[1])>maxDistance)invalid=true;}
 return {reset,down(id,x,y,time){if(!points.size){reset();start=time;}seen++;if(seen>2)invalid=true;points.set(id,[x,y]);if(points.size===2)paired=true;},move,
  up(id,x,y,time){if(!points.has(id))return false;move(id,x,y);points.delete(id);if(points.size)return false;const exit=paired&&!invalid&&time-start<=maxDuration;reset();return exit;},cancel:reset};
}
export function createViewingMode({root,canvas,uiElements,returnFocus,onChange=()=>{}}){
 let active=false,snapshot=[];const gesture=createTwoFingerExitGesture(),doc=canvas.ownerDocument;
 const ui=[...uiElements];ui.forEach(el=>el.setAttribute('data-workshop-ui',''));
 function set(value){
  value=!!value;if(value===active)return;active=value;gesture.reset();
  if(active){snapshot=ui.map(el=>({el,inert:el.inert}));ui.forEach(el=>el.inert=true);}
  else{snapshot.forEach(({el,inert})=>el.inert=inert);snapshot=[];}
  root.classList.toggle('viewing-mode',active);onChange(active);
  (active?canvas:returnFocus)?.focus({preventScroll:true});
 }
 function key(e){if(active&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();set(false);}}
 function down(e){if(active&&e.pointerType==='touch')gesture.down(e.pointerId,e.clientX,e.clientY,e.timeStamp);}
 function move(e){if(active&&e.pointerType==='touch')gesture.move(e.pointerId,e.clientX,e.clientY);}
 function up(e){if(active&&e.pointerType==='touch'&&gesture.up(e.pointerId,e.clientX,e.clientY,e.timeStamp))set(false);}
 function cancel(){gesture.cancel();}
 doc.addEventListener('keydown',key,true);canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointercancel',cancel,true);
 return {get active(){return active;},enter:()=>set(true),exit:()=>set(false),dispose(){set(false);doc.removeEventListener('keydown',key,true);canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);}};
}
