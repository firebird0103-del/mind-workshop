export const LAMP_DEFAULTS = Object.freeze({pitch:58,yaw:-12,heading:0,intensity:100,x:-10.20,z:-.85});
const finite=(v,fallback)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):fallback;
const clamp=(v,lo,hi,fallback)=>Math.max(lo,Math.min(hi,finite(v,fallback)));
// The full shade, base and cable stay on the clear left part of the desk.
export function normalizeLamp(input={}) {
  return {pitch:clamp(input.pitch,25,75,58),yaw:clamp(input.yaw,-25,25,-12),
    heading:clamp(input.heading,-50,50,0),intensity:clamp(input.intensity,0,200,100),
    x:clamp(input.x,-12.4,-9.4,-10.20),z:clamp(input.z,-2,1.6,-.85)};
}
