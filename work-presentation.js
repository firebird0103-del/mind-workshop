import * as THREE from './vendor/three.module.js';
const CAR_SCALE=1.35;
const ORRERY_SCALE=1.5;
const PARTS=['core','wings','melody','plumage'];
const WORKS={'starlight-orrery':'orrery','clockwork-car':'car'};
export const WORK_ASSETS=Object.fromEntries(Object.values(WORKS).flatMap(kind=>[
 [kind+'Work',`assets/works/${kind}.glb`],...PARTS.map(id=>[kind+'Tray'+id,`assets/works/${kind}_tray_${id}.glb`])
]));
// A scene cover conceals transfer to the separate desk demonstration area.
// The complete route clears the miniature (frontmost z=5.42), tools and desk edge (z=10.09).
export function carRoute(u){
 const a=-Math.PI/2+Math.PI*2*Math.max(0,Math.min(1,u));
 const x=3.4*Math.cos(a),z=7.5+1.1*Math.sin(a),dx=-3.4*Math.sin(a),dz=1.1*Math.cos(a);
 return {position:[x,.018,z],yaw:Math.atan2(dx,dz),steering:-Math.atan(.68*3.4*1.1/Math.pow(dx*dx+dz*dz,1.5))};
}
const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);};
function transferCover(t,mid){
 if(t<mid-.45||t>=mid+.45)return 0;
 return t<mid?smooth((t-(mid-.45))/.35):1-smooth((t-(mid+.1))/.35);
}
export function createWorkPresentation(centerGroup,trays,onEvent=()=>{},onTransition=()=>{}){
 const works=new Map();let active='mechanical-bird',ready=false,time=0,spin=null,runTarget=0,runSpeed=0,mechanism=0,slow=false,
  exploded=false,explode=0,hoodOpen=false,hood=0,carShow=null,returnRequested=false,autorun=0;
 const home=new THREE.Vector3(0,.59,0);let transitionMask=0;
 function setTransition(value){transitionMask=value;onTransition(value);}
 function reset(){
  spin=null;runTarget=runSpeed=0;exploded=false;explode=0;hoodOpen=false;hood=0;carShow=null;returnRequested=false;autorun=0;
  setTransition(0);
  for(const w of works.values()){
   w.autoStarted=false;
   w.root.position.copy(home);w.root.rotation.set(0,w.kind==='car'?.45:0,0);w.root.scale.setScalar(w.kind==='car'?CAR_SCALE:ORRERY_SCALE);
   w.partNodes.forEach(n=>n.position.set(0,0,0));if(w.hood)w.hood.rotation.x=0;
   if(w.key)w.key.rotation.z=0;w.steering.forEach(n=>n.rotation.y=0);
  }
 }
 function mount(map){
  for(const[id,kind]of Object.entries(WORKS)){
   const root=map[kind+'Work'].scene;root.position.copy(home);root.rotation.y=kind==='car'?.45:0;root.scale.setScalar(kind==='car'?CAR_SCALE:ORRERY_SCALE);root.userData.centerWorkbench=true;root.visible=false;centerGroup.add(root);
   const w={kind,root,partNodes:PARTS.map(id=>root.getObjectByName('Part_'+id[0].toUpperCase()+id.slice(1))),gears:[],orbits:[],wheels:[],steering:[],trayNodes:[]};
   root.traverse(n=>{
    if(n.userData.workGear)w.gears.push(n);if(n.userData.orbitRate)w.orbits.push(n);
    if(n.userData.wheelRadius)w.wheels.push(n);if(n.userData.frontWheel)w.steering.push(n);
   });
   w.orbits.forEach((n,i)=>n.rotation.y=i*2.0);
   w.hood=root.getObjectByName('Car_Hood_Pivot');w.key=root.getObjectByName('Car_Winding_Key');
   for(const part of PARTS){const node=map[kind+'Tray'+part].scene;node.userData.workBlueprint=id;node.visible=false;trays[part].add(node);w.trayNodes.push(node);}
   works.set(id,w);
  }
 }
 function sync(id,effectiveParts){
  if(id!==active){reset();active=id;}
  const nextReady=effectiveParts.size===4;if(!nextReady&&ready)reset();ready=nextReady;
  for(const[id,w]of works){w.root.visible=id===active&&ready;w.trayNodes.forEach(n=>n.visible=id===active);}
  const w=works.get(active);
  if(w?.kind==='orrery'&&ready&&!w.autoStarted){w.autoStarted=true;action('primary',{automatic:true});}
 }
 function hasAction(){return !!(spin||carShow||(active==='clockwork-car'&&hoodOpen)||runTarget>0||runSpeed>.0001||Math.abs(explode-(exploded?1:0))>.001||Math.abs(hood-(hoodOpen?1:0))>.001);}
 function action(type,{automatic=false}={}){
  const w=works.get(active);if(!w||!ready)return false;
  if(type==='spin'){
   if(carShow)return false;spin={start:time,from:w.root.rotation.y};
   onEvent(`${w.kind==='car'?'發條機械車':'齒輪天體儀'}正在進行 360° 旋轉展示。`);
  }else if(type==='primary'){
   if(w.kind==='orrery'){
    exploded=false;
    runTarget=automatic?(slow?.25:1):(runTarget>0?0:(slow?.25:1));autorun=0;
    onEvent(runTarget?'齒輪天體儀啟動：搖柄帶動傳動齒輪與行星軌道。':'天體儀正在緩慢停止。');
   }else{
    if(carShow){returnRequested=true;onEvent('機械車正在完成路線並返回展示臺。');return true;}
    spin=null;exploded=false;hoodOpen=false;carShow={start:time,last:null,distance:0,pace:1,area:'home'};returnRequested=false;setTransition(0);
    onEvent('上緊發條後，切換到模型前方的桌面試車區；巡遊結束會回到圓桌。');
   }
  }else if(type==='secondary'){
   if(w.kind==='orrery'){exploded=false;slow=!slow;runTarget=slow?.25:1;onEvent(slow?'慢速觀察：看清齒輪與軌道的連動。':'天體儀恢復正常運轉。');}
   else{if(carShow){onEvent('請等機械車停妥後再開啟車蓋。');return false;}hoodOpen=!hoodOpen;onEvent(hoodOpen?'掀開車蓋，觀察發條鼓與傳動齒輪。':'車蓋已關閉。');}
  }else if(type==='explode'){
   if(carShow)return false;runTarget=0;spin=null;hoodOpen=false;exploded=!exploded;onEvent(exploded?'展開四個組件，觀察各自的組裝位置。':'四個組件重新合體。');
  }else if(type==='stop'){runTarget=0;returnRequested=true;}
  return true;
 }
 function update(dt){
  dt=Math.max(0,Math.min(.25,dt));time+=dt;const w=works.get(active);if(!w||!ready)return;
  explode+=(Number(exploded)-explode)*Math.min(1,dt*10);if(Math.abs(explode-Number(exploded))<.001)explode=Number(exploded);
  const offsets=w.kind==='orrery'?[[0,0,0],[0,.18,0],[0,.34,0],[0,.50,0]]:[[0,.28,0],[0,0,0],[0,.65,0],[0,.95,0]];
  w.partNodes.forEach((n,i)=>n.position.set(...offsets[i].map(v=>v*explode)));
  if(autorun&&time>=autorun){runTarget=0;autorun=0;}
  runSpeed+=(runTarget-runSpeed)*Math.min(1,dt*2.5);if(Math.abs(runSpeed-runTarget)<.0001)runSpeed=runTarget;
  const turning=w.kind==='orrery'?runSpeed*(1-explode):hoodOpen?.35:0;
  mechanism+=dt*turning;
  w.gears.forEach(n=>n.rotation[n.userData.axis]=mechanism*1.8*n.userData.ratio);
  w.orbits.forEach((n,i)=>n.rotation.y=mechanism*.8*n.userData.orbitRate+i*2.0);
  if(spin){const u=(time-spin.start)/3.8;w.root.rotation.y=spin.from+smooth(u)*Math.PI*2;if(u>=1)spin=null;}
  if(w.hood){hood+=(Number(hoodOpen)-hood)*Math.min(1,dt*8);if(Math.abs(hood-Number(hoodOpen))<.001)hood=Number(hoodOpen);w.hood.rotation.x=-hood*1.17;}
  if(carShow){
   const show=carShow;
   show.pace+=((returnRequested?2.4:1)-show.pace)*Math.min(1,dt*2);
   show.start-=dt*(show.pace-1);const t=time-show.start;
   let swapped=false,cover=Math.max(transferCover(t,2.25),transferCover(t,15.15));
   if(t<1.8){w.key.rotation.z=-Math.PI*6*smooth(t/1.8);}
   else if(t>=2.25&&t<14.7){
    if(show.area!=='desk'){show.area='desk';swapped=true;}
    const u=t<2.7?0:smooth((t-2.7)/12);const pose=carRoute(u);
    // root is parented to centerGroup at [0,.44,1.68], so desk coordinates are converted here.
    w.root.position.set(pose.position[0],pose.position[1]-.44,pose.position[2]-1.68);w.root.rotation.y=pose.yaw;
    if(show.last){const d=Math.hypot(pose.position[0]-show.last[0],pose.position[2]-show.last[2]);show.distance+=d;}
    show.last=pose.position;
    w.wheels.forEach(n=>n.rotation.x=show.distance/(.155*CAR_SCALE));
    w.steering.forEach(n=>n.rotation.y=pose.steering*Math.sin(Math.PI*u));
    w.gears.forEach(n=>n.rotation[n.userData.axis]=show.distance*8*n.userData.ratio);
    w.key.rotation.z=-Math.PI*6+u*Math.PI*2;
   }else if(t>=15.15){
    if(show.area!=='home'){show.area='home';swapped=true;}
    w.root.position.copy(home);w.root.rotation.y=.45;w.steering.forEach(n=>n.rotation.y=0);
    if(t>=15.6&&!swapped){carShow=null;w.key.rotation.z=0;onEvent('發條機械車完成桌面巡遊，已回到中央圓桌。');}
   }
   // Cover the exact relocation frame even when a slow frame or early return
   // skips over the fully covered interval. Never fade the car's own materials.
   setTransition(swapped?1:cover);
  }
 }
 function stats(){const w=works.get(active);return {blueprintId:active,ready,rotation:w?.root.rotation.y,scale:w?.root.scale.x,time:+time.toFixed(3),active:hasAction(),running:runTarget>0,slow,runSpeed,mechanism,exploded,hoodOpen,hoodProgress:hood,transitionMask,
  carStage:carShow?(time-carShow.start<2.25?'winding':time-carShow.start<14.7?'desk-test':'returning'):'parked',
  carDistance:carShow?.distance||0,position:w?.root.getWorldPosition(new THREE.Vector3()).toArray(),wheelAngles:w?.wheels.map(n=>n.rotation.x)||[],orbitAngles:w?.orbits.map(n=>n.rotation.y)||[],parts:w?.partNodes.map(n=>n.name)||[]};}
 return {mount,sync,action,update,hasAction,stats,reset};
}
