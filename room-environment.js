const smooth = (a,b,v) => { const t=Math.max(0,Math.min(1,(v-a)/(b-a))); return t*t*(3-2*t); };
const wrap = (value,period) => ((value%period)+period)%period;

export function deskLampLevel(hour) {
  const h=wrap(hour,24);
  if(h<5)return 1;
  if(h<8)return 1-smooth(5,8,h);
  return smooth(17.5,20.5,h);
}
export function outdoorPhase(hour) {
  const h=wrap(hour,24);
  return h<5||h>=20?'night':h<8?'dawn':h<17?'day':'dusk';
}

// One shared horizon, east on the left, west on the right. Each body continues below
// that horizon after setting; it never switches identities or jumps across the sky.
export function skyState(hour,elapsed=0) {
  const h=wrap(hour,24),horizon=860;
  const body=rise=>{
    const age=wrap(h-rise,24),angle=age/12*Math.PI;
    return {x:1024-990*Math.cos(angle),y:horizon-640*Math.sin(angle),visible:age<12,progress:age/12};
  };
  const clouds=[[300,450,.9],[1120,585,.55],[1780,390,.75]].map(([x,y,scale],i)=>({
    x:wrap(x+elapsed*(10+i*2.2)+250,2548)-250,y,scale
  }));
  return {sun:body(6),moon:body(18),horizon,clouds};
}

const stops=[
  [0,['#152b46','#526277']],[5,['#152b46','#526277']],
  [6,['#899db6','#efd2ac']],[8,['#88b6d5','#c9dfdf']],
  [16.5,['#88b6d5','#c9dfdf']],[18,['#787d9d','#d9a588']],
  [20,['#152b46','#526277']],[24,['#152b46','#526277']]
];
function skyColors(hour) {
  const h=wrap(hour,24);let i=0;while(i<stops.length-2&&h>=stops[i+1][0])i++;
  const t=smooth(stops[i][0],stops[i+1][0],h);
  return stops[i][1].map((hex,k)=>{
    const a=parseInt(hex.slice(1),16),b=parseInt(stops[i+1][1][k].slice(1),16);
    return '#'+[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t).toString(16).padStart(2,'0')).join('');
  });
}

// Canvas texture belongs exclusively to the outdoor quad behind the window.
// Clouds use simulation seconds, so they also drift when automatic day/night is off.
export function createOutdoorSky(THREE) {
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1024;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  let lastFrame='',lastHour;
  const blendColor=(aHex,bHex,t)=>{
    const a=parseInt(aHex.slice(1),16),b=parseInt(bHex.slice(1),16);
    return '#'+[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t).toString(16).padStart(2,'0')).join('');
  };
  function update(hour,elapsed=0) {
    const h=wrap(hour,24),frame=Math.floor(elapsed*4);
    if(frame===lastFrame&&Math.abs(h-lastHour)<.1)return;lastFrame=frame;lastHour=h;
    const state=skyState(h,elapsed),palette=skyColors(h);
    const night=1-smooth(5,7.5,h)+smooth(17.5,20,h);
    const sky=ctx.createLinearGradient(0,0,0,1024);sky.addColorStop(0,palette[0]);sky.addColorStop(1,palette[1]);
    ctx.fillStyle=sky;ctx.fillRect(0,0,2048,1024);
    ctx.fillStyle='#e7e5d4';
    for(let i=0;i<58;i++){
      const x=40+(i*173)%1950,y=45+(i*83)%610;
      ctx.globalAlpha=night*(.30+(i%4)*.14);ctx.beginPath();ctx.arc(x,y,1.3+(i%3)*.45,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // Clip at the horizon. Rising/setting discs are progressively occluded by the landscape.
    ctx.save();ctx.beginPath();ctx.rect(0,0,2048,state.horizon);ctx.clip();
    for(const [name,body] of [['sun',state.sun],['moon',state.moon]]){
      if(!body.visible)continue;
      ctx.fillStyle=name==='moon'?'#e6e3c9':'#f8e6b4';ctx.beginPath();ctx.arc(body.x,body.y,name==='moon'?33:46,0,Math.PI*2);ctx.fill();
      if(name==='moon'){
        // A subtle fixed-phase crescent; masking matches the continuous local sky gradient.
        ctx.fillStyle=sky;ctx.beginPath();ctx.arc(body.x+16,body.y-8,30,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
    ctx.fillStyle=`rgba(${Math.round(250-night*84)},${Math.round(245-night*65)},${Math.round(229-night*32)},${.55-night*.38})`;
    for(const {x:cx,y:cy,scale} of state.clouds){
      ctx.beginPath();ctx.ellipse(cx,cy,150*scale,24*scale,0,0,Math.PI*2);ctx.ellipse(cx-75*scale,cy-12*scale,75*scale,28*scale,0,0,Math.PI*2);ctx.ellipse(cx+55*scale,cy-20*scale,90*scale,36*scale,0,0,Math.PI*2);ctx.fill();
    }
    for(const [base,amp,dayColor,nightColor] of [[865,35,'#a8b7ac','#374d5e'],[935,22,'#82978a','#263b49']]){
      ctx.beginPath();ctx.moveTo(0,1024);ctx.lineTo(0,base);
      for(let i=0;i<=32;i++)ctx.lineTo(i*64,base+Math.sin(i*.38)*amp+Math.cos(i*.71)*amp*.4);
      ctx.lineTo(2048,1024);ctx.closePath();
      const a=parseInt(dayColor.slice(1),16),b=parseInt(nightColor.slice(1),16);
      ctx.fillStyle='#'+[16,8,0].map(shift=>Math.round(((a>>shift)&255)*(1-night)+((b>>shift)&255)*night).toString(16).padStart(2,'0')).join('');ctx.fill();
    }
    const townColor=blendColor('#657f72','#20333f',night);
    ctx.fillStyle=townColor;
    for(let i=0;i<15;i++){
      const bx=i*150-40,by=956-(i%3)*9,bw=62+(i%3)*16,bh=20+(i%4)*7;
      ctx.fillRect(bx,by,bw,bh+100);ctx.beginPath();ctx.moveTo(bx-7,by);ctx.lineTo(bx+bw*.48,by-18);ctx.lineTo(bx+bw+7,by);ctx.closePath();ctx.fill();
      if(night>.01){ctx.fillStyle=`rgba(233,191,117,${night*.55})`;for(let k=0;k<3;k++)ctx.fillRect(bx+12+k*25,by+16,8,12);ctx.fillStyle=townColor;}
    }
    texture.needsUpdate=true;
  }
  update(11);
  return {texture,update,canvas};
}
