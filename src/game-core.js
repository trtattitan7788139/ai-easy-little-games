(function initPulseCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulseCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function pulseCoreFactory() {
  'use strict';

  const UPGRADES = Object.freeze([
    Object.freeze({ id: 'overdrive', name: '超載推進', icon: '»', description: '移動速度 +12%。' }),
    Object.freeze({ id: 'reinforced-hull', name: '強化船體', icon: '◆', description: '最大船體 +1，並修復 1 格船體。' }),
    Object.freeze({ id: 'cargo-lattice', name: '貨艙擴充', icon: '▦', description: '貨艙容量 +2，存入分數額外 +5%。' }),
    Object.freeze({ id: 'phase-cooling', name: '相位冷卻', icon: '⌁', description: '衝刺冷卻時間 -15%（最低 1.4 秒）。' }),
    Object.freeze({ id: 'wide-pulse', name: '廣域脈衝', icon: '◉', description: '脈衝範圍 +22%。' }),
    Object.freeze({ id: 'capacitor', name: '高效電容', icon: 'ϟ', description: '脈衝充能速度 +20%。' }),
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

  function steerTowardWithSeparation(subject, target, neighbors, separationRadius, separationWeight) {
    const radius = Math.max(1, Number(separationRadius) || 48);
    const weight = Math.max(0, Number(separationWeight) || 0);
    const targetDx = target.x - subject.x;
    const targetDy = target.y - subject.y;
    const targetDistance = Math.max(0.0001, Math.hypot(targetDx, targetDy));
    const pursuitX = targetDx / targetDistance;
    const pursuitY = targetDy / targetDistance;

    let separationX = 0;
    let separationY = 0;
    for (const other of neighbors || []) {
      if (other === subject || (subject.id != null && other.id === subject.id)) continue;
      let dx = subject.x - other.x;
      let dy = subject.y - other.y;
      let distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;

      if (distance < 0.0001) {
        const a = Number(subject.id) || 1;
        const b = Number(other.id) || 2;
        const low = Math.min(a, b);
        const high = Math.max(a, b);
        let angle = ((low * 31 + high * 17) * 0.61803398875) % (Math.PI * 2);
        if (a > b) angle += Math.PI;
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }

      const proximity = 1 - Math.min(1, distance / radius);
      separationX += (dx / distance) * proximity;
      separationY += (dy / distance) * proximity;
    }

    const separationMagnitude = Math.hypot(separationX, separationY);
    if (separationMagnitude > 0.0001 && weight > 0) {
      const strength = Math.min(1, separationMagnitude) * weight;
      separationX = (separationX / separationMagnitude) * strength;
      separationY = (separationY / separationMagnitude) * strength;
    } else {
      separationX = 0;
      separationY = 0;
    }

    const combinedX = pursuitX + separationX;
    const combinedY = pursuitY + separationY;
    const combinedMagnitude = Math.max(0.0001, Math.hypot(combinedX, combinedY));
    return { x: combinedX / combinedMagnitude, y: combinedY / combinedMagnitude };
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
    steerTowardWithSeparation,
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
