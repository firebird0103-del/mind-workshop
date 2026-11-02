import {createViewingMode} from './viewing-mode.js';
import {normalizeLamp,LAMP_DEFAULTS} from './lamp-controls.js';
import {createRoundSession} from './round-session.js';
import {createWorkbench} from './workbench.js';
// Main controller for 《心智大作戰：腦內工坊》 (Brain Workshop v1.0)
import {showRankings, escapeHTML} from './ranking.js';
import {GAMES, AGES, DEFAULTS, KEYS, read, write, safePath} from './config.js';
import {
  BLUEPRINTS,
  defaultCraftingState,
  loadCraftingState,
  saveCraftingState,
  getActiveBlueprint,
  applyGameCompletion,
  startNextWork,
  completeAllForTesting,
  clearCollections
} from './crafting.js';

const bubbleNodes = new Map();
const $ = s => document.querySelector(s);

const icons = {
  clock: '<circle cx="24" cy="24" r="18"/><path d="M24 12v13h10"/>',
  search: '<circle cx="20" cy="20" r="13"/><path d="m30 30 12 12"/>',
  memory: '<path d="M23 9c-7-6-13 0-11 6-8 0-10 12-3 15-4 7 3 14 10 11l5 2V8m1 1c7-6 13 0 11 6 8 0 10 12 3 15 4 7-3 14-10 11l-5 2M16 21l8 5 8-5M15 33l9-7 9 7"/>',
  shapes: '<circle cx="14" cy="14" r="8"/><path d="m34 7 10 17H24Z"/><rect x="26" y="31" width="16" height="14" rx="2"/><path d="m12 29 9 15H3Z"/>'
};
const icon = id =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[id]}</svg>`;

const displayParams = new URLSearchParams(location.search);
const isDemo = displayParams.get('demo') === '1';
let cached = isDemo ? {} : read(KEYS.settings, {});
let settings = {...DEFAULTS, ...cached, paths: {...DEFAULTS.paths, ...(cached.paths || {})}};
if (!Number.isInteger(settings.age) || settings.age < 0 || settings.age > 5) settings.age = -1;
settings.quality = Math.max(1, Math.min(1.75, Number(settings.quality) || 1.4));
settings.lampPitch=Math.max(25,Math.min(75,Number(settings.lampPitch)||58));
settings.lampYaw=Math.max(-25,Math.min(25,(Number.isFinite(Number(settings.lampYaw))?Number(settings.lampYaw):-12)));
settings.lamp=normalizeLamp({...settings.lamp,pitch:settings.lamp?.pitch??settings.lampPitch,yaw:settings.lamp?.yaw??settings.lampYaw});
settings.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
const urlResidentMode = displayParams.get('residentMode');
settings.residentMode = (urlResidentMode === 'dynamic' || urlResidentMode === 'classic')
  ? urlResidentMode
  : (settings.residentMode === 'dynamic' ? 'dynamic' : 'classic');
for (const key of Object.keys(DEFAULTS.paths)) settings.paths[key] = DEFAULTS.paths[key];

if (isDemo) { settings.motion=false; settings.sound=false; settings.age=3; }
const requestedWork=({bird:'mechanical-bird',orrery:'starlight-orrery',car:'clockwork-car'})[displayParams.get('work')]||displayParams.get('work');
let craftingState = isDemo ? startNextWork(defaultCraftingState(),BLUEPRINTS.some(b=>b.id===requestedWork)?requestedWork:'mechanical-bird') : loadCraftingState();
if (isDemo) {
  const count=Math.max(0,Math.min(4,Math.floor(Number(displayParams.get('parts') ?? 4) || 0)));
  craftingState.installedParts=['core','wings','melody','plumage'].slice(0,count);
  document.body.dataset.demo='true';
  $('#demoNotice').hidden=false;
}
let selected = null,
  world = null,
  audio = null,
  noticeTimer;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const roundSession = createRoundSession();
const AGE_VALUES = ['7-12','13-18','19-35','36-55','56-70','71+'];
const workbench = createWorkbench({
  getPlayer: () => {
    const p = roundSession.player;
    return {name:p.name, age:AGE_VALUES[p.ageIndex], ageLabel:AGES[p.ageIndex]};
  },
  beforeOpen: game => {
    $('#detail').hidden = true;
    $('#residentCard').hidden = true;
    $('#celebrate').hidden = true;
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
    world?.dismissSpeech();
    world?.focus(GAMES.findIndex(g => g.id === game.id));
    window.BrainChallenge.audio?.unlock?.();
  },
  onVisibility: syncMotion,
  onComplete: result => roundSession.queue(result),
  onReturn: flushNativeCompletions
});

function syncPlayerUI() {
  if (isDemo) {
    $('#age').selectedIndex = settings.age + 1;
    $('#playerSummary').textContent = '展示模式';
    $('#playerSummaryHint').textContent = '返回遊玩後即可設定玩家';
    return;
  }
  const p = roundSession.player;
  settings.age = p?.ageIndex ?? -1;
  $('#age').selectedIndex = settings.age + 1;
  $('#playerSummary').textContent = p ? `${p.name}｜${AGES[p.ageIndex]}` : '尚未設定玩家';
  $('#playerSummaryHint').textContent = p ? '換人請按「新一局」' : '首次挑戰時設定年齡與暱稱';
  if (p) {
    window.BrainChallenge.player.setName(p.name);
    window.BrainChallenge.player.setAge(AGE_VALUES[p.ageIndex]);
  }
  saveSettings();
}

function flushNativeCompletions() {
  if (isDemo || !world) return;
  for (const result of roundSession.pending) {
    handleGameFinished(result.gameId, result);
    roundSession.acknowledge(result.token);
  }
}

function beginNewRound() {
  // Resolve the old presentation before changing blueprints; its cargo must not
  // leak into the next cycle. Existing scene/model code stays unchanged.
  world?.skipCraftingAnimation();
  $('#craftBanner').hidden = true;
  if (!isDemo) {
    roundSession.reset();
    try {sessionStorage.removeItem('currentPlayerName');localStorage.removeItem('currentUserAge');} catch {}
  }
  craftingState = startNextWork(craftingState);
  persistCrafting(); syncPlayerUI(); renderCraftingUI();
  $('#celebrate').hidden = true;
  $('#panel').close(); world?.overview(); syncMotion();
  toast(isDemo ? `展示作品：${getActiveBlueprint(craftingState).name}` : `新一局：${getActiveBlueprint(craftingState).name}。下次挑戰請重新設定年齡與暱稱。`);
}

function requestNewRound() {
  if (isDemo) return beginNewRound();
  if (!roundSession.player && !craftingState.installedParts.length && !roundSession.pending.length) return beginNewRound();
  $('#panelContent').innerHTML = '<div class="eyebrow">NEW ROUND</div><h2>開始新一局？</h2>' +
    '<p>會清空目前圓桌的組裝進度，並重新設定玩家的年齡與暱稱。既有成績、遊玩紀錄、收藏及遊戲設定會保留。</p>' +
    '<div class="settings-buttons"><button id="cancelNewRound" type="button">繼續這一局</button><button id="confirmReset" class="primary" type="button">開始新一局</button></div>';
  open($('#panel'));
  $('#confirmReset').onclick = beginNewRound;
  $('#cancelNewRound').onclick = () => $('#panel').close();
}

function saveSettings() {
  if (isDemo) return;
  if (!write(KEYS.settings, settings)) {
    toast('目前瀏覽器無法儲存設定，但本次遊玩與操作仍可正常使用。');
  }
}

function persistCrafting() {
  if (isDemo) return;
  if (!saveCraftingState(craftingState)) {
    toast('目前瀏覽器無法寫入本機存檔，本次工坊進度將於記憶體內保留。');
  }
}

function toast(t) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

function sound(win = false) {
  if (!settings.sound || !settings.volume) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    [0, ...(win ? [0.12, 0.24] : [])].forEach((d, i) => {
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.type = 'sine';
      o.frequency.value = [523, 659, 784][i];
      g.gain.setValueAtTime(0, audio.currentTime + d);
      g.gain.linearRampToValueAtTime(settings.volume * 0.11, audio.currentTime + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d + 0.24);
      o.connect(g).connect(audio.destination);
      o.start(audio.currentTime + d);
      o.stop(audio.currentTime + d + 0.25);
    });
  } catch {}
}

function syncMotion() {
  world?.setSound(settings.sound,settings.volume);
  const isPaused = !settings.motion || reduced.matches || !!document.querySelector('dialog[open]');
  world?.setPaused(isPaused);
  const button=$('#toggleMotionBtn');
  if(button){button.textContent=!settings.motion||reduced.matches?'▷ 開啟日常動畫':'Ⅱ 暫停日常動畫';button.setAttribute('aria-pressed',String(!settings.motion||reduced.matches));}
}

function syncCutaway() {
  world?.setCutaway(settings.cutaway);
  const btn = $('#cutawayToggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(settings.cutaway));
    btn.textContent = settings.cutaway ? '⌂ 屋頂自動淡出：開' : '⌂ 屋頂自動淡出：關';
  }
}

function open(d) {
  if (d.id === 'detail') {
    $('#residentCard').hidden = true;
    $('#celebrate').hidden = true;
    d.hidden = false;
    return;
  }
  $('#detail').hidden = true;
  $('#residentCard').hidden = true;
  $('#celebrate').hidden = true;
  world?.dismissSpeech();
  document.querySelectorAll('dialog[open]').forEach(x => x.close());
  d.showModal();
  syncMotion();
}

$('#detail')
  .querySelectorAll('[data-close]')
  .forEach(b => (b.onclick = () => ($('#detail').hidden = true)));

for (const d of document.querySelectorAll('dialog:not(#workbench)')) {
  d.querySelectorAll('[data-close]').forEach(b => (b.onclick = () => d.close()));
  d.addEventListener('close', syncMotion);
  d.addEventListener('click', e => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    }
  });
}

$('#games').innerHTML = GAMES.map(
  (g, i) =>
    `<button class="game-card" data-game="${i}" style="--accent:${g.color};--tint:${g.tint}">
      <span class="icon">${icon(g.icon)}</span>
      <span><strong>${g.name}</strong></span>
      <span class="tick"></span>
    </button>`
).join('');

$('#labels').innerHTML = GAMES.map(
  (g, i) =>
    `<button class="map-label" data-game="${i}" aria-label="${g.zone}（點擊進入對話與挑戰）" style="--accent:${g.color}">
      <b>0${i + 1}</b><span>${g.name}</span><em>💬 挑戰</em>
    </button>`
).join('');

document.querySelectorAll('[data-game]').forEach(b => (b.onclick = () => selectStudio(+b.dataset.game)));

function selectStudio(i) {
  $('#residentCard').hidden = true;
  $('#celebrate').hidden = true;
  selected = GAMES[i];
  sound();
  world?.focus(i);
  const part=getActiveBlueprint(craftingState).parts.find(p=>p.gameId===selected.id);
  const installed = craftingState.installedParts.includes(part.id);
  $('#detail').style.setProperty('--accent', selected.color);
  $('#detailZone').textContent = `0${i + 1} · ${selected.floorLabel} · ${selected.zone}`;
  $('#detailTitle').textContent = selected.name;
  $('#detailDesc').textContent = selected.shortDesc;
  $('#detailPartPill').textContent = installed
    ? `✓ 已安裝：${part.name}`
    : `⚙ 對應零件：${part.name}`;
  $('#launch').textContent = '開始遊戲 →';
  open($('#detail'));
}

function renderCraftingUI() {
  const bp = getActiveBlueprint(craftingState);
  const installedCount = craftingState.installedParts.length;
  const totalParts = bp.parts.length;

  $('#progress').textContent = `${bp.name}進度 ${installedCount} / ${totalParts}`;
  $('#headerCraftBadge').textContent = `${bp.name} ${installedCount}/${totalParts}`;
  $('#headerCraftIcon').textContent=bp.icon;
  $('#focusBirdTool').textContent=`${bp.icon} 中央作品`;
  $('#dots').innerHTML = bp.parts
    .map(p => `<i class="${craftingState.installedParts.includes(p.id) ? 'done' : ''}" title="${p.name}"></i>`)
    .join('');

  document.querySelectorAll('.map-label').forEach((el, i) => {
    const partId = GAMES[i].partKey;
    const done = craftingState.installedParts.includes(partId);
    el.classList.toggle('complete', done);
    const em = el.querySelector('em');
    if (em) em.textContent = done ? '✓ 已備料' : '💬 挑戰';
  });

  document.querySelectorAll('.game-card .tick').forEach((el, i) => {
    const partId = GAMES[i].partKey;
    const done=craftingState.installedParts.includes(partId);
    el.closest('.game-card').classList.toggle('complete',done);
    el.textContent = done ? '✓ 已備料' : '';
  });

  world?.syncCrafting(craftingState);
  if(world?.getStats().work.carStage==='parked'){$('#workRunBar').hidden=true;$('#workReturn').disabled=false;}
}

function handleGameFinished(gameId, {token = 'preview-' + Date.now(), score = 100, preview = false} = {}) {
  const res = applyGameCompletion(craftingState, {
    gameId,
    token,
    status: 'completed',
    score
  });
  if (!res.applied) return;
  craftingState = res.state;
  persistCrafting();
  sound(true);
  // Start delivery animation first so the part is held in the resident's hands until they arrive at the Central Workbench!
  world?.playCraftingFeedback(res.event);
  renderCraftingUI();

  toast(
    preview
      ? `⚙ ${res.event.gameName}居民正將「${res.event.shortPartName}」送往中央圓桌（送達後安裝 ${res.event.progressCount}/4）…`
      : `挑戰完成！${res.event.gameName}居民正將「${res.event.shortPartName}」送往中央圓桌（${res.event.progressCount}/4）…`
  );
}

function openBirdShowcaseCard(justCompletedEdition = null) {
  if(document.body.classList.contains('viewing-mode'))return;
  $('#detail').hidden = true;
  $('#residentCard').hidden = true;
  const bp = getActiveBlueprint(craftingState);
  const count = craftingState.installedParts.length;
  // Strictly check if all 4 parts are currently assembled on the Central Workbench!
  const isTableAssembled = count >= 4 && (world?.getStats().deliveredParts.length??4)>=4;

  if ($('#celebrateEyebrow')) {
    $('#celebrateEyebrow').textContent = isTableAssembled
      ? `AUTOMATON SHOWCASE · 4 / 4 組裝完成`
      : `WORKBENCH TRAYS · 圓桌備料進度 ${count} / 4`;
  }
  $('#celebrateTitle').textContent = isTableAssembled
    ? `${bp.icon} 「${bp.name}」互動展示`
    : `⚙ 中央製作臺（備料 ${count} / 4）`;
  $('#celebrateDesc').textContent = isTableAssembled
    ? `「${bp.name}」四個組件已合體！${bp.id==='clockwork-car'?'桌面試車時鏡頭會跟隨車子，結束後返回原本視角。':'選擇下方動作，鏡頭仍可自由操作。'}`
    : `本次作品是「${bp.name}」。完成挑戰後居民會配送組件，四件全部送達後就能合體展示。`;

  if ($('#birdActionGrid')) {
    $('#birdActionGrid').hidden = !isTableAssembled;
  }
  if ($('#trayStatusList')) {
    $('#trayStatusList').hidden = isTableAssembled;
    if (!isTableAssembled) {
      $('#trayStatusList').innerHTML = bp.parts
        .map((p, idx) => {
          const done = craftingState.installedParts.includes(p.id);
          return `<button type="button" class="tray-status-item ${done ? 'done' : ''}" data-tray-studio="${idx}">
            <span>0${idx + 1} · ${GAMES[idx].name}（${p.shortName}）</span>
            <small>${done ? '✓ 已備料' : '前往挑戰 →'}</small>
          </button>`;
        })
        .join('');
      $('#trayStatusList').querySelectorAll('[data-tray-studio]').forEach(btn => {
        btn.onclick = () => selectStudio(+btn.dataset.trayStudio);
      });
    }
  }
  if ($('#celebrateNext')) {
    $('#celebrateNext').disabled = count === 0;
    $('#celebrateNext').textContent = isTableAssembled ? '↻ 開啟下一件製作' : '↻ 清空圓桌重來';
  }

  updateWorkActionLabels();
  $('#celebrate').hidden = false;
}

if ($('#closeCelebrate')) {
  $('#closeCelebrate').onclick = () => {
    $('#celebrate').hidden = true;
  };
}

function updateWorkActionLabels(){
  const bp=getActiveBlueprint(craftingState),s=world?.getStats().work;
  const labels=bp.id==='mechanical-bird'?['🦅 展翅飛起','🎵 發條鳴唱']:bp.id==='starlight-orrery'?
    [s?.running?'停止運轉':'啟動天體儀',s?.slow?'恢復正常速度':'慢速觀察']:['上發條・桌面試車','打開／關閉車蓋'];
  $('#celebrateWatch').textContent=labels[0];$('#birdChirpBtn').textContent=labels[1];
}
$('#birdSpinBtn').onclick=()=>{world?.triggerWorkAction('spin');sound();};
$('#celebrateWatch').onclick=()=>{
  world?.triggerWorkAction('primary');sound(true);updateWorkActionLabels();syncMotion();
  if(getActiveBlueprint(craftingState).id==='clockwork-car'&&world?.getStats().work.carStage!=='parked'){$('#celebrate').hidden=true;$('#workRunBar').hidden=false;}
};
$('#workReturn').onclick=()=>{world?.triggerWorkAction('primary');$('#workReturn').disabled=true;};
$('#birdChirpBtn').onclick=()=>{world?.triggerWorkAction('secondary');sound();updateWorkActionLabels();};
$('#birdExplodeBtn').onclick=()=>{world?.triggerWorkAction('explode');sound();};

if ($('#birdCollectionModalBtn')) {
  $('#birdCollectionModalBtn').onclick = () => {
    $('#celebrate').hidden = true;
    showCollectionAndDetails(null);
  };
}

$('#celebrateNext').onclick = requestNewRound;

$('#skipCraftAnim').onclick = () => {
  world?.skipCraftingAnimation();
  $('#craftBanner').hidden = true;
  toast('已跳過配送動畫，零件已直接送達中央製作臺！');
};

syncPlayerUI();

function syncSound() {
  const button=$('#sound');if(!button)return;
  button.textContent=settings.sound?'♫ 音效開啟':'♫ 音效關閉';
  button.setAttribute('aria-pressed',String(settings.sound));
}
function toggleSound(){
  settings.sound=!settings.sound;
  world?.setSound(settings.sound,settings.volume);
  saveSettings();syncSound();sound();
}

reduced.addEventListener('change', syncMotion);

if ($('#cutawayToggle')) {
  $('#cutawayToggle').onclick = () => {
    settings.cutaway = !settings.cutaway;
    saveSettings();
    syncCutaway();
  };
}

$('#overview').onclick = () => {
  setHudExpanded(false);
  $('#detail').hidden = true;
  $('#residentCard').hidden = true;
  $('#celebrate').hidden = true;
  world?.overview();
  toast('已回到腦內工坊全景');
};

const clockPresets = [6.5, 11.2, 17.75, 22.25];
let clockPresetIdx = 1;
if ($('#clockCycleBtn')) {
  $('#clockCycleBtn').onclick = () => {
    clockPresetIdx = (clockPresetIdx + 1) % clockPresets.length;
    const nextH = clockPresets[clockPresetIdx];
    world?.setTime(nextH, true);
    sound();
  };
}

$('#focusBirdTool').onclick = () => {
  setHudExpanded(false);
  world?.focusWorkbench();
  openBirdShowcaseCard();
};

function playerPrompt() {
  if (isDemo) { toast('展示模式不記錄遊玩進度，請點「返回遊玩」開始挑戰。'); return; }
  if (!selected || workbench.active) return;
  if (roundSession.player) return launchPath(selected.id);
  $('#detail').hidden = true;
  $('#panelContent').innerHTML =
    '<div class="eyebrow">WORKSHOP CHALLENGE</div><h2>準備進入挑戰</h2>' +
    '<p>這一輪只需設定一次，四間工作室都會沿用。換人時請按「新一局」。</p>' +
    '<form id="workshopPlayerForm"><label class="player-setup-field">年齡組別<select id="workshopAge" required><option value="">請選擇年齡組別</option>' +
    AGES.map((label, i) => `<option value="${i}">${label}</option>`).join('') + '</select></label>' +
    '<label class="player-setup-field">玩家暱稱<input id="workshopPlayer" maxlength="10" placeholder="留白則使用「訪客」" autocomplete="off"></label>' +
    '<div class="settings-buttons"><button id="randomPlayer" type="button">🎲 隨機名稱</button></div>' +
    '<p class="muted">年齡僅供統計紀錄，不影響遊戲難度。</p>' +
    '<button class="primary" id="confirmPlayer" type="submit">確認並進入工作台 →</button></form>';
  open($('#panel'));
  $('#randomPlayer').onclick = () => {
    $('#workshopPlayer').value = window.BrainChallengeNames.next($('#workshopPlayer').value);
  };
  $('#workshopPlayerForm').onsubmit = event => {
    event.preventDefault();
    if (!$('#workshopPlayerForm').reportValidity() || workbench.active) return;
    const name = $('#workshopPlayer').value.trim() || '訪客';
    roundSession.confirm(name, Number($('#workshopAge').value));
    syncPlayerUI();
    $('#panel').close();
    launchPath(selected.id);
  };
}

function launchPath(type) {
  if (type === 'ranking' || type === 'config') {
    location.assign(settings.paths[type]);
    return;
  }
  const game = GAMES.find(g => g.id === type);
  if (game && roundSession.player) workbench.open({...game, index:GAMES.indexOf(game)});
}

$('#launch').onclick = playerPrompt;

function showCollectionAndDetails(focusGame = null) {
  const bp = getActiveBlueprint(craftingState);
  const e = escapeHTML;
  const studioSection = focusGame
    ? `<div class="eyebrow">STUDIO DETAILS · ${e(focusGame.zone)}</div>
       <h2>${e(focusGame.name)}</h2>
       <p>${e(focusGame.desc)}</p>
       <div class="info-grid">${focusGame.facts.map(f => `<span>${e(f)}</span>`).join('')}</div>
       <button class="primary" id="modalStartGame" type="button" style="margin-bottom:18px">開始「${e(focusGame.name)}」遊戲 →</button>`
    : `<div class="eyebrow">CENTRAL WORKBENCH BLUEPRINT</div>
       <h2>中央作品：${e(bp.name)}</h2>
       <p>${e(bp.description)}</p>`;

  const partsHtml = bp.parts
    .map(p => {
      const done = craftingState.installedParts.includes(p.id);
      return `<div class="part-card ${done ? 'installed' : ''}">
        <strong>${done ? '✓ ' : '○ '}${e(p.name)}</strong>
        <small>負責：${e(GAMES[p.studioIndex].zone)}</small>
        <small>${e(p.desc)}</small>
      </div>`;
    })
    .join('');

  $('#panelContent').innerHTML =
    studioSection +
    `<h3>${e(bp.name)}組裝藍圖（${craftingState.installedParts.length} / ${bp.parts.length}）</h3>` +
    `<div class="blueprint-grid">${partsHtml}</div>` +
    `<div class="settings-buttons">
      <button id="modalFocusWorkbench" type="button">⚙ 聚焦中央圓桌</button>
      <button id="modalNewWork" type="button">↻ 開始新一輪組裝</button>
    </div>`;

  open($('#panel'));

  const startBtn = $('#modalStartGame');
  if (startBtn && focusGame) {
    startBtn.onclick = () => {
      selected = focusGame;
      $('#panel').close();
      playerPrompt();
    };
  }
  $('#modalFocusWorkbench').onclick = () => {
    $('#panel').close();
    world?.focusWorkbench();
  };
  $('#modalNewWork').onclick = requestNewRound;
}

$('#moreGame').onclick = () => showCollectionAndDetails(selected);
$('#collectionBtn').onclick = () => showCollectionAndDetails(null);
$('#openCollectionLink').onclick = () => showCollectionAndDetails(null);

$('#reset').onclick = requestNewRound;

function manageRecords() {
  window.BrainRecordsTransfer.resetPreview(false);
  try {
    window.renderModalData(window.BrainRecordsData.readLocal().records);
    window.BrainRecordsTransfer.status('匯出包含全部紀錄；匯入前會先顯示預覽，不會立即更動資料。');
  } catch (error) {
    window.BrainRecordsTransfer.status(error.message, true);
  }
  open($('#recordsPanel'));
}

function rankings() {
  $('#detail').hidden = true;
  showRankings($('#panel'), $('#panelContent'), open, GAMES, window.BrainChallenge, manageRecords);
}

$('#ranking').onclick = rankings;
$('#recordsBack').onclick = rankings;

function consumeResult() {
  if (isDemo) return;
  const r = read(KEYS.result, null);
  const p = read(KEYS.pending, null);
  if (!r || !p) return;
  try {
    localStorage.removeItem(KEYS.result);
  } catch {}
  if (r.token !== p.token || r.gameId !== p.gameId || Date.now() - p.startedAt > 86400000) return;
  try {
    localStorage.removeItem(KEYS.pending);
  } catch {}
  if (r.status === 'completed') {
    handleGameFinished(r.gameId, {token: r.token, score: r.score});
  } else if (r.status === 'cancelled') {
    toast('已取消本局挑戰，返回腦內工坊（取消不會計入作品零件）。');
  }
}

window.addEventListener('storage', e => {
  if (e.key === KEYS.result) consumeResult();
});

function showCollectionRecords(){
  const e=escapeHTML,count=craftingState.collections.length;
  $('#panelContent').innerHTML=
    '<div class="eyebrow">WORKSHOP COLLECTION</div><h2>收藏紀錄</h2>'+
    (count?`<div class="info-grid">${BLUEPRINTS.map(b=>`<span>${b.icon} ${e(b.name)} × ${craftingState.collections.filter(c=>c.blueprintId===b.id).length}</span>`).join('')}</div>`:'<p class="muted">目前沒有收藏紀錄。</p>')+
    `<div class="settings-buttons"><button id="clearCollections" type="button" ${count?'':'disabled'}>清除收藏紀錄</button><button id="collectionBack" type="button">返回控制台</button></div>`+
    '<div id="collectionClearConfirm" class="collection-clear-confirm" hidden><p>清除全部收藏紀錄？目前作品、遊戲成績與設定都會保留。</p><div class="settings-buttons"><button id="confirmClearCollections" type="button">確認清除</button><button id="cancelClearCollections" type="button">取消</button></div></div>';
  open($('#panel'));
  $('#clearCollections').onclick=()=>{$('#collectionClearConfirm').hidden=false;$('#confirmClearCollections').focus();};
  $('#cancelClearCollections').onclick=()=>{$('#collectionClearConfirm').hidden=true;$('#clearCollections').focus();};
  $('#confirmClearCollections').onclick=()=>{
    craftingState=clearCollections(craftingState);persistCrafting();renderCraftingUI();showCollectionRecords();toast('已清除收藏紀錄，目前作品與遊戲成績保留。');
  };
  $('#collectionBack').onclick=settingsPanel;
}

function settingsPanel() {
  $('#panelContent').innerHTML =
    '<div class="eyebrow">WORKSHOP SETTINGS</div>' +
    '<h2>工坊控制台</h2>' +
    '<div class="settings-buttons control-shortcuts"><button id="lampControl" type="button">☀ 調整檯燈</button><button id="residentsButton" type="button">☺ 居民與動物</button><button id="collectionHistory" type="button">收藏紀錄</button></div>' +
    '<p class="muted">工坊進度會保存在這台瀏覽器；原有四款遊戲的設定與遊玩紀錄會繼續保留。</p>' +
    `<div class="settings-buttons"><button id="sound" type="button" aria-pressed="${settings.sound}">${settings.sound?'♫ 音效開啟':'♫ 音效關閉'}</button></div>` +
    `<label class="settings-field">工坊環境音效音量 <output id="volumeOutput">${Math.round(settings.volume * 100)}%</output>` +
    `<input id="volume" type="range" min="0" max="100" value="${Math.round(settings.volume * 100)}"></label>` +
    `<label class="settings-field">3D 畫面精細度 <output id="qualityOutput">${settings.quality.toFixed(2)}</output>` +
    `<input id="quality" type="range" min="1" max="1.75" step="0.05" value="${settings.quality}"></label>` +
    `<label class="settings-field">居民活動模式（切換後自動重啟工坊）` +
    `<select id="residentModeSelect">` +
    `<option value="classic" ${settings.residentMode !== 'dynamic' ? 'selected' : ''}>1. 經典規律模式（原版固定巡邏）</option>` +
    `<option value="dynamic" ${settings.residentMode === 'dynamic' ? 'selected' : ''}>2. 動態事件模式（24h 隨機組合事件）</option>` +
    `</select></label>` +
    `<p class="muted" style="margin-top:-4px;margin-bottom:10px;font-size:.84rem;">模式 2 會在基礎工作之餘，隨機組合「跨區請益、接力上發條、圓桌圍觀品評、偶遇動物夥伴」等動態事件；切換後會儲存並重新載入工坊。</p>` +
    '<div class="settings-buttons">' +
    `<button id="toggleMotionBtn" type="button">${settings.motion&&!reduced.matches?'Ⅱ 暫停日常動畫':'▷ 開啟日常動畫'}</button>` +
    '<button id="oldConfig" type="button">開啟原版遊戲 Config ↗</button>' +
    '</div>' +
    '<p><a href="?demo=1&amp;parts=4&amp;hour=11">開啟展示模式（不寫入遊玩進度）↗</a></p>' +
    `<label class="settings-field">測試作品<select id="testBlueprint">${BLUEPRINTS.map(b=>`<option value="${b.id}" ${b.id===craftingState.activeBlueprintId?'selected':''}>${b.name}</option>`).join('')}</select></label>` +
    '<div class="settings-buttons"><button id="completeAllLevels" type="button">✓ 完成所有關卡（測試用）</button></div>' +
    '<p class="muted">立即組裝所選作品的四個組件，不新增遊玩成績或收藏；一般模式會儲存工坊進度，展示模式僅本次有效。</p>';


  open($('#panel'));

  $('#volume').oninput = e => {
    settings.volume = +e.target.value / 100;
    world?.setSound(settings.sound,settings.volume);
    $('#volumeOutput').textContent = e.target.value + '%';
    saveSettings();
  };
  $('#volume').onchange = () => {world?.setSound(settings.sound,settings.volume);sound();};

  $('#quality').oninput = e => {
    settings.quality = +e.target.value;
    $('#qualityOutput').textContent = settings.quality.toFixed(2);
    world?.setQuality(settings.quality);
    saveSettings();
  };

  const modeSelect = $('#residentModeSelect');
  if (modeSelect) {
    modeSelect.onchange = e => {
      const nextMode = e.target.value === 'dynamic' ? 'dynamic' : 'classic';
      if (nextMode === settings.residentMode) return;
      settings.residentMode = nextMode;
      if (isDemo) {
        const u = new URL(location.href);
        u.searchParams.set('residentMode', nextMode);
        location.assign(u.toString());
        return;
      }
      saveSettings();
      location.reload();
    };
  }

  $('#toggleMotionBtn').onclick = () => {
    if(reduced.matches)return toast('目前依裝置的「減少動態效果」偏好暫停動畫。');
    settings.motion = !settings.motion;
    saveSettings();syncMotion();
  };

  $('#completeAllLevels').onclick = () => {
    if($('#testBlueprint').value!==craftingState.activeBlueprintId)craftingState=startNextWork(craftingState,$('#testBlueprint').value);
    craftingState=completeAllForTesting(craftingState);
    persistCrafting();
    renderCraftingUI();
    world?.skipCraftingAnimation();
    $('#panel').close();
    toast(`${getActiveBlueprint(craftingState).name}的四個組件已全部完成，可直接測試互動。`);
  };

  $('#sound').onclick=toggleSound;
  $('#oldConfig').onclick = () => launchPath('config');
  $('#lampControl').onclick=()=>{$('#panel').close();openLampCard();};
  $('#residentsButton').onclick=openResidentsPanel;
  $('#collectionHistory').onclick=showCollectionRecords;


}

let lampTest=false,lampMoving=false;
const lampInputs={pitch:'lampAngle',yaw:'lampYaw',heading:'lampHeading',intensity:'lampIntensity',x:'lampX',z:'lampZ'};
function openLampCard(){
  $('#lampCard').hidden=false;updateLampControls();
}
function updateLampControls(){
  for(const [key,id]of Object.entries(lampInputs)){
    $('#'+id).value=settings.lamp[key];
    $('#'+id+'Output').textContent=key==='intensity'?settings.lamp[key]+'%':['x','z'].includes(key)?Number(settings.lamp[key]).toFixed(2):settings.lamp[key]+'°';
  }
  $('#lampPreview').textContent=lampTest?'結束試亮':'試亮檯燈';
  $('#lampMove').textContent=lampMoving?'✓ 完成移動':'↔ 移動檯燈';$('#lampMove').setAttribute('aria-pressed',String(lampMoving));
  world?.setLampOptions(settings.lamp,lampTest);
}
$('#closeLamp').onclick=()=>{
  $('#lampCard').hidden=true;lampTest=false;lampMoving=false;world?.setLampMoveMode(false);updateLampControls();
};
for(const [key,id]of Object.entries(lampInputs))$('#'+id).oninput=e=>{
  settings.lamp=normalizeLamp({...settings.lamp,[key]:+e.target.value});
  settings.lampPitch=settings.lamp.pitch;settings.lampYaw=settings.lamp.yaw;
  updateLampControls();saveSettings();
};
$('#lampPreview').onclick=()=>{lampTest=!lampTest;updateLampControls();};
$('#lampMove').onclick=()=>{
  lampMoving=!lampMoving;world?.setLampMoveMode(lampMoving);updateLampControls();
  if(lampMoving)toast('拖曳檯燈，或點選左側桌面放置；也可使用位置滑桿。');
};
$('#lampReset').onclick=()=>{
  settings.lamp={...LAMP_DEFAULTS};settings.lampPitch=58;settings.lampYaw=-12;
  lampMoving=false;world?.setLampMoveMode(false);updateLampControls();saveSettings();
};


$('#settings').onclick = settingsPanel;


function setHudExpanded(expanded){
  $('#workshopHud').dataset.expanded=String(!!expanded);
  $('#hudToggle').setAttribute('aria-expanded',String(!!expanded));
  $('#hudToggle').title=expanded?'收合場景操作':'展開場景操作';
  $('#hudControls').hidden=!expanded;
}
$('#hudToggle').onclick=()=>setHudExpanded($('#hudToggle').getAttribute('aria-expanded')!=='true');
document.addEventListener('pointerdown',e=>{if(!$('#workshopHud').contains(e.target))setHudExpanded(false);});
const viewing=createViewingMode({root:document.body,canvas:$('#scene'),
  uiElements:document.querySelectorAll('body > :not(main):not(script), main > :not(.world), #world > :not(canvas)'),
  returnFocus:$('#hudToggle'),onChange(active){
    setHudExpanded(false);
    if(active){
      document.querySelectorAll('dialog[open]').forEach(d=>d.close());
      $('#detail').hidden=true;$('#residentCard').hidden=true;$('#celebrate').hidden=true;
      $('#lampCard').hidden=true;lampTest=false;lampMoving=false;world?.setLampMoveMode(false);updateLampControls();
      world?.dismissSpeech();
    }
    world?.setViewingMode(active);
  }});
$('#viewingMode').onclick=()=>viewing.enter();

try {
  const {createWorld} = await import('./scene.js');
  world = createWorld(
    $('#scene'),
    selectStudio,
    () => openBirdShowcaseCard(),
    () => {
      $('#loading').hidden = true;
      if (isDemo) {
        const requested=Number(displayParams.get('hour') ?? 11);
        world.setTime(Number.isFinite(requested)?requested:11,false);
        const view=displayParams.get('view');
        if (view==='bird') world.focusWorkbench();
        else if (/^[0-3]$/.test(view || '')) world.focus(Number(view));
        else world.overview();
        world.setPaused(true);
      }
      if (world.isSoftware) toast('目前使用相容繪圖模式，材質與動畫顯示較為簡化。');
    },
    error => {
      const message=error?.message || '無法建立繪圖畫面';
      $('#loading').textContent=`工坊未能完整載入：${message}。請完整解壓縮，透過 START-WINDOWS.cmd 或 Python 伺服器開啟，再重新整理。`;
    },
    {residentMode: settings.residentMode}
  );

  if (world) {
    world.setAmbientGate(
      () =>
        !viewing.active && !document.querySelector('dialog[open]') &&
        $('#detail').hidden &&
        $('#residentCard').hidden &&
        $('#celebrate').hidden
    );
    world.onLabels(positions => {
      if (innerWidth<650) return;
      const reserved=[...document.querySelectorAll('.wordmark,.top-actions,.intro,.workshop-log,.workshop-hud,.dock,.world-tools')]
        .filter(el=>!el.hidden).map(el=>el.getBoundingClientRect());
      const overlap=(a,b)=>a.left<b.right+8&&a.right>b.left-8&&a.top<b.bottom+8&&a.bottom>b.top-8;
      positions.forEach((p,i)=>{
        const label=$('#labels').children[i];if(!label)return;
        label.hidden=p.visible===false;if(label.hidden)return;
        const w=label.offsetWidth,h=label.offsetHeight;
        let chosen;
        for(const dy of [0,48,-48,90,-90]) {
          const x=Math.max(w/2+12,Math.min(innerWidth-w/2-12,p.x));
          const y=Math.max(h+12,Math.min(innerHeight-12,p.y+dy));
          const box={left:x-w/2,right:x+w/2,top:y-h,bottom:y};
          if(!reserved.some(r=>overlap(box,r))) {chosen={x,y,box};break;}
        }
        if(!chosen){label.hidden=true;return;}
        label.style.left=chosen.x+'px';label.style.top=chosen.y+'px';reserved.push(chosen.box);
      });
    });
    world.onClock((h, info = {}) => {
      const hour = Math.floor(h),
        minute = Math.floor((h - hour) * 60);
      $('#workshopClock').textContent = String(hour).padStart(2, '0') + ':' + String(minute).padStart(2, '0');
      if ($('#clockIcon')) $('#clockIcon').textContent = info.icon || (hour >= 6 && hour < 17 ? '☀' : hour >= 17 && hour < 20 ? '🌇' : '🌙');
      if ($('#clockPhase')) $('#clockPhase').textContent = (info.label || '24h 運轉中');
      document.body.dataset.timePhase = info.phase || 'day';
      if (info.skyCenter) document.documentElement.style.setProperty('--sky-center', info.skyCenter);
      if (info.skyEdge) document.documentElement.style.setProperty('--sky-edge', info.skyEdge);
    });
    world.onResident(showResident);
    world.onAnimal(showAnimal);
    world.onSpeech(showSpeech);
    world.onBubbles(renderBubbles);
    world.onGesture(() => {
      $('#detail').hidden = true;
      $('#residentCard').hidden = true;
    });
    world.onEvent(text => {
      $('#workshopLog').textContent = text;
      if(world.getStats().work.carStage==='parked'){$('#workRunBar').hidden=true;$('#workReturn').disabled=false;}
    });
    world.onCraftAnim(state => {
      const banner = $('#craftBanner');
      if (!banner) return;
      if (state.active) {
        banner.hidden = false;
        $('#craftBannerText').textContent = state.inTransit
          ? `⚙ ${state.studioName}居民正在將「${state.partName}」送往中央製作臺…`
          : state.birdCompleted
            ? `🎉 ${getActiveBlueprint(craftingState).name}四個組件已送達，合體展示！`
            : `✓ 「${state.partName}」已送達中央製作臺托盤！`;
      } else {
        banner.hidden = true;
      }
      if (state.delivered && state.birdCompleted) {
        openBirdShowcaseCard(state.edition || 1);
        if(getActiveBlueprint(craftingState).id==='clockwork-car'&&world.getStats().work.carStage!=='parked'){$('#celebrate').hidden=true;$('#workRunBar').hidden=false;}
        toast(`🎉 ${getActiveBlueprint(craftingState).name}已完成，試試它的展示動作！`);
      } else if (state.delivered && state.partName) {
        toast(`✓ 居民已將「${state.partName}」送達中央圓桌備料托盤！`);
      }
    });
    world.setLampOptions(settings.lamp);
    world.onLampChange(options=>{settings.lamp=normalizeLamp(options);updateLampControls();saveSettings();});
    world.onLamp(openLampCard);
    world.setQuality(settings.quality);
    syncCutaway();
    renderCraftingUI();
    syncMotion();
  }
} catch (e) {
  $('#loading').textContent = '3D 工坊場景載入失敗，請確認使用本機 HTTP 伺服器開啟。';
  console.error(e);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    setHudExpanded(false);
    $('#detail').hidden = true;
    $('#residentCard').hidden = true;
    world?.dismissSpeech();
  }
});

let trackedResident = null,
  trackedAnimal = null;

function showResident(r) {
  $('#detail').hidden = true;
  $('#celebrate').hidden = true;
  trackedResident = r.index;
  trackedAnimal = null;
  $('#residentCard').hidden = false;
  $('#residentEyebrow').textContent = `WORKSHOP RESIDENT · ${r.floor || 1}F`;
  $('#residentName').textContent = `${r.name} · ${r.role}`;
  $('#residentTask').textContent = r.index>=5?'咖啡與音樂休息區｜工作之餘，也享受工坊生活。':r.index===4?'中央升降臺與連通廊｜查看機構運作與通行狀況。':`${r.from} → ${r.to}｜負責：${r.cargo}`;
  $('#residentDispatch').hidden=r.index>=5;
  $('#residentDispatch').textContent=r.index===4?'搭乘升降臺 ⚙':'示範配送 ⚙';
  $('#residentActions').hidden = false;
  $('#animalActions').hidden = true;
  $('#residentReply').textContent = r.lastSpeech || `嗨！一起完成${getActiveBlueprint(craftingState).name}吧！`;
  $('#residentMood').textContent = (r.mood === '充滿幹勁' ? '♥ ' : r.mood === '專注製作' ? '⚙ ' : '☺ ') + (r.mood || '專注工作');
  updateResidentCard();
}

function showAnimal(a) {
  $('#detail').hidden = true;
  $('#celebrate').hidden = true;
  trackedAnimal = a.index;
  trackedResident = null;
  $('#residentCard').hidden = false;
  $('#residentEyebrow').textContent = `WORKSHOP COMPANION · ${a.floor || 1}F`;
  $('#residentName').textContent = `${a.icon} ${a.name} · ${a.species}`;
  $('#residentTask').textContent = `${a.home} · ${a.routine}`;
  $('#residentState').textContent = a.status;
  $('#residentCount').textContent = '點選下方按鈕跟牠互動，看看牠的反應！';
  $('#residentActions').hidden = true;
  $('#animalActions').hidden = false;
  $('#residentReply').textContent = a.status;
  $('#residentMood').textContent = '☺ ' + a.mood;
}

function updateResidentCard() {
  if (trackedResident === null || $('#residentCard').hidden) return;
  const r = world?.residents()[trackedResident];
  if (!r) return;
  $('#residentState').textContent = r.status;
  $('#residentCount').textContent =
    (r.index>=5?'咖啡・音樂・工坊日常':r.index===4?`本次已完成 ${r.inspections||0} 次巡視`:`本次已配送 ${r.completed} 趟材料`) + (r.friendship ? ` · 收到 ${r.friendship} 顆愛心` : '');
}

function showSpeech(s) {
  if (s.kind === 'resident' && trackedResident !== s.index) {
    showResident(world.residents()[s.index]);
  }
  if (s.kind === 'animal' && trackedAnimal !== s.index) {
    showAnimal(world.animals()[s.index]);
  }
  $('#residentReply').textContent = s.text;
  $('#residentMood').textContent = s.emote + ' ' + s.mood;
  if (s.kind === 'animal') $('#residentState').textContent = s.text;
  updateResidentCard();
}

function renderBubbles(items) {
  const layer = $('#speechLayer');
  const visible = items
    .filter(x => x.visible && (x.interactive || ($('#detail').hidden && $('#residentCard').hidden)))
    .sort((a, b) => Number(b.interactive) - Number(a.interactive) || b.until - a.until)
    .slice(0, 2);
  const used = new Set();
  const rects = [];
  const base = layer.getBoundingClientRect();
  const blocked = [...document.querySelectorAll('#detail,#residentCard,.workshop-hud,.dock,#craftBanner,.map-label')]
    .filter(e => !e.hidden)
    .map(e => {
      const r = e.getBoundingClientRect();
      return {x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height};
    });

  for (const b of visible) {
    let el = bubbleNodes.get(b.key);
    if (!el) {
      el = document.createElement('div');
      el.className = 'speech-bubble';
      el.innerHTML = '<strong></strong><span></span><button class="bubble-close" type="button">×</button>';
      const close = el.querySelector('button');
      close.setAttribute('aria-label', '關閉' + b.name + '的對話');
      close.onpointerdown = e => e.stopPropagation();
      close.onclick = e => {
        e.stopPropagation();
        world?.dismissSpeech(b.key);
      };
      layer.append(el);
      bubbleNodes.set(b.key, el);
    }
    el.querySelector('strong').textContent = `${b.emote} ${b.name} · ${b.mood}`;
    el.dataset.until = b.until;
    const chars = Array.from(b.text);
    el.querySelector('span').textContent = chars.length > 40 ? chars.slice(0, 40).join('') + '…' : b.text;
    el.classList.toggle('player-speech', b.interactive);

    const width = Math.min(window.innerWidth < 650 ? 195 : 220, layer.clientWidth - 24);
    const height = el.offsetHeight || 92;
    const clampX = x => Math.max(width / 2 + 8, Math.min(layer.clientWidth - width / 2 - 8, x));
    const clampY = y => Math.max(height + 10, Math.min(layer.clientHeight - 10, y));
    const options = [
      [b.x, b.y - 16],
      [b.x - width * 0.65, b.y - 16],
      [b.x + width * 0.65, b.y - 16],
      [b.x, b.y + height + 24]
    ];
    let chosen = null;
    for (const [cx, cy] of options) {
      const x = clampX(cx),
        y = clampY(cy);
      const r = {x: x - width / 2, y: y - height, w: width, h: height};
      if (
        ![...blocked, ...rects].some(
          a => a.x < r.x + r.w + 8 && a.x + a.w + 8 > r.x && a.y < r.y + r.h + 8 && a.y + a.h + 8 > r.y
        )
      ) {
        chosen = {x, y, r};
        break;
      }
    }
    el.hidden = !chosen;
    if (chosen) {
      el.style.left = chosen.x + 'px';
      el.style.top = chosen.y + 'px';
      el.style.setProperty('--tail', Math.max(12, Math.min(width - 12, b.x - chosen.x + width / 2)) + 'px');
      rects.push(chosen.r);
    }
    used.add(b.key);
  }
  for (const [key, el] of bubbleNodes) {
    if (!used.has(key)) {
      el.remove();
      bubbleNodes.delete(key);
    }
  }
}

setInterval(() => {
  updateResidentCard();
  for (const [key, el] of bubbleNodes) {
    if (performance.now() > Number(el.dataset.until)) {
      el.remove();
      bubbleNodes.delete(key);
    } else if (!el.isConnected) {
      bubbleNodes.delete(key);
    }
  }
}, 500);

$('#closeResident').onclick = () => {
  $('#residentCard').hidden = true;
  world?.dismissSpeech();
};
$('#residentWave').onclick = () => {
  world?.talkResident(trackedResident, 'hello');
  sound();
};
$('#residentAsk').onclick = () => {
  world?.talkResident(trackedResident, 'task');
  sound();
};
$('#residentCheer').onclick = () => {
  world?.talkResident(trackedResident, 'encourage');
  sound(true);
};
$('#residentDispatch').onclick = () => {
  world?.requestResidentAction(trackedResident);
  sound();
};
$('#animalPet').onclick = () => {
  world?.interactAnimal(trackedAnimal, 'pet');
  sound();
};
$('#animalFeed').onclick = () => {
  world?.interactAnimal(trackedAnimal, 'feed');
  sound(true);
};

function openResidentsPanel(){
  $('#panelContent').innerHTML =
    '<div class="eyebrow">WORKSHOP COMMUNITY</div>' +
    '<h2>工坊居民與動物夥伴</h2>' +
    `<p class="muted">目前模式：<strong>${settings.residentMode === 'dynamic' ? '2. 動態事件模式（隨機組合事件）' : '1. 經典規律模式（原版）'}</strong>｜點選任一居民或動物，鏡頭會移近並立即與他打招呼。</p>` +
    '<h3>動物夥伴</h3><div id="animalList"></div>' +
    '<h3>工坊居民名冊（8 位）</h3><div id="residentList"></div>';
  for (const a of world?.animals() || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'resident-row animal-row';
    b.textContent = `${a.icon} ${a.name} · ${a.species} — ${a.status}`;
    b.onclick = () => {
      $('#panel').close();
      world.visitAnimal(a.index);
    };
    $('#animalList').append(b);
  }
  for (const r of world?.residents() || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'resident-row';
    b.textContent = `[${r.floor}F] ${r.name} · ${r.role} — ${r.status}`;
    b.onclick = () => {
      $('#panel').close();
      world.visitResident(r.index);
    };
    $('#residentList').append(b);
  }
  open($('#panel'));
}

function navigationMode(mode) {
  world?.setNavigationMode(mode);
  $('#rotateMode').setAttribute('aria-pressed', String(mode === 'rotate'));
  $('#panMode').setAttribute('aria-pressed', String(mode === 'pan'));
  $('#scene').setAttribute(
    'aria-label',
    mode === 'pan'
      ? '平移模式：拖曳移動畫面，滾輪縮放。'
      : '旋轉模式：左鍵旋轉，右鍵平移，滾輪縮放。'
  );
}
$('#rotateMode').onclick = () => navigationMode('rotate');
$('#panMode').onclick = () => navigationMode('pan');

persistCrafting();
renderCraftingUI();
consumeResult();
flushNativeCompletions();

// Auto-fade studio callout bubbles (#labels) after 5 seconds of pointer inactivity; fade back in on any mouse/touch action
let studioLabelsIdleTimer = null;
function wakeStudioLabels() {
  const el = $('#labels');
  if (!el) return;
  el.classList.remove('idle-hidden');
  clearTimeout(studioLabelsIdleTimer);
  studioLabelsIdleTimer = setTimeout(() => {
    el.classList.add('idle-hidden');
  }, 5000);
}
['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(evt => {
  window.addEventListener(evt, wakeStudioLabels, {passive: true});
});
wakeStudioLabels();
