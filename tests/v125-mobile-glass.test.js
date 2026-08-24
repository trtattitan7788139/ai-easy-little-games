const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('v1.2.5 UI patch loads the dedicated mobile glass stylesheet', () => {
  const ui = read('src/game-v123-ui.js');
  assert.match(ui, /theme-v125\.css/);
  assert.match(ui, /v1\.2\.5 \/\/ DESKTOP \+ MOBILE/);
  assert.match(ui, /version:\s*'1\.2\.5'/);
});

test('Dash and Pulse use a true glass surface at rest and when pressed', () => {
  const css = read('theme-v125.css');
  assert.match(css, /\.mobile-controls\s+\.mobile-action[\s\S]*linear-gradient\([^)]*rgba\(255,\s*255,\s*255,\s*\.1[0-4]\)/);
  assert.match(css, /backdrop-filter:\s*blur\(16px\)\s+saturate\(1\.35\)/);
  assert.match(css, /border-color:\s*rgba\(255,\s*255,\s*255,\s*\.2[6-9]\)/);
  assert.match(css, /box-shadow:[\s\S]*inset\s+0\s+1px\s+0\s+rgba\(255,\s*255,\s*255,\s*\.3/);
  assert.match(css, /\.mobile-controls\s+\.touch-button:active[\s\S]*rgba\(255,\s*255,\s*255,\s*\.1[6-9]\)/);
});

test('glass override is scoped to mobile action buttons only', () => {
  const css = read('theme-v125.css');
  assert.doesNotMatch(css, /\.mobile-joystick|\.joystick-ring|\.icon-button|\.primary-button|\.secondary-button|\.ghost-button/);
});
