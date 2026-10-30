'use strict';
const visualPool = BrainChallengeAssets.api.getPool('attention','iconPool');
const GAME_CONFIG = BrainChallengeConfigAPI.getForModule('attention');
const totalRounds=GAME_CONFIG.rounds, targetsToFind=GAME_CONFIG.differencesPerRound;
let currentRoundIndex=0,totalScore=0,totalTimeMs=0,roundStartTime=0,foundCount=0,roundScore=0,diffIndices=[],phase='ready',assetsReady=false;
let objectDeck=BrainChallengeAssets.api.createDeck('attention');
const $=id=>document.getElementById(id);
const gridA=$('grid-a'),gridB=$('grid-b'),instruction=$('instruction'),statusBar=$('status-bar'),resultBoard=$('result-board'),btnStart=$('btn-start'),btnNext=$('btn-next'),scorePill=$('score-pill'),progressBar=$('game-progress-bar');
$('ready-art').innerHTML=[0,1,2].map(i=>'<span>'+visualPool[i].markup+'</span>').join('');
function shuffle(array){for(let i=array.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[array[i],array[j]]=[array[j],array[i]]}return array}
function setPhase(value){phase=value;document.body.dataset.phase=value}
function validateSetup(){
  if(!Number.isInteger(targetsToFind)||targetsToFind<1)throw new Error('不同處數量必須是正整數。');
  for(const size of GAME_CONFIG.gridSizes.slice(0,totalRounds)){
    if(!Number.isInteger(size)||size<2||targetsToFind>size*size||size*size+targetsToFind>visualPool.length)throw new Error('格數或不同處數量超出圖庫容量，請回管理設定調整。');
  }
}
async function prepareAssets(){
  btnStart.disabled=true;btnStart.textContent='正在準備圖片…';
  try{
    validateSetup();
    await BrainChallengeAssets.api.preload(['attention']);
    assetsReady=true;btnStart.disabled=false;btnStart.textContent='開始挑戰 →';$('asset-status').textContent='';
  }catch(error){
    $('asset-status').textContent=error.message+' 請確認已完整解壓縮遊戲資料夾。';
    btnStart.textContent='重新載入圖片';btnStart.disabled=false;
  }
}
function renderVisual(cell,item,index,interactive){
  cell.innerHTML=item.markup;cell.dataset.objectId=item.id;
  cell.setAttribute('aria-label','第 '+(Math.floor(index/GAME_CONFIG.gridSizes[currentRoundIndex])+1)+' 列，第 '+(index%GAME_CONFIG.gridSizes[currentRoundIndex]+1)+' 格：'+item.label);
  if(interactive)cell.setAttribute('aria-pressed','false');
}
function initGame(){
  if(!assetsReady){prepareAssets();return}
  if(phase!=='ready')return;
  currentRoundIndex=0;totalScore=0;totalTimeMs=0;
  objectDeck=BrainChallengeAssets.api.createDeck('attention');
  $('ready-panel').hidden=true;$('find-stage').hidden=false;
  startRound();
}
function startRound(){
  setPhase('playing');foundCount=0;roundScore=GAME_CONFIG.scoring.startingScore;
  resultBoard.hidden=true;btnNext.hidden=true;$('round-hint').hidden=false;
  $('round-hint').textContent='不必搶快。點錯扣 '+GAME_CONFIG.scoring.wrongPenalty+' 分，已找到的格子不會重複計分。';
  BrainChallenge.gameShell.hideFeedback();
  const size=GAME_CONFIG.gridSizes[currentRoundIndex],count=size*size;
  statusBar.textContent='第 '+(currentRoundIndex+1)+' / '+totalRounds+' 題';
  scorePill.textContent=roundScore;
  BrainChallenge.gameShell.setProgress(progressBar,currentRoundIndex,totalRounds);
  gridA.style.setProperty('--grid-size',size);gridB.style.setProperty('--grid-size',size);
  const picked=objectDeck.draw(count+targetsToFind),baseItems=picked.slice(0,count),targetItems=[...baseItems];
  diffIndices=shuffle(Array.from({length:count},(_,i)=>i)).slice(0,targetsToFind);
  diffIndices.forEach((index,i)=>{targetItems[index]=picked[count+i]});
  gridA.innerHTML='';gridB.innerHTML='';
  for(let i=0;i<count;i++){
    const a=document.createElement('div');a.className='cell';a.id='cell-A-'+i;renderVisual(a,baseItems[i],i,false);gridA.appendChild(a);
    const b=document.createElement('button');b.type='button';b.className='cell';b.id='cell-B-'+i;renderVisual(b,targetItems[i],i,true);gridB.appendChild(b);
    // Native click supports mouse, touch, keyboard, and assistive technologies.
    b.addEventListener('click',()=>checkClick(i,b));
  }
  $('game-container').classList.remove('is-entering');void $('game-container').offsetWidth;$('game-container').classList.add('is-entering');
  roundStartTime=Date.now();updateInstruction();fitBoards();
  if(currentRoundIndex>0)gridB.firstElementChild?.focus({preventScroll:true});
}
function checkClick(index,target){
  if(phase!=='playing'||target.disabled)return;
  const a=$('cell-A-'+index),b=$('cell-B-'+index);
  if(diffIndices.includes(index)){
    BrainChallenge.audio?.play?.('correct');
    a.classList.add('found');b.classList.add('found');b.disabled=true;b.setAttribute('aria-pressed','true');foundCount++;
    b.setAttribute('aria-label',b.getAttribute('aria-label')+'，已找到');
    updateInstruction();
    if(foundCount===targetsToFind)roundComplete();
  }else if(!target.classList.contains('wrong')){
    BrainChallenge.audio?.play?.('wrong');
    target.classList.add('wrong');roundScore=Math.max(GAME_CONFIG.scoring.minimumScore,roundScore-GAME_CONFIG.scoring.wrongPenalty);
    scorePill.textContent=roundScore;$('round-hint').textContent='這一格相同，再比對看看。點錯扣 '+GAME_CONFIG.scoring.wrongPenalty+' 分。';
    setTimeout(()=>target.classList.remove('wrong'),400);
  }
}
function updateInstruction(){
  instruction.innerHTML='找出 <span class="target-count">'+targetsToFind+'</span> 個不同處 <span class="found-count"> · 已找到 '+foundCount+' / '+targetsToFind+'</span><small>比較相同位置，在右邊「找錯圖」點選答案。</small>';
}
function roundComplete(){
  if(phase!=='playing')return;
  setPhase('review');totalTimeMs+=Date.now()-roundStartTime;totalScore+=roundScore;
  gridB.querySelectorAll('button').forEach(button=>button.disabled=true);
  BrainChallenge.gameShell.setProgress(progressBar,currentRoundIndex+1,totalRounds);
  instruction.innerHTML='全部找到了！<small>可以再比對一下，準備好就繼續。</small>';
  $('round-hint').hidden=true;resultBoard.textContent='本題完成 · '+roundScore+' 分';resultBoard.hidden=false;
  btnNext.textContent=currentRoundIndex===totalRounds-1?'查看結果 →':'下一題 →';btnNext.hidden=false;
  btnNext.focus({preventScroll:true});
}
function nextRound(){
  if(phase!=='review')return;
  currentRoundIndex++;if(currentRoundIndex<totalRounds)startRound();else showFinalResult();
}
function showFinalResult(){
  BrainChallenge.audio?.play?.('complete');
  setPhase('finished');$('find-stage').hidden=true;
  const average=Math.round(totalScore/totalRounds),seconds=Math.floor(totalTimeMs/1000);
  const timeText=seconds>=60?Math.floor(seconds/60)+' 分 '+seconds%60+' 秒':seconds+' 秒';
  statusBar.textContent='挑戰完成';instruction.textContent='完成全部 '+totalRounds+' 題！';
  $('score-pill-wrap').innerHTML='平均 <strong>'+average+'</strong> 分';
  $('final-panel').innerHTML='<h2>每個發現，都很精彩</h2><div class="score-big">'+average+'</div><div>平均得分 · 作答時間 '+timeText+'</div><div class="finish-actions"><button class="main-action-btn" onclick="location.reload()">再玩一次</button><button class="main-action-btn secondary" onclick="BrainChallenge.navigation.goHome()">回到大廳</button></div>';
  $('final-panel').hidden=false;
  BrainChallenge.scores.save({gameName:'視覺注意力',playerName:BrainChallenge.player.getName(),score:average,totalSeconds:seconds,timeText,age:BrainChallenge.player.getAge(),timestamp:new Date().toLocaleString()});
  $('final-panel').querySelector('button')?.focus({preventScroll:true});
}
function fitBoards(){
  if(phase==='ready'||phase==='finished')return;
  const stage=$('find-stage'),size=GAME_CONFIG.gridSizes[currentRoundIndex];
  // Board headings/padding, actions, footer and page bottom are reserved.
  // On short screens retain 44px cells and allow vertical scrolling.
  // Two passes account for instruction wrapping after its width is narrowed.
  for(let pass=0;pass<2;pass++){
    const availableHeight=window.innerHeight-stage.getBoundingClientRect().top-170;
    const availableWidth=(stage.clientWidth-24)/2-26;
    const minimum=size*50+6;
    const board=Math.max(minimum,Math.min(availableHeight,availableWidth));
    stage.style.setProperty('--board-size',Math.floor(board)+'px');
    document.body.style.setProperty('--attention-frame-width',Math.min(stage.clientWidth,Math.max(720,Math.floor(board*2+64)))+'px');
  }
}
function exitGame(){
  if(phase==='ready'||phase==='finished'||confirm('離開後，本次尚未完成的進度不會儲存。確定回大廳嗎？'))BrainChallenge.navigation.goHome();
}
window.addEventListener('resize',fitBoards);
document.addEventListener('fullscreenchange',fitBoards);
document.fonts?.ready.then(fitBoards);
prepareAssets();
