// Instance-owned DOM, clock, timers, feedback, and audio. No global game hooks.
export function createGameRuntime(root, {player, onComplete, onRetry, onHome, onState}) {
  const realWindow = globalThis.window;
  const realDocument = globalThis.document;
  const original = realWindow.BrainChallenge;
  const controller = new AbortController();
  const timers = new Map();
  const audioNodes = new Set();
  let alive = true, started = false, finished = false, pausedAt = null, pausedTotal = 0, nextTimer = 1;
  const realNow = () => globalThis.performance.now();
  const epoch = globalThis.Date.now() - realNow();
  const gameNow = () => (pausedAt ?? realNow()) - pausedTotal;
  const scopedNow = () => Math.floor(epoch + gameNow());
  class GameDate extends globalThis.Date { static now() { return scopedNow(); } }
  function schedule(entry) {
    entry.since = realNow();
    entry.native = realWindow.setTimeout(() => {
      timers.delete(entry.id);
      if (alive) entry.fn(...entry.args);
    }, entry.remaining);
  }
  function setTimeout(fn, delay = 0, ...args) {
    if (!alive) return 0;
    const id = nextTimer++;
    const entry = {id, fn, args, remaining: Math.max(0, Number(delay) || 0)};
    timers.set(id, entry);
    if (pausedAt === null) schedule(entry);
    return id;
  }
  function clearTimeout(id) {
    const entry = timers.get(id);
    if (entry) realWindow.clearTimeout(entry.native);
    timers.delete(id);
  }
  function listen(target, type, fn, options = {}) {
    target.addEventListener(type, fn, {...(typeof options === 'boolean' ? {capture: options} : options), signal: controller.signal});
  }
  const doc = {
    body: root.querySelector('.game-root'),
    getElementById: id => root.getElementById(id),
    querySelector: selector => root.querySelector(selector),
    querySelectorAll: selector => root.querySelectorAll(selector),
    createElement: tag => realDocument.createElement(tag),
    addEventListener: (type, fn, options) => listen(root, type, fn, options),
    removeEventListener: (type, fn, options) => root.removeEventListener(type, fn, options),
    fonts: realDocument.fonts
  };
  const win = {
    setTimeout, clearTimeout,
    addEventListener: (type, fn, options) => listen(realWindow, type, fn, options),
    removeEventListener: (type, fn, options) => realWindow.removeEventListener(type, fn, options),
    matchMedia: (...args) => realWindow.matchMedia(...args),
    scrollTo: () => {},
    BrainChallengeAssets: realWindow.BrainChallengeAssets,
    get innerHeight() { return realDocument.getElementById('workbenchBody').getBoundingClientRect().bottom; }
  };
  const presets = {
    tap: {frequency:560,duration:.060,type:'sine',gain:.060},
    correct: {frequency:760,duration:.12,type:'sine',gain:.075},
    wrong: {frequency:210,duration:.13,type:'triangle',gain:.060},
    complete: {frequency:900,duration:.18,type:'sine',gain:.080}
  };
  const audio = {
    unlock: () => original.audio?.unlock?.(),
    play(name) {
      const shared = original.audio;
      if (!alive || !shared?.enabled) return false;
      try {
        shared.unlock();
        const ctx = shared._ensureContext();
        if (!ctx || !shared._masterGain) return false;
        const p = presets[name] || presets.tap, t = ctx.currentTime;
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = p.type; osc.frequency.setValueAtTime(p.frequency, t);
        gain.gain.setValueAtTime(.0001, t);
        gain.gain.exponentialRampToValueAtTime(p.gain, t + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, t + p.duration);
        osc.connect(gain); gain.connect(shared._masterGain); audioNodes.add(osc);
        osc.onended = () => {audioNodes.delete(osc); osc.disconnect(); gain.disconnect();};
        osc.start(t); osc.stop(t + p.duration + .02); return true;
      } catch { return false; }
    }
  };
  let feedbackTimer;
  const layer = () => doc.getElementById('game-feedback');
  const shell = {
    feedback({type = 'info', title = '', message = '', duration = 1500, sound = true}) {
      const el = layer(); if (!alive || !el) return false;
      el.className = 'game-feedback is-visible feedback-' + type;
      const heading = realDocument.createElement('strong'), copy = realDocument.createElement('span');
      heading.textContent = title; copy.textContent = message; el.replaceChildren(heading, copy);
      clearTimeout(feedbackTimer);
      if (duration) feedbackTimer = setTimeout(() => shell.hideFeedback(), duration);
      if (sound) audio.play(type === 'wrong' ? 'wrong' : type === 'info' ? 'tap' : 'correct');
      return true;
    },
    hideFeedback() { layer()?.classList.remove('is-visible'); },
    animateScore(el) {
      if (!el) return;
      el.classList.remove('score-bump'); void el.offsetWidth; el.classList.add('score-bump');
      setTimeout(() => el.classList.remove('score-bump'), 520);
    },
    setProgress(el, current, total) {
      if (!el || !total) return;
      const value = Math.max(0, Math.min(current, total));
      el.style.width = value / total * 100 + '%';
      el.setAttribute('aria-valuenow', value); el.setAttribute('aria-valuemax', total);
    }
  };
  const api = {
    ...original, audio, gameShell: shell,
    player: {getName: () => player.name, getAge: () => player.age},
    navigation: {goHome: onHome},
    scores: {
      save(record) {
        if (!alive || finished) return original.scores.getHistory();
        const pinned = {...record, playerName: player.name, age: player.age};
        const history = original.scores.save(pinned);
        finished = true; doc.body.dataset.phase = 'finished';
        onState('finished'); onComplete(history.at(-1) || pinned);
        return history;
      }
    }
  };
  win.BrainChallenge = api;
  const runtime = {
    document: doc, window: win, BrainChallenge: api,
    BrainChallengeAssets: win.BrainChallengeAssets,
    BrainChallengeConfigAPI: realWindow.BrainChallengeConfigAPI,
    BrainChallengeLayout: realWindow.BrainChallengeLayout,
    BrainInterference: realWindow.BrainInterference,
    Date: GameDate, performance: {now: gameNow},
    setTimeout, clearTimeout,
    markStarted() { if (!alive || started) return; started = true; doc.body.dataset.phase = 'playing'; onState('playing'); },
    get state() { return finished ? 'finished' : started ? 'playing' : 'ready'; },
    get timerCount() { return timers.size; },
    bindActions(actions) {
      listen(root, 'click', event => {
        if (!alive || pausedAt !== null) return;
        const button = event.target.closest?.('[data-action]');
        if (!button || button.disabled || !button.getClientRects().length) return;
        const action = button.dataset.action;
        if (action === 'retry') return onRetry();
        if (action === 'home') return onHome();
        if (['startGame','initGame'].includes(action) && started) return;
        actions[action]?.();
      });
    },
    pause() {
      if (!alive || pausedAt !== null) return;
      pausedAt = realNow();
      for (const entry of timers.values()) {
        realWindow.clearTimeout(entry.native);
        entry.remaining = Math.max(0, entry.remaining - (pausedAt - entry.since));
      }
      root.querySelectorAll('*').forEach(el => el.getAnimations().forEach(a => a.pause()));
    },
    resume() {
      if (!alive || pausedAt === null) return;
      pausedTotal += realNow() - pausedAt; pausedAt = null;
      for (const entry of timers.values()) schedule(entry);
      root.querySelectorAll('*').forEach(el => el.getAnimations().forEach(a => a.play()));
    },
    dispose() {
      if (!alive) return;
      alive = false; controller.abort();
      for (const id of [...timers.keys()]) clearTimeout(id);
      root.querySelectorAll('*').forEach(el => el.getAnimations().forEach(a => a.cancel()));
      for (const osc of audioNodes) {try {osc.stop();} catch {}}
      audioNodes.clear();
    }
  };
  return runtime;
}
