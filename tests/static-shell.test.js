const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const requiredIds = [
  'gameCanvas', 'menuScreen', 'startButton', 'tutorialButton', 'howButton',
  'hud', 'abilityRack', 'hullValue', 'timerValue', 'cargoValue', 'multiplierValue',
  'bankedValue', 'scoreValue', 'dashFill', 'dashLabel', 'pulseFill', 'pulseLabel',
  'tutorialPanel', 'tutorialStep', 'tutorialText', 'tutorialProgress',
  'upgradeScreen', 'upgradeChoices', 'pauseScreen', 'resumeButton',
  'endScreen', 'endTitle', 'endSummary', 'finalScore', 'finalBanked', 'bestScore',
  'restartButton', 'menuButton', 'pauseButton', 'soundButton', 'howScreen', 'howCloseButton'
];

test('browser shell contains every DOM contract used by the game', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  }
});

test('classic scripts load core before browser game for direct file launch', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const core = html.indexOf('src/game-core.js');
  const game = html.indexOf('src/game.js');
  assert.ok(core >= 0 && game > core, 'game-core.js must load before game.js');
  assert.doesNotMatch(html, /type=["']module["']/i);
});

test('stylesheet and game scripts exist', () => {
  for (const file of ['styles.css', 'src/game-core.js', 'src/game.js']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test('HTML ids are unique', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual([...new Set(duplicates)], []);
});

test('upgrade overlay uses Traditional Chinese copy', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const section = html.match(/<section id="upgradeScreen"[\s\S]*?<\/section>/)?.[0] || '';
  assert.match(section, /中繼站同步完成/);
  assert.match(section, /選擇一項升級/);
  assert.doesNotMatch(section, /RELAY SYNCHRONIZED/);
});
