/* Layout-only measurements for the two legacy game pages. */
(function(){
  'use strict';
  const game=document.body.dataset.gameId;
  function fit(){
    if(game==='clock'){
      const stage=document.querySelector('.clock-stage'),play=document.querySelector('.play-area');
      if(!stage||getComputedStyle(stage).display==='none')return;
      const siblings=[...play.children].filter(el=>el!==stage&&getComputedStyle(el).display!=='none');
      const others=siblings.reduce((sum,el)=>sum+el.getBoundingClientRect().height,0);
      const gap=parseFloat(getComputedStyle(play).gap)||10;
      const remaining=window.innerHeight-play.getBoundingClientRect().top-others-gap*siblings.length-70;
      stage.style.setProperty('--clock-size',Math.max(280,Math.min(640,remaining,play.clientWidth))+'px');
    }
    if(game==='executive'){
      const choices=document.getElementById('choices');
      if(!choices||!choices.children.length)return;
      const size=BrainChallengeLayout.chooseGrid(choices.clientWidth,Math.max(100,window.innerHeight-choices.getBoundingClientRect().top-86),choices.children.length,{min:96,max:170,gap:12,maxColumns:6});
      if(choices.style.getPropertyValue('--choice-cols')!==String(size.cols))choices.style.setProperty('--choice-cols',size.cols);
      if(choices.style.getPropertyValue('--choice-size')!==size.size+'px')choices.style.setProperty('--choice-size',size.size+'px');
    }
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;fit()})}
  window.addEventListener('resize',schedule);
  document.addEventListener('fullscreenchange',schedule);
  document.fonts?.ready.then(schedule);
  if(window.ResizeObserver){
    const observer=new ResizeObserver(schedule);
    ['.topbar','.info-area','.info','#result-board','.btn-group'].forEach(selector=>{const el=document.querySelector(selector);if(el)observer.observe(el)});
  }
  const changes=new MutationObserver(schedule);
  ['#result-board','.btn-group','#choices','#instruction'].forEach(selector=>{const el=document.querySelector(selector);if(el)changes.observe(el,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style']})});
  schedule();
})();
