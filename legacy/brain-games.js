/* 心智大作戰｜Game Modules 2.0
 * Phase 2 Step 2：Game Module / Plugin API。
 * 既有三款遊戲維持原 HTML 入口；本層只負責模組定義、註冊、替換與查詢。
 */
(function (window) {
  'use strict';

  const LEGACY_NAME_MAP = Object.freeze({
    '時鐘挑戰': '空間認知',
    '時間認知': '空間認知',
    '大家來找碴': '視覺注意力',
    '記憶大挑戰': '工作記憶',
    '形色切換': '語意判斷'
  });

  const REQUIRED_FIELDS = ['id', 'title', 'file'];
  const LIFECYCLE_HOOKS = ['create', 'mount', 'start', 'pause', 'resume', 'stop', 'destroy'];

  const builtInModules = [
    {
      id: 'clock',
      configKey: 'clock',
      title: '空間認知',
      shortTitle: '空間認知',
      file: 'clock_game.html',
      icon: '',
      description: '掌握指針與空間位置',
      order: 1,
      enabled: true,
      version: '1.0.0',
      type: 'html-game',
      source: 'builtin'
    },
    {
      id: 'attention',
      configKey: 'attention',
      title: '視覺注意力',
      shortTitle: '視覺注意力',
      file: 'find_diff_game.html',
      icon: '🔍',
      description: '找出細節差異',
      order: 2,
      enabled: true,
      version: '1.0.0',
      type: 'html-game',
      source: 'builtin'
    },
    {
      id: 'memory',
      configKey: 'memory',
      title: '工作記憶',
      shortTitle: '工作記憶',
      file: 'memory_game_hard.html',
      icon: '🧩',
      description: '記住順序、完成挑戰',
      order: 3,
      enabled: true,
      version: '1.0.0',
      type: 'html-game',
      source: 'builtin'
    },
    {
      id: 'executive',
      configKey: 'executive',
      title: '語意判斷',
      shortTitle: '語意判斷',
      file: 'shape_color_game.html',
      icon: '🔷',
      description: '切換規則、抑制原本反應',
      order: 4,
      enabled: true,
      version: '1.0.0',
      type: 'html-game',
      source: 'builtin'
    }
  ];

  const registry = new Map();
  builtInModules.forEach(module => registry.set(module.id, Object.freeze(Object.assign({}, module))));

  function cloneModule(module) {
    return Object.assign({}, module);
  }

  function sortModules(items) {
    return items.sort((a, b) => {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9999;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9999;
      return orderA - orderB || a.title.localeCompare(b.title, 'zh-Hant');
    });
  }

  function validate(module) {
    const errors = [];
    if (!module || typeof module !== 'object') return ['module 必須是物件'];
    REQUIRED_FIELDS.forEach(field => {
      if (!String(module[field] ?? '').trim()) errors.push(`缺少必要欄位：${field}`);
    });
    if (module.id && !/^[a-z0-9][a-z0-9_-]*$/i.test(module.id)) {
      errors.push('id 只能包含英數字、底線或連字號');
    }
    if (module.file && !/^[^?#]+\.html(?:[?#].*)?$/i.test(module.file)) {
      errors.push('file 必須是 HTML 入口檔');
    }
    return errors;
  }

  function normalize(module, options) {
    const opts = options || {};
    const normalized = Object.assign({
      configKey: null,
      shortTitle: module.title,
      description: '',
      icon: '🎮',
      order: 999,
      enabled: true,
      version: '1.0.0',
      type: 'html-game',
      source: opts.source || 'plugin'
    }, module);
    normalized.shortTitle = normalized.shortTitle || normalized.title;
    normalized.enabled = normalized.enabled !== false;
    normalized.order = Number.isFinite(Number(normalized.order)) ? Number(normalized.order) : 999;
    normalized.lifecycle = normalized.lifecycle && typeof normalized.lifecycle === 'object' ? Object.assign({}, normalized.lifecycle) : {};
    LIFECYCLE_HOOKS.forEach(hook => {
      if (typeof normalized.lifecycle[hook] !== 'function') delete normalized.lifecycle[hook];
    });
    return normalized;
  }

  function emitChange(detail) {
    try {
      window.dispatchEvent(new CustomEvent('brain:modules-changed', { detail }));
    } catch (_) { /* 舊環境不支援 CustomEvent 時不影響主程式 */ }
  }

  const GameModules = {
    version: '2.0.0',

    list(options) {
      const opts = options || {};
      let items = Array.from(registry.values());
      if (opts.enabledOnly !== false) items = items.filter(module => module.enabled !== false);
      return sortModules(items.map(cloneModule));
    },

    get(id) {
      return registry.get(id) ? cloneModule(registry.get(id)) : null;
    },

    has(id) {
      return registry.has(id);
    },

    byTitle(title) {
      for (const module of registry.values()) {
        if (module.title === title) return cloneModule(module);
      }
      return null;
    },

    validate,

    lifecycleHooks: Object.freeze(LIFECYCLE_HOOKS.slice()),

    register(module, options) {
      const opts = options || {};
      const errors = validate(module);
      if (errors.length) return { ok: false, errors };
      const normalized = normalize(module, opts);
      if (registry.has(normalized.id) && opts.replace !== true) {
        return { ok: false, errors: [`模組已存在：${normalized.id}`] };
      }
      registry.set(normalized.id, Object.freeze(cloneModule(normalized)));
      emitChange({ action: opts.replace === true ? 'replace' : 'register', module: cloneModule(normalized) });
      return { ok: true, module: cloneModule(normalized) };
    },

    unregister(id) {
      if (!registry.has(id)) return { ok: false, errors: [`找不到模組：${id}`] };
      const removed = cloneModule(registry.get(id));
      if (removed.source === 'builtin') {
        return { ok: false, errors: [`內建模組不可移除：${id}`] };
      }
      registry.delete(id);
      emitChange({ action: 'unregister', module: removed });
      return { ok: true, module: removed };
    },

    setEnabled(id, enabled) {
      if (!registry.has(id)) return { ok: false, errors: [`找不到模組：${id}`] };
      const current = registry.get(id);
      const updated = Object.assign({}, current, { enabled: enabled !== false });
      registry.set(id, Object.freeze(updated));
      emitChange({ action: 'set-enabled', module: cloneModule(updated) });
      return { ok: true, module: cloneModule(updated) };
    },

    normalizeName(name) {
      return LEGACY_NAME_MAP[name] || name;
    },

    legacyNameMap: LEGACY_NAME_MAP
  };

  window.BrainChallengeModules = Object.freeze(GameModules);
})(window);
