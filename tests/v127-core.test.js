'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../src/game-v127-core.js');

test('v1.2.7 defines ten upgrade thresholds', () => {
  assert.deepEqual(core.UPGRADE_THRESHOLDS, [16, 38, 72, 118, 180, 250, 330, 420, 520, 630]);
});

test('normal upgrades cap at level 3 and disappear from the eligible pool', () => {
  assert.equal(core.MAX_UPGRADE_LEVEL, 3);
  let levels = {};
  levels = core.recordUpgradeLevel(levels, 'overdrive');
  assert.equal(core.upgradeLevel(levels, 'overdrive'), 1);
  levels = core.recordUpgradeLevel(levels, 'overdrive');
  levels = core.recordUpgradeLevel(levels, 'overdrive');
  assert.equal(core.upgradeLevel(levels, 'overdrive'), 3);
  assert.equal(core.canOfferUpgrade(levels, 'overdrive'), false);

  const pool = [
    { id: 'overdrive', name: '超載推進', description: '移動速度 +12%。' },
    { id: 'wide-pulse', name: '廣域脈衝', description: '脈衝範圍 +22%。' },
  ];
  const eligible = core.eligibleUpgradePool(pool, levels);
  assert.deepEqual(eligible.map((item) => item.id), ['wide-pulse']);
});

test('upgrade labels show Lv.2 and Lv.3 before reaching MAX', () => {
  const upgrade = { id: 'cargo-lattice', name: '貨艙擴充', description: '貨艙容量 +2。' };
  assert.equal(core.decorateUpgrade(upgrade, {}).name, '貨艙擴充');
  assert.equal(core.decorateUpgrade(upgrade, { 'cargo-lattice': 1 }).name, '貨艙擴充 Lv.2');
  assert.equal(core.decorateUpgrade(upgrade, { 'cargo-lattice': 2 }).name, '貨艙擴充 Lv.3');
  assert.equal(core.decorateUpgrade(upgrade, { 'cargo-lattice': 3 }), null);
});

test('emergency repair never gains levels and remains offerable after other upgrades are MAX', () => {
  const maxed = { overdrive: 3, 'wide-pulse': 3 };
  const afterRepair = core.recordUpgradeLevel(maxed, 'emergency-repair');
  assert.deepEqual(afterRepair, maxed);
  assert.equal(core.canOfferUpgrade(afterRepair, 'emergency-repair'), true);
});

test('eligible choice picker never returns a level-3 upgrade', () => {
  const pool = [
    { id: 'overdrive', name: '超載推進' },
    { id: 'wide-pulse', name: '廣域脈衝' },
    { id: 'capacitor', name: '高效電容' },
  ];
  const levels = { overdrive: 3, 'wide-pulse': 1, capacitor: 2 };
  const choices = core.pickEligibleUpgradeChoices(pool, 3, () => 0, levels);
  assert.deepEqual(choices.map((item) => item.id), ['wide-pulse', 'capacitor']);
  assert.equal(choices[0].name, '廣域脈衝 Lv.2');
  assert.equal(choices[1].name, '高效電容 Lv.3');
});
