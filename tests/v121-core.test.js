const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const corePath = path.join(ROOT, 'src', 'game-v121-core.js');

test('v1.2.1 helper module exists', () => {
  assert.equal(fs.existsSync(corePath), true, 'src/game-v121-core.js should exist');
});

test('emergency repair restores two hull without exceeding max hull', () => {
  const core = require(corePath);
  assert.deepEqual(core.healHull(1, 4), { hull: 3, healed: 2 });
  assert.deepEqual(core.healHull(3, 4), { hull: 4, healed: 1 });
  assert.deepEqual(core.healHull(4, 4), { hull: 4, healed: 0 });
});

test('emergency repair is weighted toward damaged players', () => {
  const core = require(corePath);
  const full = core.repairOfferChance(4, 4);
  const hurt = core.repairOfferChance(3, 4);
  const critical = core.repairOfferChance(1, 4);
  assert.ok(full > 0 && full < hurt, 'full-health chance should be low but non-zero');
  assert.ok(hurt < critical, 'critical-health chance should be highest');
});

test('upgrade protection lasts exactly 1.5 seconds', () => {
  const core = require(corePath);
  assert.equal(core.UPGRADE_GRACE_SECONDS, 1.5);
});

test('fullscreen strategy prefers standalone, then native fullscreen, then install guidance', () => {
  const core = require(corePath);
  assert.equal(core.fullscreenStrategy({ standalone: true, canRequest: true }), 'standalone');
  assert.equal(core.fullscreenStrategy({ standalone: false, canRequest: true }), 'native');
  assert.equal(core.fullscreenStrategy({ standalone: false, canRequest: false }), 'install');
});

test('visual viewport height falls back safely', () => {
  const core = require(corePath);
  assert.equal(core.safeViewportHeight(612.4, 844), 612);
  assert.equal(core.safeViewportHeight(0, 844), 844);
  assert.equal(core.safeViewportHeight(undefined, 390), 390);
});


test('upgrade progress reports the current segment instead of the full threshold range', () => {
  const core = require(corePath);
  const thresholds = [16, 38, 72, 118, 180];
  assert.deepEqual(core.upgradeProgressState(11, 0, thresholds), {
    current: 11, required: 16, ratio: 11 / 16, remaining: 5, maxed: false, ready: false,
  });
  assert.deepEqual(core.upgradeProgressState(27, 1, thresholds), {
    current: 11, required: 22, ratio: 0.5, remaining: 11, maxed: false, ready: false,
  });
});

test('upgrade progress marks near-ready and maxed states', () => {
  const core = require(corePath);
  const thresholds = [16, 38, 72, 118, 180];
  const near = core.upgradeProgressState(15, 0, thresholds);
  assert.equal(near.ready, true);
  assert.ok(near.ratio >= 0.8);
  assert.deepEqual(core.upgradeProgressState(180, 5, thresholds), {
    current: 0, required: 0, ratio: 1, remaining: 0, maxed: true, ready: true,
  });
});
