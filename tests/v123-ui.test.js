const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('v1.2.3 loads the transparency override after v1.2.2 theme', () => {
  const html = read('index.html');
  const v122 = html.indexOf('theme-v122.css');
  const v123 = html.indexOf('theme-v123.css');
  assert.ok(v122 >= 0 && v123 > v122, 'theme-v123.css must load after theme-v122.css');
  assert.equal(fs.existsSync('theme-v123.css'), true, 'theme-v123.css should exist');
});

test('visible health terminology uses 血量 instead of HULL', () => {
  const html = read('index.html');
  assert.match(html, /class="hud-label">血量<\/span>/);
  assert.doesNotMatch(html, />HULL</);
  assert.doesNotMatch(html, /HULL\s*(?:是|歸零)/);
});

test('button surfaces are more transparent while borders stay legible', () => {
  assert.equal(fs.existsSync('theme-v123.css'), true, 'theme-v123.css should exist');
  const css = fs.existsSync('theme-v123.css') ? read('theme-v123.css') : '';
  assert.match(css, /\.icon-button[\s\S]*?background:\s*rgba\([^;]+,\s*\.4[0-9]\)/);
  assert.match(css, /\.primary-button[\s\S]*?background:[\s\S]*?rgba\([^;]+,\s*\.3[0-9]\)/);
  assert.match(css, /#normalButton\.secondary-button[\s\S]*?rgba\(255,\s*103,\s*31,\s*\.6[0-9]\)/);
  assert.match(css, /\.mobile-action[\s\S]*?background:\s*rgba\([^;]+,\s*\.4[0-9]\)/);
});

test('dynamic tutorial and upgrade copy are localized without renaming internal hull state', () => {
  const html = read('index.html');
  assert.ok(html.indexOf('src/game-v123-ui.js') > html.indexOf('src/game-08.js'));
  assert.equal(fs.existsSync('src/game-v123-ui.js'), true);
  const js = read('src/game-v123-ui.js');
  assert.match(js, /replaceAll\('HULL', '血量'\)/);
  assert.match(js, /setTutorialStepV123/);
  assert.match(js, /renderUpgradeChoicesV123/);
  assert.match(js, /version: '1\.2\.3'/);
  assert.doesNotMatch(js, /state\.player\.hull\s*=/);
});
