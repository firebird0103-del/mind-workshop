'use strict';
const itemPool=BrainChallengeAssets.api.getPool('memory','itemPool');
const GAME_CONFIG=BrainChallengeConfigAPI.getForModule('memory');
const totalRounds=GAME_CONFIG.rounds,sequenceLength=GAME_CONFIG.sequenceLength;
const IMAGE_DURATION_MS=GAME_CONFIG.sequence.imageDurationMs,IMAGE_GAP_MS=GAME_CONFIG.sequence.imageGapMs,COUNTDOWN_STEP_MS=GAME_CONFIG.sequence.countdownStepMs,COUNTDOWN_GO_MS=GAME_CONFIG.sequence.countdownGoMs,DISTRACTOR_COUNT=GAME_CONFIG.answerOptions.distractorCount;
let currentRoundIndex=0,totalScore=0,totalTimeMs=0,roundStartTime=0,targetItems=[],userAnswers=Array(sequenceLength).fill(null),sequenceTimer=null,noticeTimer=null,phase='ready',assetsReady=false;
let objectDeck=BrainChallengeAssets.api.createDeck('memory');
const $=id=>document.getElementById(id);
const instruction=$('instruction'),statusBar=$('status-bar'),scorePill=$('score-pill'),scorePillWrap=$('score-pill-wrap'),progressBar=$('game-progress-bar'),memoryStage=$('memory-stage'),displayArea=$('display-area'),sequenceLabel=$('sequence-label'),answerArea=$('answer-area'),optionsArea=$('options-area'),resultBoard=$('result-board'),microNotice=$('micro-notice'),btnStart=$('btn-start'),btnSubmit=$('btn-submit'),btnNext=$('btn-next'),countdownLayer=$('memory-countdown'),countdownText=$('countdown-text');
function shuffle(array){for(let i=array.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[array[i],array[j]]=[array[j],array[i]]}return array}
function renderVisual(element,item){element.innerHTML=item?.markup||'';element.setAttribute('aria-label',item?.label||'')}
function showNotice(message){window.clearTimeout(noticeTimer);microNotice.textContent=message;microNotice.classList.add('is-visible');noticeTimer=window.setTimeout(()=>microNotice.classList.remove('is-visible'),1800)}
function clearNotice(){window.clearTimeout(noticeTimer);microNotice.textContent='';microNotice.classList.remove('is-visible')}
function exitGame(){if(phase==='ready'||phase==='finished'||confirm('離開後，本次尚未完成的進度不會儲存。確定回大廳嗎？'))BrainChallenge.navigation.goHome()}
async function prepareAssets(){
  btnStart.disabled=true;btnStart.textContent='正在準備圖片…';
  try{
    if(!Number.isInteger(DISTRACTOR_COUNT)||DISTRACTOR_COUNT<0||sequenceLength+DISTRACTOR_COUNT>itemPool.length)throw new Error('題目選項數超出圖庫容量，請回管理設定調整。');
    await BrainChallengeAssets.api.preload(['memory']);
    assetsReady=true;btnStart.disabled=false;btnStart.textContent='開始挑戰';clearNotice();
  }catch(error){
    microNotice.textContent=error.message+' 請確認已完整解壓縮遊戲資料夾。';microNotice.classList.add('is-visible');
    btnStart.textContent='重新載入圖片';btnStart.disabled=false;
  }
}
function initGame(){
  if(!assetsReady){prepareAssets();return}
  if(phase!=='ready')return;
  btnStart.style.display='none';currentRoundIndex=0;totalScore=0;totalTimeMs=0;
  objectDeck=BrainChallengeAssets.api.createDeck('memory');
  scorePill.textContent='0';startRound();
}
function startRound(){
  phase='showing';document.body.dataset.phase=phase;window.clearTimeout(sequenceTimer);clearNotice();
  resultBoard.style.display='none';btnSubmit.style.display='none';btnNext.style.display='none';answerArea.style.display='none';optionsArea.style.display='none';
  displayArea.style.display='flex';renderVisual(displayArea,null);sequenceLabel.style.display='block';sequenceLabel.textContent='請記住順序';
  userAnswers=Array(sequenceLength).fill(null);renderSlots();
  statusBar.innerHTML='進度 <strong>'+(currentRoundIndex+1)+' / '+totalRounds+'</strong>';
  scorePill.textContent=totalScore;BrainChallenge.gameShell.setProgress(progressBar,currentRoundIndex,totalRounds);
  instruction.innerHTML='請準備！<br>倒數結束後，依序記住接下來出現的 '+sequenceLength+' 個物件。';
  targetItems=objectDeck.draw(sequenceLength);roundStartTime=0;playCountdown();fitMemoryLayout();
}
function playCountdown(){
  countdownLayer.classList.add('is-visible');let step=0;const labels=['3','2','1','GO'];
  const tick=()=>{
    if(phase!=='showing')return;
    if(step>=labels.length){countdownLayer.classList.remove('is-visible');playSequence();return}
    const label=labels[step++];countdownText.textContent=label;countdownText.classList.toggle('go',label==='GO');
    countdownLayer.classList.remove('flash');void countdownLayer.offsetWidth;countdownLayer.classList.add('flash');
    sequenceTimer=window.setTimeout(tick,label==='GO'?COUNTDOWN_GO_MS:COUNTDOWN_STEP_MS);
  };tick();
}
function playSequence(){
  let step=0;
  function showNext(){
    if(phase!=='showing')return;
    if(step<sequenceLength){
      renderVisual(displayArea,targetItems[step]);sequenceLabel.textContent='第 '+(step+1)+' / '+sequenceLength+' 個';
      if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)displayArea.animate([{opacity:.7},{opacity:1}],{duration:160,easing:'ease-out'});
      sequenceTimer=window.setTimeout(()=>{renderVisual(displayArea,null);step++;sequenceTimer=window.setTimeout(showNext,IMAGE_GAP_MS)},IMAGE_DURATION_MS);
    }else startAnswering();
  }
  showNext();
}
function startAnswering(){
  phase='answering';document.body.dataset.phase=phase;displayArea.style.display='none';sequenceLabel.textContent='排列你的答案';
  answerArea.style.display='flex';optionsArea.style.display='grid';btnSubmit.style.display='block';btnSubmit.disabled=false;
  optionsArea.innerHTML='';
  const distractors=objectDeck.draw(DISTRACTOR_COUNT,targetItems);
  shuffle([...targetItems,...distractors]).forEach(item=>{
    const btn=document.createElement('button');btn.type='button';btn.className='option-btn';btn.dataset.objectId=item.id;renderVisual(btn,item);
    btn.addEventListener('click',()=>selectAnswer(item,btn));optionsArea.appendChild(btn);
  });
  updateSlotsDisplay();fitMemoryLayout();roundStartTime=Date.now();
}
function renderSlots(){
  answerArea.innerHTML='';
  for(let i=0;i<sequenceLength;i++){
    const slot=document.createElement('button');slot.type='button';slot.className='slot';slot.dataset.index=i+1;slot.dataset.filled='false';
    slot.setAttribute('aria-label','第 '+(i+1)+' 個答案，尚未選擇');slot.addEventListener('click',()=>removeAnswer(i));answerArea.appendChild(slot);
  }
}
function updateSlotsDisplay(){
  answerArea.querySelectorAll('.slot').forEach((slot,index)=>{
    const entry=userAnswers[index];renderVisual(slot,entry?.item);slot.dataset.filled=entry?'true':'false';
    slot.setAttribute('aria-label','第 '+(index+1)+' 個答案：'+(entry?entry.item.label+'，點選取消':'尚未選擇'));
  });
  instruction.innerHTML='依剛剛的順序，選出 '+sequenceLength+' 個物件。<br><span class="target-count">已選：'+userAnswers.filter(Boolean).length+' / '+sequenceLength+'</span>';
}
function selectAnswer(item,btn){
  if(phase!=='answering'||btn.disabled||userAnswers.some(entry=>entry?.item.id===item.id))return;
  const index=userAnswers.indexOf(null);
  if(index===-1){showNotice('已排滿，可以確認答案；也可以點上方格子取消。');return}
  userAnswers[index]={item,btn};btn.disabled=true;btn.classList.add('disabled','selected');updateSlotsDisplay();
}
function removeAnswer(index){
  if(phase!=='answering'||!userAnswers[index])return;
  const entry=userAnswers[index];entry.btn.disabled=false;entry.btn.classList.remove('disabled','selected');
  userAnswers[index]=null;const selected=userAnswers.filter(Boolean);
  userAnswers=Array.from({length:sequenceLength},(_,i)=>selected[i]||null);updateSlotsDisplay();
}
function submitAnswer(){
  if(phase!=='answering')return;
  if(userAnswers.includes(null)){showNotice('請先選滿 '+sequenceLength+' 個物件，再確認答案。');return}
  phase='review';document.body.dataset.phase=phase;clearNotice();totalTimeMs+=Date.now()-roundStartTime;
  optionsArea.style.display='none';sequenceLabel.textContent='你的排列';
  optionsArea.querySelectorAll('button').forEach(button=>button.disabled=true);
  answerArea.querySelectorAll('button').forEach((button,index)=>{
    button.disabled=true;button.setAttribute('aria-label','第 '+(index+1)+' 個答案：'+userAnswers[index].item.label);
  });
  btnSubmit.disabled=true;btnSubmit.style.display='none';
  const userItems=userAnswers.map(answer=>answer.item);
  const correctCount=userItems.filter(item=>targetItems.includes(item)).length;
  const exact=userItems.every((item,i)=>item===targetItems[i]);
  BrainChallenge.audio?.play?.(exact?'correct':'wrong');
  const scoring=GAME_CONFIG.scoring;
  // Partial credit must not exceed full-set credit on long sequences.
  const roundScore=exact?scoring.exact:correctCount===sequenceLength?scoring.orderedComplete:Math.min(scoring.orderedComplete,correctCount*scoring.partialPerCorrect);
  totalScore+=roundScore;scorePill.textContent=totalScore;
  BrainChallenge.gameShell.setProgress(progressBar,currentRoundIndex+1,totalRounds);
  BrainChallenge.gameShell.animateScore(scorePillWrap);
  instruction.textContent=exact?'順序完全正確！':'這是正確順序，一起再看一次。';
  resultBoard.innerHTML='本題得分：<strong>'+roundScore+' 分</strong><div>正確順序</div><ol class="answer-reveal">'+targetItems.map((item,i)=>'<li>'+item.markup+'<span>'+(i+1)+'. '+item.label+'</span></li>').join('')+'</ol>';
  resultBoard.style.display='block';btnNext.style.display='block';
  btnNext.textContent=currentRoundIndex===totalRounds-1?'看最終結果':'下一題';
  fitMemoryLayout();
  btnNext.focus({preventScroll:true});
}
function nextRound(){
  if(phase!=='review')return;
  currentRoundIndex++;if(currentRoundIndex<totalRounds)startRound();else showFinalResult();
}
function showFinalResult(){
  BrainChallenge.audio?.play?.('complete');
  phase='finished';document.body.dataset.phase=phase;window.clearTimeout(sequenceTimer);statusBar.textContent='挑戰完成';
  BrainChallenge.gameShell.setProgress(progressBar,totalRounds,totalRounds);
  answerArea.style.display='none';optionsArea.style.display='none';btnSubmit.style.display='none';btnNext.style.display='none';sequenceLabel.style.display='none';
  const average=Math.round(totalScore/totalRounds),seconds=Math.floor(totalTimeMs/1000);
  const timeText=seconds>=60?Math.floor(seconds/60)+'分'+seconds%60+'秒':seconds+'秒';
  instruction.textContent='本關完成！你的工作記憶挑戰結果';
  BrainChallenge.scores.save({gameName:'工作記憶',playerName:BrainChallenge.player.getName(),score:average,totalSeconds:seconds,timeText,age:BrainChallenge.player.getAge(),timestamp:new Date().toLocaleString()});
  resultBoard.innerHTML='<div>本關平均得分</div><div class="score-big">'+average+' 分</div><div>作答總時間：'+timeText+'</div><div class="finish-actions"><button class="again" onclick="location.reload()">再挑戰一次</button><button class="home" onclick="BrainChallenge.navigation.goHome()">回到大廳</button></div>';
  resultBoard.style.display='block';
}
function fitMemoryLayout(){
  const content=$('memory-content');
  const width=Math.max(180,content.clientWidth);
  const slot=Math.max(52,Math.min(76,Math.floor((width-8*(sequenceLength-1))/sequenceLength)));
  memoryStage.style.setProperty('--memory-slot-size',slot+'px');
  if(phase==='answering'){
    const available=Math.max(56,window.innerHeight-optionsArea.getBoundingClientRect().top-148);
    const layout=BrainChallengeLayout.chooseGrid(width,available,sequenceLength+DISTRACTOR_COUNT,{min:56,max:112,gap:8,maxColumns:10});
    optionsArea.style.setProperty('--memory-cols',layout.cols);
    optionsArea.style.setProperty('--memory-option-size',layout.size+'px');
  }
}
window.addEventListener('resize',fitMemoryLayout);
document.addEventListener('fullscreenchange',fitMemoryLayout);
document.fonts?.ready.then(fitMemoryLayout);
prepareAssets();
