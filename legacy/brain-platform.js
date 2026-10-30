/* 心智大作戰｜Platform Preflight
 * Phase 2 Step 15：Final Candidate Hardening
 * 只讀檢查平台服務與 4 款內建 Game Module；不修改任何遊戲設定。
 */
(function (window) {
  'use strict';

  const REQUIRED_MODULES = ['clock', 'attention', 'memory', 'executive'];
  const REQUIRED_SERVICES = ['BrainChallenge', 'BrainChallengeConfigAPI', 'BrainChallengeAssets', 'BrainChallengeAudio', 'BrainChallengeFeedback'];

  function check() {
    const results = [];
    REQUIRED_SERVICES.forEach(name => {
      results.push({ name, ok: !!window[name], type: 'service' });
    });

    const modules = window.BrainChallenge?.modules;
    REQUIRED_MODULES.forEach(id => {
      const module = modules?.get?.(id);
      const ok = !!module && module.source === 'builtin' && module.enabled !== false;
      results.push({ name: `module:${id}`, ok, type: 'module', detail: module || null });
    });

    const config = window.BrainChallengeConfigAPI;
    const configChecks = REQUIRED_MODULES.map(id => {
      try {
        return { name: `config:${id}`, ok: !!config?.get?.(id), type: 'config' };
      } catch (error) {
        return { name: `config:${id}`, ok: false, type: 'config', detail: error.message };
      }
    });
    results.push(...configChecks);

    let ok = results.every(item => item.ok);
    return {
      ok,
      version: window.BrainChallenge?.version || 'unknown',
      moduleCount: modules?.list?.({ enabledOnly: true })?.length || 0,
      results
    };
  }

  window.BrainChallengePlatform = Object.freeze({ version: '1.0.0', check });
})(window);
