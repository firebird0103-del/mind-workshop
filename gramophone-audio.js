// Original, quiet mechanical waltz. Entirely offline; respects sound, volume,
// simulation pause and page visibility. Audio starts only after a user gesture.
export function createGramophoneAudio(isPlaying){
  let context=null,master=null,next=0,beat=0,enabled=true,volume=.35,timer=null,scheduled=0;
  const melody=[67,71,74,71,69,67,64,67,71,69,67,64,62,66,69,74,71,69,67,71,74,76,74,71];
  function note(midi,at,duration,gain,type='triangle'){
    scheduled++;const o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.value=440*2**((midi-69)/12);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
    o.connect(g).connect(master);o.start(at);o.stop(at+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  function schedule(){
    if(!context)return;
    const active=enabled&&!document.hidden&&isPlaying();master.gain.setTargetAtTime(active?volume*.15:0,context.currentTime,.08);
    if(!active){next=context.currentTime+.05;return;}
    next=Math.max(next,context.currentTime+.02);
    while(next<context.currentTime+.25){
      note(melody[beat%melody.length],next,.34,.23);
      if(beat%3===0)note(beat%12<6?48:50,next,.55,.16,'sine');
      else note(beat%12<6?55:57,next,.22,.08,'sine');
      next+=.36;beat++;
    }
  }
  function unlock(){
    try{if(!context){context=new(window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=0;master.connect(context.destination);timer=setInterval(schedule,120);}context.resume().catch(()=>{});}catch{}
  }
  document.addEventListener('pointerdown',unlock);document.addEventListener('keydown',unlock);
  return {stats:()=>({unlocked:!!context,state:context?.state||'locked',enabled,volume,scheduled,playing:!!(enabled&&isPlaying()&&!document.hidden)}),setOptions(on,v){enabled=!!on;volume=Math.max(0,Math.min(1,Number(v)||0));schedule();},dispose(){clearInterval(timer);document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);context?.close();}};
}
