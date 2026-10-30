/* 心智大作戰｜Shared Feedback Manager 1.0
 * Phase 2 Step 3：共用 Feedback 服務。
 * 負責提示層、回饋生命週期與可選音效；不介入任何遊戲判定。
 */
(function (window) {
  'use strict';

  const DEFAULT_ICONS = Object.freeze({
    correct: '✓',
    partial: '!',
    wrong: '×',
    info: '•'
  });

  let feedbackTimer = null;
  let scoreTimer = null;

  function getLayer(layerId) {
    return document.getElementById(layerId || 'game-feedback');
  }

  function normalizeType(type) {
    return ['correct', 'partial', 'wrong', 'info'].includes(type) ? type : 'info';
  }

  const Feedback = {
    version: '1.0.0',

    show(options) {
      const opts = options || {};
      const layer = getLayer(opts.layerId);
      if (!layer) return false;

      const type = normalizeType(opts.type);
      const icon = opts.icon || DEFAULT_ICONS[type];
      const title = String(opts.title || '');
      const message = String(opts.message || '');

      layer.className = `game-feedback is-visible feedback-${type}`;
      layer.innerHTML = `<div class="feedback-icon" aria-hidden="true">${icon}</div><div class="feedback-copy"><strong>${title}</strong>${message ? `<span>${message}</span>` : ''}</div>`;

      window.clearTimeout(feedbackTimer);
      if (opts.duration !== 0) {
        feedbackTimer = window.setTimeout(() => this.hide(opts.layerId), Number(opts.duration) || 1500);
      }

      if (opts.sound !== false && window.BrainChallengeAudio?.play) {
        const soundMap = { correct: 'correct', partial: 'correct', wrong: 'wrong', info: 'tap' };
        window.BrainChallengeAudio.play(opts.soundName || soundMap[type]);
      }
      return true;
    },

    hide(layerId) {
      const layer = getLayer(layerId);
      if (!layer) return false;
      layer.classList.remove('is-visible');
      return true;
    },

    clear(layerId) {
      const layer = getLayer(layerId);
      if (!layer) return false;
      window.clearTimeout(feedbackTimer);
      layer.classList.remove('is-visible');
      layer.innerHTML = '';
      return true;
    },

    scorePop(elementOrId) {
      const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
      if (!el) return false;
      window.clearTimeout(scoreTimer);
      el.classList.remove('score-bump');
      void el.offsetWidth;
      el.classList.add('score-bump');
      scoreTimer = window.setTimeout(() => el.classList.remove('score-bump'), 520);
      return true;
    },

    progress(fillOrId, current, total) {
      const el = typeof fillOrId === 'string' ? document.getElementById(fillOrId) : fillOrId;
      if (!el || !total) return false;
      const safeCurrent = Math.max(0, Math.min(Number(current) || 0, Number(total)));
      el.style.width = `${(safeCurrent / Number(total)) * 100}%`;
      el.setAttribute('aria-valuenow', String(safeCurrent));
      el.setAttribute('aria-valuemax', String(total));
      return true;
    }
  };

  window.BrainChallengeFeedback = Object.freeze(Feedback);
})(window);
