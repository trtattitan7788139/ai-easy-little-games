'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('v1.2.7 runtime takes over upgrade trigger, choices, selection, and HUD', () => {
  const js = read('src/game-v127.js');
  assert.match(js, /checkUpgrade\s*=\s*function checkUpgradeV127/);
  assert.match(js, /renderUpgradeChoices\s*=\s*function renderUpgradeChoicesV127/);
  assert.match(js, /chooseUpgrade\s*=\s*function chooseUpgradeV127/);
  assert.match(js, /updateHud\s*=\s*function updateHudV127/);
  assert.match(js, /UPGRADE_THRESHOLDS/);
  assert.match(js, /UPGRADES MAX/);
});

test('v1.2.7 UI loader loads core before runtime', () => {
  const js = read('src/game-v123-ui.js');
  assert.match(js, /game-v127-core\.js/);
  assert.match(js, /game-v127\.js/);
  assert.match(js, /v1\.2\.7/);
});
