'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const v127 = require('../src/game-v127-core.js');

function loadRuntime() {
  const hud = { classList: { toggle() {} } };
  const fill = { style: {} };
  const value = { textContent: '' };
  const label = { textContent: '' };
  const upgradeChoices = {
    children: [],
    set textContent(value) { if (value === '') this.children = []; },
    appendChild(node) { this.children.push(node); },
  };

  const context = {
    console, Math, Object, Number, String, Boolean, Array, Set,
    performance: { now: () => 1234 },
    window: null,
    document: {
      getElementById(id) {
        return { upgradeProgressHud: hud, upgradeProgressFill: fill, upgradeProgressValue: value, upgradeProgressLabel: label }[id] || null;
      },
      createElement() {
        return {
          type: '', className: '', dataset: {}, innerHTML: '',
          addEventListener(type, fn) { if (type === 'click') this.click = fn; },
        };
      },
      querySelector() { return null; },
      addEventListener() {},
    },
  };
  context.window = context;
  context.PulseV127Core = v127;
  context.PulseV121Core = {
    UPGRADE_GRACE_SECONDS: 1.5,
    healHull(hull, maxHull, amount) { const next = Math.min(maxHull, hull + amount); return { hull: next, healed: next - hull }; },
    repairOfferChance() { return 0; },
    upgradeProgressState(progress, nextIndex, thresholds) {
      if (nextIndex >= thresholds.length) return { ratio: 1, maxed: true, ready: true, current: 0, required: 0 };
      const start = nextIndex === 0 ? 0 : thresholds[nextIndex - 1];
      const end = thresholds[nextIndex];
      const required = end - start;
      const current = Math.max(0, Math.min(required, progress - start));
      const ratio = required ? current / required : 1;
      return { ratio, maxed: false, ready: ratio >= .8, current, required };
    },
  };
  context.PulseCore = {
    getUpgradePool() {
      return [
        { id: 'overdrive', name: '超載推進', icon: '»', description: '移動速度 +12%。' },
        { id: 'wide-pulse', name: '廣域脈衝', icon: '◉', description: '脈衝範圍 +22%。' },
      ];
    },
  };

  context.__upgradeChoices = upgradeChoices;
  vm.createContext(context);
  vm.runInContext(`
    var checkUpgrade = function(){};
    var renderUpgradeChoices = function(){};
    var chooseUpgrade = function(){};
    var updateHud = function(){};
    var upgradeReturnMode = 'playing';
    var lastFrame = 0;
    var state = { mode: 'playing', score: 0, killScoreFraction: 0, killScorePenalty: 0, nextUpgradeIndex: 0,
      player: { hull: 2, maxHull: 3, invulnerable: 0, hitFlash: 0, upgradeLevels: {} }, particles: [] };
    var dom = { upgradeChoices: __upgradeChoices };
    var keys = { clear: function(){} };
    var syncUiState = function(){};
    var playTone = function(){};
    var spawnBurst = function(){};
    var upgradeProgressScore = function(){ return state.score + state.killScoreFraction + state.killScorePenalty; };
    var __applyCount = 0;
    var applyUpgrade = function(stats, id){ __applyCount += 1; return Object.assign({}, stats, { speed: (stats.speed || 100) + 1 }); };
  `, context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/game-v127.js'), 'utf8'), context);
  return { context, upgradeChoices, value, label };
}

test('runtime applies a regular upgrade only three times', () => {
  const { context } = loadRuntime();
  context.chooseUpgrade('overdrive');
  context.chooseUpgrade('overdrive');
  context.chooseUpgrade('overdrive');
  context.chooseUpgrade('overdrive');
  assert.equal(context.state.player.upgradeLevels.overdrive, 3);
  assert.equal(context.__applyCount, 3);
});

test('runtime offers only emergency repair when all regular upgrades are MAX', () => {
  const { context, upgradeChoices } = loadRuntime();
  context.state.player.upgradeLevels = { overdrive: 3, 'wide-pulse': 3 };
  context.renderUpgradeChoices();
  assert.equal(upgradeChoices.children.length, 1);
  assert.equal(upgradeChoices.children[0].dataset.upgradeId, 'emergency-repair');
});

test('sixth upgrade uses the new 250-point threshold and HUD reaches 10/10', () => {
  const { context, value, label } = loadRuntime();
  context.state.nextUpgradeIndex = 5;
  context.state.score = 249;
  context.checkUpgrade();
  assert.equal(context.state.nextUpgradeIndex, 5);
  context.state.score = 250;
  context.checkUpgrade();
  assert.equal(context.state.nextUpgradeIndex, 6);

  context.state.mode = 'playing';
  context.state.nextUpgradeIndex = 10;
  context.updateHud();
  assert.equal(label.textContent, 'UPGRADES MAX');
  assert.equal(value.textContent, '10 / 10');
});
