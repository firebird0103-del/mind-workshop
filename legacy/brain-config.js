/* 心智大作戰｜Game Config Layer
 * Phase 2 - Step 8
 * 集中管理遊戲參數，並提供 Module 對應、暫時覆寫與還原 API。
 * v8：語意判斷預設與展示模式為 10 題；其他參數維持原設定。
 */
(function (root) {
  'use strict';

  const defaults = {
    version: 1,
    clock: {
      rounds: 5,
      scoring: { fullScore: 100, partialScore: 50, zeroScore: 0 },
      angleTolerance: { hour: 12, minute: 12 },
      time: { hourMin: 1, hourMax: 12, minuteMin: 0, minuteMax: 59, uniqueQuestions: true }
    },
    attention: {
      rounds: 3,
      gridSizes: [4, 5, 6],
      differencesPerRound: 3,
      scoring: { startingScore: 100, wrongPenalty: 5, minimumScore: 10 }
    },
    memory: {
      rounds: 3,
      sequenceLength: 5,
      sequence: { imageDurationMs: 1200, imageGapMs: 300, countdownStepMs: 1000, countdownGoMs: 1000 },
      answerOptions: { distractorCount: 15 },
      scoring: { exact: 100, orderedComplete: 80, partialPerCorrect: 15 }
    },
    executive: {
      rounds: 10,
      optionsPerRound: 4,
      switchEvery: 1,
      startingRule: 'color',
      scoring: { correct: 100, wrong: 0 }
    }
  };

  const presets = Object.freeze({
    exhibition: deepClonePreset({
      clock: { rounds: 5, scoring: { fullScore: 100, partialScore: 50, zeroScore: 0 }, angleTolerance: { hour: 12, minute: 12 }, time: { hourMin: 1, hourMax: 12, minuteMin: 0, minuteMax: 59, uniqueQuestions: true } },
      attention: { rounds: 3, gridSizes: [4, 5, 6], differencesPerRound: 3, scoring: { startingScore: 100, wrongPenalty: 5, minimumScore: 10 } },
      memory: { rounds: 3, sequenceLength: 5, sequence: { imageDurationMs: 1200, imageGapMs: 300, countdownStepMs: 1000, countdownGoMs: 1000 }, answerOptions: { distractorCount: 15 }, scoring: { exact: 100, orderedComplete: 80, partialPerCorrect: 15 } },
      executive: { rounds: 10, optionsPerRound: 4, switchEvery: 1, startingRule: 'color', scoring: { correct: 100, wrong: 0 } }
    }),
    challenge: {
      clock: { rounds: 5, scoring: { fullScore: 100, partialScore: 50, zeroScore: 0 }, angleTolerance: { hour: 8, minute: 8 }, time: { hourMin: 1, hourMax: 12, minuteMin: 0, minuteMax: 59, uniqueQuestions: true } },
      attention: { rounds: 3, gridSizes: [5, 6, 7], differencesPerRound: 4, scoring: { startingScore: 100, wrongPenalty: 5, minimumScore: 10 } },
      memory: { rounds: 3, sequenceLength: 6, sequence: { imageDurationMs: 1000, imageGapMs: 250, countdownStepMs: 1000, countdownGoMs: 1000 }, answerOptions: { distractorCount: 15 }, scoring: { exact: 100, orderedComplete: 80, partialPerCorrect: 15 } },
      executive: { rounds: 6, optionsPerRound: 6, switchEvery: 1, startingRule: 'color', scoring: { correct: 100, wrong: 0 } }
    }
  });

  function deepClonePreset(value) {
    if (Array.isArray(value)) return value.map(deepClonePreset);
    if (value && typeof value === 'object') {
      const output = {};
      Object.keys(value).forEach(key => { output[key] = deepClonePreset(value[key]); });
      return output;
    }
    return value;
  }

  const moduleConfigMap = Object.freeze({
    clock: 'clock',
    attention: 'attention',
    memory: 'memory',
    executive: 'executive'
  });

  const STORAGE_KEY = 'brain_challenge_game_config_v1';
  const MODE_STORAGE_KEY = 'brain_challenge_game_mode_v1';

  function loadPersisted() {
    try {
      const raw = root.localStorage ? root.localStorage.getItem(STORAGE_KEY) : null;
      if (!raw) return deepClone(defaults);
      const parsed = JSON.parse(raw);
      const candidate = deepMerge(defaults, parsed);
      // Upgrade the old exhibition default without changing custom/challenge settings.
      if (root.localStorage.getItem(MODE_STORAGE_KEY) === 'exhibition' && candidate.executive.rounds === 5) {
        candidate.executive.rounds = defaults.executive.rounds;
      }
      validate(candidate);
      return candidate;
    } catch (_) {
      return deepClone(defaults);
    }
  }

  function loadMode() {
    try {
      const raw = root.localStorage ? root.localStorage.getItem(MODE_STORAGE_KEY) : null;
      if (raw === 'challenge' || raw === 'exhibition' || raw === 'custom') return raw;
      const hasPersistedConfig = root.localStorage ? !!root.localStorage.getItem(STORAGE_KEY) : false;
      return hasPersistedConfig ? 'custom' : 'exhibition';
    } catch (_) {
      return 'exhibition';
    }
  }

  let active = loadPersisted();
  let activeMode = loadMode();

  function deepClone(value) {
    if (Array.isArray(value)) return value.map(deepClone);
    if (value && typeof value === 'object') {
      const output = {};
      Object.keys(value).forEach(key => { output[key] = deepClone(value[key]); });
      return output;
    }
    return value;
  }

  function deepMerge(base, patch) {
    const output = deepClone(base);
    if (!patch || typeof patch !== 'object') return output;
    Object.keys(patch).forEach(key => {
      const value = patch[key];
      if (value && typeof value === 'object' && !Array.isArray(value) && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])) {
        output[key] = deepMerge(output[key], value);
      } else {
        output[key] = deepClone(value);
      }
    });
    return output;
  }

  function validate(config) {
    if (!config || typeof config !== 'object') throw new Error('Config must be an object.');
    if (!config.clock || !config.attention || !config.memory || !config.executive) throw new Error('Missing required game config sections.');
    if (!Number.isInteger(config.clock.rounds) || config.clock.rounds < 1) throw new Error('clock.rounds must be a positive integer.');
    if (!Number.isInteger(config.attention.rounds) || config.attention.rounds < 1) throw new Error('attention.rounds must be a positive integer.');
    if (!Array.isArray(config.attention.gridSizes) || config.attention.gridSizes.length < config.attention.rounds) throw new Error('attention.gridSizes must cover every round.');
    if (!Number.isInteger(config.memory.rounds) || config.memory.rounds < 1) throw new Error('memory.rounds must be a positive integer.');
    if (!Number.isInteger(config.memory.sequenceLength) || config.memory.sequenceLength < 1) throw new Error('memory.sequenceLength must be a positive integer.');
    if (!config.memory.sequence || config.memory.sequence.imageDurationMs <= 0 || config.memory.sequence.imageGapMs < 0 || config.memory.sequence.countdownStepMs <= 0 || config.memory.sequence.countdownGoMs <= 0) throw new Error('memory sequence timing is invalid.');
    if (!Number.isInteger(config.executive.rounds) || config.executive.rounds < 1) throw new Error('executive.rounds must be a positive integer.');
    if (!Number.isInteger(config.executive.optionsPerRound) || config.executive.optionsPerRound < 3) throw new Error('executive.optionsPerRound must be at least 3.');
    if (!Number.isInteger(config.executive.switchEvery) || config.executive.switchEvery < 1) throw new Error('executive.switchEvery must be a positive integer.');
    if (!config.executive.scoring || Number(config.executive.scoring.correct) < 0 || Number(config.executive.scoring.wrong) < 0) throw new Error('executive scoring is invalid.');
    return true;
  }

  function get(gameId) {
    if (!Object.prototype.hasOwnProperty.call(active, gameId)) throw new Error('Unknown game config: ' + gameId);
    return deepClone(active[gameId]);
  }

  function getDefaults(gameId) {
    if (!Object.prototype.hasOwnProperty.call(defaults, gameId)) throw new Error('Unknown default game config: ' + gameId);
    return deepClone(defaults[gameId]);
  }

  function getForModule(moduleId) {
    const configKey = moduleConfigMap[moduleId];
    if (!configKey) return null;
    return get(configKey);
  }

  function getConfigKey(moduleId) {
    return moduleConfigMap[moduleId] || null;
  }

  function setRuntime(gameId, patch) {
    if (!Object.prototype.hasOwnProperty.call(active, gameId)) throw new Error('Unknown game config: ' + gameId);
    const candidate = deepMerge(active, { [gameId]: patch });
    validate(candidate);
    active = candidate;
    activeMode = 'custom';
    try { root.localStorage.setItem(MODE_STORAGE_KEY, activeMode); } catch (_) {}
    emit('set-runtime', { gameId: gameId, config: get(gameId) });
    return get(gameId);
  }

  function reset(gameId) {
    if (!Object.prototype.hasOwnProperty.call(defaults, gameId)) throw new Error('Unknown game config: ' + gameId);
    active = deepMerge(active, { [gameId]: defaults[gameId] });
    activeMode = 'custom';
    try { root.localStorage.setItem(MODE_STORAGE_KEY, activeMode); } catch (_) {}
    emit('reset', { gameId: gameId, config: get(gameId) });
    return get(gameId);
  }

  function resetAll() {
    active = deepClone(defaults);
    activeMode = 'exhibition';
    try { root.localStorage.setItem(MODE_STORAGE_KEY, activeMode); } catch (_) {}
    emit('reset-all', { config: deepClone(active) });
    return getAll();
  }

  function persistAll() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
      root.localStorage.setItem(MODE_STORAGE_KEY, activeMode);
      emit('persist', { config: deepClone(active) });
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearPersisted() {
    try {
      root.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function getPresets() {
    return deepClonePreset(presets);
  }

  function getMode() {
    return activeMode;
  }

  function setMode(mode, options) {
    if (mode !== 'exhibition' && mode !== 'challenge' && mode !== 'custom') throw new Error('Unknown config mode: ' + mode);
    const opts = options || {};
    if (mode === 'custom') {
      activeMode = 'custom';
    } else {
      active = deepClonePreset(presets[mode]);
      activeMode = mode;
      validate(active);
    }
    if (opts.persist !== false) {
      try {
        root.localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
        root.localStorage.setItem(MODE_STORAGE_KEY, activeMode);
      } catch (_) {}
    }
    emit('mode', { mode: activeMode, config: deepClone(active) });
    return getAll();
  }

  function getAll() {
    return deepClone(active);
  }

  function emit(action, detail) {
    try {
      root.dispatchEvent(new CustomEvent('brain:config-changed', { detail: Object.assign({ action: action }, detail || {}) }));
    } catch (_) { /* 舊環境不支援 CustomEvent 時不影響主程式 */ }
  }

  validate(active);

  root.BrainChallengeConfig = Object.freeze({
    version: defaults.version,
    moduleConfigMap: moduleConfigMap
  });

  root.BrainChallengeConfigAPI = Object.freeze({
    get,
    getDefaults,
    getForModule,
    getConfigKey,
    getAll,
    setRuntime,
    reset,
    resetAll,
    persistAll,
    clearPersisted,
    validate,
    getPresets,
    getMode,
    setMode
  });

  root.dispatchEvent(new CustomEvent('brain:config-ready'));
})(window);
