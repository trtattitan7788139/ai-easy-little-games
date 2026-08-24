'use strict';

(function exposeV121Core(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PulseV121Core = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const UPGRADE_GRACE_SECONDS = 1.5;

  function healHull(hull, maxHull, amount = 2) {
    const max = Math.max(0, Number(maxHull) || 0);
    const current = Math.min(max, Math.max(0, Number(hull) || 0));
    const next = Math.min(max, current + Math.max(0, Number(amount) || 0));
    return { hull: next, healed: next - current };
  }

  function repairOfferChance(hull, maxHull) {
    const max = Math.max(1, Number(maxHull) || 1);
    const current = Math.min(max, Math.max(0, Number(hull) || 0));
    const missing = max - current;
    if (missing <= 0) return 0.08;
    if (missing === 1) return 0.34;
    return Math.min(0.72, 0.50 + missing * 0.08);
  }

  function fullscreenStrategy({ standalone = false, canRequest = false } = {}) {
    if (standalone) return 'standalone';
    return canRequest ? 'native' : 'install';
  }

  function upgradeProgressState(progress, nextIndex, thresholds) {
    const list = Array.isArray(thresholds) ? thresholds.map(Number).filter(Number.isFinite) : [];
    const index = Math.max(0, Math.trunc(Number(nextIndex) || 0));
    if (index >= list.length) {
      return { current: 0, required: 0, ratio: 1, remaining: 0, maxed: true, ready: true };
    }
    const start = index === 0 ? 0 : list[index - 1];
    const end = list[index];
    const required = Math.max(0, end - start);
    const current = Math.min(required, Math.max(0, (Number(progress) || 0) - start));
    const ratio = required > 0 ? Math.min(1, current / required) : 1;
    return {
      current, required, ratio,
      remaining: Math.max(0, required - current),
      maxed: false,
      ready: ratio >= 0.8,
    };
  }

  function safeViewportHeight(visualHeight, innerHeight) {
    const visual = Number(visualHeight);
    if (Number.isFinite(visual) && visual > 0) return Math.max(1, Math.round(visual));
    const fallback = Number(innerHeight);
    return Number.isFinite(fallback) && fallback > 0 ? Math.max(1, Math.round(fallback)) : 1;
  }

  return {
    UPGRADE_GRACE_SECONDS,
    healHull,
    repairOfferChance,
    fullscreenStrategy,
    upgradeProgressState,
    safeViewportHeight,
  };
});
