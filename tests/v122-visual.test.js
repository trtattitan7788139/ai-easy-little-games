'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const themePath = path.join(root, 'theme-v122.css');
const theme = fs.existsSync(themePath) ? fs.readFileSync(themePath, 'utf8') : '';

test('v1.2.2 visual theme is loaded and versioned', () => {
  assert.match(index, /theme-v122\.css/);
  assert.match(index, /v1\.2\.2 \/\/ DESKTOP \+ MOBILE/);
});

test('landscape menu is centered without forcing text alignment center', () => {
  assert.match(theme, /\.menu-screen\s*\{[^}]*justify-items:\s*center/s);
  assert.match(theme, /\.hero-card\s*\{[^}]*margin-inline:\s*auto/s);
  assert.match(theme, /\.hero-card\s*\{[^}]*text-align:\s*left/s);
});

test('theme raises text contrast and defines Pantone 165 C approximation', () => {
  assert.match(theme, /--text-strong:\s*#F8FBFF/i);
  assert.match(theme, /--text-secondary:\s*#D6E2EC/i);
  assert.match(theme, /--pantone-165c:\s*#FF671F/i);
  assert.match(theme, /#normalButton[^}]*var\(--pantone-165c\)/s);
});

test('game canvas is gently brightened for dark-scene visibility', () => {
  assert.match(theme, /#gameCanvas\s*\{[^}]*filter:\s*brightness\(1\.08\)\s*saturate\(1\.06\)/s);
});

test('upgrade and modal motion use rounded easing and staggered choices', () => {
  assert.match(theme, /--motion-smooth:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
  assert.match(theme, /@keyframes\s+v122-modal-enter/);
  assert.match(theme, /@keyframes\s+v122-upgrade-choice-enter/);
  assert.match(theme, /\.upgrade-choice:nth-child\(2\)[^}]*animation-delay:/s);
  assert.match(theme, /\.upgrade-choice:nth-child\(3\)[^}]*animation-delay:/s);
});

test('reduced motion remains respected', () => {
  assert.match(theme, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(theme, /animation:\s*none\s*!important/);
});
