import * as THREE from './vendor/three.module.js';
import {LIFE_LAYOUT as L} from './life-layout.js';

const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const v=p=>new THREE.Vector3(...p);

// Solve the two real arm joints in world space, with an outward elbow pole.
// The model's forearm includes the sculpted hand; its palm offset is the endpoint.
function grip(m,side,target){
  const arm=m.bones[side<0?'armL':'armR'],fore=m.bones[side<0?'forearmL':'forearmR'];
  if(!arm||!fore)return;
  m.p.updateMatrixWorld(true);
  const shoulder=arm.getWorldPosition(new THREE.Vector3()),scale=m.p.getWorldScale(new THREE.Vector3()).x*.78;
  const upper=fore.position.length()*scale,palm=new THREE.Vector3(side*.020,-.087,.033),lower=palm.length()*scale;
  const delta=target.clone().sub(shoulder),distance=Math.max(.02,Math.min(upper+lower-.001,delta.length())),dir=delta.normalize();
  const pole=new THREE.Vector3(side,-.35,-.3).applyQuaternion(m.p.getWorldQuaternion(new THREE.Quaternion()));
  pole.addScaledVector(dir,-pole.dot(dir)).normalize();
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  const elbow=shoulder.clone().addScaledVector(dir,along).addScaledVector(pole,height);
  const localDir=elbow.clone().sub(shoulder).normalize().applyQuaternion(arm.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  arm.quaternion.setFromUnitVectors(fore.position.clone().normalize(),localDir);
  m.p.updateMatrixWorld(true);
  const end=shoulder.clone().addScaledVector(dir,distance),foreDir=end.sub(elbow).normalize().applyQuaternion(fore.parent.getWorldQuaternion(new THREE.Quaternion()).invert());
  fore.quaternion.setFromUnitVectors(palm.normalize(),foreDir);
}

export function createLifePresentation(map,models,town){
  const coffee=map.coffeeCorner.scene,music=map.musicCorner.scene,delivery=map.deliveryStations.scene;
  const cups=[0,1].map(i=>coffee.getObjectByName('Coffee_Cup_'+i));
  const cupHomes=cups.map(o=>o.position.clone());
  const parcels=[0,1,2,3].map(i=>delivery.getObjectByName('Delivery_Parcel_'+i));
  const record=music.getObjectByName('Gramophone_Record_Pivot'),crank=music.getObjectByName('Gramophone_Crank_Pivot');
  let snapshot={};
  function update(){
    for(const a of town.actors){
      const m=models[a.index];if(m.cargo)m.cargo.visible=false;
      if(a.index<4){
        const parcel=parcels[a.index],state=a.parcel.state,source=v(L.couriers[a.index].source),receiver=v(L.receivers[a.index]);
        // The very same case moves from source, through the hands, to reception and back.
        const held=new THREE.Vector3(0,.265,.148).applyAxisAngle(new THREE.Vector3(0,1,0),a.yaw).add(new THREE.Vector3(a.p[0],m.p.position.y,a.p[1]));
        if(state==='source')parcel.position.copy(a.stage==='collecting'?source.lerp(held,smooth((a.parcel.progress-.45)/.55)):source);
        else if(state==='placing')parcel.position.copy(held.lerp(receiver,smooth(a.parcel.progress)));
        else if(state==='received')parcel.position.copy(receiver);
        else if(state==='return-pick')parcel.position.copy(receiver.lerp(held,smooth(a.parcel.progress)));
        else if(state==='stowing')parcel.position.copy(held.lerp(source,smooth(a.parcel.progress)));
        else parcel.position.copy(held);
        const blendAngle=(from,to,k)=>from+Math.atan2(Math.sin(to-from),Math.cos(to-from))*k;
        parcel.rotation.y=state==='source'?(a.stage==='collecting'?blendAngle(0,a.yaw,smooth((a.parcel.progress-.45)/.55)):0):['placing','stowing'].includes(state)?blendAngle(a.yaw,0,smooth(a.parcel.progress)):state==='received'?0:state==='return-pick'?blendAngle(0,a.yaw,smooth(a.parcel.progress)):a.yaw;
        if(m.bones.chest){m.bones.chest.position.z=0;if(['collecting','stow','assembling'].includes(a.stage)){m.bones.chest.position.z=.10*Math.sin(Math.PI*a.parcel.progress);m.bones.chest.rotation.x=.16;}if(a.routine?.active&&a.routine.kind==='inspect'){m.bones.chest.position.z=.10;m.bones.chest.rotation.x=.16;}}
        if(state!=='source'||a.stage==='collecting'||(a.routine?.active&&a.routine.kind==='inspect')){
          const right=new THREE.Vector3(Math.cos(a.yaw),0,-Math.sin(a.yaw));
          const near=parcel.position.clone().add(new THREE.Vector3(a.p[0]-parcel.position.x,0,a.p[1]-parcel.position.z).normalize().multiplyScalar(.045));
          grip(m,-1,near.clone().addScaledVector(right,-.096));
          grip(m,1,near.clone().addScaledVector(right,.096));
        }
      }
      if(a.routine?.active&&a.routine.look&&m.bones.head){const p=a.routine.look;m.bones.head.rotation.x=THREE.MathUtils.clamp(Math.atan2(a.y+.50-p[1],Math.hypot(p[0]-a.p[0],p[2]-a.p[1]))*.45,-.30,.30);}
      const l=a.life;if(!l)continue;
      // The greeting keeps the seated body and cup pose, without turning the chair.
      const seated=l.seated??0;
      // Keep trousers above the cushion instead of letting the Sit clip's low
      // pelvis sink into it. The source skeleton and walking clips stay intact.
      if(seated>0&&m.bones.hips)m.bones.hips.position.y=.25+(L.seating.hipY-.25)*smooth(seated);
      if(!a.moving)for(const key of ['legL','legR'])if(m.bones[key])m.bones[key].rotation.x=-Math.PI/2*seated;
      for(const key of ['kneeL','kneeR'])if(m.bones[key])m.bones[key].rotation.x=Math.PI/2*seated;
      if(a.index===5||a.index===7){
        const idx=a.index===5?0:1,cup=cups[idx],home=cupHomes[idx];
        const sip=l.action==='coffee-sip'?Math.max(0,Math.sin(l.time*.65)):0;
        if(m.bones.chest){m.bones.chest.rotation.x=.13*seated;m.bones.chest.position.z=.03*Math.sin(Math.PI*l.cup);}
        if(m.bones.head&&l.cup>0)m.bones.head.rotation.x=.16+.18*sip;
        if(m.bones.head&&l.action==='coffee-read'){m.bones.head.rotation.x=.25;m.bones.head.rotation.y=.16;}
        const held=new THREE.Vector3(.035,.36+.008*sip,.145).applyAxisAngle(new THREE.Vector3(0,1,0),a.yaw).add(new THREE.Vector3(a.p[0],m.p.position.y,a.p[1]));
        cup.position.copy(home).lerp(held,smooth(l.cup));cup.position.y+=.045*Math.sin(Math.PI*smooth(l.cup));cup.rotation.set(.08*sip,idx===0?Math.PI/2:-Math.PI/2,0);
        if(l.cup>0){
          const handle=cup.localToWorld(new THREE.Vector3(.065,.037,0));
          grip(m,1,handle);
        }
      }
      if(a.index===6&&l.action==='music-wind'){
        m.bones.chest.rotation.x=.12;
        const target=v(L.music.cabinet).add(new THREE.Vector3(-.58,.28,.06));
        if(l.action==='music-wind'){target.y+=Math.cos(town.life.music.wind)*.065;target.z+=Math.sin(town.life.music.wind)*.065;}
        grip(m,-1,target);
      }
      m.p.updateMatrixWorld(true);
    }
    record.rotation.y=town.life.music.angle;crank.rotation.x=town.life.music.wind;
    const contacts=town.actors.filter(a=>a.life&&a.index!==6&&a.life.cup>.99).map(a=>{const m=models[a.index],cup=cups[a.index===5?0:1];const palm=m.bones.forearmR.localToWorld(new THREE.Vector3(.020,-.087,.033));const handle=cup.localToWorld(new THREE.Vector3(.065,.037,0));return {index:a.index,error:palm.distanceTo(handle)};});
    snapshot={studio:town.actors.slice(0,4).map(a=>({index:a.index,position:[...a.p],...a.routine})),contacts,music:{...town.life.music},cups:cups.map(c=>c.position.toArray()),parcels:parcels.map((p,i)=>({state:town.actors[i].parcel.state,position:p.position.toArray()})),actors:town.actors.filter(a=>a.life).map(a=>({index:a.index,position:[...a.p],...a.life}))};
  }
  return {update,stats:()=>snapshot};
}
