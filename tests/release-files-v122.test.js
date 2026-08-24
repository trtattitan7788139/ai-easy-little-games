'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('v1.2.2 theme is local, linked last, and upload-safe', () => {
  const html = read('index.html');
  const themePath = path.join(root, 'theme-v122.css');
  assert.equal(fs.existsSync(themePath), true);
  assert.ok(fs.statSync(themePath).size <= 9000, 'theme-v122.css should stay <= 9000 bytes');
  const v121 = html.indexOf('mobile-v121.css');
  const v122 = html.indexOf('theme-v122.css');
  assert.ok(v121 >= 0 && v122 > v121, 'v1.2.2 theme must load after mobile-v121.css');
  assert.doesNotMatch(read('theme-v122.css'), /https?:\/\//i);
});

test('v1.2.2 keeps existing runtime script order unchanged', () => {
  const html = read('index.html');
  const expected = [
    'src/game-core.js','src/game.js','src/game-02.js','src/game-03.js','src/game-04.js',
    'src/game-06.js','src/game-05.js','src/game-v121-core.js','src/game-07.js','src/game-08.js'
  ];
  let last = -1;
  for (const script of expected) {
    const pos = html.indexOf(script);
    assert.ok(pos > last, `${script} should preserve runtime order`);
    last = pos;
  }
});
