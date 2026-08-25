'use strict';

(function exposeV127Core(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PulseV127Core = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const MAX_UPGRADE_LEVEL = 3;
  const UPGRADE_THRESHOLDS = Object.freeze([16, 38, 72, 118, 180, 250, 330, 420, 520, 630]);
  const REPAIR_UPGRADE_ID = 'emergency-repair';

  function upgradeLevel(levels, upgradeId) {
    if (upgradeId === REPAIR_UPGRADE_ID) return 0;
    const raw = Number(levels && levels[upgradeId]);
    return Number.isFinite(raw) ? Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.trunc(raw))) : 0;
  }

  function canOfferUpgrade(levels, upgradeId) {
    return upgradeId === REPAIR_UPGRADE_ID || upgradeLevel(levels, upgradeId) < MAX_UPGRADE_LEVEL;
  }

  function recordUpgradeLevel(levels, upgradeId) {
    const current = { ...(levels || {}) };
    if (upgradeId === REPAIR_UPGRADE_ID) return current;
    current[upgradeId] = Math.min(MAX_UPGRADE_LEVEL, upgradeLevel(current, upgradeId) + 1);
    return current;
  }

  function baseUpgradeName(name) {
    return String(name || '').replace(/\s+Lv\.\d+\s*$/i, '').trim();
  }

  function decorateUpgrade(upgrade, levels) {
    if (!upgrade || !upgrade.id || !canOfferUpgrade(levels, upgrade.id)) return null;
    if (upgrade.id === REPAIR_UPGRADE_ID) return { ...upgrade };
    const current = upgradeLevel(levels, upgrade.id);
    const nextLevel = current + 1;
    return {
      ...upgrade,
      name: nextLevel <= 1 ? baseUpgradeName(upgrade.name) : `${baseUpgradeName(upgrade.name)} Lv.${nextLevel}`,
      level: nextLevel,
      maxAfterPick: nextLevel >= MAX_UPGRADE_LEVEL,
    };
  }

  function eligibleUpgradePool(pool, levels) {
    return (Array.isArray(pool) ? pool : [])
      .map((upgrade) => decorateUpgrade(upgrade, levels))
      .filter(Boolean);
  }

  function pickEligibleUpgradeChoices(pool, count, rng, levels) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const available = eligibleUpgradePool(pool, levels).slice();
    const amount = Math.max(0, Math.min(Math.trunc(Number(count) || 0), available.length));
    const chosen = [];
    for (let i = 0; i < amount; i += 1) {
      const raw = Math.floor(random() * available.length);
      const index = Math.max(0, Math.min(available.length - 1, raw));
      chosen.push(available.splice(index, 1)[0]);
    }
    return chosen;
  }

  return {
    MAX_UPGRADE_LEVEL,
    UPGRADE_THRESHOLDS,
    REPAIR_UPGRADE_ID,
    upgradeLevel,
    canOfferUpgrade,
    recordUpgradeLevel,
    decorateUpgrade,
    eligibleUpgradePool,
    pickEligibleUpgradeChoices,
  };
});
