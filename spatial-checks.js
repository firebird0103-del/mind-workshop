import {OBSTACLES_1F,WORKSHOP} from './layout.js';
export const CAT_RADIUS=.42;
const tops={'central-table':1.16,'lift-shaft-1f':6.1,'memory-tree':3.0,'memory-back-shelf':2.30,'memory-front-crates':.98,'switch-back-shelf':2.32,'switch-sorting-table':1.04,'cat-crate':.76,'push-cart':.86,'fence-left':.97,'fence-right':.97,'stair-base-left':3.18,'stair-base-right':3.18};
export function catPositionClear([x,y,z],yaw=-.25){
 const footprint=[[0,.20,.02],[.18,.22,.18],[-.21,.12,.06],[-.35,.08,.12]];
 for(const ob of OBSTACLES_1F){
  const top=ob.top??tops[ob.id]??WORKSHOP.floor1Y+.60;if(y>=top-.004)continue;
  for(const[offset,radius,base]of footprint){if(y+base>=top-.004)continue;const cx=x+Math.sin(yaw)*offset,cz=z+Math.cos(yaw)*offset,d=ob.shape==='circle'?Math.hypot(cx-ob.x,cz-ob.z)-ob.radius:Math.hypot(Math.max(0,Math.abs(cx-ob.x)-ob.hx),Math.max(0,Math.abs(cz-ob.z)-ob.hz));if(d<radius-1e-6)return false;}
 }
 return true;
}
