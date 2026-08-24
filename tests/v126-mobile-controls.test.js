const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('v1.2.6 loads joystick-material override after v1.2.5', () => {
  const ui = read('src/game-v123-ui.js');
  assert.match(ui, /ensureTheme\('theme-v126\.css'\)/);
  assert.match(ui, /v1\.2\.6 \/\/ DESKTOP \+ MOBILE/);
  assert.match(ui, /version === '1\.2\.6'/);
});

test('Dash and Pulse use the same dark cyan radial material as joystick ring', () => {
  const css = read('theme-v126.css');
  assert.match(css, /\.mobile-controls \.mobile-action[\s\S]*radial-gradient\(circle,\s*rgba\(22,\s*217,\s*255,\s*\.09\)\s*0\s*34%,\s*rgba\(8,\s*17,\s*36,\s*\.64\)\s*35%\s*100%\)/);
  assert.match(css, /border-color:\s*rgba\(102,\s*239,\s*255,\s*\.38\)/);
  assert.match(css, /box-shadow:[\s\S]*inset 0 0 34px rgba\(22,\s*217,\s*255,\s*\.08\)/);
  assert.doesNotMatch(css, /rgba\(255,\s*255,\s*255,\s*\.12\)/);
  assert.doesNotMatch(css, /backdrop-filter:\s*blur\(16px\)/);
});

test('landscape Dash and Pulse use joystick landscape opacity while preserving action scope', () => {
  const css = read('theme-v126.css');
  assert.match(css, /@media \(orientation:\s*landscape\)[\s\S]*\.mobile-controls \.mobile-action[\s\S]*rgba\(8,\s*17,\s*36,\s*\.58\)/);
  assert.doesNotMatch(css, /\.joystick-ring\s*\{/);
  assert.doesNotMatch(css, /\.icon-button\s*\{/);
});
