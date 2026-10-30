// Rest, clear the whole leap, traverse the room, sniff, return and leap home.
export function createCatPatrol(home,floorRoute,speed=.14,jumpHeight=1.0){
 const route=floorRoute.map(p=>[...p]);if(route.length<2)throw new Error('Cat patrol requires a connected floor route');
 let state='rest',elapsed=0,index=1,direction=1,position=[...home],yaw=-.25,moving=false;
 const ease=t=>t*t*(3-2*t),duration={rest:12,descend:1.6,sniff:6,ascend:1.8};
 const getState=()=>({position:[...position],yaw,moving,state});
 function jumpPose(kind,t){const u=ease(t),from=kind==='descend'?home:route[0],to=kind==='descend'?route[0]:home;const p=from.map((v,i)=>v+(to[i]-v)*u);p[1]+=Math.sin(t*Math.PI)*jumpHeight;return p;}
 function canJump(kind,canMove){const from=kind==='descend'?home:route[0],to=kind==='descend'?route[0]:home,heading=Math.atan2(to[0]-from[0],to[2]-from[2]);for(let i=0;i<=20;i++)if(!canMove(jumpPose(kind,i/20),heading))return false;return true;}
 function avoidance(){const points=[{p:[position[0],position[2]],y:position[1],clearance:.70}];if(state==='descend'||state==='ascend')for(let i=0;i<=20;i++){if(i/20<elapsed/duration[state])continue;const p=jumpPose(state,i/20);points.push({p:[p[0],p[2]],y:p[1],clearance:.70});}return points;}
 function update(dt,canMove=()=>true){
  dt=Math.max(0,Math.min(.25,dt));moving=false;
  if(state==='rest'||state==='sniff'){
   elapsed+=dt;if(elapsed>=duration[state]){if(state==='rest'&&!canJump('descend',canMove))return getState();elapsed=0;if(state==='rest')state='descend';else{state='walk-back';direction=-1;index=route.length-2;}}
  }else if(state==='descend'||state==='ascend'){
   const t=Math.min(1,(elapsed+dt)/duration[state]),from=state==='descend'?home:route[0],to=state==='descend'?route[0]:home,next=jumpPose(state,t),heading=Math.atan2(to[0]-from[0],to[2]-from[2]);
   if(canMove(next,heading)){position=next;elapsed+=dt;moving=true;yaw=heading;if(t===1){elapsed=0;state=state==='descend'?'walk-out':'rest';index=1;direction=1;}}
  }else{
   const target=route[index],dx=target[0]-position[0],dz=target[2]-position[2],d=Math.hypot(dx,dz),k=d<1e-8?1:Math.min(1,speed*dt/d),next=[position[0]+dx*k,target[1],position[2]+dz*k],heading=Math.atan2(dx,dz);
   if(canMove(next,heading)){position=next;moving=d>1e-6;if(moving)yaw=heading;if(k===1){if(state==='walk-out'&&index===route.length-1){state='sniff';elapsed=0;}else if(state==='walk-back'&&index===0){if(canJump('ascend',canMove)){state='ascend';elapsed=0;}else moving=false;}else index+=direction;}}
  }
  return getState();
 }
 return {update,getState,avoidance,route};
}
