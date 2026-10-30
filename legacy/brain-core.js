/* 心智大作戰｜Core 3.0
 * 共用：遊戲註冊、玩家資料、成績儲存、導頁與 Touch / Pointer 基礎能力。
 * 本檔刻意保持輕量，不介入既有遊戲的核心玩法。
 */
(function (window) {
  'use strict';

  const MODULES = window.BrainChallengeModules;
  const getGameRegistry = () => MODULES ? MODULES.list() : [];
  const LEGACY_NAME_MAP = Object.freeze(
    MODULES?.legacyNameMap || {}
  );

  const Storage = {
    get(key, fallback = null) {
      try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
    },
    getJSON(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) { return fallback; }
    },
    setJSON(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; }
    },
    sessionGet(key, fallback = null) {
      try { return sessionStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
    },
    sessionSet(key, value) {
      try { sessionStorage.setItem(key, value); return true; } catch (_) { return false; }
    }
  };

  const Player = {
    getName() { return Storage.sessionGet('currentPlayerName', '訪客') || '訪客'; },
    setName(name) { Storage.sessionSet('currentPlayerName', (name || '訪客').trim() || '訪客'); },
    getAge() { return Storage.get('currentUserAge', '未設定') || '未設定'; },
    setAge(age) { Storage.set('currentUserAge', age || ''); }
  };

  const Scores = {
    normalize(record) {
      if (!record || typeof record !== 'object') return record;
      return Object.assign({}, record, {
        gameName: LEGACY_NAME_MAP[record.gameName] || record.gameName || '未命名遊戲'
      });
    },
    getHistory() {
      const history = Storage.getJSON('game_history', []);
      return Array.isArray(history) ? history.map(this.normalize) : [];
    },
    save(record) {
      const history = this.getHistory();
      const idBytes = new Uint8Array(16);
      window.crypto.getRandomValues(idBytes);
      const saved = Object.assign({}, record, {
        recordId: 'play-' + Array.from(idBytes, n => n.toString(16).padStart(2, '0')).join(''),
        recordedAtISO: new Date().toISOString(), appVersion: '10.7'
      });
      history.push(this.normalize(saved));
      Storage.setJSON('game_history', history);
      return history;
    },
    clear() { return Storage.setJSON('game_history', []); }
  };

  const Navigation = {
    homeUrl: 'index.html',
    goHome() { window.location.href = this.homeUrl; },
    goGame(gameId) {
      const game = MODULES?.get?.(gameId);
      if (game && game.enabled === false) return;
      if (game) window.location.href = game.file;
    }
  };

  function onPress(element, handler, options) {
    if (!element || typeof handler !== 'function') return () => {};
    const opts = options || {};
    const listener = function (event) {
      if (event.type === 'pointerdown' && opts.preventDefault !== false) event.preventDefault();
      handler(event);
    };
    element.addEventListener('pointerup', listener, { passive: false });
    element.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handler(event);
      }
    });
    return () => {
      element.removeEventListener('pointerup', listener);
    };
  }



  const GameShell = {
    feedback(options) {
      return window.BrainChallengeFeedback?.show(options) || false;
    },
    hideFeedback(layerId) {
      return window.BrainChallengeFeedback?.hide(layerId) || false;
    },
    animateScore(elementOrId) {
      return window.BrainChallengeFeedback?.scorePop(elementOrId) || false;
    },
    setProgress(fillOrId, current, total) {
      return window.BrainChallengeFeedback?.progress(fillOrId, current, total) || false;
    }
  };

  const GameLifecycle = (function () {
    let active = null;

    function emit(action, detail) {
      try {
        window.dispatchEvent(new CustomEvent('brain:game-lifecycle', { detail: Object.assign({ action }, detail || {}) }));
      } catch (_) {}
    }

    function invoke(id, hook, context) {
      const module = MODULES?.get?.(id);
      const fn = module?.lifecycle?.[hook];
      if (typeof fn !== 'function') return { ok: true, skipped: true };
      try {
        const result = fn(Object.assign({ id, module: module }, context || {}));
        return { ok: true, result };
      } catch (error) {
        emit('error', { id, hook, error });
        return { ok: false, error };
      }
    }

    return {
      current() { return active ? Object.assign({}, active) : null; },
      start(id, context) {
        const module = MODULES?.get?.(id);
        if (!module) return { ok: false, error: new Error(`找不到遊戲模組：${id}`) };
        if (module.enabled === false) return { ok: false, error: new Error(`遊戲模組已停用：${id}`) };
        if (active && active.id !== id) this.stop(context);
        if (!active) {
          const created = invoke(id, 'create', context);
          if (!created.ok) return created;
          const mounted = invoke(id, 'mount', context);
          if (!mounted.ok) return mounted;
          active = { id, state: 'mounted' };
        }
        const started = invoke(id, 'start', context);
        if (!started.ok) return started;
        active.state = 'running';
        emit('start', { id, module: module });
        return { ok: true, module: module };
      },
      pause(context) {
        if (!active || active.state !== 'running') return { ok: true, skipped: true };
        const result = invoke(active.id, 'pause', context);
        if (result.ok) { active.state = 'paused'; emit('pause', { id: active.id }); }
        return result;
      },
      resume(context) {
        if (!active || active.state !== 'paused') return { ok: true, skipped: true };
        const result = invoke(active.id, 'resume', context);
        if (result.ok) { active.state = 'running'; emit('resume', { id: active.id }); }
        return result;
      },
      stop(context) {
        if (!active) return { ok: true, skipped: true };
        const id = active.id;
        const stopped = invoke(id, 'stop', context);
        const destroyed = invoke(id, 'destroy', context);
        active = null;
        emit('stop', { id });
        return { ok: stopped.ok && destroyed.ok, stopped, destroyed };
      }
    };
  })();

  const BrainChallenge = {
    config: window.BrainChallengeConfigAPI || null,
    version: '3.3.0',
    get games() { return getGameRegistry(); },
    get gameRegistry() { return getGameRegistry(); },
    legacyGameNameMap: LEGACY_NAME_MAP,
    storage: Storage,
    player: Player,
    scores: Scores,
    navigation: Navigation,
    onPress,
    gameShell: GameShell,
    getGame(id) { return MODULES?.get?.(id) || null; },
    registerGameModule(module, options) { return MODULES?.register?.(module, options) || { ok: false, errors: ['Game Module API 不可用'] }; },
    unregisterGameModule(id) { return MODULES?.unregister?.(id) || { ok: false, errors: ['Game Module API 不可用'] }; },
    setGameEnabled(id, enabled) { return MODULES?.setEnabled?.(id, enabled) || { ok: false, errors: ['Game Module API 不可用'] }; },
    normalizeGameName(name) { return LEGACY_NAME_MAP[name] || name; },
    currentGameId() { return document.body?.dataset.gameId || null; },
    audio: window.BrainChallengeAudio || null,
    feedback: window.BrainChallengeFeedback || null,
    modules: MODULES || null,
    lifecycle: GameLifecycle
  };

  window.BrainChallenge = BrainChallenge;

  const initialGameId = BrainChallenge.currentGameId();
  if (initialGameId) {
    window.addEventListener('beforeunload', function () { GameLifecycle.stop({ reason: 'page-unload' }); }, { once: true });
    GameLifecycle.start(initialGameId, { root: document.body, reason: 'page-load' });
  }

  document.documentElement.dataset.brainVersion = BrainChallenge.version;
  document.documentElement.dataset.brainPhase = '2-step5';
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('orientationchange', function () {
    window.setTimeout(() => window.scrollTo(0, 0), 180);
  }, { passive: true });
})(window);
