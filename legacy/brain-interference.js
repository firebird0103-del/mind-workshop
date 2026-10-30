(function () {
  'use strict';
  // Dark variants retain color identity and remain legible on the white prompt.
  const inks={red:'#b52d3b',blue:'#175cb0',yellow:'#806000',green:'#08754e',purple:'#7044b3',orange:'#a34b00'};
  window.BrainInterference={
    choose(choices,random=Math.random){
      const correct=choices.find(item=>item.correct);
      const candidates=choices.filter(item=>!item.correct&&item.color.id!==correct.color.id);
      if(!candidates.length)return null;
      return candidates[Math.floor(random()*candidates.length)].color;
    },
    ink(color){return inks[color?.id]||'#202a46';}
  };
})();
