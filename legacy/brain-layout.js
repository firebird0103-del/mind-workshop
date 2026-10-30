/* Pure sizing helpers shared by viewport-aware games; testable without a browser. */
(function(root){
  'use strict';
  function chooseGrid(width,height,count,{min=56,max=112,gap=8,maxColumns=10}={}){
    const colsLimit=Math.max(1,Math.min(count,maxColumns,Math.floor((width+gap)/(min+gap))));
    let best=null;
    for(let cols=1;cols<=colsLimit;cols++){
      const rows=Math.ceil(count/cols);
      const size=Math.floor(Math.min(max,(width-gap*(cols-1))/cols,(height-gap*(rows-1))/rows));
      if(size<min)continue;
      const waste=cols*rows-count;
      if(!best||size>best.size||size===best.size&&(waste<best.waste||waste===best.waste&&rows<best.rows))best={cols,rows,size,waste,fits:true};
    }
    // Do not hide content or shrink below minimum. Short/narrow devices may scroll.
    return best||{cols:colsLimit,rows:Math.ceil(count/colsLimit),size:min,waste:0,fits:false};
  }
  root.BrainChallengeLayout=Object.freeze({chooseGrid});
})(window);
