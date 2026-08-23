const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('release includes beginner-friendly README with launch and controls', () => {
  const readme = read('README.md');
  for (const phrase of ['Pulse Courier: Neon Run', 'PLAY.bat', 'index.html', 'WASD', 'SPACE', '新手教學', 'node --test']) {
    assert.ok(readme.includes(phrase), `README should mention ${phrase}`);
  }
});

test('release includes a one-click Windows launcher and license', () => {
  assert.equal(fs.existsSync(path.join(root, 'PLAY.bat')), true);
  assert.match(read('PLAY.bat'), /index\.html/i);
  assert.match(read('LICENSE'), /MIT License/);
});

test('runtime files contain no external web asset dependencies', () => {
  for (const file of ['index.html', 'styles.css', 'mobile-v112.css', 'src/game-core.js', 'src/game.js']) {
    assert.doesNotMatch(read(file), /https?:\/\//i, `${file} should remain fully local`);
  }
});

test('v1.1.2 mobile override stylesheet is included locally', () => {
  assert.equal(fs.existsSync(path.join(root, 'mobile-v112.css')), true, 'mobile-v112.css should exist');
  assert.match(read('index.html'), /href="mobile-v112\.css"/);
});

test('browser runtime is split into upload-safe local script segments', () => {
  const html = read('index.html');
  const scripts = [...html.matchAll(/<script defer src="(src\/game(?:-[0-9]+)?\.js)"><\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.length >= 2, 'runtime should be split across multiple readable script files');
  for (const file of scripts) {
    const fullPath = path.join(root, file);
    assert.equal(fs.existsSync(fullPath), true, `${file} should exist`);
    assert.ok(fs.statSync(fullPath).size <= 9000, `${file} should stay <= 9000 bytes for reliable connector uploads`);
    assert.doesNotMatch(read(file), /https?:\/\//i, `${file} should remain fully local`);
  }
});

test('enemy pursuit runtime applies separation steering to prevent stacking', () => {
  const chasers = read('src/game-02.js');
  const chargers = read('src/game-03.js');
  assert.match(chasers, /steerTowardWithSeparation\(enemy, state\.player, state\.enemies/);
  assert.match(chargers, /steerTowardWithSeparation\(enemy, state\.player, state\.enemies/);
});


test('energy cells use the calmer v1.1 spawn cadence', () => {
  const runtime = read('src/game-02.js');
  assert.match(runtime, /CELL_SPAWN_MIN\s*=\s*0\.95/);
  assert.match(runtime, /CELL_SPAWN_MAX\s*=\s*1\.35/);
  assert.match(runtime, /CELL_DOUBLE_CHANCE\s*=\s*0\.08/);
  assert.match(runtime, /MAX_NATURAL_CELLS\s*=\s*22/);
});

test('dash impact runtime distinguishes locked dash from unlocked attacks', () => {
  const runtime = read('src/game-03.js');
  assert.match(runtime, /dashImpactLevel\s*>\s*0/);
  assert.match(runtime, /dashImpactRadius/);
  assert.match(runtime, /dashImpactScore/);
});
