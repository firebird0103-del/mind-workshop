/* 心智大作戰｜Audio Manager 1.2
 * Phase 2 Step 4B：實際音效接線。
 * - 首次 Touch / Pointer 操作自動解鎖 AudioContext
 * - 共用按鈕提供 tap 提示音
 * - 遊戲結果由 Feedback / Game 事件呼叫 correct / wrong / complete
 * - 保留 enable / volume 設定，不改變遊戲判定
 */
(function (window) {
  'use strict';

  const PRESETS = Object.freeze({
    tap:      { frequency: 560, duration: 0.060, type: 'sine',     gain: 0.060 },
    correct:  { frequency: 760, duration: 0.12,  type: 'sine',     gain: 0.075 },
    wrong:    { frequency: 210, duration: 0.13,  type: 'triangle', gain: 0.060 },
    complete: { frequency: 900, duration: 0.18,  type: 'sine',     gain: 0.080 }
  });

  const AudioManager = {
    enabled: true,
    volume: 0.85,
    _context: null,
    _masterGain: null,
    _globalTapInstalled: false,

    _ensureContext() {
      if (this._context) return this._context;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      try {
        this._context = new Ctx();
        this._masterGain = this._context.createGain();
        this._masterGain.gain.value = this.volume;
        this._masterGain.connect(this._context.destination);
        return this._context;
      } catch (_) {
        this._context = null;
        this._masterGain = null;
        return null;
      }
    },

    setEnabled(value) {
      this.enabled = value !== false;
      try { localStorage.setItem('brain-audio-enabled', String(this.enabled)); } catch (_) {}
      if (this._masterGain) this._masterGain.gain.value = this.enabled ? this.volume : 0;
      this.updateControls();
      return this.enabled;
    },

    isEnabled() { return this.enabled; },

    setVolume(value) {
      const next = Math.max(0, Math.min(1, Number(value)));
      this.volume = Number.isFinite(next) ? next : 0.85;
      if (this._masterGain) this._masterGain.gain.value = this.enabled ? this.volume : 0;
      return this.volume;
    },

    getVolume() { return this.volume; },

    updateControls() {
      document.querySelectorAll('[data-audio-toggle]').forEach(button => {
        button.textContent = this.enabled ? '音效：開' : '音效：關';
        button.setAttribute('aria-pressed', String(this.enabled));
      });
    },

    installControls() {
      let controls = document.querySelectorAll('[data-audio-toggle]');
      const bar = document.querySelector('.topbar');
      if (!controls.length && bar) {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'exit-btn';
        button.setAttribute('data-audio-toggle', '');
        bar.appendChild(button);
        controls = [button];
      }
      controls.forEach(button => {
        button.dataset.audioTap = 'false';
        button.addEventListener('click', () => {
          this.setEnabled(!this.enabled);
          if (this.enabled) { this.unlock(); this.play('tap'); }
        });
      });
      this.updateControls();
    },

    unlock() {
      if (!this.enabled) return false;
      const ctx = this._ensureContext();
      if (!ctx) return false;
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return true;
      } catch (_) {
        return false;
      }
    },

    play(name, overrides) {
      if (!this.enabled) return false;
      const preset = Object.assign({}, PRESETS[name] || PRESETS.tap, overrides || {});
      const ctx = this._ensureContext();
      if (!ctx || !this._masterGain) return false;
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = preset.type;
        osc.frequency.setValueAtTime(preset.frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, preset.gain), now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + preset.duration);
        osc.connect(gain);
        gain.connect(this._masterGain);
        osc.start(now);
        osc.stop(now + preset.duration + 0.02);
        return true;
      } catch (_) {
        return false;
      }
    },

    stop() { /* 預留：Phase 2 後續接背景音／長音效 */ },

    installGlobalTapFeedback() {
      if (this._globalTapInstalled || !document || !document.addEventListener) return;
      this._globalTapInstalled = true;
      document.addEventListener('pointerdown', (event) => {
        const target = event.target && event.target.closest ? event.target.closest('button, [role=button]') : null;
        if (target) this.unlock();
      }, { passive: true });
      document.addEventListener('pointerup', (event) => {
        const target = event.target && event.target.closest ? event.target.closest('button, [role=button]') : null;
        if (!target || target.disabled || target.dataset.audioTap === 'false' || target.closest('.choices, #grid-b, #options-area, #answer-area')) return;
        this.play('tap');
      }, { passive: true });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const target = event.target && event.target.closest ? event.target.closest('button, [role=button]') : null;
        if (target && !target.disabled && target.dataset.audioTap !== 'false' && !target.closest('.choices, #grid-b, #options-area, #answer-area')) this.play('tap');
      }, { passive: true });
    }
  };

  window.BrainChallengeAudio = AudioManager;
  try { AudioManager.enabled = localStorage.getItem('brain-audio-enabled') !== 'false'; } catch (_) {}
  document.addEventListener('DOMContentLoaded', () => AudioManager.installControls(), { once: true });
  document.addEventListener('DOMContentLoaded', () => AudioManager.installGlobalTapFeedback(), { once: true });
  AudioManager.installGlobalTapFeedback();
})(window);
