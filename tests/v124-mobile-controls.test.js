const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(ROOT, 'theme-v124.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'src/game-v123-ui.js'), 'utf8');

test('v1.2.4 UI patch loads the dedicated mobile control transparency override', () => {
  assert.match(ui, /theme-v124\.css/);
  assert.match(ui, /v1\.2\.4 \/\/ DESKTOP \+ MOBILE/);
  assert.match(ui, /version:\s*'1\.2\.4'/);
});

test('mobile Dash and Pulse are about 20% opaque at rest and 38% when pressed', () => {
  assert.match(css, /\.mobile-controls\s+\.mobile-action[\s\S]*rgba\(8,\s*14,\s*30,\s*\.20\)/);
  assert.match(css, /\.mobile-controls\s+\.touch-button:active[\s\S]*rgba\(18,\s*64,\s*88,\s*\.38\)/);
  assert.match(css, /border-color:\s*rgba\(173,\s*226,\s*241,\s*\.52\)/);
});
