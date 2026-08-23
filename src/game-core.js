(function initPulseCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function pulseCoreFactory() {
  'use strict';

  const UPGRADES = Object.freeze([
    Object.freeze({ id: 'overdrive', name: 'Overdrive', icon: '»', description: '+12% movement speed.' }),
    Object.freeze({ id: 'reinforced-hull', name: 'Reinforced Hull', icon: '◆', description: '+1 max hull and repair 1 hull.' }),
    Object.freeze({ id: 'cargo-lattice', name: 'Cargo Lattice', icon: '▦', description: '+2 cargo capacity and +5% bank bonus.' }),
    Object.freeze({ id: 'phase-cooling', name: 'Phase Cooling', icon: '⌁', description: '-15% dash cooldown (minimum 1.4s).' }),
    Object.freeze({ id: 'wide-pulse', name: 'Wide Pulse', icon: '◉', description: '+22% Pulse radius.' }),
    Object.freeze({ id: 'capacitor', name: 'Capacitor', icon: 'ϟ', description: 'Pulse charges 20% faster.' }),
  ]);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function circlesOverlap(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const radius = a.r + b.r;
    return dx * dx + dy * dy <= radius * radius;
  }

  function carryMultiplier(carried) {
    return Math.min(2.5, 1 + Math.max(0, carried) * 0.12);
  }

  function carrySpeedFactor(carried) {
    return 1 - Math.min(0.20, Math.max(0, carried) * 0.025);
  }

  function bankReward(carried, bankBonus) {
    if (carried <= 0) return 0;
    const base = carried * carryMultiplier(carried);
    return Math.round(base * (1 + Math.max(0, bankBonus || 0)));
  }

  function spawnInterval(elapsedSeconds, carried) {
    const elapsedPressure = Math.max(0, elapsedSeconds) * 0.0048;
    const cargoPressure = Math.max(0, carried) * 0.075;
    return Math.max(0.32, Number((1.55 - elapsedPressure - cargoPressure).toFixed(3)));
  }

  function missionStatus({ hull, elapsed, banked }) {
    if (hull <= 0) return 'gameover';
    if (elapsed >= 240 && banked >= 60) return 'victory';
    return 'playing';
  }

  function createBasePlayerStats() {
    return {
      hull: 3,
      maxHull: 3,
      speed: 245,
      capacity: 6,
      bankBonus: 0,
      dashCooldown: 3,
      dashDuration: 0.22,
      dashMultiplier: 2.5,
      pulseRadius: 145,
      pulseGain: 16,
    };
  }

  function applyUpgrade(stats, upgradeId) {
    const next = { ...stats };
    switch (upgradeId) {
      case 'overdrive':
        next.speed *= 1.12;
        break;
      case 'reinforced-hull':
        next.maxHull += 1;
        next.hull = Math.min(next.maxHull, next.hull + 1);
        break;
      case 'cargo-lattice':
        next.capacity += 2;
        next.bankBonus += 0.05;
        break;
      case 'phase-cooling':
        next.dashCooldown = Math.max(1.4, Number((next.dashCooldown * 0.85).toFixed(4)));
        break;
      case 'wide-pulse':
        next.pulseRadius *= 1.22;
        break;
      case 'capacitor':
        next.pulseGain *= 1.2;
        break;
      default:
        return next;
    }
    return next;
  }

  function pickUpgradeChoices(count, rng) {
    const random = typeof rng === 'function' ? rng : Math.random;
    const pool = UPGRADES.slice();
    const amount = clamp(Math.floor(count || 0), 0, pool.length);
    const chosen = [];
    for (let i = 0; i < amount; i += 1) {
      const index = clamp(Math.floor(random() * pool.length), 0, pool.length - 1);
      chosen.push(pool.splice(index, 1)[0]);
    }
    return chosen;
  }

  return Object.freeze({
    UPGRADES,
    clamp,
    circlesOverlap,
    carryMultiplier,
    carrySpeedFactor,
    bankReward,
    spawnInterval,
    missionStatus,
    createBasePlayerStats,
    applyUpgrade,
    pickUpgradeChoices,
  });
});
