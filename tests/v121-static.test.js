const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('page exposes fullscreen/PWA hooks and loads v1.2.1 runtime', () => {
  const html = read('index.html');
  assert.match(html, /id="fullscreenButton"/);
  assert.match(html, /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(html, /apple-mobile-web-app-capable/);
  assert.match(html, /mobile-v121\.css/);
  assert.match(html, /src\/game-v121-core\.js/);
  assert.match(html, /src\/game-07\.js/);
  assert.match(html, /src\/game-08\.js/);
  assert.match(html, /v1\.2\.\d+ \/\/ DESKTOP \+ MOBILE/);
});

test('mobile v1.2.1 layout uses visual viewport height and overlays controls', () => {
  const cssPath = path.join(ROOT, 'mobile-v121.css');
  assert.equal(fs.existsSync(cssPath), true, 'mobile-v121.css should exist');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  assert.match(css, /--app-height/);
  assert.match(css, /height:\s*var\(--app-height/);
  assert.match(css, /\.mobile-controls[\s\S]*position:\s*fixed/);
  assert.match(css, /overflow:\s*hidden/);
});

test('runtime adds 1.5 second upgrade grace and emergency repair', () => {
  const runtimePath = path.join(ROOT, 'src', 'game-07.js');
  assert.equal(fs.existsSync(runtimePath), true, 'src/game-07.js should exist');
  const js = fs.existsSync(runtimePath) ? fs.readFileSync(runtimePath, 'utf8') : '';
  assert.match(js, /emergency-repair/);
  assert.match(js, /UPGRADE_GRACE_SECONDS/);
  assert.match(js, /invulnerable/);
  assert.match(js, /visualViewport/);
  assert.match(js, /requestFullscreen/);
});

test('manifest is standalone-capable', () => {
  const manifestPath = path.join(ROOT, 'manifest.webmanifest');
  assert.equal(fs.existsSync(manifestPath), true, 'manifest.webmanifest should exist');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
});

test('page exposes a visible next-upgrade progress HUD', () => {
  const html = read('index.html');
  assert.match(html, /id="upgradeProgressHud"/);
  assert.match(html, /id="upgradeProgressFill"/);
  assert.match(html, /id="upgradeProgressValue"/);
  assert.match(html, /NEXT UPGRADE/);

  const js = read('src/game-08.js');
  assert.match(js, /upgradeProgressState/);
  assert.match(js, /upgradeProgressHud/);
  assert.match(js, /is-near-ready/);
  assert.match(js, /UPGRADES MAX/);
});

test('fullscreen fallback is a non-blocking inline hint', () => {
  const js = read('src/game-07.js');
  const css = read('mobile-v121.css');
  assert.match(js, /fullscreen-inline-hint/);
  assert.match(js, /role', 'status'/);
  assert.doesNotMatch(js, /aria-modal/);
  assert.match(css, /\.fullscreen-inline-hint/);
  assert.match(css, /pointer-events:\s*none/);
});
