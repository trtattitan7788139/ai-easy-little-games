const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const requiredIds = [
  'gameCanvas', 'menuScreen', 'startButton', 'tutorialButton', 'howButton',
  'hud', 'abilityRack', 'hullValue', 'timerValue', 'cargoValue', 'multiplierValue',
  'bankedValue', 'scoreValue', 'dashFill', 'dashLabel', 'dashImpactLabel', 'pulseFill', 'pulseLabel',
  'tutorialPanel', 'tutorialStep', 'tutorialText', 'tutorialProgress',
  'upgradeScreen', 'upgradeChoices', 'pauseScreen', 'resumeButton',
  'endScreen', 'endTitle', 'endSummary', 'finalScore', 'finalBanked', 'bestScore',
  'restartButton', 'menuButton', 'pauseButton', 'soundButton', 'howScreen', 'howCloseButton',
  'normalButton', 'difficultyValue', 'finalDifficulty', 'bestNormalScore',
  'mobileControls', 'mobileJoystick', 'mobileJoystickStick',
  'mobileDashButton', 'mobilePulseButton', 'mobileDashLabel', 'mobilePulseLabel', 'mobileDashImpactLabel'
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


test('desktop shell uses a larger game frame and readable HUD scale', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8') + fs.readFileSync(path.join(root, 'mobile-v120.css'), 'utf8');
  assert.match(css, /\.app-shell\s*\{[\s\S]*?width:\s*min\(1450px,\s*94vw,\s*calc\(\(100vh - 140px\) \* 1\.6\)\)/);
  assert.match(css, /\.hud-card\s*\{[\s\S]*?min-width:\s*96px/);
  assert.match(css, /\.ability\s*\{[\s\S]*?width:\s*224px/);
});


test('mobile layout exposes touch controls instead of keyboard-only gameplay', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8') + fs.readFileSync(path.join(root, 'mobile-v120.css'), 'utf8');
  assert.match(html, /id=["']mobileControls["']/);
  assert.match(html, /id=["']mobileDashButton["']/);
  assert.match(html, /id=["']mobilePulseButton["']/);
  assert.match(html, /id=["']mobileJoystick["']/);
  assert.match(html, /id=["']mobileJoystickStick["']/);
  assert.match(css, /\.mobile-controls\s*\{/);
  assert.match(css, /\.mobile-joystick\s*\{/);
  assert.match(css, /\.joystick-stick\s*\{/);
  assert.match(css, /touch-action:\s*none/);
});



test('mobile stylesheet includes a dedicated landscape play layout', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8') + fs.readFileSync(path.join(root, 'mobile-v120.css'), 'utf8');
  assert.match(css, /@media\s*\([^)]*orientation:\s*landscape[^)]*\)[\s\S]*?\.mobile-controls\s*\{[\s\S]*?position:\s*(?:fixed|absolute)/);
  assert.match(css, /@media\s*\([^)]*orientation:\s*landscape[^)]*\)[\s\S]*?\.mobile-joystick\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(css, /@media\s*\([^)]*orientation:\s*landscape[^)]*\)[\s\S]*?\.footer-note\s*\{[\s\S]*?display:\s*none/);
});

test('mobile overlays are compact enough to keep pause actions reachable', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8') + fs.readFileSync(path.join(root, 'mobile-v120.css'), 'utf8');
  assert.match(css, /@media\s*\(max-width:\s*560px\)[\s\S]*?\.overlay\s*\{[\s\S]*?padding:\s*8px/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)[\s\S]*?\.pause-card\s*\{[\s\S]*?max-height:\s*calc\(100% - 8px\)/);
});


test('menu exposes easy and normal difficulty choices with clear score rules', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /id=["']startButton["'][\s\S]*?簡單/);
  assert.match(html, /id=["']normalButton["'][\s\S]*?普通/);
  assert.match(html, /普通[\s\S]*?(?:×|x)0\.5/);
  assert.match(html, /id=["']bestNormalScore["']/);
  assert.match(html, /id=["']difficultyValue["']/);
});

test('v1.2 mobile layout enlarges portrait controls and fills landscape viewport', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8') + fs.readFileSync(path.join(root, 'mobile-v120.css'), 'utf8');
  assert.match(css, /@media\s*\(orientation:\s*portrait\)[\s\S]*?\.game-frame\s*\{[\s\S]*?height:\s*(?:clamp|min|max|calc)/);
  assert.match(css, /@media\s*\(orientation:\s*portrait\)[\s\S]*?\.joystick-ring\s*\{[\s\S]*?width:\s*17\dpx/);
  assert.match(css, /@media\s*\(orientation:\s*landscape\)[\s\S]*?\.game-frame\s*\{[\s\S]*?width:\s*100%[\s\S]*?height:\s*calc\(100dvh/);
});
