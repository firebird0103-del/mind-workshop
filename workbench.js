import layoutSettings from './workbench-layout-settings.js';
import {applyLayoutSettings} from './native-games/layout-settings.js';
import './native-games/assets.js';
import {createGameRuntime} from './native-games/runtime.js';
import {createSessionToken} from './round-session.js';
import * as time from './native-games/time.js';
import * as spot from './native-games/spot.js';
import * as memory from './native-games/memory.js';
import * as ruleSwitch from './native-games/switch.js';
import {prepareLayout, observeLayout} from './native-games/layout.js';

const modules = {time, spot, memory, switch: ruleSwitch};
const theme = new URL('./native-games/workbench-theme.css', import.meta.url).href;

export function createWorkbench({getPlayer, beforeOpen, onVisibility, onComplete, onReturn}) {
  const dialog = document.getElementById('workbench');
  const body = document.getElementById('workbenchBody');
  const frame = document.getElementById('workbenchFrame');
  const prompt = document.getElementById('workbenchExitPrompt');
  const shadow = document.getElementById('workbenchGame').attachShadow({mode: 'open'});
  const phaseLabel = document.getElementById('workbenchPhase');
  let runtime = null, layout = null, revision = 0, game = null, visitToken = null, launching = false, closing = false, returnFocus = null;

  function setPhase(phase) {
    dialog.dataset.phase = phase;
    phaseLabel.textContent = {loading:'準備工作台', ready:'準備挑戰', playing:'挑戰進行中', finished:'挑戰完成'}[phase] || '';
  }
  function restoreFocus() {
    if (returnFocus?.isConnected && returnFocus.getClientRects().length) returnFocus.focus({preventScroll:true});
    else document.querySelector(`[data-game="${game?.index ?? 0}"]`)?.focus({preventScroll:true});
  }
  function close() {
    if (closing) return;
    closing = true;
    revision++; launching = false;
    runtime?.dispose(); runtime = null;
    layout?.dispose(); layout = null;
    frame.inert = true; prompt.hidden = true;
    dialog.classList.add('is-closing');
    const finish = () => {
      shadow.replaceChildren(); dialog.close(); dialog.classList.remove('is-closing'); frame.inert = false;
      closing = false; onVisibility(false); onReturn(); restoreFocus();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 160);
  }
  function stay() {
    prompt.hidden = true; frame.inert = false; runtime?.resume();
    document.getElementById('workbenchClose').focus({preventScroll:true});
  }
  function requestClose() {
    if (!dialog.open || closing) return;
    if (!prompt.hidden) return stay();
    if (runtime?.state !== 'playing') return close();
    runtime.pause(); prompt.hidden = false; frame.inert = true;
    document.getElementById('workbenchStay').focus({preventScroll:true});
  }
  function stylesheet(href) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
    const loaded = new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = () => reject(new Error('工作台樣式載入失敗，請確認已完整解壓縮。'));
    });
    shadow.append(link); return loaded;
  }
  async function mount() {
    const currentRevision = ++revision;
    runtime?.dispose(); runtime = null;
    layout?.dispose(); layout = null;
    setPhase('loading'); body.scrollTop = 0;
    shadow.replaceChildren();
    const loading = document.createElement('p'); loading.className = 'bench-loading'; loading.textContent = '正在準備工作台…'; shadow.append(loading);
    try {
      const mod = modules[game.id];
      await Promise.all([stylesheet(mod.stylesheet), stylesheet(theme)]);
      if (currentRevision !== revision || !dialog.open) return;
      loading.remove();
      const template = document.createElement('template'); template.innerHTML = mod.template;
      shadow.append(template.content.cloneNode(true));
      const presentation = applyLayoutSettings(dialog,shadow.querySelector('.game-root'),layoutSettings);
      prepareLayout(shadow,game.id);
      layout = observeLayout(shadow,body,game.id,presentation);
      const player = getPlayer();
      runtime = createGameRuntime(shadow, {
        player,
        onComplete: record => onComplete({gameId: game.id, token: visitToken, score: record.score}),
        onState: setPhase,
        onHome: requestClose,
        onRetry: () => { if (runtime?.state === 'finished') mount(); }
      });
      runtime.requestLayout = layout.request;
      setPhase('ready'); mod.mount(runtime);
      // Each instance installs its original viewport resize handlers in its scope.
      body.scrollTop = 0;
      (shadow.querySelector('[data-action="startGame"], [data-action="initGame"]') || body).focus({preventScroll:true});
    } catch (error) {
      if (currentRevision !== revision || !dialog.open) return;
      runtime?.dispose(); runtime = null;
      layout?.dispose(); layout = null;
      shadow.replaceChildren();
      const p = document.createElement('p'); p.textContent = error.message; shadow.append(p);
      setPhase('ready');
      console.error('Native workbench:', error);
    }
  }
  document.getElementById('workbenchClose').addEventListener('click', requestClose);
  document.getElementById('workbenchLeave').addEventListener('click', close);
  document.getElementById('workbenchStay').addEventListener('click', stay);
  dialog.addEventListener('cancel', event => {event.preventDefault(); requestClose();});
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) requestClose();
  });
  return {
    get active() { return dialog.open || launching; },
    async open(nextGame) {
      if (dialog.open || launching) return;
      launching = true; returnFocus = document.activeElement;
      game = nextGame; visitToken = createSessionToken();
      beforeOpen(nextGame);
      // Keep the existing camera flight visible before the modal pauses daily life.
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await new Promise(resolve => setTimeout(resolve, 560));
      dialog.style.setProperty('--studio', game.color);
      dialog.style.setProperty('--studio-tint', game.tint);
      document.getElementById('workbenchTitle').textContent = game.name;
      document.getElementById('workbenchStudio').textContent = game.zone;
      const player = getPlayer();
      document.getElementById('workbenchPlayer').textContent = `${player.name} · ${player.ageLabel}`;
      dialog.showModal(); onVisibility(true); launching = false;
      await mount();
    },
    requestClose
  };
}
