// Migrated from Fix4. Scoring, questions and timings are preserved.
export const template = "<div class=\"game-root attention-page\" data-game-id=\"attention\" data-phase=\"ready\"><main class=\"game-card\">\n  <section class=\"info-area\" aria-label=\"本關說明與進度\">\n    <div class=\"title-group\"><div class=\"eyebrow\">CHALLENGE 02 · 觀察與發現</div><h1>視覺注意力</h1></div>\n    <div class=\"instruction\" id=\"instruction\" role=\"status\" aria-live=\"polite\">比較左右兩張圖，找出換了物件的格子。<small>在右邊「找錯圖」點選答案。</small></div>\n    <div class=\"game-hud\">\n      <div class=\"status-row\"><span class=\"status-pill\" id=\"status-bar\">準備開始</span><span class=\"status-pill score-pill\" id=\"score-pill-wrap\">本題 <strong id=\"score-pill\">100</strong> 分</span></div>\n      <div class=\"game-progress\"><span id=\"game-progress-bar\" role=\"progressbar\" aria-label=\"已完成題數\" aria-valuemin=\"0\" aria-valuemax=\"3\" aria-valuenow=\"0\"></span></div>\n    </div>\n  </section>\n  <section class=\"play-area\" id=\"play-area\" aria-label=\"找錯遊戲\">\n    <div class=\"ready-panel\" id=\"ready-panel\">\n      <div class=\"ready-art\" id=\"ready-art\" aria-hidden=\"true\"></div>\n      <h2>看看哪裡不一樣？</h2>\n      <p>熟悉的生活物件，考驗你的觀察力。<br>左右相同位置，仔細比一比。</p>\n      <button id=\"btn-start\" class=\"main-action-btn\" data-action=\"initGame\" disabled>正在準備圖片…</button>\n      <p id=\"asset-status\" role=\"status\" class=\"asset-status\"></p>\n    </div>\n    <div class=\"find-stage\" id=\"find-stage\" hidden>\n      <div class=\"grid-pair\" id=\"game-container\">\n        <section class=\"grid-wrapper\"><div class=\"grid-title\"><span class=\"board-badge\">A</span><h2>基準圖</h2><small>先看這邊</small></div><div class=\"grid-scroll\"><div id=\"grid-a\" class=\"grid-area\" aria-label=\"基準圖\"></div></div></section>\n        <section class=\"grid-wrapper target-board\"><div class=\"grid-title target\"><span class=\"board-badge\">B</span><h2>找錯圖</h2><small>點選不同的格子</small></div><div class=\"grid-scroll\"><div id=\"grid-b\" class=\"grid-area\" aria-label=\"找錯圖\"></div></div></section>\n      </div>\n      <div class=\"round-footer\">\n        <p id=\"round-hint\" class=\"round-hint\">不必搶快，依自己的步調觀察。</p>\n        <div class=\"result-board\" id=\"result-board\" role=\"status\" hidden></div>\n        <button id=\"btn-next\" class=\"main-action-btn\" data-action=\"nextRound\" hidden>下一題 →</button>\n      </div>\n    </div>\n    <div class=\"final-panel\" id=\"final-panel\" hidden></div>\n  </section>\n</main><div class=\"game-feedback\" id=\"game-feedback\" role=\"status\" aria-live=\"polite\"></div></div>";
export const stylesheet = new URL('./spot.css', import.meta.url).href;
export function mount(runtime) {
const {document, window, BrainChallenge, BrainChallengeAssets, BrainChallengeConfigAPI,
  BrainChallengeLayout, BrainInterference, Date, performance, setTimeout, clearTimeout} = runtime;
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
  if(phase!=='ready')return;runtime.markStarted();
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
  $('final-panel').innerHTML='<h2>每個發現，都很精彩</h2><div class="score-big">'+average+'</div><div>平均得分 · 作答時間 '+timeText+'</div><div class="finish-actions"><button class="main-action-btn" data-action="retry">再挑戰一次</button><button class="main-action-btn secondary" data-action="home">回到工坊</button></div>';
  $('final-panel').hidden=false;
  BrainChallenge.scores.save({gameName:'視覺注意力',playerName:BrainChallenge.player.getName(),score:average,totalSeconds:seconds,timeText,age:BrainChallenge.player.getAge(),timestamp:new Date().toLocaleString()});
  $('final-panel').querySelector('button')?.focus({preventScroll:true});
}
function fitBoards(){runtime.requestLayout?.();}
window.addEventListener('resize',fitBoards);
document.addEventListener('fullscreenchange',fitBoards);
document.fonts?.ready.then(fitBoards);
prepareAssets();

runtime.bindActions({initGame,nextRound});

}
